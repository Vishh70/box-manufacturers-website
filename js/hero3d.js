/**
 * @file Home Page 3D Hero Animation - Hyper-Realistic v10 (Final Deep Detail)
 * @description The ultimate architectural re-design for absolute detail.
 *              Uses Linear Tone Mapping for high-contrast, deep kraft tones, 
 *              and 3.0x normal map intensity for tactile surface ridges.
 */

(function () {
    'use strict';

    if (typeof THREE === 'undefined') return;

    // --- Global State ---
    const S = {
        isUserInteracting: false,
        isMobile: window.innerWidth < 768,
        isVisible: true,
        isDragging: false,
        prevMouse: { x: 0, y: 0 },
        baseRotX: -0.32, 
        baseRotY: 0.65,
        rotX: -0.32,
        rotY: 0.65,
        targetRotX: -0.32,
        targetRotY: 0.65,
        dragOffsetX: 0,
        dragOffsetY: 0
    };

    const DAMPING = 0.045;
    const ROTATION_SWAY_X = 0.01;
    const ROTATION_SWAY_Y = 0.05;
    const DRAG_RETURN = 0.95;
    const DRAG_LIMIT_X = 0.3;
    const DRAG_LIMIT_Y = 0.5;
    const REVEAL_CYCLE_MS = 14000;
    const REVEAL_PEAK = 0.14;

    const BOX_W = 2.4; 
    const BOX_H = 1.6;
    const BOX_D = 2.0;
    const THICKNESS = 0.07;
    const BEVEL_SIZE = 0.02;

    let container, scene, camera, renderer;
    let mainBoxGroup, flapPivotGroup, insertPanel, insertMaterial;
    let animFrameId, animationStart = 0;

    let brandedMat, plainMat, workbenchMat;

    /* =========================================================
     *  ULTRA-HIGH FIDELITY PBR BAKER (2048px)
     * ========================================================= */

    function bakePBRCardboard(isBranded = false) {
        const size = 2048;
        const albedoCanvas = document.createElement('canvas'); albedoCanvas.width = size; albedoCanvas.height = size;
        const normalCanvas = document.createElement('canvas'); normalCanvas.width = size; normalCanvas.height = size;
        const roughCanvas = document.createElement('canvas'); roughCanvas.width = size; roughCanvas.height = size;

        const ctxA = albedoCanvas.getContext('2d');
        const ctxN = normalCanvas.getContext('2d');
        const ctxR = roughCanvas.getContext('2d');

        // 1. Albedo Pass (Deep Brown-Tan)
        ctxA.fillStyle = '#a8855e'; // Deep, realistic cardboard brown
        ctxA.fillRect(0, 0, size, size);
        
        // Baked AO (Soft darkening around edges)
        const grad = ctxA.createRadialGradient(size/2, size/2, 0, size/2, size/2, size*0.8);
        grad.addColorStop(0, 'rgba(0,0,0,0)');
        grad.addColorStop(1, 'rgba(0,0,0,0.15)');
        ctxA.fillStyle = grad;
        ctxA.fillRect(0, 0, size, size);

        // Fiber detail
        ctxA.globalAlpha = 0.3;
        for(let i=0; i<150000; i++) {
            const x = Math.random()*size; const y = Math.random()*size;
            ctxA.fillStyle = Math.random() > 0.5 ? '#7d6244' : '#57452f';
            ctxA.fillRect(x,y,1.5,1.5);
        }

        if (isBranded) {
            drawHighResBranding(ctxA, size, '#000000'); // Pure Black for maximum contrast
        }

        // 2. Normal Pass (Physical Ridges)
        ctxN.fillStyle = 'rgb(128,128,255)'; 
        ctxN.fillRect(0, 0, size, size);
        
        // High-Contrast Corrugation Ridges (Vertical)
        ctxN.globalAlpha = 0.2;
        for(let i=0; i<size; i+=45) {
            ctxN.fillStyle = 'rgb(90,90,255)';
            ctxN.fillRect(i, 0, 18, size);
        }
        
        // Micro-grain fiber bump
        ctxN.globalAlpha = 0.25;
        for(let i=0; i<300000; i++) {
             const x = Math.random()*size; const y = Math.random()*size;
             ctxN.fillStyle = Math.random() > 0.5 ? 'rgb(160,160,255)' : 'rgb(90,90,255)';
             ctxN.fillRect(x,y,1,1);
        }

        // 3. Roughness Pass (Cardboard is very rough/dry)
        ctxR.fillStyle = '#ffffff'; // 100% rough base
        ctxR.fillRect(0, 0, size, size);
        if (isBranded) {
            ctxR.globalAlpha = 0.2;
            ctxR.fillStyle = '#999999'; // Ink is slightly smoother/waxy
            drawHighResBranding(ctxR, size, '#999999');
        }

        const albedoTex = new THREE.CanvasTexture(albedoCanvas);
        const normalTex = new THREE.CanvasTexture(normalCanvas);
        const roughTex = new THREE.CanvasTexture(roughCanvas);
        
        [albedoTex, normalTex, roughTex].forEach(t => { 
            t.anisotropy = 8;
            t.generateMipmaps = true;
        });

        return { albedoTex, normalTex, roughTex };
    }

    function drawHighResBranding(ctx, size, color) {
        ctx.save();
        ctx.translate(size*0.08, size*0.35);
        const scale = size / 1024;
        
        ctx.fillStyle = color;
        ctx.strokeStyle = color;

        // "AE" logo with arrows - Bolder paths
        ctx.beginPath();
        ctx.moveTo(0, 180*scale); ctx.lineTo(105*scale, 15*scale); ctx.lineTo(210*scale, 180*scale);
        ctx.lineWidth = 62*scale; ctx.stroke();
        
        ctx.fillRect(100*scale, 50*scale, 250*scale, 48*scale);
        ctx.fillRect(100*scale, 120*scale, 190*scale, 48*scale);
        ctx.fillRect(100*scale, 190*scale, 250*scale, 48*scale);
        
        ctx.lineWidth = 22*scale;
        for(let i=0; i<3; i++) {
            const sx = -45*scale + i*60*scale; const ex = 150*scale + i*100*scale;
            ctx.beginPath();
            ctx.moveTo(sx, 260*scale);
            ctx.quadraticCurveTo(sx + 90*scale, 190*scale, ex, 35*scale);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(ex - 30*scale, 75*scale); ctx.lineTo(ex, 35*scale); ctx.lineTo(ex + 15*scale, 85*scale);
            ctx.fill();
        }
        
        ctx.restore(); ctx.save();
        ctx.translate(size*0.52, size*0.55);
        ctx.textAlign = 'left';
         
        ctx.font = `900 ${260*scale}px "Inter", "Arial Black", sans-serif`;
        ctx.fillText('ARTI', -40*scale, -60*scale);
         
        ctx.font = `800 ${130*scale}px "Inter", "Arial Black", sans-serif`;
        ctx.fillText('ENTERPRISES', -40*scale, 75*scale);

        ctx.textAlign = 'center';
        ctx.font = `900 ${48*scale}px "Inter", Arial, sans-serif`;
        ctx.fillText('QUALITY PRODUCTS | RELIABLE SERVICE | EST. 2005', 0, 190*scale);
         
        ctx.font = `600 ${36*scale}px "Inter", Arial, sans-serif`;
        ctx.fillText('Head Office: 123 Industrial Area, Sector 4, City, State - Zip Code', 0, 340*scale);
        ctx.fillText('Email: info@artienterprises.com | Web: www.artienterprises.com', 0, 395*scale);
        ctx.font = `bold ${44*scale}px "Inter", Arial, sans-serif`;
        ctx.fillText('Contact: +91 98765 43210', 0, 465*scale);
        ctx.restore();
    }

    /* =========================================================
     *  SCENE
     * ========================================================= */

    function init() {
        container = document.getElementById('hero3dCanvas');
        if (!container) return;

        scene = new THREE.Scene();
        camera = new THREE.PerspectiveCamera(22, container.clientWidth / container.clientHeight, 0.1, 1000);
        camera.position.set(6, 4, 11);
        camera.lookAt(0, 0.2, 0);

        renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setSize(container.clientWidth, container.clientHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.outputEncoding = THREE.sRGBEncoding;
        renderer.toneMapping = THREE.LinearToneMapping; // Switched to Linear for higher contrast
        renderer.toneMappingExposure = 0.85; // Low exposure to avoid blowout
        renderer.shadowMap.enabled = !S.isMobile;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        container.appendChild(renderer.domElement);

        // Warehouse Point Lighting (Studio Feel)
        scene.add(new THREE.AmbientLight(0xfff8ee, 0.4)); 
        const key = new THREE.DirectionalLight(0xfffdf5, 1.2);
        key.position.set(-8, 12, 10);
        key.castShadow = true;
        key.shadow.mapSize.set(2048, 2048);
        key.shadow.radius = 15;
        scene.add(key);

        const point = new THREE.PointLight(0xfff5e0, 0.8);
        point.position.set(5, 5, 5);
        scene.add(point);

        buildScene();
        setupInteraction();
        startLoop();

        window.addEventListener('resize', onResize);
        onResize();
    }

    function buildScene() {
        const brandedS = bakePBRCardboard(true);
        const plainS = bakePBRCardboard(false);

        brandedMat = new THREE.MeshPhysicalMaterial({
            map: brandedS.albedoTex, normalMap: brandedS.normalTex, 
            roughnessMap: brandedS.roughTex, 
            normalScale: new THREE.Vector2(3.0, 3.0), // Massive normal boost for texture detail
            roughness: 1.0, 
            clearcoat: 0.05, clearcoatRoughness: 0.1, // Tiny glint of wet ink
            side: THREE.DoubleSide
        });

        plainMat = new THREE.MeshPhysicalMaterial({
            map: plainS.albedoTex, normalMap: plainS.normalTex,
            roughnessMap: plainS.roughTex, 
            normalScale: new THREE.Vector2(3.0, 3.0),
            roughness: 1.0, side: THREE.DoubleSide
        });

        // 1. Ground Surface (Dark Textured Workbench)
        const ground = new THREE.Mesh(new THREE.PlaneGeometry(40,40), new THREE.MeshPhysicalMaterial({ color: 0x333333, roughness: 0.8 }));
        ground.rotation.x = -Math.PI / 2; ground.position.y = -1.9; ground.receiveShadow = true;
        scene.add(ground);

        // 2. Master Box
        mainBoxGroup = new THREE.Group();
        scene.add(mainBoxGroup);

        const geo = (w,h,d) => {
            const sh = new THREE.Shape();
            const r = BEVEL_SIZE;
            sh.moveTo(-w/2+r, -h/2); sh.lineTo(w/2-r, -h/2);
            sh.absarc(w/2-r, -h/2+r, r, -Math.PI/2, 0, false);
            sh.lineTo(w/2, h/2-r); sh.absarc(w/2-r, h/2-r, r, 0, Math.PI/2, false);
            sh.lineTo(-w/2+r, h/2); sh.absarc(-w/2+r, h/2-r, r, Math.PI/2, Math.PI, false);
            sh.lineTo(-w/2, -h/2+r); sh.absarc(-w/2+r, -h/2+r, r, Math.PI, Math.PI*1.5, false);
            return new THREE.ExtrudeGeometry(sh, { depth: d, bevelEnabled: true, bevelThickness: 0.008, bevelSize: 0.008, bevelSegments: 3 });
        };

        const pGeo = geo(BOX_W, BOX_H, THICKNESS);
        const sGeo = geo(THICKNESS, BOX_H, BOX_D);
        const tGeo = geo(BOX_W, THICKNESS, BOX_D);

        // Walls
        const front = new THREE.Mesh(pGeo, brandedMat); 
        front.position.set(0, 0, BOX_D/2); front.castShadow = true; mainBoxGroup.add(front);
        const back = front.clone(); back.position.z = -BOX_D/2; mainBoxGroup.add(back);

        const left = new THREE.Mesh(sGeo, plainMat);
        left.position.set(-BOX_W/2, 0, 0); mainBoxGroup.add(left);
        const right = left.clone(); right.position.x = BOX_W/2; mainBoxGroup.add(right);

        const bottom = new THREE.Mesh(tGeo, plainMat);
        bottom.position.set(0, -BOX_H/2, 0); bottom.receiveShadow = true; mainBoxGroup.add(bottom);

        // Flaps
        flapPivotGroup = new THREE.Group(); flapPivotGroup.position.set(0, BOX_H/2, 0); mainBoxGroup.add(flapPivotGroup);
        const flapGeo = geo(BOX_W, THICKNESS, BOX_D * 0.495);
        const fPivot = new THREE.Group(); fPivot.position.set(0, 0, BOX_D/2);
        const fMesh = new THREE.Mesh(flapGeo, plainMat);
        fMesh.position.set(0, 0, -BOX_D*0.247); fPivot.add(fMesh);
        fPivot.rotation.x = -Math.PI/2 - 0.2; flapPivotGroup.add(fPivot);

        const bPivot = new THREE.Group(); bPivot.position.set(0, 0, -BOX_D/2);
        const bMesh = fMesh.clone(); bMesh.position.z = BOX_D*0.247;
        bPivot.add(bMesh); bPivot.rotation.x = Math.PI/2 + 0.2; flapPivotGroup.add(bPivot);
    }

    /* =========================================================
     *  ANIMATION
     * ========================================================= */

    function startLoop() {
        animationStart = performance.now();
        const frame = (now) => {
            animFrameId = requestAnimationFrame(frame);
            const swayY = Math.sin(now * 0.00015) * ROTATION_SWAY_Y;
            const swayX = Math.sin(now * 0.0001) * ROTATION_SWAY_X;
            if (!S.isDragging) { S.dragOffsetX *= DRAG_RETURN; S.dragOffsetY *= DRAG_RETURN; }
            S.targetRotX = S.baseRotX + swayX + S.dragOffsetX;
            S.targetRotY = S.baseRotY + swayY + S.dragOffsetY;
            S.rotX += (S.targetRotX - S.rotX) * DAMPING;
            S.rotY += (S.targetRotY - S.rotY) * DAMPING;
            if (mainBoxGroup) { mainBoxGroup.rotation.x = S.rotX; mainBoxGroup.rotation.y = S.rotY; }
            const elapsed = Math.max(0, now - animationStart);
            const cycle = (elapsed % REVEAL_CYCLE_MS) / REVEAL_CYCLE_MS;
            const reveal = (cycle > 0.4 && cycle < 0.8) ? Math.sin((cycle - 0.4)/0.4 * Math.PI) * REVEAL_PEAK : 0;
            if (flapPivotGroup && flapPivotGroup.children[0]) {
                flapPivotGroup.children[0].rotation.x = -Math.PI/2 - 0.2 + reveal * 3.5;
                flapPivotGroup.children[1].rotation.x = Math.PI/2 + 0.2 - reveal * 3.5;
            }
            renderer.render(scene, camera);
        };
        requestAnimationFrame(frame);
    }

    function setupInteraction() {
        container.addEventListener('pointerdown', (e) => {
            S.isDragging = true; S.prevMouse.x = e.clientX; S.prevMouse.y = e.clientY;
        });
        window.addEventListener('pointermove', (e) => {
            if (!S.isDragging) return;
            const dx = e.clientX - S.prevMouse.x;
            const dy = e.clientY - S.prevMouse.y;
            S.dragOffsetY = THREE.MathUtils.clamp(S.dragOffsetY + dx * 0.0018, -DRAG_LIMIT_Y, DRAG_LIMIT_Y);
            S.dragOffsetX = THREE.MathUtils.clamp(S.dragOffsetX + dy * 0.0012, -DRAG_LIMIT_X, DRAG_LIMIT_X);
            S.prevMouse.x = e.clientX; S.prevMouse.y = e.clientY;
        });
        window.addEventListener('pointerup', () => S.isDragging = false);
    }

    function onResize() {
        if (!container || !camera || !renderer) return;
        camera.aspect = container.clientWidth / container.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(container.clientWidth, container.clientHeight);
    }

    init();
})();

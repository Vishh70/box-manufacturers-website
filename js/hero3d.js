/**
 * @file Home Page 3D Hero Animation - Hyper-Realistic v5 (Photo-Ref)
 * @description Matches the specific branding, typography, and scene grounding 
 *              from the user's warehouse reference photo. 
 *              Includes: "AE" logo with arrows, professional subtext, 
 *              contact box, and a workbench surface.
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
        baseRotX: -0.28,
        baseRotY: 0.55,
        rotX: -0.28,
        rotY: 0.55,
        targetRotX: -0.28,
        targetRotY: 0.55,
        dragOffsetX: 0,
        dragOffsetY: 0
    };

    const DAMPING = 0.05;
    const ROTATION_SWAY_X = 0.02;
    const ROTATION_SWAY_Y = 0.06;
    const DRAG_RETURN = 0.95;
    const DRAG_LIMIT_X = 0.25;
    const DRAG_LIMIT_Y = 0.35;
    const REVEAL_CYCLE_MS = 14000;
    const REVEAL_PEAK = 0.15;

    // --- Scaling (Ref matches a standard big box) ---
    const BOX_W = 2.0;
    const BOX_H = 1.45;
    const BOX_D = 1.6;
    const THICKNESS = 0.045;
    const BEVEL_SIZE = 0.012;

    let container, scene, camera, renderer;
    let mainBoxGroup, secondaryBox, flapPivotGroup, insertPanel, insertMaterial;
    let animFrameId, animationStart = 0;

    // Shared Materials
    let outerMat, brandingMat, labelMat, tapeMat, workbenchMat;

    /* =========================================================
     *  PHOTO-REF TEXTURE GENERATORS
     * ========================================================= */

    /** Recreates the exact branding from the photo (Logo, Tagline, Address) */
    function createPhotoRefBrandingTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 1024; canvas.height = 1024;
        const ctx = canvas.getContext('2d');

        // Transparent base
        ctx.clearRect(0, 0, 1024, 1024);
        
        const logoColor = '#00264d'; // Dark Navy like the image
        ctx.fillStyle = logoColor;
        ctx.strokeStyle = logoColor;

        // 1. Draw "AE" stylized Logo (Left)
        // This is a simplified vector-like recreation of the logo in the image
        const lx = 120, ly = 300, ls = 280;
        
        ctx.save();
        ctx.translate(lx, ly);
        
        // The stylized "A"
        ctx.beginPath();
        ctx.moveTo(30, 150);
        ctx.lineTo(80, 20);
        ctx.lineTo(130, 150);
        ctx.lineWidth = 35;
        ctx.stroke();
        
        // The stylized "E" block and the 3 arrows
        ctx.fillRect(80, 50, 150, 25);
        ctx.fillRect(80, 95, 120, 25);
        ctx.fillRect(80, 140, 150, 25);
        
        // Swooshing Arrows (upward)
        ctx.lineWidth = 15;
        for(let i=0; i<3; i++) {
            ctx.beginPath();
            ctx.moveTo(20 + i*40, 180);
            ctx.quadraticCurveTo(60 + i*40, 140, 100 + i*60, 40);
            ctx.stroke();
            // Arrow head
            ctx.beginPath();
            ctx.moveTo(100 + i*60 - 15, 60);
            ctx.lineTo(100 + i*60, 40);
            ctx.lineTo(100 + i*60 + 5, 75);
            ctx.fill();
        }
        ctx.restore();

        // 2. Main Text "ARTI"
        ctx.font = 'bold 180px "Inter", Arial, sans-serif';
        ctx.fillText('ARTI', 420, 430);
        
        // 3. "ENTERPRISES"
        ctx.font = '700 85px "Inter", Arial, sans-serif';
        ctx.fillText('ENTERPRISES', 420, 520);

        // 4. "QUALITY PRODUCTS | RELIABLE SERVICE | EST. 2005"
        ctx.font = 'bold 32px "Inter", Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('QUALITY PRODUCTS | RELIABLE SERVICE | EST. 2005', 512, 600);

        // 5. Contact Block at bottom
        ctx.font = '300 24px "Inter", Arial, sans-serif';
        ctx.fillText('Head Office: 123 Industrial Area, Sector 4, City, State - Zip Code', 512, 750);
        ctx.fillText('Email: info@artienterprises.com | Web: www.artienterprises.com', 512, 790);
        ctx.font = 'bold 28px "Inter", Arial, sans-serif';
        ctx.fillText('Contact: +91 98765 43210', 512, 835);

        // Apply a slight blur/softness to simulate real print bleed
        ctx.filter = 'blur(0.5px)';

        const tex = new THREE.CanvasTexture(canvas);
        tex.anisotropy = 8;
        return tex;
    }

    /** Warm Kraft Paper Texture calibrated to the photo */
    function createV5KraftTexture() {
        const size = 1024;
        const canvas = document.createElement('canvas');
        canvas.width = size; canvas.height = size;
        const ctx = canvas.getContext('2d');

        // Base Kraft (Warmer, yellower than v4 to match photo)
        ctx.fillStyle = '#d4b483'; 
        ctx.fillRect(0, 0, size, size);

        // High frequency fibers
        ctx.globalAlpha = 0.15;
        for (let i = 0; i < 60000; i++) {
            const x = Math.random() * size, y = Math.random() * size;
            const l = Math.random() * 4 + 1;
            ctx.strokeStyle = `rgb(90, 70, 30)`;
            ctx.lineWidth = 0.2;
            ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + l, y + l); ctx.stroke();
        }

        // Subtile Corrugation lines
        ctx.globalAlpha = 0.05;
        ctx.fillStyle = '#000';
        for (let i = 0; i < 24; i++) {
            ctx.fillRect((i/24)*size, 0, 12, size);
        }

        const tex = new THREE.CanvasTexture(canvas);
        tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
        return tex;
    }

    /** Workbench surface texture */
    function createWorkbenchTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 512; canvas.height = 512;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#444'; // Plywood/Industrial gray
        ctx.fillRect(0, 0, 512, 512);
        
        // Wood grain/streaks
        ctx.globalAlpha = 0.2;
        ctx.strokeStyle = '#222';
        for (let i = 0; i < 100; i++) {
            ctx.lineWidth = Math.random() * 5;
            const y = Math.random() * 512;
            ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(512, y + (Math.random()-0.5)*20); ctx.stroke();
        }

        const tex = new THREE.CanvasTexture(canvas);
        tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
        tex.repeat.set(4, 4);
        return tex;
    }

    /* =========================================================
     *  GEOMETRY HELPERS
     * ========================================================= */

    function createBeveledPanelGeo(w, h, depth) {
        const shape = new THREE.Shape();
        const r = BEVEL_SIZE;
        shape.moveTo(-w / 2 + r, -h / 2);
        shape.lineTo(w / 2 - r, -h / 2);
        shape.absarc(w / 2 - r, -h / 2 + r, r, -Math.PI / 2, 0, false);
        shape.lineTo(w / 2, h / 2 - r);
        shape.absarc(w / 2 - r, h / 2 - r, r, 0, Math.PI / 2, false);
        shape.lineTo(-w / 2 + r, h / 2);
        shape.absarc(-w / 2 + r, h / 2 - r, r, Math.PI / 2, Math.PI, false);
        shape.lineTo(-w / 2, -h / 2 + r);
        shape.absarc(-w / 2 + r, -h / 2 + r, r, Math.PI, Math.PI * 1.5, false);

        return new THREE.ExtrudeGeometry(shape, {
            depth: depth, bevelEnabled: true, bevelThickness: 0.005, 
            bevelSize: 0.005, bevelSegments: 3
        });
    }

    /* =========================================================
     *  SCENE INITIALIZATION
     * ========================================================= */

    function init() {
        container = document.getElementById('hero3dCanvas');
        if (!container) return;

        scene = new THREE.Scene();

        camera = new THREE.PerspectiveCamera(28, container.clientWidth / container.clientHeight, 0.1, 1000);
        camera.position.set(4.2, 2.5, 7.5);
        camera.lookAt(0, 0.5, 0);

        renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setSize(container.clientWidth, container.clientHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.outputEncoding = THREE.sRGBEncoding;
        renderer.toneMapping = THREE.LinearToneMapping;
        renderer.toneMappingExposure = 1.0;
        renderer.shadowMap.enabled = !S.isMobile;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        container.appendChild(renderer.domElement);

        // Warm Lighting Rig (Warehouse Atmosphere)
        scene.add(new THREE.AmbientLight(0xfff8ee, 0.5));
        
        const key = new THREE.DirectionalLight(0xfff5e1, 1.3);
        key.position.set(-8, 10, 8);
        key.castShadow = !S.isMobile;
        key.shadow.mapSize.set(2048, 2048);
        key.shadow.radius = 4;
        scene.add(key);

        const fill = new THREE.PointLight(0xddeeff, 0.4);
        fill.position.set(5, 5, 5);
        scene.add(fill);

        buildScene();
        setupInteraction();
        startLoop();

        window.addEventListener('resize', onResize);
        onResize();
    }

    function buildScene() {
        const kraftTex = createV5KraftTexture();
        const brandingTex = createPhotoRefBrandingTexture();
        const workbenchTex = createWorkbenchTexture();

        outerMat = new THREE.MeshPhysicalMaterial({
            map: kraftTex, roughness: 0.95, metalness: 0,
            color: 0xffffff, side: THREE.DoubleSide
        });

        brandingMat = new THREE.MeshPhysicalMaterial({
            map: brandingTex, roughness: 1.0, metalness: 0, 
            transparent: true, opacity: 0.95, envMapIntensity: 0
        });

        workbenchMat = new THREE.MeshPhysicalMaterial({
            map: workbenchTex, roughness: 0.8, metalness: 0, color: 0x888888
        });

        // 1. Workbench Surface
        const bench = new THREE.Mesh(new THREE.PlaneGeometry(20, 20), workbenchMat);
        bench.rotation.x = -Math.PI / 2;
        bench.position.y = -1.5;
        bench.receiveShadow = true;
        scene.add(bench);

        // 2. Main Box Group
        mainBoxGroup = buildBox(true);
        mainBoxGroup.position.set(0, 0, 0);
        scene.add(mainBoxGroup);

        // 3. Branding Overlay (Front)
        const brandingMesh = new THREE.Mesh(new THREE.PlaneGeometry(BOX_W * 0.9, BOX_W * 0.9), brandingMat);
        brandingMesh.position.set(0, 0, BOX_D/2 + THICKNESS/2 + 0.002);
        mainBoxGroup.add(brandingMesh);

        // 4. Secondary Background Box
        secondaryBox = buildBox(false);
        secondaryBox.position.set(-1.8, -0.2, -2.5);
        secondaryBox.rotation.y = -0.6;
        secondaryBox.scale.set(0.9, 0.9, 0.9);
        scene.add(secondaryBox);
    }

    function buildBox(isMain) {
        const group = new THREE.Group();
        const panelGeo = createBeveledPanelGeo(BOX_W, BOX_H, THICKNESS);
        const topGeo = createBeveledPanelGeo(BOX_W, THICKNESS, BOX_D);

        // Walls
        const front = new THREE.Mesh(panelGeo, outerMat); 
        front.position.set(0, 0, BOX_D / 2); front.castShadow = true; group.add(front);
        const back = front.clone(); back.position.z = -BOX_D / 2; group.add(back);

        const sidePanel = createBeveledPanelGeo(THICKNESS, BOX_H, BOX_D);
        const left = new THREE.Mesh(sidePanel, outerMat); 
        left.position.set(-BOX_W/2, 0, 0); left.castShadow = true; group.add(left);
        const right = left.clone(); right.position.x = BOX_W/2; group.add(right);

        const bottom = new THREE.Mesh(topGeo, outerMat); 
        bottom.position.set(0, -BOX_H/2, 0); bottom.receiveShadow = true; group.add(bottom);

        // RSC Flaps (Top)
        if (isMain) {
            flapPivotGroup = new THREE.Group();
            flapPivotGroup.position.y = BOX_H / 2; group.add(flapPivotGroup);

            const fPivot = new THREE.Group(); fPivot.position.set(0, 0, BOX_D/2);
            const fMesh = new THREE.Mesh(createBeveledPanelGeo(BOX_W, THICKNESS, BOX_D * 0.48), outerMat);
            fMesh.position.set(0, 0, -BOX_D * 0.24); fMesh.castShadow = true;
            fPivot.add(fMesh); fPivot.rotation.x = -Math.PI/2 - 0.2; flapPivotGroup.add(fPivot);

            const bPivot = new THREE.Group(); bPivot.position.set(0, 0, -BOX_D/2);
            const bMesh = fMesh.clone(); bMesh.position.z = BOX_D * 0.24;
            bPivot.add(bMesh); bPivot.rotation.x = Math.PI/2 + 0.2; flapPivotGroup.add(bPivot);

            buildInsert(group);
        } else {
            const top = new THREE.Mesh(topGeo, outerMat);
            top.position.set(0, BOX_H/2, 0); group.add(top);
        }

        return group;
    }

    function buildInsert(group) {
        insertMaterial = new THREE.MeshPhysicalMaterial({ color: 0xecd7b2, transparent: true, opacity: 0.1 });
        insertPanel = new THREE.Mesh(new THREE.BoxGeometry(BOX_W * 0.85, 0.4, BOX_D * 0.8), insertMaterial);
        insertPanel.position.set(0, 0.1, 0); group.add(insertPanel);
    }

    /* =========================================================
     *  ANIMATION & INTERACTION
     * ========================================================= */

    function startLoop() {
        animationStart = performance.now();
        const frame = (now) => {
            animFrameId = requestAnimationFrame(frame);
            if (!S.isVisible) return;

            const swayY = Math.sin(now * 0.0002) * ROTATION_SWAY_Y;
            const swayX = Math.sin(now * 0.0001) * ROTATION_SWAY_X;

            if (!S.isDragging) {
                S.dragOffsetX *= DRAG_RETURN; S.dragOffsetY *= DRAG_RETURN;
            }

            S.targetRotX = S.baseRotX + swayX + S.dragOffsetX;
            S.targetRotY = S.baseRotY + swayY + S.dragOffsetY;
            S.rotX += (S.targetRotX - S.rotX) * DAMPING;
            S.rotY += (S.targetRotY - S.rotY) * DAMPING;

            if (mainBoxGroup) {
                mainBoxGroup.rotation.x = S.rotX; mainBoxGroup.rotation.y = S.rotY;
            }

            const elapsed = Math.max(0, now - animationStart);
            const cycle = (elapsed % REVEAL_CYCLE_MS) / REVEAL_CYCLE_MS;
            const reveal = (cycle > 0.3 && cycle < 0.7) ? Math.sin((cycle - 0.3)/0.4 * Math.PI) * REVEAL_PEAK : 0;
            
            if (flapPivotGroup && flapPivotGroup.children[0]) {
                flapPivotGroup.children[0].rotation.x = -Math.PI/2 - 0.2 + reveal * 3.5;
            }
            if (insertPanel) {
                insertPanel.position.y = 0.1 + reveal * 0.8;
                insertMaterial.opacity = 0.1 + reveal * 1.5;
            }

            renderer.render(scene, camera);
        };
        requestAnimationFrame(frame);
    }

    function setupInteraction() {
        container.addEventListener('pointerdown', (e) => {
            S.isDragging = true; S.isUserInteracting = true;
            S.prevMouse.x = e.clientX; S.prevMouse.y = e.clientY;
        });
        window.addEventListener('pointermove', (e) => {
            if (!S.isDragging) return;
            const dx = e.clientX - S.prevMouse.x;
            const dy = e.clientY - S.prevMouse.y;
            S.dragOffsetY = THREE.MathUtils.clamp(S.dragOffsetY + dx * 0.002, -DRAG_LIMIT_Y, DRAG_LIMIT_Y);
            S.dragOffsetX = THREE.MathUtils.clamp(S.dragOffsetX + dy * 0.0015, -DRAG_LIMIT_X, DRAG_LIMIT_X);
            S.prevMouse.x = e.clientX; S.prevMouse.y = e.clientY;
        });
        window.addEventListener('pointerup', () => S.isDragging = false);
    }

    function onResize() {
        if (!container || !camera || !renderer) return;
        S.isMobile = window.innerWidth < 768;
        camera.aspect = container.clientWidth / container.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(container.clientWidth, container.clientHeight);

        if (mainBoxGroup) {
            const scale = S.isMobile ? 0.7 : 1.0;
            mainBoxGroup.scale.set(scale, scale, scale);
            if(secondaryBox) secondaryBox.scale.set(scale * 0.9, scale * 0.9, scale * 0.9);
        }
    }

    init();
})();

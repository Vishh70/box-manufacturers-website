/**
 * @file Home Page 3D Hero Animation - Hyper-Realistic v4 (Warehouse Stack)
 * @description Features a multi-box composition with procedural shipping labels, 
 *              industrial icons (Fragile, Moisture), and real-world wear details.
 */

(function () {
    'use strict';

    if (typeof THREE === 'undefined') return;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // --- Global State ---
    const S = {
        isUserInteracting: false,
        isMobile: window.innerWidth < 768,
        isVisible: true,
        isDragging: false,
        prevMouse: { x: 0, y: 0 },
        baseRotX: -0.35,
        baseRotY: 0.65,
        rotX: -0.35,
        rotY: 0.65,
        targetRotX: -0.35,
        targetRotY: 0.65,
        dragOffsetX: 0,
        dragOffsetY: 0
    };

    const DAMPING = 0.05;
    const ROTATION_SWAY_X = 0.025;
    const ROTATION_SWAY_Y = 0.08;
    const DRAG_RETURN = 0.95;
    const DRAG_LIMIT_X = 0.22;
    const DRAG_LIMIT_Y = 0.32;
    const REVEAL_CYCLE_MS = 12000;
    const REVEAL_PEAK = 0.16;

    // --- Scaling ---
    const BOX_W = 1.8;
    const BOX_H = 0.52;
    const BOX_D = 1.15;
    const THICKNESS = 0.038;
    const BEVEL_SIZE = 0.008;

    let container, scene, camera, renderer, pmremGenerator;
    let mainBoxGroup, secondaryBox, flapPivotGroup, insertPanel, insertMaterial;
    let animFrameId, animationStart = 0;

    // Shared Materials
    let outerMat, labelMat, iconMat, tapeMat, edgeMat, shadowMat;

    /* =========================================================
     *  PROCEDURAL TEXTURE GENERATORS
     * ========================================================= */

    /** Creates a realistic shipping label with barcode and text */
    function createShippingLabelTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 512; canvas.height = 320;
        const ctx = canvas.getContext('2d');

        // White/Off-white paper
        ctx.fillStyle = '#fefefe';
        ctx.fillRect(0, 0, 512, 320);

        // Border
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 4;
        ctx.strokeRect(10, 10, 492, 300);

        // Header
        ctx.fillStyle = '#000';
        ctx.font = 'bold 36px Arial';
        ctx.fillText('PRIORITY MAIL', 30, 60);

        // Barcode (procedural lines)
        ctx.fillRect(30, 80, 452, 4); // Top line
        for (let i = 0; i < 40; i++) {
            const w = Math.random() * 8 + 2;
            const x = 30 + (i / 40) * 452;
            ctx.fillRect(x, 100, w, 80);
        }
        ctx.font = '20px monospace';
        ctx.fillText('1Z 999 555 01 2345 6789', 30, 200);

        // Address Lines
        ctx.font = '24px Arial';
        ctx.fillText('TO: ARTI ENTERPRISES', 30, 240);
        ctx.fillText('PUNE, MAHARASHTRA, INDIA', 30, 270);
        ctx.font = 'bold 32px Arial';
        ctx.fillText('H-08', 420, 290);

        const tex = new THREE.CanvasTexture(canvas);
        tex.anisotropy = 4;
        return tex;
    }

    /** Creates industrial print icons (Fragile, Handle with Care) */
    function createIndustrialIconsTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 512; canvas.height = 512;
        const ctx = canvas.getContext('2d');

        // Transparent background
        ctx.clearRect(0, 0, 512, 512);
        ctx.strokeStyle = '#333';
        ctx.fillStyle = '#333';
        ctx.lineWidth = 8;

        // 1. Fragile Glass Icon
        const x1 = 100, y1 = 100, s1 = 120;
        ctx.strokeRect(x1, y1 + 40, s1, s1 * 0.8); // Base
        ctx.beginPath(); // Stem
        ctx.moveTo(x1 + s1 / 2, y1 + s1 * 0.8 + 40);
        ctx.lineTo(x1 + s1 / 2, y1 + s1 + 80);
        ctx.moveTo(x1 + 30, y1 + s1 + 80);
        ctx.lineTo(x1 + s1 - 30, y1 + s1 + 80);
        ctx.stroke();

        // Crack line
        ctx.beginPath();
        ctx.moveTo(x1 + 40, y1 + 40);
        ctx.lineTo(x1 + 70, y1 + 90);
        ctx.lineTo(x1 + 50, y1 + 120);
        ctx.stroke();

        // 2. Protect from Moisture (Umbrella)
        const x2 = 300, y2 = 100, s2 = 140;
        ctx.beginPath();
        ctx.arc(x2 + s2 / 2, y2 + s2 / 2, s2 / 2, Math.PI, 0); // Top
        ctx.stroke();
        ctx.beginPath(); // Handle
        ctx.moveTo(x2 + s2 / 2, y2 + s2 / 2);
        ctx.lineTo(x2 + s2 / 2, y2 + s2 * 0.85);
        ctx.arc(x2 + s2 / 2 - 20, y2 + s2 * 0.85, 20, 0, Math.PI);
        ctx.stroke();

        // 3. This Way Up Arrows
        const x3 = 100, y3 = 350, s3 = 100;
        ctx.fillRect(x3, y3, 10, 80);
        ctx.fillRect(x3 + 50, y3, 10, 80);
        ctx.beginPath();
        ctx.moveTo(x3 - 10, y3 + 20); ctx.lineTo(x3 + 5, y3); ctx.lineTo(x3 + 20, y3 + 20);
        ctx.moveTo(x3 + 40, y3 + 20); ctx.lineTo(x3 + 55, y3); ctx.lineTo(x3 + 70, y3 + 20);
        ctx.stroke();

        // Branding Text
        ctx.font = 'bold 64px Arial';
        ctx.fillText('ARTI', 300, 420);
        ctx.font = '24px Arial';
        ctx.fillText('3-Ply Corrugated', 280, 460);

        const tex = new THREE.CanvasTexture(canvas);
        tex.anisotropy = 4;
        return tex;
    }

    /** Detailed Kraft Paper with wear and fibers */
    function createV4KraftTexture() {
        const size = 1024;
        const canvas = document.createElement('canvas');
        canvas.width = size; canvas.height = size;
        const ctx = canvas.getContext('2d');

        // Base Kraft
        ctx.fillStyle = '#c5a36b';
        ctx.fillRect(0, 0, size, size);

        // Fiber detail
        ctx.globalAlpha = 0.18;
        for (let i = 0; i < 50000; i++) {
            const x = Math.random() * size;
            const y = Math.random() * size;
            const l = Math.random() * 5 + 1;
            const a = Math.random() * Math.PI;
            ctx.strokeStyle = `rgb(100, 80, 40)`;
            ctx.lineWidth = 0.3;
            ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l);
            ctx.stroke();
        }

        // Stains & Handling Wear (Scuff marks)
        ctx.globalAlpha = 0.08;
        for (let i = 0; i < 25; i++) {
            const x = Math.random() * size, y = Math.random() * size;
            const r = 40 + Math.random() * 150;
            const g = ctx.createRadialGradient(x, y, 0, x, y, r);
            g.addColorStop(0, 'rgba(60, 40, 20, 0.4)');
            g.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = g; ctx.fillRect(0, 0, size, size);
        }

        // Corrugation ridges (Baked into diffuse)
        const ridges = 48;
        for (let i = 0; i < ridges; i++) {
            const x = (i / ridges) * size;
            ctx.fillStyle = i % 2 === 0 ? 'rgba(0,0,0,0.02)' : 'rgba(255,255,255,0.015)';
            ctx.fillRect(x, 0, 8, size);
        }

        const tex = new THREE.CanvasTexture(canvas);
        tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
        return tex;
    }

    /* =========================================================
     *  GEOMETRY & HELPERS
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
     *  SCENE CORE
     * ========================================================= */

    function init() {
        container = document.getElementById('hero3dCanvas');
        if (!container) return;

        scene = new THREE.Scene();

        camera = new THREE.PerspectiveCamera(30, container.clientWidth / container.clientHeight, 0.1, 100);
        camera.position.set(3.2, 1.6, 5.2);
        camera.lookAt(0.2, 0, 0);

        renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setSize(container.clientWidth, container.clientHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.outputEncoding = THREE.sRGBEncoding;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.15;
        renderer.shadowMap.enabled = !S.isMobile;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        container.appendChild(renderer.domElement);

        // Lighting Rig
        scene.add(new THREE.AmbientLight(0xfff8ee, 0.6));
        const key = new THREE.DirectionalLight(0xffedd2, 1.2);
        key.position.set(-5, 6, 8);
        key.castShadow = !S.isMobile;
        key.shadow.mapSize.set(1024, 1024);
        key.shadow.bias = -0.0005;
        scene.add(key);

        const fill = new THREE.DirectionalLight(0xddeeff, 0.4);
        fill.position.set(5, 2, 2);
        scene.add(fill);

        // Environment reflections
        const envCanvas = document.createElement('canvas');
        envCanvas.width = envCanvas.height = 256;
        const envCtx = envCanvas.getContext('2d');
        envCtx.fillStyle = '#222'; envCtx.fillRect(0, 0, 256, 256);
        envCtx.fillStyle = '#fff'; envCtx.fillRect(100, 0, 56, 128);
        const envTex = new THREE.CanvasTexture(envCanvas);
        envTex.mapping = THREE.EquirectangularReflectionMapping;
        scene.environment = envTex;

        buildSceneComposition();
        setupInteraction();
        startLoop();

        window.addEventListener('resize', onResize);
        onResize();
    }

    /* =========================================================
     *  BUILD WAREHOUSE STACK
     * ========================================================= */

    function buildSceneComposition() {
        const kraftTex = createV4KraftTexture();
        const labelTex = createShippingLabelTexture();
        const iconTex = createIndustrialIconsTexture();

        outerMat = new THREE.MeshPhysicalMaterial({
            map: kraftTex, color: 0xc5a36b, roughness: 0.9, metalness: 0,
            envMapIntensity: 0.4, side: THREE.DoubleSide
        });

        labelMat = new THREE.MeshPhysicalMaterial({
            map: labelTex, roughness: 0.7, metalness: 0, transparent: true, envMapIntensity: 0.2
        });

        iconMat = new THREE.MeshStandardMaterial({
            map: iconTex, transparent: true, opacity: 0.8
        });

        tapeMat = new THREE.MeshPhysicalMaterial({
            color: 0xccb58e, roughness: 0.3, transmission: 0.2, thickness: 0.02, transparent: true, opacity: 0.65
        });

        edgeMat = new THREE.MeshStandardMaterial({ color: 0x987a4d, roughness: 0.9 });

        // --- 1. Secondary Box (Static background box) ---
        secondaryBox = buildSingleBox(false, kraftTex);
        secondaryBox.position.set(-1.0, -0.28, -1.2);
        secondaryBox.rotation.y = -0.45;
        secondaryBox.scale.set(0.9, 0.9, 0.9);
        scene.add(secondaryBox);

        // --- 2. Main Animated Box ---
        mainBoxGroup = buildSingleBox(true, kraftTex);
        mainBoxGroup.position.set(0.2, 0, 0);
        scene.add(mainBoxGroup);

        // Add Label and Icons to Main Box
        const label = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.5), labelMat);
        label.position.set(BOX_W/2 + THICKNESS/2 + 0.005, 0, 0);
        label.rotation.y = Math.PI/2;
        mainBoxGroup.add(label);

        const icons = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.7), iconMat);
        icons.position.set(0, 0, BOX_D/2 + THICKNESS/2 + 0.005);
        mainBoxGroup.add(icons);

        // Ground Shadow
        if (!S.isMobile) {
            const ground = new THREE.Mesh(new THREE.PlaneGeometry(12, 12), new THREE.ShadowMaterial({ opacity: 0.18 }));
            ground.rotation.x = -Math.PI/2; ground.position.y = -1.3; ground.receiveShadow = true;
            scene.add(ground);
        }
    }

    function buildSingleBox(isMain, kraftTex) {
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

        // Flaps
        if (isMain) {
            flapPivotGroup = new THREE.Group();
            flapPivotGroup.position.y = BOX_H / 2; group.add(flapPivotGroup);

            const fPivot = new THREE.Group(); fPivot.position.set(0, 0, BOX_D/2);
            const fMesh = new THREE.Mesh(createBeveledPanelGeo(BOX_W, THICKNESS, BOX_D * 0.48), outerMat);
            fMesh.position.set(0, 0, -BOX_D * 0.24); fMesh.castShadow = true;
            fPivot.add(fMesh); fPivot.rotation.x = -Math.PI/2; flapPivotGroup.add(fPivot);

            const bPivot = new THREE.Group(); bPivot.position.set(0, 0, -BOX_D/2);
            const bMesh = fMesh.clone(); bMesh.position.z = BOX_D * 0.24;
            bPivot.add(bMesh); bPivot.rotation.x = Math.PI/2; flapPivotGroup.add(bPivot);

            buildInsert(group);
        } else {
            const top = new THREE.Mesh(topGeo, outerMat);
            top.position.set(0, BOX_H/2, 0); group.add(top);
        }

        // Tape
        const tape = new THREE.Mesh(new THREE.PlaneGeometry(BOX_W * 0.7, 0.08), tapeMat);
        tape.rotation.x = -Math.PI / 2; tape.position.set(0, BOX_H/2 + 0.02, 0);
        group.add(tape);

        return group;
    }

    function buildInsert(group) {
        insertMaterial = new THREE.MeshPhysicalMaterial({ color: 0xecd7b2, transparent: true, opacity: 0.05 });
        insertPanel = new THREE.Mesh(new THREE.BoxGeometry(BOX_W * 0.8, 0.15, BOX_D * 0.75), insertMaterial);
        insertPanel.position.set(0, 0.05, 0); group.add(insertPanel);
    }

    /* =========================================================
     *  ANIMATION
     * ========================================================= */

    function startLoop() {
        animationStart = performance.now();
        const frame = (now) => {
            animFrameId = requestAnimationFrame(frame);
            if (!S.isVisible) return;

            const swayY = Math.sin(now * 0.0003) * ROTATION_SWAY_Y;
            const swayX = Math.sin(now * 0.0002) * ROTATION_SWAY_X;

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

            // Animate reveal
            const elapsed = Math.max(0, now - animationStart);
            const cycle = (elapsed % REVEAL_CYCLE_MS) / REVEAL_CYCLE_MS;
            const reveal = (cycle > 0.4 && cycle < 0.8) ? Math.sin((cycle - 0.4)/0.4 * Math.PI) * REVEAL_PEAK : 0;
            
            if (flapPivotGroup && flapPivotGroup.children[0]) {
                flapPivotGroup.children[0].rotation.x = -Math.PI/2 + reveal * 3.2;
            }
            if (insertPanel) {
                insertPanel.position.y = 0.05 + reveal * 0.4;
                insertMaterial.opacity = 0.05 + reveal * 1.8;
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
            S.dragOffsetY = THREE.MathUtils.clamp(S.dragOffsetY + dx * 0.003, -DRAG_LIMIT_Y, DRAG_LIMIT_Y);
            S.dragOffsetX = THREE.MathUtils.clamp(S.dragOffsetX + dy * 0.002, -DRAG_LIMIT_X, DRAG_LIMIT_X);
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

        if (mainBoxGroup && secondaryBox) {
            const scale = S.isMobile ? 0.85 : 1.05;
            mainBoxGroup.scale.set(scale, scale, scale);
            secondaryBox.scale.set(scale * 0.85, scale * 0.85, scale * 0.85);
            mainBoxGroup.position.x = S.isMobile ? 0 : 0.2;
        }
    }

    init();
})();

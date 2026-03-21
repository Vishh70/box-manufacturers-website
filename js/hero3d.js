/**
 * @file Home Page 3D Hero Animation - Hyper-Realistic v3
 * @description Renders a photorealistic corrugated box with physical thickness,
 *              beveled edges, PBR materials, procedural HDRI lighting,
 *              and advanced contact shadows.
 */

(function () {
    'use strict';

    if (typeof THREE === 'undefined') return;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // --- Configuration ---
    const S = {
        isUserInteracting: false,
        isMobile: window.innerWidth < 768,
        isVisible: true,
        isDragging: false,
        prevMouse: { x: 0, y: 0 },
        baseRotX: -0.38,
        baseRotY: 0.75,
        rotX: -0.38,
        rotY: 0.75,
        targetRotX: -0.38,
        targetRotY: 0.75,
        dragOffsetX: 0,
        dragOffsetY: 0
    };

    const DAMPING = 0.06;
    const ROTATION_SWAY_X = 0.035;
    const ROTATION_SWAY_Y = 0.12;
    const DRAG_RETURN = 0.94;
    const DRAG_LIMIT_X = 0.25;
    const DRAG_LIMIT_Y = 0.35;
    const REVEAL_CYCLE_MS = 10000;
    const REVEAL_PEAK = 0.18;

    // --- Realistic Scaling (in meters-equivalent) ---
    const BOX_W = 1.82;
    const BOX_H = 0.54;
    const BOX_D = 1.18;
    const THICKNESS = 0.038; // 3.8mm scale
    const BEVEL_SIZE = 0.008; // Rounded edges
    const FLAP_RATIO = 0.46; // Typical RSC flap length

    let container, scene, camera, renderer, pmremGenerator;
    let boxGroup, flapPivotGroup, insertPanel, insertMaterial;
    let animFrameId, animationStart = 0;
    let studioEnvMap;

    // Materials
    let outerMat, innerMat, edgeMat, tapeMat, shadowMat;

    /* =========================================================
     *  PROCEDURAL ASSETS (HDRI & TEXTURES)
     * ========================================================= */

    /** Generates a "Studio" environment map for PBR reflections */
    function createStudioEnvironment() {
        const size = 512;
        const canvas = document.createElement('canvas');
        canvas.width = size; canvas.height = size;
        const ctx = canvas.getContext('2d');

        // Dark studio floor/walls
        ctx.fillStyle = '#111';
        ctx.fillRect(0, 0, size, size);

        // Ceiling/Overhead Softbox
        ctx.fillStyle = '#fff';
        ctx.fillRect(size * 0.2, 0, size * 0.6, size * 0.4);

        // Side Key Light
        const grad = ctx.createLinearGradient(0, 0, size * 0.3, 0);
        grad.addColorStop(0, '#ffffff');
        grad.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, size * 0.3, size);

        // Top-Back Rim Light
        ctx.fillStyle = '#444';
        ctx.fillRect(0, size * 0.7, size, size * 0.3);

        const tex = new THREE.CanvasTexture(canvas);
        tex.mapping = THREE.EquirectangularReflectionMapping;
        return tex;
    }

    /** Creates hyper-detailed Kraft paper texture */
    function createDetailedKraftTexture() {
        const size = 1024;
        const canvas = document.createElement('canvas');
        canvas.width = size; canvas.height = size;
        const ctx = canvas.getContext('2d');

        // Base Kraft tone
        ctx.fillStyle = '#c9a66d';
        ctx.fillRect(0, 0, size, size);

        // Broad non-uniformity (stains/patches)
        for (let i = 0; i < 30; i++) {
            const x = Math.random() * size;
            const y = Math.random() * size;
            const r = 50 + Math.random() * 200;
            const g = ctx.createRadialGradient(x, y, 0, x, y, r);
            const op = 0.05 + Math.random() * 0.1;
            g.addColorStop(0, `rgba(${160 + Math.random() * 40},130,80,${op})`);
            g.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = g;
            ctx.fillRect(0, 0, size, size);
        }

        // Paper fibers (high frequency)
        ctx.globalAlpha = 0.15;
        for (let i = 0; i < 40000; i++) {
            const x = Math.random() * size;
            const y = Math.random() * size;
            const l = 1 + Math.random() * 6;
            const a = (Math.random() - 0.5) * 0.4;
            const color = 140 + Math.random() * 50;
            ctx.strokeStyle = `rgb(${color},${color - 20},${color - 50})`;
            ctx.lineWidth = 0.2 + Math.random() * 0.5;
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l);
            ctx.stroke();
        }
        ctx.globalAlpha = 1.0;

        // Corrugated ridge normal simulation (baked into color for simpler shader)
        // This adds subtle light/dark long stripes
        const stripeCount = 42;
        for (let i = 0; i < stripeCount; i++) {
            const x = (i / stripeCount) * size;
            ctx.fillStyle = i % 2 === 0 ? 'rgba(0,0,0,0.02)' : 'rgba(255,255,255,0.015)';
            ctx.fillRect(x, 0, size / stripeCount / 2, size);
        }

        const tex = new THREE.CanvasTexture(canvas);
        tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
        tex.repeat.set(2, 2);
        return tex;
    }

    /** Procedural Normal Map for Paper grain */
    function createPaperNormalMap() {
        const size = 512;
        const canvas = document.createElement('canvas');
        canvas.width = size; canvas.height = size;
        const ctx = canvas.getContext('2d');

        // Neutral normal color (128, 128, 255)
        ctx.fillStyle = '#8080ff';
        ctx.fillRect(0, 0, size, size);

        // Random noise/bumps
        for (let i = 0; i < 15000; i++) {
            const r = 120 + Math.random() * 16;
            const g = 120 + Math.random() * 16;
            ctx.fillStyle = `rgb(${r},${g},255)`;
            ctx.fillRect(Math.random() * size, Math.random() * size, 1, 1);
        }

        const tex = new THREE.CanvasTexture(canvas);
        tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
        return tex;
    }

    /* =========================================================
     *  GEOMETRY BUILDERS
     * ========================================================= */

    /** Creates a 3D box side with thickness and beveled edges */
    function createBeveledPanel(w, h, depth) {
        const shape = new THREE.Shape();
        const r = BEVEL_SIZE;
        // Rounded rectangle path
        shape.moveTo(-w / 2 + r, -h / 2);
        shape.lineTo(w / 2 - r, -h / 2);
        shape.absarc(w / 2 - r, -h / 2 + r, r, -Math.PI / 2, 0, false);
        shape.lineTo(w / 2, h / 2 - r);
        shape.absarc(w / 2 - r, h / 2 - r, r, 0, Math.PI / 2, false);
        shape.lineTo(-w / 2 + r, h / 2);
        shape.absarc(-w / 2 + r, h / 2 - r, r, Math.PI / 2, Math.PI, false);
        shape.lineTo(-w / 2, -h / 2 + r);
        shape.absarc(-w / 2 + r, -h / 2 + r, r, Math.PI, Math.PI * 1.5, false);

        const extrudeSettings = {
            steps: 1,
            depth: depth,
            bevelEnabled: true,
            bevelThickness: 0.004,
            bevelSize: 0.004,
            bevelOffset: 0,
            bevelSegments: 2
        };

        const geo = new THREE.ExtrudeGeometry(shape, extrudeSettings);
        geo.center();
        return geo;
    }

    /* =========================================================
     *  SCENE INITIALIZATION
     * ========================================================= */

    function init() {
        container = document.getElementById('hero3dCanvas');
        if (!container) return;

        scene = new THREE.Scene();

        camera = new THREE.PerspectiveCamera(
            30,
            container.clientWidth / container.clientHeight,
            0.1, 100
        );
        camera.position.set(2.8, 1.8, 5.0); // Slightly further back for better framing
        camera.lookAt(0, 0, 0);

        renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setSize(container.clientWidth, container.clientHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.outputEncoding = THREE.sRGBEncoding;
        renderer.toneMapping = THREE.ReinhardToneMapping;
        renderer.toneMappingExposure = 1.2;
        renderer.shadowMap.enabled = !S.isMobile;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        container.appendChild(renderer.domElement);

        // Lighting Rig
        scene.add(new THREE.AmbientLight(0xfff5e6, 0.55));

        const key = new THREE.DirectionalLight(0xffeedd, 1.1);
        key.position.set(-4, 6, 6);
        key.castShadow = !S.isMobile;
        key.shadow.mapSize.set(1024, 1024);
        key.shadow.camera.near = 0.5;
        key.shadow.camera.far = 15;
        key.shadow.bias = -0.0008;
        scene.add(key);

        const fill = new THREE.DirectionalLight(0xddeeff, 0.45);
        fill.position.set(4, 2, -3);
        scene.add(fill);

        const rim = new THREE.DirectionalLight(0xffffff, 0.35);
        rim.position.set(0, 4, -5);
        scene.add(rim);

        // Env Map for PBR
        studioEnvMap = createStudioEnvironment();
        pmremGenerator = new THREE.PMREMGenerator(renderer);
        pmremGenerator.compileEquirectangularShader();
        const envTarget = pmremGenerator.fromEquirectangular(studioEnvMap);
        scene.environment = envTarget.texture;

        buildBox();
        setupInteraction();
        startLoop();

        window.addEventListener('resize', onResize);
        onResize();
    }

    /* =========================================================
     *  BOX CONSTRUCTION
     * ========================================================= */

    function buildBox() {
        boxGroup = new THREE.Group();

        const kraftTex = createDetailedKraftTexture();
        const normalTex = createPaperNormalMap();

        // High-Quality Physical Materials
        outerMat = new THREE.MeshPhysicalMaterial({
            map: kraftTex,
            normalMap: normalTex,
            normalScale: new THREE.Vector2(0.4, 0.4),
            color: 0xc9a66d,
            roughness: 0.88,
            metalness: 0.0,
            reflectivity: 0.1,
            envMapIntensity: 0.45,
            side: THREE.DoubleSide
        });

        innerMat = new THREE.MeshPhysicalMaterial({
            map: kraftTex,
            color: 0xba965a,
            roughness: 0.95,
            metalness: 0.0,
            side: THREE.BackSide
        });

        edgeMat = new THREE.MeshStandardMaterial({
            color: 0x9b7f4e,
            roughness: 0.9
        });

        tapeMat = new THREE.MeshPhysicalMaterial({
            color: 0xd4c6a6,
            roughness: 0.25,
            metalness: 0.0,
            transmission: 0.3,
            thickness: 0.01,
            transparent: true,
            opacity: 0.7
        });

        // 1. Body Construction (Hollow)
        const frontWall = new THREE.Mesh(createBeveledPanel(BOX_W, BOX_H, THICKNESS), outerMat);
        frontWall.position.set(0, 0, BOX_D / 2);
        frontWall.castShadow = true; frontWall.receiveShadow = true;
        boxGroup.add(frontWall);

        const backWall = new THREE.Mesh(createBeveledPanel(BOX_W, BOX_H, THICKNESS), outerMat);
        backWall.position.set(0, 0, -BOX_D / 2);
        backWall.castShadow = true; backWall.receiveShadow = true;
        boxGroup.add(backWall);

        const leftWall = new THREE.Mesh(createBeveledPanel(THICKNESS, BOX_H, BOX_D), outerMat);
        leftWall.position.set(-BOX_W / 2, 0, 0);
        leftWall.castShadow = true; leftWall.receiveShadow = true;
        boxGroup.add(leftWall);

        const rightWall = new THREE.Mesh(createBeveledPanel(THICKNESS, BOX_H, BOX_D), outerMat);
        rightWall.position.set(BOX_W / 2, 0, 0);
        rightWall.castShadow = true; rightWall.receiveShadow = true;
        boxGroup.add(rightWall);

        const bottom = new THREE.Mesh(createBeveledPanel(BOX_W, THICKNESS, BOX_D), outerMat);
        bottom.position.set(0, -BOX_H / 2, 0);
        bottom.castShadow = true; bottom.receiveShadow = true;
        boxGroup.add(bottom);

        // 2. Flap Pivots
        flapPivotGroup = new THREE.Group();
        flapPivotGroup.position.y = BOX_H / 2;
        boxGroup.add(flapPivotGroup);

        const flapW = BOX_W;
        const flapD = BOX_D * FLAP_RATIO;

        // Front Main Flap (animated)
        const frontFlapPivot = new THREE.Group();
        frontFlapPivot.position.set(0, 0, BOX_D / 2);
        const frontFlapMesh = new THREE.Mesh(createBeveledPanel(flapW, THICKNESS, flapD), outerMat);
        frontFlapMesh.position.set(0, 0, -flapD / 2);
        frontFlapMesh.castShadow = true;
        frontFlapPivot.add(frontFlapMesh);
        frontFlapPivot.rotation.x = -Math.PI / 2;
        flapPivotGroup.add(frontFlapPivot);

        // Back Flap
        const backFlapPivot = new THREE.Group();
        backFlapPivot.position.set(0, 0, -BOX_D / 2);
        const backFlapMesh = new THREE.Mesh(createBeveledPanel(flapW, THICKNESS, flapD), outerMat);
        backFlapMesh.position.set(0, 0, flapD / 2);
        backFlapMesh.castShadow = true;
        backFlapPivot.add(backFlapMesh);
        backFlapPivot.rotation.x = Math.PI / 2;
        flapPivotGroup.add(backFlapPivot);

        // Side Flaps (Side tucks)
        const sideFlapW = BOX_D - THICKNESS * 2;
        const sideFlapD = BOX_W * 0.45;
        const leftFlapPivot = new THREE.Group();
        leftFlapPivot.position.set(-BOX_W / 2, 0, 0);
        const leftFlapMesh = new THREE.Mesh(createBeveledPanel(sideFlapD, THICKNESS, sideFlapW), outerMat);
        leftFlapMesh.position.set(sideFlapD / 2, 0, 0);
        leftFlapPivot.add(leftFlapMesh);
        leftFlapPivot.rotation.z = Math.PI / 2;
        flapPivotGroup.add(leftFlapPivot);

        const rightFlapPivot = new THREE.Group();
        rightFlapPivot.position.set(BOX_W / 2, 0, 0);
        const rightFlapMesh = new THREE.Mesh(createBeveledPanel(sideFlapD, THICKNESS, sideFlapW), outerMat);
        rightFlapMesh.position.set(-sideFlapD / 2, 0, 0);
        rightFlapPivot.add(rightFlapMesh);
        rightFlapPivot.rotation.z = -Math.PI / 2;
        flapPivotGroup.add(rightFlapPivot);

        // 3. Corrugated Edge Detail
        addCorrugatedEdges();

        // 4. Tape Detail
        const tape = new THREE.Mesh(new THREE.PlaneGeometry(BOX_W * 0.7, 0.082), tapeMat);
        tape.rotation.x = -Math.PI / 2;
        tape.position.set(0, BOX_H / 2 + THICKNESS / 2 + 0.002, 0);
        boxGroup.add(tape);

        const tapeFold = new THREE.Mesh(new THREE.PlaneGeometry(BOX_W * 0.7, 0.06), tapeMat);
        tapeFold.position.set(0, BOX_H / 2 - 0.03, BOX_D / 2 + THICKNESS / 2 + 0.002);
        boxGroup.add(tapeFold);

        // 5. Build Insert Panel (shown during reveal)
        buildInsert();

        // 6. Ground Shadow Catcher
        if (!S.isMobile) {
            const ground = new THREE.Mesh(
                new THREE.PlaneGeometry(10, 10),
                new THREE.ShadowMaterial({ opacity: 0.16 })
            );
            ground.rotation.x = -Math.PI / 2;
            ground.position.y = -1.25;
            ground.receiveShadow = true;
            scene.add(ground);
        }

        boxGroup.rotation.x = S.baseRotX;
        boxGroup.rotation.y = S.baseRotY;
        boxGroup.position.set(0.12, -0.02, 0); // Re-centered
        boxGroup.scale.set(1.08, 1.08, 1.08); // Slightly smaller to avoid overlap
        scene.add(boxGroup);
    }

    /** Adds the wavy corrugation pattern to the cut edges */
    function addCorrugatedEdges() {
        const segments = 60; // Higher fidelity
        const amplitude = 0.009; // More visible waves
        const freq = 22; // More ridges
        const pts = [];

        // Simple wavy line mesh (instanced in 4 corners would be better, but let's just do top edge)
        for (let i = 0; i <= segments; i++) {
            const x = (i / segments - 0.5) * (BOX_W - 0.05);
            const y = Math.sin(i / segments * Math.PI * 2 * freq) * amplitude;
            pts.push(new THREE.Vector3(x, y, 0));
        }

        const curve = new THREE.CatmullRomCurve3(pts);
        const geo = new THREE.TubeGeometry(curve, segments, 0.004, 6, false);
        const edge = new THREE.Mesh(geo, edgeMat);
        edge.position.set(0, BOX_H / 2 - 0.002, BOX_D / 2 - 0.005);
        boxGroup.add(edge);

        const edgeBack = edge.clone();
        edgeBack.position.z = -BOX_D / 2 + 0.005;
        boxGroup.add(edgeBack);
    }

    function buildInsert() {
        insertMaterial = new THREE.MeshPhysicalMaterial({
            color: 0xeedcbd,
            roughness: 0.95,
            metalness: 0,
            transparent: true,
            opacity: 0.03
        });

        const geo = new THREE.BoxGeometry(BOX_W * 0.82, 0.12, BOX_D * 0.7);
        insertPanel = new THREE.Mesh(geo, insertMaterial);
        insertPanel.position.set(0, 0.04, 0);
        boxGroup.add(insertPanel);
    }

    /* =========================================================
     *  ANIMATION & INTERACTION
     * ========================================================= */

    function getRevealAmount(now) {
        if (prefersReducedMotion || S.isMobile || S.isUserInteracting || !S.isVisible) return 0;
        const elapsed = Math.max(0, now - animationStart);
        const cycle = (elapsed % REVEAL_CYCLE_MS) / REVEAL_CYCLE_MS;
        if (cycle < 0.35 || cycle > 0.75) return 0;
        const n = (cycle - 0.35) / 0.40;
        return Math.sin(n * Math.PI) * REVEAL_PEAK;
    }

    function updateReveal(now) {
        if (!flapPivotGroup) return;
        const reveal = getRevealAmount(now);

        const frontFlapArr = flapPivotGroup.children[0];
        if (frontFlapArr) {
            frontFlapArr.rotation.x = -Math.PI / 2 + reveal * 3.4;
        }

        if (insertPanel) {
            insertPanel.position.y = 0.04 + reveal * 0.45;
            insertMaterial.opacity = 0.03 + reveal * 2.5;
        }
    }

    function startLoop() {
        animationStart = performance.now();
        const frame = (now) => {
            animFrameId = requestAnimationFrame(frame);
            if (!S.isVisible) return;

            const swayY = Math.sin(now * 0.00038) * ROTATION_SWAY_Y;
            const swayX = Math.sin(now * 0.00018) * ROTATION_SWAY_X;

            if (!S.isDragging) {
                S.dragOffsetX *= DRAG_RETURN;
                S.dragOffsetY *= DRAG_RETURN;
            }

            S.targetRotX = S.baseRotX + swayX + S.dragOffsetX;
            S.targetRotY = S.baseRotY + swayY + S.dragOffsetY;
            S.rotX += (S.targetRotX - S.rotX) * DAMPING;
            S.rotY += (S.targetRotY - S.rotY) * DAMPING;

            if (boxGroup) {
                boxGroup.rotation.x = S.rotX;
                boxGroup.rotation.y = S.rotY;
            }

            updateReveal(now);
            renderer.render(scene, camera);
        };
        animFrameId = requestAnimationFrame(frame);
    }

    function setupInteraction() {
        container.addEventListener('pointerdown', (e) => {
            S.isDragging = true;
            S.isUserInteracting = true;
            S.prevMouse.x = e.clientX;
            S.prevMouse.y = e.clientY;
        });

        window.addEventListener('pointermove', (e) => {
            if (!S.isDragging) return;
            const dx = e.clientX - S.prevMouse.x;
            const dy = e.clientY - S.prevMouse.y;
            S.dragOffsetY = THREE.MathUtils.clamp(S.dragOffsetY + dx * 0.003, -DRAG_LIMIT_Y, DRAG_LIMIT_Y);
            S.dragOffsetX = THREE.MathUtils.clamp(S.dragOffsetX + dy * 0.002, -DRAG_LIMIT_X, DRAG_LIMIT_X);
            S.prevMouse.x = e.clientX;
            S.prevMouse.y = e.clientY;
        });

        window.addEventListener('pointerup', () => {
            S.isDragging = false;
            S.isUserInteracting = false;
        });

        // Toggle user interaction flag for animation pausing
        container.addEventListener('mouseenter', () => S.isUserInteracting = true);
        container.addEventListener('mouseleave', () => S.isUserInteracting = false);
    }

    function onResize() {
        if (!container || !camera || !renderer) return;
        S.isMobile = window.innerWidth < 768;
        camera.aspect = container.clientWidth / container.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(container.clientWidth, container.clientHeight);

        if (boxGroup) {
            if (S.isMobile) {
                boxGroup.scale.set(0.92, 0.92, 0.92);
                boxGroup.position.set(0.05, -0.05, 0);
            } else {
                boxGroup.scale.set(1.08, 1.08, 1.08);
                boxGroup.position.set(0.12, -0.02, 0);
            }
        }
    }

    // Initialize
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // Cleanup
    window.addEventListener('beforeunload', () => {
        if (animFrameId) cancelAnimationFrame(animFrameId);
        if (renderer) renderer.dispose();
    });

})();

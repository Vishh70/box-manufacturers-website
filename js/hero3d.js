/**
 * @file Home Page 3D Hero Animation
 * @description Renders a hyper-realistic corrugated RSC box with proper flaps,
 *              kraft paper texture, corrugation details, fold creases, and tape.
 */

(function () {
    'use strict';

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const S = {
        isUserInteracting: false,
        isMobile: window.innerWidth < 768,
        isVisible: true,
        isDragging: false,
        prevMouse: { x: 0, y: 0 },
        baseRotX: -0.40,
        baseRotY: 0.78,
        rotX: -0.40,
        rotY: 0.78,
        targetRotX: -0.40,
        targetRotY: 0.78,
        dragOffsetX: 0,
        dragOffsetY: 0
    };

    const DAMPING = 0.07;
    const ROTATION_SWAY_X = 0.04;
    const ROTATION_SWAY_Y = 0.15;
    const DRAG_RETURN = 0.93;
    const DRAG_LIMIT_X = 0.28;
    const DRAG_LIMIT_Y = 0.38;
    const REVEAL_CYCLE_MS = 9500;
    const REVEAL_PEAK = 0.16;

    /* ---- Box Dimensions (realistic proportions) ---- */
    const BW = 1.8;   // body width (X)
    const BH = 0.52;  // body height (Y)
    const BD = 1.15;   // body depth (Z)
    const WALL = 0.035; // wall thickness
    const FLAP_H = BD * 0.45; // flap length (about half the depth)

    let container, scene, camera, renderer;
    let boxGroup, lidFlapGroup, insertPanel, insertMaterial;
    let animFrameId, animationStart = 0;
    let kraftMat, darkKraftMat, insideMat, tapeMat;

    /* =========================================================
     *  PROCEDURAL TEXTURES
     * ========================================================= */

    function createKraftTexture(size) {
        size = size || 512;
        const c = document.createElement('canvas');
        c.width = size; c.height = size;
        const ctx = c.getContext('2d');

        // Base kraft colour
        ctx.fillStyle = '#c4a265';
        ctx.fillRect(0, 0, size, size);

        // Subtle broad colour variation (patches)
        for (let i = 0; i < 18; i++) {
            const x = Math.random() * size;
            const y = Math.random() * size;
            const r = 30 + Math.random() * 100;
            const g = ctx.createRadialGradient(x, y, 0, x, y, r);
            const tone = Math.random() > 0.5 ? 'rgba(180,148,90,' : 'rgba(210,178,120,';
            g.addColorStop(0, tone + (0.06 + Math.random() * 0.08) + ')');
            g.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = g;
            ctx.fillRect(0, 0, size, size);
        }

        // Fine fiber strands (horizontal-ish)
        for (let i = 0; i < 16000; i++) {
            const x = Math.random() * size;
            const y = Math.random() * size;
            const len = 3 + Math.random() * 9;
            const angle = (Math.random() - 0.5) * 0.55;
            const base = 135 + Math.floor(Math.random() * 48);
            ctx.strokeStyle = `rgba(${base},${base - 20},${base - 50},${0.05 + Math.random() * 0.12})`;
            ctx.lineWidth = 0.3 + Math.random() * 0.8;
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(x + Math.cos(angle) * len, y + Math.sin(angle) * len);
            ctx.stroke();
        }

        // Occasional darker specks (natural paper imperfections)
        for (let i = 0; i < 600; i++) {
            ctx.fillStyle = `rgba(${80 + Math.random() * 40},${60 + Math.random() * 30},${30 + Math.random() * 20},${0.08 + Math.random() * 0.15})`;
            ctx.fillRect(Math.random() * size, Math.random() * size, 1 + Math.random() * 2.5, 1 + Math.random() * 2.5);
        }

        const tex = new THREE.CanvasTexture(c);
        tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
        tex.repeat.set(2.5, 2.5);
        return tex;
    }

    function createBumpMap(size) {
        size = size || 512;
        const c = document.createElement('canvas');
        c.width = size; c.height = size;
        const ctx = c.getContext('2d');

        // Neutral grey base
        ctx.fillStyle = '#808080';
        ctx.fillRect(0, 0, size, size);

        // Corrugation ridges (vertical sine waves)
        const ridges = 32;
        for (let i = 0; i < ridges; i++) {
            const x = (i / ridges) * size;
            const w = size / ridges;
            // Alternating light/dark stripes for ridge effect
            ctx.fillStyle = i % 2 === 0 ? '#999' : '#666';
            ctx.fillRect(x, 0, w, size);
        }

        // Subtle random noise for paper grain
        for (let i = 0; i < 8000; i++) {
            const v = 100 + Math.floor(Math.random() * 56);
            ctx.fillStyle = `rgb(${v},${v},${v})`;
            ctx.fillRect(Math.random() * size, Math.random() * size, 1, 1);
        }

        const tex = new THREE.CanvasTexture(c);
        tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
        tex.repeat.set(4, 4);
        return tex;
    }

    /* =========================================================
     *  SCENE SETUP
     * ========================================================= */

    function setupScene() {
        scene = new THREE.Scene();

        camera = new THREE.PerspectiveCamera(
            32,
            container.clientWidth / container.clientHeight,
            0.1, 100
        );
        camera.position.set(2.7, 1.8, 4.6);
        camera.lookAt(0, 0.08, 0);

        renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setSize(container.clientWidth, container.clientHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.outputEncoding = THREE.sRGBEncoding;
        renderer.shadowMap.enabled = !S.isMobile;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.05;
        container.appendChild(renderer.domElement);

        /* -- Lights (product-photography style) -- */
        scene.add(new THREE.AmbientLight(0xfff8ef, 0.50));

        const keyLight = new THREE.DirectionalLight(0xfff4dc, 1.0);
        keyLight.position.set(-3.5, 5.2, 5.5);
        keyLight.castShadow = !S.isMobile;
        keyLight.shadow.mapSize.set(1024, 1024);
        keyLight.shadow.camera.near = 0.5;
        keyLight.shadow.camera.far = 14;
        keyLight.shadow.camera.left = -3;
        keyLight.shadow.camera.right = 3;
        keyLight.shadow.camera.top = 3;
        keyLight.shadow.camera.bottom = -3;
        keyLight.shadow.bias = -0.001;
        scene.add(keyLight);

        const fill = new THREE.DirectionalLight(0xdce8ff, 0.40);
        fill.position.set(3.8, 2, -2.8);
        scene.add(fill);

        const rim = new THREE.DirectionalLight(0xfff0d0, 0.30);
        rim.position.set(-1.5, 3.5, -4);
        scene.add(rim);

        const bottomBounce = new THREE.DirectionalLight(0xffe8c8, 0.15);
        bottomBounce.position.set(0, -2, 2);
        scene.add(bottomBounce);

        /* -- Ground shadow plane -- */
        if (!S.isMobile) {
            const ground = new THREE.Mesh(
                new THREE.PlaneGeometry(10, 10),
                new THREE.ShadowMaterial({ opacity: 0.13 })
            );
            ground.rotation.x = -Math.PI / 2;
            ground.position.y = -1.2;
            ground.position.z = 0.2;
            ground.receiveShadow = true;
            scene.add(ground);
        }
    }

    /* =========================================================
     *  MATERIALS
     * ========================================================= */

    function createMaterials() {
        const kraftTex = createKraftTexture(512);
        const bumpTex = createBumpMap(512);

        kraftMat = new THREE.MeshStandardMaterial({
            map: kraftTex,
            bumpMap: bumpTex,
            bumpScale: 0.025,
            color: 0xc4a265,
            roughness: 0.78,
            metalness: 0.0
        });

        darkKraftMat = new THREE.MeshStandardMaterial({
            map: kraftTex,
            bumpMap: bumpTex,
            bumpScale: 0.02,
            color: 0xab8a4a,
            roughness: 0.85,
            metalness: 0.0
        });

        insideMat = new THREE.MeshStandardMaterial({
            map: kraftTex,
            bumpMap: bumpTex,
            bumpScale: 0.015,
            color: 0xbfa05d,
            roughness: 0.92,
            metalness: 0.0,
            side: THREE.BackSide
        });

        tapeMat = new THREE.MeshStandardMaterial({
            color: 0xd4c399,
            roughness: 0.38,
            metalness: 0.02,
            transparent: true,
            opacity: 0.72
        });

        insertMaterial = new THREE.MeshStandardMaterial({
            color: 0xe3d6b6,
            roughness: 0.9,
            metalness: 0,
            transparent: true,
            opacity: prefersReducedMotion ? 0 : 0.02
        });
    }

    /* =========================================================
     *  BOX CONSTRUCTION
     * ========================================================= */

    function buildBox() {
        boxGroup = new THREE.Group();
        createMaterials();

        buildBody();
        buildFlaps();
        buildCorrugatedEdge();
        buildFoldCreases();
        buildTapeStrip();
        addEdgeLines();
        buildInsertPanel();

        boxGroup.rotation.x = S.baseRotX;
        boxGroup.rotation.y = S.baseRotY;
        boxGroup.position.set(0.18, -0.05, 0);
        boxGroup.scale.set(1.1, 1.1, 1.1);

        scene.add(boxGroup);
    }

    /* --- Body (hollow open-top box) --- */
    function buildBody() {
        // Front wall
        const frontG = new THREE.BoxGeometry(BW, BH, WALL);
        const front = new THREE.Mesh(frontG, kraftMat);
        front.position.set(0, 0, BD / 2);
        front.castShadow = true; front.receiveShadow = true;
        boxGroup.add(front);

        // Back wall
        const back = new THREE.Mesh(frontG, kraftMat);
        back.position.set(0, 0, -BD / 2);
        back.castShadow = true; back.receiveShadow = true;
        boxGroup.add(back);

        // Left wall
        const sideG = new THREE.BoxGeometry(WALL, BH, BD);
        const left = new THREE.Mesh(sideG, kraftMat);
        left.position.set(-BW / 2, 0, 0);
        left.castShadow = true; left.receiveShadow = true;
        boxGroup.add(left);

        // Right wall
        const right = new THREE.Mesh(sideG, kraftMat);
        right.position.set(BW / 2, 0, 0);
        right.castShadow = true; right.receiveShadow = true;
        boxGroup.add(right);

        // Bottom
        const bottomG = new THREE.BoxGeometry(BW, WALL, BD);
        const bottom = new THREE.Mesh(bottomG, kraftMat);
        bottom.position.set(0, -BH / 2, 0);
        bottom.castShadow = true; bottom.receiveShadow = true;
        boxGroup.add(bottom);

        // Inner faces (darker for depth)
        const innerFront = new THREE.Mesh(new THREE.PlaneGeometry(BW - WALL * 2, BH - WALL), darkKraftMat);
        innerFront.position.set(0, WALL / 2, BD / 2 - WALL - 0.001);
        boxGroup.add(innerFront);

        const innerBack = new THREE.Mesh(new THREE.PlaneGeometry(BW - WALL * 2, BH - WALL), darkKraftMat);
        innerBack.position.set(0, WALL / 2, -(BD / 2 - WALL - 0.001));
        innerBack.rotation.y = Math.PI;
        boxGroup.add(innerBack);

        const innerLeft = new THREE.Mesh(new THREE.PlaneGeometry(BD - WALL * 2, BH - WALL), darkKraftMat);
        innerLeft.position.set(-BW / 2 + WALL + 0.001, WALL / 2, 0);
        innerLeft.rotation.y = Math.PI / 2;
        boxGroup.add(innerLeft);

        const innerRight = new THREE.Mesh(new THREE.PlaneGeometry(BD - WALL * 2, BH - WALL), darkKraftMat);
        innerRight.position.set(BW / 2 - WALL - 0.001, WALL / 2, 0);
        innerRight.rotation.y = -Math.PI / 2;
        boxGroup.add(innerRight);
    }

    /* --- RSC Flaps (4 flaps with pivot hinges at top of walls) --- */
    function buildFlaps() {
        lidFlapGroup = new THREE.Group();
        lidFlapGroup.position.y = BH / 2;
        boxGroup.add(lidFlapGroup);

        // Front flap (main closing flap — the one that animates)
        const flapFrontPivot = new THREE.Group();
        flapFrontPivot.position.set(0, 0, BD / 2);
        const flapFrontMesh = new THREE.Mesh(
            new THREE.BoxGeometry(BW, WALL, FLAP_H),
            kraftMat
        );
        flapFrontMesh.position.set(0, WALL / 2, -FLAP_H / 2);
        flapFrontMesh.castShadow = true;
        flapFrontPivot.add(flapFrontMesh);

        // Inner face of front flap
        const flapFrontInner = new THREE.Mesh(
            new THREE.PlaneGeometry(BW - 0.02, FLAP_H - 0.02),
            darkKraftMat
        );
        flapFrontInner.position.set(0, 0, -FLAP_H / 2);
        flapFrontInner.rotation.x = Math.PI / 2;
        flapFrontPivot.add(flapFrontInner);

        // Close the front flap (folded flat — will animate open)
        flapFrontPivot.rotation.x = -Math.PI / 2;
        flapFrontPivot.userData = { type: 'frontFlap' };
        lidFlapGroup.add(flapFrontPivot);

        // Back flap (closed flat)
        const flapBackPivot = new THREE.Group();
        flapBackPivot.position.set(0, 0, -BD / 2);
        const flapBackMesh = new THREE.Mesh(
            new THREE.BoxGeometry(BW, WALL, FLAP_H),
            kraftMat
        );
        flapBackMesh.position.set(0, WALL / 2, FLAP_H / 2);
        flapBackMesh.castShadow = true;
        flapBackPivot.add(flapBackMesh);
        flapBackPivot.rotation.x = Math.PI / 2;
        lidFlapGroup.add(flapBackPivot);

        // Left side flap (shorter tuck flap)
        const tuckFlapW = BD * 0.44;
        const flapLeftPivot = new THREE.Group();
        flapLeftPivot.position.set(-BW / 2, 0, 0);
        const flapLeftMesh = new THREE.Mesh(
            new THREE.BoxGeometry(tuckFlapW, WALL, BD - WALL * 2),
            kraftMat
        );
        flapLeftMesh.position.set(tuckFlapW / 2, WALL / 2, 0);
        flapLeftMesh.castShadow = true;
        flapLeftPivot.add(flapLeftMesh);
        flapLeftPivot.rotation.z = Math.PI / 2;
        lidFlapGroup.add(flapLeftPivot);

        // Right side flap (shorter tuck flap)
        const flapRightPivot = new THREE.Group();
        flapRightPivot.position.set(BW / 2, 0, 0);
        const flapRightMesh = new THREE.Mesh(
            new THREE.BoxGeometry(tuckFlapW, WALL, BD - WALL * 2),
            kraftMat
        );
        flapRightMesh.position.set(-tuckFlapW / 2, WALL / 2, 0);
        flapRightMesh.castShadow = true;
        flapRightPivot.add(flapRightMesh);
        flapRightPivot.rotation.z = -Math.PI / 2;
        lidFlapGroup.add(flapRightPivot);
    }

    /* --- Corrugated edge visible on the top of walls --- */
    function buildCorrugatedEdge() {
        // Show corrugation pattern on the cut top edge (front wall)
        const segments = 36;
        const edgeW = BW - 0.04;
        const amplitude = 0.008;
        const verts = [];
        const indices = [];

        for (let row = 0; row < 2; row++) {
            const z = BD / 2 - WALL + row * WALL;
            for (let i = 0; i <= segments; i++) {
                const t = i / segments;
                const x = -edgeW / 2 + t * edgeW;
                const y = BH / 2 + Math.sin(t * Math.PI * 18) * amplitude;
                verts.push(x, y, z);
            }
        }

        for (let i = 0; i < segments; i++) {
            const a = i, b = i + 1;
            const c = segments + 1 + i, d = c + 1;
            indices.push(a, b, c, b, d, c);
        }

        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
        geo.setIndex(indices);
        geo.computeVertexNormals();

        const corrEdge = new THREE.Mesh(geo, darkKraftMat);
        corrEdge.castShadow = true;
        boxGroup.add(corrEdge);

        // Same for back wall
        const corrEdgeBack = corrEdge.clone();
        corrEdgeBack.position.z = -(BD - WALL);
        boxGroup.add(corrEdgeBack);
    }

    /* --- Fold creases on the body --- */
    function buildFoldCreases() {
        const creaseMat = new THREE.MeshStandardMaterial({
            color: 0x9d8450,
            roughness: 0.95,
            metalness: 0,
            transparent: true,
            opacity: 0.18
        });

        // Horizontal crease line near top of body
        const creaseH = new THREE.Mesh(
            new THREE.PlaneGeometry(BW + 0.01, 0.006),
            creaseMat
        );
        creaseH.position.set(0, BH / 2 - 0.005, BD / 2 + 0.002);
        boxGroup.add(creaseH);

        const creaseH2 = creaseH.clone();
        creaseH2.position.z = -(BD / 2 + 0.002);
        boxGroup.add(creaseH2);

        // Vertical fold creases at body corners (subtle)
        const creaseV = new THREE.Mesh(
            new THREE.PlaneGeometry(0.005, BH),
            creaseMat
        );
        // Front-left corner
        const cfl = creaseV.clone();
        cfl.position.set(-BW / 2, 0, BD / 2 + 0.002);
        boxGroup.add(cfl);
        // Front-right corner
        const cfr = creaseV.clone();
        cfr.position.set(BW / 2, 0, BD / 2 + 0.002);
        boxGroup.add(cfr);
    }

    /* --- Tape strip across the top seam --- */
    function buildTapeStrip() {
        const tapeWidth = 0.08;
        const tape = new THREE.Mesh(
            new THREE.BoxGeometry(BW * 0.75, 0.003, tapeWidth),
            tapeMat
        );
        // Position on top of front flap (which is folded shut at top)
        tape.position.set(0, BH / 2 + WALL + 0.003, 0);
        tape.castShadow = true;
        boxGroup.add(tape);

        // Front overhanging tape
        const tapeFront = new THREE.Mesh(
            new THREE.BoxGeometry(BW * 0.75, 0.07, 0.003),
            tapeMat
        );
        tapeFront.position.set(0, BH / 2 + WALL - 0.032, BD / 2 + 0.002);
        boxGroup.add(tapeFront);
    }

    /* --- Edge highlight lines --- */
    function addEdgeLines() {
        const edgeMat = new THREE.LineBasicMaterial({
            color: 0x8b6f3a,
            transparent: true,
            opacity: 0.30
        });

        // Body outline
        const bodyEdges = new THREE.LineSegments(
            new THREE.EdgesGeometry(new THREE.BoxGeometry(BW, BH, BD)),
            edgeMat
        );
        boxGroup.add(bodyEdges);
    }

    /* --- Inner corrugated insert panel (for reveal animation) --- */
    function buildInsertPanel() {
        insertPanel = new THREE.Mesh(
            createCorrugationGeometry(BW * 0.82, 0.14, BD * 0.7),
            insertMaterial
        );
        insertPanel.position.set(0, 0.05, 0);
        insertPanel.rotation.x = 0.02;
        insertPanel.castShadow = true;
        boxGroup.add(insertPanel);
    }

    function createCorrugationGeometry(width, height, depth) {
        const segments = 32;
        const rows = 5;
        const amplitude = height * 0.38;
        const frequency = 9;
        const verts = [];
        const indices = [];
        const halfW = width / 2;
        const halfD = depth / 2;

        for (let row = 0; row <= rows; row++) {
            const z = -halfD + (row / rows) * depth;
            for (let i = 0; i <= segments; i++) {
                const x = -halfW + (i / segments) * width;
                const y = Math.sin((i / segments) * Math.PI * 2 * frequency) * amplitude;
                verts.push(x, y, z);
            }
        }

        for (let row = 0; row < rows; row++) {
            for (let i = 0; i < segments; i++) {
                const a = row * (segments + 1) + i;
                const b = a + 1;
                const c = a + segments + 1;
                const d = c + 1;
                indices.push(a, b, c, b, d, c);
            }
        }

        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
        geo.setIndex(indices);
        geo.computeVertexNormals();
        return geo;
    }

    /* =========================================================
     *  REVEAL ANIMATION (flap peek)
     * ========================================================= */

    function getRevealAmount(now) {
        if (prefersReducedMotion || S.isMobile || S.isUserInteracting || !S.isVisible) return 0;

        const elapsed = Math.max(0, now - animationStart);
        const cycle = (elapsed % REVEAL_CYCLE_MS) / REVEAL_CYCLE_MS;
        if (cycle < 0.34 || cycle > 0.7) return 0;

        const normalized = (cycle - 0.34) / 0.36;
        return Math.sin(normalized * Math.PI) * REVEAL_PEAK;
    }

    function updateReveal(now) {
        if (!lidFlapGroup || !insertPanel || !insertMaterial) return;

        const reveal = getRevealAmount(now);

        // Animate front flap opening
        const frontFlap = lidFlapGroup.children[0]; // front flap pivot
        if (frontFlap) {
            // Base closed = -PI/2, open slightly
            frontFlap.rotation.x = -Math.PI / 2 + reveal * 3.2;
        }

        // Slight lift on the whole flap group
        lidFlapGroup.position.y = BH / 2 + reveal * 0.08;

        // Show insert panel on reveal
        insertPanel.position.y = 0.05 + reveal * 0.35;
        insertPanel.rotation.x = 0.02 + reveal * 0.12;
        insertMaterial.opacity = prefersReducedMotion ? 0 : 0.02 + reveal * 2.2;
    }

    /* =========================================================
     *  RENDER LOOP
     * ========================================================= */

    function renderOnce() {
        renderer.render(scene, camera);
    }

    function startLoop() {
        animationStart = performance.now();

        function frame(now) {
            animFrameId = requestAnimationFrame(frame);
            if (!S.isVisible) return;

            const swayY = Math.sin(now * 0.00042) * ROTATION_SWAY_Y;
            const swayX = Math.sin(now * 0.00021) * ROTATION_SWAY_X;

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
        }

        animFrameId = requestAnimationFrame(frame);
    }

    /* =========================================================
     *  INTERACTION
     * ========================================================= */

    function setupInteraction() {
        container.addEventListener('mouseenter', function () {
            S.isUserInteracting = true;
        });

        container.addEventListener('mouseleave', function () {
            S.isUserInteracting = false;
            S.isDragging = false;
        });

        container.addEventListener('pointerdown', function (e) {
            S.isDragging = true;
            S.isUserInteracting = true;
            S.prevMouse.x = e.clientX;
            S.prevMouse.y = e.clientY;
        });

        window.addEventListener('pointermove', function (e) {
            if (!S.isDragging) return;
            const dx = e.clientX - S.prevMouse.x;
            const dy = e.clientY - S.prevMouse.y;
            S.dragOffsetY = THREE.MathUtils.clamp(S.dragOffsetY + dx * 0.0035, -DRAG_LIMIT_Y, DRAG_LIMIT_Y);
            S.dragOffsetX = THREE.MathUtils.clamp(S.dragOffsetX + dy * 0.0025, -DRAG_LIMIT_X, DRAG_LIMIT_X);
            S.prevMouse.x = e.clientX;
            S.prevMouse.y = e.clientY;
        });

        window.addEventListener('pointerup', function () {
            S.isDragging = false;
            S.isUserInteracting = false;
        });

        container.addEventListener('touchstart', function () {
            S.isUserInteracting = true;
        }, { passive: true });

        container.addEventListener('touchend', function () {
            S.isUserInteracting = false;
        }, { passive: true });
    }

    /* =========================================================
     *  RESIZE / VISIBILITY
     * ========================================================= */

    function onResize() {
        if (!container || !camera || !renderer) return;

        S.isMobile = window.innerWidth < 768;
        camera.aspect = container.clientWidth / container.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(container.clientWidth, container.clientHeight);

        if (boxGroup) {
            if (S.isMobile) {
                boxGroup.position.set(0.06, -0.04, 0);
                boxGroup.scale.set(0.92, 0.92, 0.92);
            } else {
                boxGroup.position.set(0.18, -0.05, 0);
                boxGroup.scale.set(1.1, 1.1, 1.1);
            }
        }

        renderOnce();
    }

    function setupResizeObserver() {
        if (typeof ResizeObserver === 'undefined') {
            window.addEventListener('resize', onResize);
            return;
        }
        new ResizeObserver(onResize).observe(container);
    }

    function setupVisibilityAPI() {
        document.addEventListener('visibilitychange', function () {
            S.isVisible = !document.hidden;
        });
    }

    /* =========================================================
     *  BOOT
     * ========================================================= */

    function init() {
        container = document.getElementById('hero3dCanvas');
        if (!container || typeof THREE === 'undefined') return;

        setupScene();
        buildBox();
        renderOnce();

        if (!prefersReducedMotion) {
            startLoop();
            setupInteraction();
        }

        setupResizeObserver();
        setupVisibilityAPI();
    }

    function boot() {
        init();
        onResize();
    }

    window.addEventListener('beforeunload', function () {
        if (animFrameId) cancelAnimationFrame(animFrameId);
        if (renderer) {
            renderer.dispose();
            renderer.forceContextLoss();
        }
    });

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot);
    } else {
        boot();
    }
})();

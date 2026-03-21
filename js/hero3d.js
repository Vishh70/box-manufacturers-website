/**
 * @file Home Page 3D Hero Animation
 * @description Renders a premium closed corrugated box with a subtle lid reveal.
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
        baseRotX: -0.42,
        baseRotY: 0.82,
        rotX: -0.42,
        rotY: 0.82,
        targetRotX: -0.42,
        targetRotY: 0.82,
        dragOffsetX: 0,
        dragOffsetY: 0
    };

    const DAMPING = 0.08;
    const ROTATION_SWAY_X = 0.05;
    const ROTATION_SWAY_Y = 0.18;
    const DRAG_RETURN = 0.92;
    const DRAG_LIMIT_X = 0.28;
    const DRAG_LIMIT_Y = 0.38;
    const REVEAL_CYCLE_MS = 9500;
    const REVEAL_PEAK = 0.14;

    let container = null;
    let scene = null;
    let camera = null;
    let renderer = null;
    let boxGroup = null;
    let lidGroup = null;
    let insertPanel = null;
    let insertMaterial = null;
    let animFrameId = null;
    let animationStart = 0;
    let bodyBaseY = -0.08;
    let lidBaseY = 0.25;

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

    function createKraftTexture() {
        const size = 256;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');

        ctx.fillStyle = '#c7a56d';
        ctx.fillRect(0, 0, size, size);

        for (let i = 0; i < 11000; i++) {
            const x = Math.random() * size;
            const y = Math.random() * size;
            const len = 2 + Math.random() * 6;
            const angle = (Math.random() - 0.5) * 0.65;
            const base = 142 + Math.floor(Math.random() * 38);
            ctx.strokeStyle = `rgba(${base},${base - 18},${base - 44},${0.06 + Math.random() * 0.12})`;
            ctx.lineWidth = 0.4 + Math.random() * 0.7;
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(x + Math.cos(angle) * len, y + Math.sin(angle) * len);
            ctx.stroke();
        }

        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(2.2, 2.2);
        return texture;
    }

    function setupScene() {
        scene = new THREE.Scene();

        camera = new THREE.PerspectiveCamera(
            34,
            container.clientWidth / container.clientHeight,
            0.1,
            100
        );
        camera.position.set(2.55, 1.6, 4.4);
        camera.lookAt(0, 0.12, 0);

        renderer = new THREE.WebGLRenderer({
            antialias: true,
            alpha: true
        });
        renderer.setSize(container.clientWidth, container.clientHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.outputEncoding = THREE.sRGBEncoding;
        renderer.shadowMap.enabled = !S.isMobile;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        container.appendChild(renderer.domElement);

        scene.add(new THREE.AmbientLight(0xffffff, 0.56));

        const key = new THREE.DirectionalLight(0xfff7ea, 0.92);
        key.position.set(-3.2, 4.6, 5.2);
        key.castShadow = !S.isMobile;
        key.shadow.mapSize.set(1024, 1024);
        key.shadow.camera.near = 0.5;
        key.shadow.camera.far = 12;
        key.shadow.camera.left = -3;
        key.shadow.camera.right = 3;
        key.shadow.camera.top = 3;
        key.shadow.camera.bottom = -3;
        scene.add(key);

        const fill = new THREE.DirectionalLight(0xd9e8ff, 0.35);
        fill.position.set(3.5, 1.8, -2.5);
        scene.add(fill);

        const rim = new THREE.DirectionalLight(0xffffff, 0.25);
        rim.position.set(0, 3.5, -4.5);
        scene.add(rim);

        if (!S.isMobile) {
            const ground = new THREE.Mesh(
                new THREE.PlaneGeometry(9, 9),
                new THREE.ShadowMaterial({ opacity: 0.11 })
            );
            ground.rotation.x = -Math.PI / 2;
            ground.position.y = -1.15;
            ground.position.z = 0.2;
            ground.receiveShadow = true;
            scene.add(ground);
        }
    }

    function buildBox() {
        boxGroup = new THREE.Group();

        const kraftTexture = createKraftTexture();
        const kraftMaterial = new THREE.MeshStandardMaterial({
            map: kraftTexture,
            color: 0xc7a56d,
            roughness: 0.82,
            metalness: 0
        });
        const darkKraftMaterial = new THREE.MeshStandardMaterial({
            map: kraftTexture,
            color: 0xb58f56,
            roughness: 0.88,
            metalness: 0
        });
        insertMaterial = new THREE.MeshStandardMaterial({
            color: 0xe3d6b6,
            roughness: 0.9,
            metalness: 0,
            transparent: true,
            opacity: prefersReducedMotion ? 0 : 0.02
        });

        const body = new THREE.Mesh(new THREE.BoxGeometry(1.85, 0.46, 1.18), kraftMaterial);
        body.position.y = bodyBaseY;
        body.castShadow = true;
        body.receiveShadow = true;
        boxGroup.add(body);

        const cavity = new THREE.Mesh(new THREE.BoxGeometry(1.63, 0.21, 0.96), darkKraftMaterial);
        cavity.position.set(0, 0.07, 0);
        cavity.castShadow = true;
        cavity.receiveShadow = true;
        boxGroup.add(cavity);

        lidGroup = new THREE.Group();
        lidGroup.position.y = lidBaseY;

        const lidTop = new THREE.Mesh(new THREE.BoxGeometry(1.86, 0.045, 1.2), kraftMaterial);
        lidTop.castShadow = true;
        lidTop.receiveShadow = true;
        lidGroup.add(lidTop);

        const seam = new THREE.Mesh(new THREE.BoxGeometry(1.76, 0.012, 0.028), darkKraftMaterial);
        seam.position.y = 0.02;
        lidGroup.add(seam);

        const frontLip = new THREE.Mesh(new THREE.BoxGeometry(1.86, 0.08, 0.04), darkKraftMaterial);
        frontLip.position.set(0, -0.04, 0.58);
        frontLip.castShadow = true;
        lidGroup.add(frontLip);

        const rearLip = new THREE.Mesh(new THREE.BoxGeometry(1.86, 0.08, 0.04), darkKraftMaterial);
        rearLip.position.set(0, -0.04, -0.58);
        rearLip.castShadow = true;
        lidGroup.add(rearLip);

        boxGroup.add(lidGroup);

        insertPanel = new THREE.Mesh(createCorrugationPanel(1.52, 0.16, 0.82), insertMaterial);
        insertPanel.position.set(0, 0.08, 0);
        insertPanel.rotation.x = 0.02;
        insertPanel.castShadow = true;
        boxGroup.add(insertPanel);

        addEdgeLines(boxGroup);

        boxGroup.rotation.x = S.baseRotX;
        boxGroup.rotation.y = S.baseRotY;
        boxGroup.position.set(0.18, -0.05, 0);
        boxGroup.scale.set(1.12, 1.12, 1.12);

        scene.add(boxGroup);
    }

    function addEdgeLines(target) {
        const edgeMaterial = new THREE.LineBasicMaterial({
            color: 0x9d7f4b,
            transparent: true,
            opacity: 0.75
        });

        const lineMeshes = [
            new THREE.LineSegments(
                new THREE.EdgesGeometry(new THREE.BoxGeometry(1.85, 0.46, 1.18)),
                edgeMaterial
            ),
            new THREE.LineSegments(
                new THREE.EdgesGeometry(new THREE.BoxGeometry(1.86, 0.045, 1.2)),
                edgeMaterial
            )
        ];

        lineMeshes[0].position.y = bodyBaseY;
        lineMeshes[1].position.y = lidBaseY;

        lineMeshes.forEach(function (mesh) {
            target.add(mesh);
        });
    }

    function createCorrugationPanel(width, height, depth) {
        const segments = 28;
        const rows = 4;
        const amplitude = height * 0.36;
        const frequency = 8;
        const vertices = [];
        const indices = [];
        const halfW = width / 2;
        const halfD = depth / 2;

        for (let row = 0; row <= rows; row++) {
            const z = -halfD + (row / rows) * depth;
            for (let i = 0; i <= segments; i++) {
                const x = -halfW + (i / segments) * width;
                const y = Math.sin((i / segments) * Math.PI * 2 * frequency) * amplitude;
                vertices.push(x, y, z);
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

        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
        geometry.setIndex(indices);
        geometry.computeVertexNormals();
        return geometry;
    }

    function getRevealAmount(now) {
        if (prefersReducedMotion || S.isMobile || S.isUserInteracting || !S.isVisible) return 0;

        const elapsed = Math.max(0, now - animationStart);
        const cycle = (elapsed % REVEAL_CYCLE_MS) / REVEAL_CYCLE_MS;
        if (cycle < 0.34 || cycle > 0.7) return 0;

        const normalized = (cycle - 0.34) / 0.36;
        const pulse = Math.sin(normalized * Math.PI);
        return pulse * REVEAL_PEAK;
    }

    function updateReveal(now) {
        if (!lidGroup || !insertPanel || !insertMaterial) return;

        const reveal = getRevealAmount(now);
        lidGroup.position.y = lidBaseY + reveal * 0.72;
        lidGroup.rotation.z = reveal * -0.12;
        lidGroup.rotation.x = reveal * -0.55;

        insertPanel.position.y = 0.08 + reveal * 0.42;
        insertPanel.rotation.x = 0.02 + reveal * 0.15;
        insertMaterial.opacity = prefersReducedMotion ? 0 : 0.02 + reveal * 1.9;
    }

    function renderOnce() {
        renderer.render(scene, camera);
    }

    function startLoop() {
        animationStart = performance.now();

        function frame(now) {
            animFrameId = requestAnimationFrame(frame);
            if (!S.isVisible) return;

            const swayY = Math.sin(now * 0.00045) * ROTATION_SWAY_Y;
            const swayX = Math.sin(now * 0.00023) * ROTATION_SWAY_X;

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

    function onResize() {
        if (!container || !camera || !renderer) return;

        S.isMobile = window.innerWidth < 768;
        camera.aspect = container.clientWidth / container.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(container.clientWidth, container.clientHeight);

        if (S.isMobile) {
            boxGroup.position.set(0.06, -0.04, 0);
            boxGroup.scale.set(0.95, 0.95, 0.95);
        } else {
            boxGroup.position.set(0.18, -0.05, 0);
            boxGroup.scale.set(1.12, 1.12, 1.12);
        }

        renderOnce();
    }

    function setupResizeObserver() {
        if (typeof ResizeObserver === 'undefined') {
            window.addEventListener('resize', onResize);
            return;
        }

        const observer = new ResizeObserver(onResize);
        observer.observe(container);
    }

    function setupVisibilityAPI() {
        document.addEventListener('visibilitychange', function () {
            S.isVisible = !document.hidden;
        });
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

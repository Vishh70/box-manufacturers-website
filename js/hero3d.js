/* ============================================
   Home Page 3D Hero Animation
   Three.js + GSAP — Auto-rotating box with
   periodic exploded layer reveal
   ============================================ */

(function () {
    'use strict';

    /* ── SAFETY: reduced motion preference ── */
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    /* ── STATE ── */
    const S = {
        isExploded: false,
        isUserInteracting: false,
        isMobile: window.innerWidth < 768,
        isVisible: true,
        rotY: 0.5,
        rotX: -0.25,
        targetRotY: 0.5,
        targetRotX: -0.25,
        isDragging: false,
        prevMouse: { x: 0, y: 0 }
    };

    const ROTATION_SPEED = 0.003;  // radians per frame (~20s full turn)
    const DAMPING = 0.06;
    const EXPLODE_INTERVAL = 15000; // ms
    const EXPLODE_HOLD = 4000;      // ms

    let scene, camera, renderer, boxGroup;
    let topLiner, fluteMesh, bottomLiner;
    let topLinerBaseY, fluteBaseY, bottomLinerBaseY;
    let labelEls = [];
    let explodeTimeline = null;
    let explodeTimer = null;
    let container = null;
    let animFrameId = null;

    /* ── INIT ── */
    function init() {
        container = document.getElementById('hero3dCanvas');
        if (!container) return;

        try {
            setupScene();
            buildBox();
            renderOnce(); // first frame immediately, no blank

            if (!prefersReducedMotion) {
                startLoop();
                if (!S.isMobile) {
                    scheduleExplode();
                }
                setupInteraction();
            }

            setupResizeObserver();
            setupVisibilityAPI();
        } catch (e) {
            console.warn('Hero 3D: init failed', e);
        }
    }

    /* ── KRAFT TEXTURE ── */
    function createKraftTexture() {
        const sz = 256;
        const c = document.createElement('canvas');
        c.width = sz; c.height = sz;
        const ctx = c.getContext('2d');
        ctx.fillStyle = '#c4a06a';
        ctx.fillRect(0, 0, sz, sz);

        for (let i = 0; i < 8000; i++) {
            const x = Math.random() * sz;
            const y = Math.random() * sz;
            const len = 2 + Math.random() * 5;
            const ang = (Math.random() - 0.5) * 0.4;
            const b = 150 + Math.floor(Math.random() * 50);
            ctx.strokeStyle = `rgba(${b},${b - 20},${b - 50},${0.06 + Math.random() * 0.1})`;
            ctx.lineWidth = 0.5 + Math.random() * 0.5;
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(x + Math.cos(ang) * len, y + Math.sin(ang) * len);
            ctx.stroke();
        }

        const tex = new THREE.CanvasTexture(c);
        tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
        tex.repeat.set(2, 2);
        return tex;
    }

    /* ── SCENE ── */
    function setupScene() {
        scene = new THREE.Scene();
        // Transparent — CSS gradient is the hero background

        camera = new THREE.PerspectiveCamera(
            38,
            container.clientWidth / container.clientHeight,
            0.1, 100
        );
        camera.position.set(2.5, 1.8, 4);
        camera.lookAt(0, 0, 0);

        renderer = new THREE.WebGLRenderer({
            antialias: true,
            alpha: true   // transparent background
        });
        renderer.setSize(container.clientWidth, container.clientHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.shadowMap.enabled = !S.isMobile;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        renderer.outputEncoding = THREE.sRGBEncoding;
        container.appendChild(renderer.domElement);

        // Ambient — prevent black faces
        scene.add(new THREE.AmbientLight(0xffffff, 0.5));

        // Key light — top-left
        const key = new THREE.DirectionalLight(0xffffff, 0.55);
        key.position.set(-4, 6, 4);
        key.castShadow = !S.isMobile;
        key.shadow.mapSize.set(512, 512);
        key.shadow.camera.near = 0.5;
        key.shadow.camera.far = 15;
        key.shadow.camera.left = -3;
        key.shadow.camera.right = 3;
        key.shadow.camera.top = 3;
        key.shadow.camera.bottom = -3;
        scene.add(key);

        // Fill — subtle warm
        const fill = new THREE.DirectionalLight(0xF0E6D4, 0.2);
        fill.position.set(3, 1, -2);
        scene.add(fill);

        // Ground shadow
        if (!S.isMobile) {
            const gGeo = new THREE.PlaneGeometry(10, 10);
            const gMat = new THREE.ShadowMaterial({ opacity: 0.06 });
            const ground = new THREE.Mesh(gGeo, gMat);
            ground.rotation.x = -Math.PI / 2;
            ground.position.y = -1.2;
            ground.receiveShadow = true;
            scene.add(ground);
        }
    }

    /* ── BUILD BOX (3 separable layers) ── */
    function buildBox() {
        boxGroup = new THREE.Group();

        const tex = createKraftTexture();

        const linerMat = new THREE.MeshStandardMaterial({
            map: tex,
            color: 0xC4A86B,
            roughness: 0.8,
            metalness: 0.0
        });

        const fluteMat = new THREE.MeshStandardMaterial({
            color: 0xD4C49A,
            roughness: 0.9,
            metalness: 0.0
        });

        const L = 1.6, W = 1.1, linerH = 0.06, fluteH = 0.14;
        const totalH = linerH * 2 + fluteH;

        // Top liner
        const topGeo = new THREE.BoxGeometry(L, linerH, W);
        topLiner = new THREE.Mesh(topGeo, linerMat);
        topLiner.position.y = fluteH / 2 + linerH / 2;
        topLiner.castShadow = true;
        topLiner.receiveShadow = true;
        topLinerBaseY = topLiner.position.y;

        // Flute (middle)
        const fluteGeo = createFluteGeometry(L * 0.98, fluteH, W * 0.98);
        fluteMesh = new THREE.Mesh(fluteGeo, fluteMat);
        fluteMesh.position.y = 0;
        fluteMesh.castShadow = true;
        fluteBaseY = 0;

        // Bottom liner
        const botGeo = new THREE.BoxGeometry(L, linerH, W);
        bottomLiner = new THREE.Mesh(botGeo, linerMat.clone());
        bottomLiner.position.y = -(fluteH / 2 + linerH / 2);
        bottomLiner.castShadow = true;
        bottomLiner.receiveShadow = true;
        bottomLinerBaseY = bottomLiner.position.y;

        boxGroup.add(topLiner);
        boxGroup.add(fluteMesh);
        boxGroup.add(bottomLiner);

        // Edge outlines for realism
        const edgeMat = new THREE.LineBasicMaterial({ color: 0x9B8560, linewidth: 1 });
        const halfL = L / 2, halfW = W / 2, halfH = totalH / 2;
        const edges = [
            [[-halfL, halfH, -halfW], [-halfL, halfH, halfW]],
            [[halfL, halfH, -halfW], [halfL, halfH, halfW]],
            [[-halfL, halfH, -halfW], [halfL, halfH, -halfW]],
            [[-halfL, halfH, halfW], [halfL, halfH, halfW]],
            [[-halfL, -halfH, -halfW], [-halfL, -halfH, halfW]],
            [[halfL, -halfH, -halfW], [halfL, -halfH, halfW]],
            [[-halfL, -halfH, -halfW], [halfL, -halfH, -halfW]],
            [[-halfL, -halfH, halfW], [halfL, -halfH, halfW]],
            [[-halfL, -halfH, -halfW], [-halfL, halfH, -halfW]],
            [[halfL, -halfH, -halfW], [halfL, halfH, -halfW]],
            [[-halfL, -halfH, halfW], [-halfL, halfH, halfW]],
            [[halfL, -halfH, halfW], [halfL, halfH, halfW]]
        ];
        edges.forEach(([a, b]) => {
            const g = new THREE.BufferGeometry().setFromPoints([
                new THREE.Vector3(...a), new THREE.Vector3(...b)
            ]);
            const line = new THREE.Line(g, edgeMat);
            boxGroup.add(line);
        });

        boxGroup.rotation.x = S.rotX;
        boxGroup.rotation.y = S.rotY;

        scene.add(boxGroup);
    }

    /* ── CORRUGATED FLUTE GEOMETRY ── */
    function createFluteGeometry(w, h, d) {
        const segs = 40;
        const rows = 6;
        const amp = h * 0.35;
        const freq = 10;
        const verts = [];
        const indices = [];

        const halfW = w / 2;
        const halfD = d / 2;

        for (let j = 0; j <= rows; j++) {
            const z = -halfD + (j / rows) * d;
            for (let i = 0; i <= segs; i++) {
                const x = -halfW + (i / segs) * w;
                const wave = Math.sin((i / segs) * Math.PI * 2 * freq) * amp;
                verts.push(x, wave, z);
            }
        }

        for (let j = 0; j < rows; j++) {
            for (let i = 0; i < segs; i++) {
                const a = j * (segs + 1) + i;
                const b = a + 1;
                const c = a + (segs + 1);
                const dd = c + 1;
                indices.push(a, b, c, b, dd, c);
            }
        }

        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
        geo.setIndex(indices);
        geo.computeVertexNormals();
        return geo;
    }

    /* ── LABEL SYNC (3D → 2D projection) ── */
    function syncLabels() {
        if (S.isMobile || !labelEls.length) return;

        const layers = [topLiner, fluteMesh, bottomLiner];
        const w2 = container.clientWidth / 2;
        const h2 = container.clientHeight / 2;

        layers.forEach((mesh, i) => {
            if (!labelEls[i]) return;
            const pos = new THREE.Vector3();
            mesh.getWorldPosition(pos);
            // offset label to the right side of the layer
            pos.x += 1.0;
            pos.project(camera);

            const x = (pos.x * w2) + w2;
            const y = -(pos.y * h2) + h2;

            labelEls[i].style.left = x + 'px';
            labelEls[i].style.top = y + 'px';
        });
    }

    /* ── RENDER ── */
    function renderOnce() {
        renderer.render(scene, camera);
    }

    function startLoop() {
        function frame() {
            animFrameId = requestAnimationFrame(frame);
            if (!S.isVisible) return;

            try {
                // Auto-rotation (when not user-interacting and not exploded)
                if (!S.isUserInteracting && !S.isExploded && !prefersReducedMotion) {
                    S.targetRotY += ROTATION_SPEED;
                }

                // Smooth damping
                S.rotX += (S.targetRotX - S.rotX) * DAMPING;
                S.rotY += (S.targetRotY - S.rotY) * DAMPING;

                if (boxGroup) {
                    boxGroup.rotation.x = S.rotX;
                    boxGroup.rotation.y = S.rotY;
                }

                syncLabels();
                renderer.render(scene, camera);
            } catch (e) {
                cancelAnimationFrame(animFrameId);
                console.warn('Hero 3D: render error', e);
            }
        }
        frame();
    }

    /* ── GSAP EXPLODED TIMELINE ── */
    function scheduleExplode() {
        if (S.isMobile || prefersReducedMotion) return;

        explodeTimer = setTimeout(function runExplode() {
            if (S.isUserInteracting || !S.isVisible) {
                explodeTimer = setTimeout(runExplode, 3000);
                return;
            }
            playExplode();
        }, EXPLODE_INTERVAL);
    }

    function playExplode() {
        if (typeof gsap === 'undefined') return;

        S.isExploded = true;

        explodeTimeline = gsap.timeline({
            onReverseComplete: function () {
                S.isExploded = false;
                // schedule next
                explodeTimer = setTimeout(function () {
                    if (!S.isUserInteracting && S.isVisible) {
                        playExplode();
                    } else {
                        scheduleExplode();
                    }
                }, EXPLODE_INTERVAL);
            }
        });

        const GAP = 0.45;

        explodeTimeline
            .to(topLiner.position, {
                y: topLinerBaseY + GAP,
                duration: 0.8,
                ease: 'power2.out'
            })
            .to(bottomLiner.position, {
                y: bottomLinerBaseY - GAP,
                duration: 0.8,
                ease: 'power2.out'
            }, '<')
            // Fade in labels
            .to(labelEls, {
                opacity: 1,
                duration: 0.4,
                stagger: 0.1,
                ease: 'power1.out'
            }, '-=0.3')
            // Hold
            .to({}, { duration: EXPLODE_HOLD / 1000 })
            // Reverse
            .to(labelEls, {
                opacity: 0,
                duration: 0.3,
                ease: 'power1.in'
            })
            .to(topLiner.position, {
                y: topLinerBaseY,
                duration: 0.7,
                ease: 'power2.inOut'
            }, '-=0.1')
            .to(bottomLiner.position, {
                y: bottomLinerBaseY,
                duration: 0.7,
                ease: 'power2.inOut',
                onComplete: function () {
                    S.isExploded = false;
                    explodeTimer = setTimeout(function () {
                        if (!S.isUserInteracting && S.isVisible) {
                            playExplode();
                        } else {
                            scheduleExplode();
                        }
                    }, EXPLODE_INTERVAL);
                }
            }, '<');
    }

    /* ── USER INTERACTION ── */
    function setupInteraction() {
        // Hover → pause auto
        container.addEventListener('mouseenter', function () {
            S.isUserInteracting = true;
        });

        container.addEventListener('mouseleave', function () {
            S.isUserInteracting = false;
            S.isDragging = false;
        });

        // Drag to rotate
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
            S.targetRotY += dx * 0.006;
            S.targetRotX += dy * 0.004;
            S.targetRotX = Math.max(-1, Math.min(0.6, S.targetRotX));
            S.prevMouse.x = e.clientX;
            S.prevMouse.y = e.clientY;
        });

        window.addEventListener('pointerup', function () {
            S.isDragging = false;
        });

        // Touch support
        container.addEventListener('touchstart', function () {
            S.isUserInteracting = true;
        }, { passive: true });

        container.addEventListener('touchend', function () {
            S.isUserInteracting = false;
        }, { passive: true });
    }

    /* ── RESIZE OBSERVER ── */
    function setupResizeObserver() {
        if (typeof ResizeObserver === 'undefined') {
            window.addEventListener('resize', onResize);
            return;
        }

        const ro = new ResizeObserver(function () {
            onResize();
        });
        ro.observe(container);
    }

    function onResize() {
        if (!container || !camera || !renderer) return;
        const wasMobile = S.isMobile;
        S.isMobile = window.innerWidth < 768;

        camera.aspect = container.clientWidth / container.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(container.clientWidth, container.clientHeight);

        // If switched to mobile, kill explode
        if (!wasMobile && S.isMobile) {
            if (explodeTimeline) explodeTimeline.kill();
            if (explodeTimer) clearTimeout(explodeTimer);
            labelEls.forEach(function (el) { el.style.opacity = '0'; });
            // Reset layer positions
            if (topLiner) topLiner.position.y = topLinerBaseY;
            if (bottomLiner) bottomLiner.position.y = bottomLinerBaseY;
            S.isExploded = false;
        }

        // If switched to desktop
        if (wasMobile && !S.isMobile && !prefersReducedMotion) {
            scheduleExplode();
        }
    }

    /* ── VISIBILITY API ── */
    function setupVisibilityAPI() {
        document.addEventListener('visibilitychange', function () {
            S.isVisible = !document.hidden;
        });
    }

    /* ── COLLECT LABEL ELEMENTS ── */
    function collectLabels() {
        if (!container || !container.parentElement) {
            labelEls = [];
            return;
        }
        labelEls = Array.from(container.parentElement.querySelectorAll('.hero-3d-label'));
    }

    /* ── BOOT ── */
    function boot() {
        container = document.getElementById('hero3dCanvas');
        if (!container) return;
        collectLabels();
        init();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot);
    } else {
        boot();
    }

})();

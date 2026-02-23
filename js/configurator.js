/* ============================================
   3D Box Configurator — Premium Edition
   Realistic Three.js Scene + Exploded View
   + Dimension Lines + Zoom + Strength Meter
   ============================================ */

(function () {
    'use strict';

    /* ── PLY DATA ── */
    const PLY_DATA = {
        3: {
            thickness: 3.2,
            capacity: '5 – 15 kg',
            layers: 'Outer + Flute + Inner',
            layerCount: 3,
            layerNames: ['Outer Liner', 'Flute', 'Inner Liner'],
            color: 0xC4A86B,
            label: '3-Ply (Single Wall)',
            strengthScore: 30,
            recommendedUse: 'Courier, E-commerce, Moving'
        },
        5: {
            thickness: 6.1,
            capacity: '12 – 40 kg',
            layers: 'Outer + Flute + Mid + Flute + Inner',
            layerCount: 5,
            layerNames: ['Outer Liner', 'Flute', 'Middle Liner', 'Flute', 'Inner Liner'],
            color: 0xB8955A,
            label: '5-Ply (Double Wall)',
            strengthScore: 60,
            recommendedUse: 'Heavy goods, Fragile items'
        },
        7: {
            thickness: 10,
            capacity: '50+ kg',
            layers: 'Outer + 3 Flutes + 3 Liners',
            layerCount: 7,
            layerNames: ['Outer Liner', 'Flute', 'Liner', 'Flute', 'Liner', 'Flute', 'Inner Liner'],
            color: 0xA8824A,
            label: '7-Ply (Triple Wall)',
            strengthScore: 95,
            recommendedUse: 'Industrial, Export, High-weight'
        }
    };

    /* ── STATE ── */
    let state = {
        length: 300,
        width: 200,
        height: 150,
        ply: 3,
        unit: 'mm',
        exploded: false
    };

    let scene, camera, renderer, mainGroup, labelRenderer;
    let isDragging = false;
    let previousMouse = { x: 0, y: 0 };
    let rotationTarget = { x: -0.3, y: 0.5 };
    let rotationCurrent = { x: -0.3, y: 0.5 };
    const INERTIA = 0.06;
    let zoomTarget = 5;
    let zoomCurrent = 5;
    const ZOOM_MIN = 2.5;
    const ZOOM_MAX = 10;

    /* ── keep a list of CSS2D labels so we can clean them up ── */
    let css2dLabels = [];

    /* ── INIT ── */
    function init() {
        const container = document.getElementById('boxViewer');
        if (!container) return;

        setupScene(container);
        buildBox();
        animate();
        setupControls();
        setupSliders();
        setupPlyButtons();
        setupUnitToggle();
        setupSuggestion();
        setupExplode();
        setupReset();
        setupWhatsAppQuote();
        updateSpecs();

        container.addEventListener('pointerdown', () => {
            const hint = document.getElementById('viewerHint');
            if (hint) hint.classList.add('hidden');
        }, { once: true });

        window.addEventListener('resize', onResize);
    }

    /* ── KRAFT TEXTURE (procedural canvas) ── */
    function createKraftTexture() {
        const size = 512;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');

        /* base fill */
        ctx.fillStyle = '#c4a06a';
        ctx.fillRect(0, 0, size, size);

        /* noise fibers */
        for (let i = 0; i < 18000; i++) {
            const x = Math.random() * size;
            const y = Math.random() * size;
            const len = 2 + Math.random() * 6;
            const angle = (Math.random() - 0.5) * 0.4;
            const brightness = 150 + Math.floor(Math.random() * 50);
            ctx.strokeStyle = `rgba(${brightness}, ${brightness - 20}, ${brightness - 50}, ${0.08 + Math.random() * 0.12})`;
            ctx.lineWidth = 0.5 + Math.random() * 0.5;
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(x + Math.cos(angle) * len, y + Math.sin(angle) * len);
            ctx.stroke();
        }

        /* subtle grain overlay */
        for (let i = 0; i < 6000; i++) {
            const x = Math.random() * size;
            const y = Math.random() * size;
            const r = 0.5 + Math.random() * 1;
            const alpha = 0.02 + Math.random() * 0.06;
            ctx.fillStyle = Math.random() > 0.5
                ? `rgba(255,240,210,${alpha})`
                : `rgba(100,70,30,${alpha})`;
            ctx.beginPath();
            ctx.arc(x, y, r, 0, Math.PI * 2);
            ctx.fill();
        }

        const tex = new THREE.CanvasTexture(canvas);
        tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
        tex.repeat.set(2, 2);
        return tex;
    }

    /* ── THREE.JS SCENE ── */
    function setupScene(container) {
        scene = new THREE.Scene();
        scene.background = new THREE.Color(0xF9FAFB);

        camera = new THREE.PerspectiveCamera(
            40, container.clientWidth / container.clientHeight, 0.1, 1000
        );
        camera.position.set(0, 0, zoomCurrent);
        camera.lookAt(0, 0, 0);

        renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setSize(container.clientWidth, container.clientHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        renderer.outputEncoding = THREE.sRGBEncoding;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.0;
        container.appendChild(renderer.domElement);

        /* CSS2D label renderer */
        if (typeof THREE.CSS2DRenderer !== 'undefined') {
            labelRenderer = new THREE.CSS2DRenderer();
            labelRenderer.setSize(container.clientWidth, container.clientHeight);
            labelRenderer.domElement.style.position = 'absolute';
            labelRenderer.domElement.style.top = '0';
            labelRenderer.domElement.style.left = '0';
            labelRenderer.domElement.style.pointerEvents = 'none';
            container.appendChild(labelRenderer.domElement);
        }

        /* Lights — soft white from top-left */
        const ambient = new THREE.AmbientLight(0xffffff, 0.55);
        scene.add(ambient);

        const dirLight = new THREE.DirectionalLight(0xffffff, 0.55);
        dirLight.position.set(-5, 8, 5);
        dirLight.castShadow = true;
        dirLight.shadow.mapSize.set(1024, 1024);
        dirLight.shadow.camera.near = 0.5;
        dirLight.shadow.camera.far = 20;
        dirLight.shadow.camera.left = -5;
        dirLight.shadow.camera.right = 5;
        dirLight.shadow.camera.top = 5;
        dirLight.shadow.camera.bottom = -5;
        scene.add(dirLight);

        const fillLight = new THREE.DirectionalLight(0xF0E6D4, 0.4);
        fillLight.position.set(4, 2, -3);
        scene.add(fillLight);

        const rimLight = new THREE.DirectionalLight(0xffffff, 0.15);
        rimLight.position.set(0, -2, -5);
        scene.add(rimLight);

        /* Ground shadow plane */
        const groundGeo = new THREE.PlaneGeometry(20, 20);
        const groundMat = new THREE.ShadowMaterial({ opacity: 0.06 });
        const ground = new THREE.Mesh(groundGeo, groundMat);
        ground.rotation.x = -Math.PI / 2;
        ground.position.y = -2;
        ground.receiveShadow = true;
        scene.add(ground);
    }

    /* ── MATERIALS ── */
    function createBoxMaterial(ply) {
        const tex = createKraftTexture();
        const data = PLY_DATA[ply];
        return new THREE.MeshStandardMaterial({
            map: tex,
            color: data.color,
            roughness: 0.9,
            metalness: 0.05,
            flatShading: false
        });
    }

    function createLayerMaterial(colorHex, isFlute) {
        const mat = new THREE.MeshStandardMaterial({
            color: colorHex,
            roughness: isFlute ? 0.9 : 0.75,
            metalness: 0.0,
            transparent: true,
            opacity: 0.88,
            flatShading: false
        });
        if (!isFlute) {
            mat.map = createKraftTexture();
        }
        return mat;
    }

    /* ── CLEAN LABELS ── */
    function clearLabels() {
        css2dLabels.forEach(lbl => {
            if (lbl.parent) lbl.parent.remove(lbl);
            if (lbl.element && lbl.element.parentNode) {
                lbl.element.parentNode.removeChild(lbl.element);
            }
        });
        css2dLabels = [];
    }

    /* ── MAKE CSS2D LABEL ── */
    function makeLabel(text, cssClass) {
        if (typeof THREE.CSS2DObject === 'undefined') return null;
        const div = document.createElement('div');
        div.className = cssClass;
        div.textContent = text;
        const label = new THREE.CSS2DObject(div);
        css2dLabels.push(label);
        return label;
    }

    /* ── BUILD BOX (entry point) ── */
    function buildBox() {
        if (mainGroup) scene.remove(mainGroup);
        clearLabels();

        mainGroup = new THREE.Group();

        const scale = 0.005;
        const l = state.length * scale;
        const w = state.width * scale;
        const h = state.height * scale;
        const ply = state.ply;
        const thickness = PLY_DATA[ply].thickness * scale * 2;

        if (state.exploded) {
            buildExplodedView(l, w, h, ply, thickness, scale);
        } else {
            buildSolidBox(l, w, h, ply, thickness);
            buildDimensionLines(l, w, h);
        }

        scene.add(mainGroup);
    }

    /* ── SOLID BOX ── */
    function buildSolidBox(l, w, h, ply, thickness) {
        const material = createBoxMaterial(ply);

        /* edge outline */
        const edgeColor = 0xA88B5E; // Slightly darker than kraft for realistic edge shading

        /* Main Body Panels
           We place the side panels between the front/back panels. */
        const mainPanelThickness = thickness;
        const frontBackW = l;
        const sideW = w - (mainPanelThickness * 2);

        // Materials for different faces (corrugated edge trick)
        const edgeMaterial = new THREE.MeshStandardMaterial({
            color: edgeColor, roughness: 1.0, metalness: 0.0,
            bumpMap: createCorrugatedBumpMap(), bumpScale: 0.02
        });

        // 0: right, 1: left, 2: top, 3: bottom, 4: front, 5: back
        const frontBackMats = [
            edgeMaterial, edgeMaterial, // right, left (edges)
            edgeMaterial, edgeMaterial, // top, bottom (edges)
            material, material          // front, back (faces)
        ];

        const sideMats = [
            material, material,         // right, left (faces)
            edgeMaterial, edgeMaterial, // top, bottom (edges)
            edgeMaterial, edgeMaterial  // front, back (edges)
        ];

        const bottomMats = [
            edgeMaterial, edgeMaterial, // right, left (edges)
            material, material,         // top, bottom (faces)
            edgeMaterial, edgeMaterial  // front, back (edges)
        ];

        /* panels: front, back, left, right, bottom */
        const panels = [
            { size: [frontBackW, h, mainPanelThickness], pos: [0, 0, w / 2 - mainPanelThickness / 2], mats: frontBackMats }, // Front
            { size: [frontBackW, h, mainPanelThickness], pos: [0, 0, -w / 2 + mainPanelThickness / 2], mats: frontBackMats },// Back
            { size: [mainPanelThickness, h, sideW], pos: [-l / 2 + mainPanelThickness / 2, 0, 0], mats: sideMats },          // Left
            { size: [mainPanelThickness, h, sideW], pos: [l / 2 - mainPanelThickness / 2, 0, 0], mats: sideMats },           // Right
            { size: [l - mainPanelThickness * 2, mainPanelThickness, sideW], pos: [0, -h / 2 + mainPanelThickness / 2, 0], mats: bottomMats } // Bottom inner floor
        ];

        panels.forEach(p => {
            const geo = new THREE.BoxGeometry(p.size[0], p.size[1], p.size[2]);
            const mesh = new THREE.Mesh(geo, p.mats);
            mesh.position.set(p.pos[0], p.pos[1], p.pos[2]);
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            mainGroup.add(mesh);
        });

        /* ── OPEN FLAPS ── */
        // Calculate flap dimensions. RSC flaps meet in the middle, so length = w / 2 (mostly).
        const flapL_major = l;
        const flapW_major = w / 2;
        const flapL_minor = w - (mainPanelThickness * 2);
        const flapW_minor = l / 2;

        /* Angles to match the reference image */
        const angleFront = -0.5; // Rads, leaning outwards
        const angleBack = 0.6;
        const angleLeft = -0.4;
        const angleRight = 0.45;

        // Front Flap (Major)
        const frontFlapGeo = new THREE.BoxGeometry(flapL_major, mainPanelThickness, flapW_major);
        // Pivot point to edge
        frontFlapGeo.translate(0, mainPanelThickness / 2, flapW_major / 2);
        const frontFlap = new THREE.Mesh(frontFlapGeo, bottomMats); // using bottom mats for top/bottom face mapping
        frontFlap.castShadow = true;
        frontFlap.receiveShadow = true;

        const pivotFront = new THREE.Group();
        pivotFront.position.set(0, h / 2, w / 2 - mainPanelThickness);
        pivotFront.rotation.x = angleFront;
        pivotFront.add(frontFlap);
        mainGroup.add(pivotFront);

        // Back Flap (Major)
        const backFlapGeo = new THREE.BoxGeometry(flapL_major, mainPanelThickness, flapW_major);
        backFlapGeo.translate(0, mainPanelThickness / 2, -flapW_major / 2);
        const backFlap = new THREE.Mesh(backFlapGeo, bottomMats);
        backFlap.castShadow = true;
        backFlap.receiveShadow = true;

        const pivotBack = new THREE.Group();
        pivotBack.position.set(0, h / 2, -w / 2 + mainPanelThickness);
        pivotBack.rotation.x = angleBack;
        pivotBack.add(backFlap);
        mainGroup.add(pivotBack);

        // Left Flap (Minor)
        const leftFlapGeo = new THREE.BoxGeometry(flapW_minor, mainPanelThickness, flapL_minor);
        // Translate anchor to left edge
        leftFlapGeo.translate(-flapW_minor / 2, mainPanelThickness / 2, 0);
        const leftFlap = new THREE.Mesh(leftFlapGeo, sideMats);
        leftFlap.castShadow = true;
        leftFlap.receiveShadow = true;

        const pivotLeft = new THREE.Group();
        pivotLeft.position.set(-l / 2 + mainPanelThickness, h / 2, 0);
        pivotLeft.rotation.z = angleLeft;
        pivotLeft.add(leftFlap);
        mainGroup.add(pivotLeft);

        // Right Flap (Minor)
        const rightFlapGeo = new THREE.BoxGeometry(flapW_minor, mainPanelThickness, flapL_minor);
        rightFlapGeo.translate(flapW_minor / 2, mainPanelThickness / 2, 0);
        const rightFlap = new THREE.Mesh(rightFlapGeo, sideMats);
        rightFlap.castShadow = true;
        rightFlap.receiveShadow = true;

        const pivotRight = new THREE.Group();
        pivotRight.position.set(l / 2 - mainPanelThickness, h / 2, 0);
        pivotRight.rotation.z = angleRight;
        pivotRight.add(rightFlap);
        mainGroup.add(pivotRight);
    }

    /* Helper: Corrugated edge bump map (procedural) */
    function createCorrugatedBumpMap() {
        const size = 128;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');

        // Draw horizontal stripes for fluting illusion
        ctx.fillStyle = '#111';
        ctx.fillRect(0, 0, size, size);

        ctx.fillStyle = '#FFF';
        for (let y = 0; y < size; y += 8) {
            ctx.fillRect(0, y, size, 4);
        }

        const tex = new THREE.CanvasTexture(canvas);
        tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
        tex.repeat.set(1, 10);
        return tex;
    }

    /* ── DIMENSION LINES ── */
    function buildDimensionLines(l, w, h) {
        const lineMat = new THREE.LineBasicMaterial({ color: 0x7EAEF5, linewidth: 2 }); // Light blue, slightly thicker
        // The reference has lines off the main body:
        // Width on left, Height on top back, Length on right
        const offset = 0.6; // Push it out nicely
        const tickSize = 0.15;

        /* Length line (labeled 300mm on right depth side in reference) -> Z-axis depth */
        const lenPts = [
            new THREE.Vector3(l / 2 + offset, -h / 2, -w / 2),
            new THREE.Vector3(l / 2 + offset, -h / 2, w / 2)
        ];
        const lenGeo = new THREE.BufferGeometry().setFromPoints(lenPts);
        mainGroup.add(new THREE.Line(lenGeo, lineMat));

        /* end ticks for length (aligned to X axis) */
        addTick(mainGroup, l / 2 + offset, -h / 2, -w / 2, tickSize, 0, 0, lineMat);
        addTick(mainGroup, l / 2 + offset, -h / 2, w / 2, tickSize, 0, 0, lineMat);

        /* Length label */
        const lenLabel = makeLabel(formatDim(state.length), 'dim-label');
        if (lenLabel) {
            lenLabel.position.set(l / 2 + offset, -h / 2 - 0.2, 0);
            mainGroup.add(lenLabel);
        }

        /* Width line (labeled 200mm on left front side in reference) -> X-axis width */
        const widPts = [
            new THREE.Vector3(-l / 2, -h / 2, w / 2 + offset),
            new THREE.Vector3(l / 2, -h / 2, w / 2 + offset)
        ];
        const widGeo = new THREE.BufferGeometry().setFromPoints(widPts);
        mainGroup.add(new THREE.Line(widGeo, lineMat));

        /* end ticks for width (aligned to Z axis) */
        addTick(mainGroup, -l / 2, -h / 2, w / 2 + offset, 0, 0, tickSize, lineMat);
        addTick(mainGroup, l / 2, -h / 2, w / 2 + offset, 0, 0, tickSize, lineMat);

        const widLabel = makeLabel(formatDim(state.width), 'dim-label');
        if (widLabel) {
            widLabel.position.set(0, -h / 2 - 0.2, w / 2 + offset);
            mainGroup.add(widLabel);
        }

        /* Height line (labeled 150mm poking up from back left corner in reference) -> Y-axis height */
        // We'll put it slightly behind/left so it doesn't obscure the front flaps as much
        const hPts = [
            new THREE.Vector3(-l / 2 - offset * 0.5, -h / 2, -w / 2),
            new THREE.Vector3(-l / 2 - offset * 0.5, h / 2, -w / 2)
        ];
        const hGeo = new THREE.BufferGeometry().setFromPoints(hPts);
        mainGroup.add(new THREE.Line(hGeo, lineMat));

        /* ticks for height (horizontal) */
        addTick(mainGroup, -l / 2 - offset * 0.5, -h / 2, -w / 2, tickSize, 0, 0, lineMat);
        addTick(mainGroup, -l / 2 - offset * 0.5, h / 2, -w / 2, tickSize, 0, 0, lineMat);

        const hLabel = makeLabel(formatDim(state.height), 'dim-label dim-label-h');
        if (hLabel) {
            hLabel.position.set(-l / 2 - offset * 0.5 - 0.2, 0, -w / 2);
            mainGroup.add(hLabel);
        }
    }

    function addTick(group, x, y, z, dx, dy, dz, mat) {
        const geo = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(x - dx, y - dy, z - dz),
            new THREE.Vector3(x + dx, y + dy, z + dz)
        ]);
        group.add(new THREE.Line(geo, mat));
    }

    function formatDim(val) {
        if (state.unit === 'in') {
            return (val / 25.4).toFixed(1) + ' in';
        }
        return val + ' mm';
    }

    /* ── EXPLODED VIEW ── */
    function buildExplodedView(l, w, h, ply, thickness, scale) {
        const data = PLY_DATA[ply];
        const layers = data.layerCount;
        const gap = 0.32;
        const layerColors = [
            0xC4A86B, 0xD4C49A, 0xB89A5A,
            0xD4C49A, 0xB89A5A, 0xD4C49A, 0xA8824A
        ];

        for (let i = 0; i < layers; i++) {
            const isFlute = i % 2 === 1;
            const layerH = isFlute ? thickness * 1.8 : thickness * 0.6;
            const yPos = (i - (layers - 1) / 2) * gap;

            if (isFlute) {
                /* Corrugated wave geometry */
                buildFluteLayer(l * 0.88, layerH, w * 0.68, yPos,
                    layerColors[i] || 0xD4C49A);
            } else {
                /* Flat liner panel */
                const geo = new THREE.BoxGeometry(l * 0.88, layerH, w * 0.68);
                const mat = createLayerMaterial(layerColors[i] || 0xC4A86B, false);
                const mesh = new THREE.Mesh(geo, mat);
                mesh.position.y = yPos;
                mesh.castShadow = true;
                mesh.receiveShadow = true;
                mainGroup.add(mesh);
            }

            /* Layer label */
            const name = data.layerNames[i] || ('Layer ' + (i + 1));
            const label = makeLabel(name, 'layer-label');
            if (label) {
                label.position.set(l * 0.52, yPos, 0);
                mainGroup.add(label);
            }
        }
    }

    /* ── FLUTE WAVE GEOMETRY ── */
    function buildFluteLayer(layerW, layerH, layerD, yPos, color) {
        /* Create a visually corrugated surface using a shape extruded along Z */
        const segments = 30;
        const amplitude = layerH * 0.4;
        const frequency = 8;

        /* Create top surface vertices */
        const geo = new THREE.BufferGeometry();
        const vertices = [];
        const indices = [];
        const normals = [];
        const halfW = layerW / 2;
        const halfD = layerD / 2;
        const cols = segments;
        const rows = 8;

        for (let j = 0; j <= rows; j++) {
            const z = -halfD + (j / rows) * layerD;
            for (let i = 0; i <= cols; i++) {
                const x = -halfW + (i / cols) * layerW;
                const wave = Math.sin((i / cols) * Math.PI * 2 * frequency) * amplitude;
                vertices.push(x, yPos + wave, z);
                normals.push(0, 1, 0);
            }
        }

        for (let j = 0; j < rows; j++) {
            for (let i = 0; i < cols; i++) {
                const a = j * (cols + 1) + i;
                const b = a + 1;
                const c = a + (cols + 1);
                const d = c + 1;
                indices.push(a, b, c);
                indices.push(b, d, c);
            }
        }

        geo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
        geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
        geo.setIndex(indices);
        geo.computeVertexNormals();

        const mat = new THREE.MeshStandardMaterial({
            color: color,
            roughness: 0.9,
            metalness: 0.0,
            transparent: true,
            opacity: 0.85,
            side: THREE.DoubleSide
        });

        const mesh = new THREE.Mesh(geo, mat);
        mesh.castShadow = true;
        mainGroup.add(mesh);
    }

    /* ── INTERACTION (drag rotate + scroll zoom) ── */
    function setupControls() {
        const container = document.getElementById('boxViewer');

        /* Drag to rotate */
        container.addEventListener('pointerdown', (e) => {
            isDragging = true;
            previousMouse.x = e.clientX;
            previousMouse.y = e.clientY;
        });

        window.addEventListener('pointermove', (e) => {
            if (!isDragging) return;
            const dx = e.clientX - previousMouse.x;
            const dy = e.clientY - previousMouse.y;
            rotationTarget.y += dx * 0.007;
            rotationTarget.x += dy * 0.004;
            rotationTarget.x = Math.max(-1.2, Math.min(0.8, rotationTarget.x));
            previousMouse.x = e.clientX;
            previousMouse.y = e.clientY;
        });

        window.addEventListener('pointerup', () => {
            isDragging = false;
        });

        /* Scroll to zoom */
        container.addEventListener('wheel', (e) => {
            e.preventDefault();
            zoomTarget += e.deltaY * 0.005;
            zoomTarget = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, zoomTarget));
        }, { passive: false });

        /* Touch pinch zoom */
        let lastTouchDist = 0;
        container.addEventListener('touchstart', (e) => {
            if (e.touches.length === 2) {
                const dx = e.touches[0].clientX - e.touches[1].clientX;
                const dy = e.touches[0].clientY - e.touches[1].clientY;
                lastTouchDist = Math.sqrt(dx * dx + dy * dy);
            }
        }, { passive: true });

        container.addEventListener('touchmove', (e) => {
            if (e.touches.length === 2) {
                const dx = e.touches[0].clientX - e.touches[1].clientX;
                const dy = e.touches[0].clientY - e.touches[1].clientY;
                const dist = Math.sqrt(dx * dx + dy * dy);
                const delta = lastTouchDist - dist;
                zoomTarget += delta * 0.02;
                zoomTarget = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, zoomTarget));
                lastTouchDist = dist;
            }
        }, { passive: true });
    }

    /* ── ANIMATION LOOP ── */
    function animate() {
        requestAnimationFrame(animate);

        /* smooth rotation */
        rotationCurrent.x += (rotationTarget.x - rotationCurrent.x) * INERTIA;
        rotationCurrent.y += (rotationTarget.y - rotationCurrent.y) * INERTIA;

        if (mainGroup) {
            mainGroup.rotation.x = rotationCurrent.x;
            mainGroup.rotation.y = rotationCurrent.y;
        }

        /* smooth zoom */
        zoomCurrent += (zoomTarget - zoomCurrent) * 0.08;
        camera.position.set(0, 0, zoomCurrent);
        camera.lookAt(0, 0, 0);

        renderer.render(scene, camera);
        if (labelRenderer) labelRenderer.render(scene, camera);
    }

    function onResize() {
        const container = document.getElementById('boxViewer');
        if (!container) return;
        camera.aspect = container.clientWidth / container.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(container.clientWidth, container.clientHeight);
        if (labelRenderer) {
            labelRenderer.setSize(container.clientWidth, container.clientHeight);
        }
    }

    /* ── SLIDERS ── */
    function setupSliders() {
        const sliders = {
            sliderLength: { key: 'length', display: 'valLength' },
            sliderWidth: { key: 'width', display: 'valWidth' },
            sliderHeight: { key: 'height', display: 'valHeight' }
        };

        Object.entries(sliders).forEach(([id, cfg]) => {
            const el = document.getElementById(id);
            if (!el) return;
            el.addEventListener('input', () => {
                const val = parseInt(el.value);
                state[cfg.key] = val;
                updateSliderDisplay(cfg.display, val);
                buildBox();
                updateSpecs();
            });
        });
    }

    function updateSliderDisplay(id, val) {
        const el = document.getElementById(id);
        if (!el) return;
        if (state.unit === 'in') {
            el.textContent = (val / 25.4).toFixed(1);
        } else {
            el.textContent = val;
        }
    }

    function updateAllDisplays() {
        updateSliderDisplay('valLength', state.length);
        updateSliderDisplay('valWidth', state.width);
        updateSliderDisplay('valHeight', state.height);

        const labels = document.querySelectorAll('.cfg-unit-label');
        labels.forEach(l => l.textContent = state.unit);

        /* rebuild box to update dimension labels */
        buildBox();
    }

    /* ── PLY BUTTONS ── */
    function setupPlyButtons() {
        const buttons = document.querySelectorAll('.cfg-ply');
        buttons.forEach(btn => {
            btn.addEventListener('click', () => {
                buttons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                state.ply = parseInt(btn.dataset.ply);
                updateSpecs();
                buildBox();
            });
        });
    }

    /* ── UNIT TOGGLE ── */
    function setupUnitToggle() {
        const buttons = document.querySelectorAll('.cfg-unit[data-unit]');
        buttons.forEach(btn => {
            btn.addEventListener('click', () => {
                buttons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                state.unit = btn.dataset.unit;
                updateAllDisplays();
            });
        });
    }

    /* ── SPECS + STRENGTH METER ── */
    function updateSpecs() {
        const data = PLY_DATA[state.ply];
        const el = (id) => document.getElementById(id);

        if (el('specThickness')) el('specThickness').textContent = data.thickness + ' mm';
        if (el('specCapacity')) el('specCapacity').textContent = data.capacity;
        if (el('specLayers')) el('specLayers').textContent = data.layers;
        if (el('specRecommendedUse')) el('specRecommendedUse').textContent = data.recommendedUse;

        /* Strength meter calculation */
        /* Base from ply, adjust for size — larger boxes = proportionally weaker */
        const volume = state.length * state.width * state.height;
        const maxVolume = 800 * 600 * 600; // max slider values
        const sizePenalty = (volume / maxVolume) * 25;
        let strength = Math.max(5, Math.min(100, data.strengthScore - sizePenalty));

        let strengthLabel, strengthColor;
        if (strength <= 33) {
            strengthLabel = 'Low';
            strengthColor = '#EF4444';
        } else if (strength <= 66) {
            strengthLabel = 'Medium';
            strengthColor = '#F59E0B';
        } else {
            strengthLabel = 'High';
            strengthColor = '#22C55E';
        }

        if (el('specStrengthLabel')) el('specStrengthLabel').textContent = strengthLabel;
        const bar = el('specStrengthFill');
        if (bar) {
            bar.style.width = strength + '%';
            bar.style.background = strengthColor;
        }
    }

    /* ── EXPLODED VIEW ── */
    function setupExplode() {
        const btn = document.getElementById('btnExplode');
        if (!btn) return;
        btn.addEventListener('click', () => {
            state.exploded = !state.exploded;
            btn.classList.toggle('active', state.exploded);
            const span = btn.querySelector('span');
            if (span) span.textContent = state.exploded ? 'Solid View' : 'Show Layers';
            buildBox();
        });
    }

    /* ── RESET ── */
    function setupReset() {
        const btn = document.getElementById('btnReset');
        if (!btn) return;
        btn.addEventListener('click', () => {
            rotationTarget.x = -0.3;
            rotationTarget.y = 0.5;
            zoomTarget = 5;
            state.exploded = false;
            const explodeBtn = document.getElementById('btnExplode');
            if (explodeBtn) {
                explodeBtn.classList.remove('active');
                const span = explodeBtn.querySelector('span');
                if (span) span.textContent = 'Show Layers';
            }
            buildBox();
        });
    }

    /* ── SMART SUGGESTION ── */
    function setupSuggestion() {
        const btn = document.getElementById('btnSuggest');
        if (!btn) return;

        btn.addEventListener('click', () => {
            const weight = parseFloat(document.getElementById('productWeight').value);
            const shipping = document.getElementById('shippingType').value;
            const result = document.getElementById('suggestionResult');

            if (!weight || !shipping) {
                result.innerHTML = '<p style="color: var(--clr-text-secondary)">Please enter both weight and shipping type.</p>';
                result.style.display = 'block';
                return;
            }

            let recPly, recSize, margin, warning = '';

            if (weight <= 5) {
                recPly = '3-Ply (Single Wall)';
                recSize = '10 × 8 × 6 inches';
                margin = 'Good safety margin';
            } else if (weight <= 15) {
                recPly = shipping === 'longdist' ? '5-Ply (Double Wall)' : '3-Ply (Single Wall)';
                recSize = '15 × 10 × 10 inches';
                margin = shipping === 'longdist' ? 'Extra protection for long distance' : 'Adequate for standard courier';
            } else if (weight <= 40) {
                recPly = '5-Ply (Double Wall)';
                recSize = '18 × 12 × 12 inches';
                margin = 'Suitable for heavy items';
            } else {
                recPly = '7-Ply (Triple Wall)';
                recSize = '22 × 22 × 30 inches';
                margin = 'Industrial-grade protection';
            }

            const currentMaxWeight = state.ply === 3 ? 15 : state.ply === 5 ? 40 : 200;
            if (weight > currentMaxWeight) {
                warning = `<p class="cfg-warning">⚠️ Selected ${state.ply}-Ply may not support ${weight} kg. Consider upgrading.</p>`;
            }

            result.innerHTML = `
                <h4>✅ Recommendation</h4>
                <p><strong>Suggested Ply:</strong> ${recPly}</p>
                <p><strong>Suggested Size:</strong> ${recSize}</p>
                <p><strong>Safety Margin:</strong> ${margin}</p>
                ${warning}
            `;
            result.style.display = 'block';
        });
    }

    /* ── WHATSAPP QUOTE ── */
    function setupWhatsAppQuote() {
        const btn = document.getElementById('btnQuoteWhatsApp');
        if (!btn) return;

        btn.addEventListener('click', () => {
            const name = (document.getElementById('custName').value || '').trim();
            const phone = (document.getElementById('custPhone').value || '').trim();

            if (!name || !phone) {
                alert('Please fill in your Name and Mobile Number to request a quote.');
                return;
            }

            const company = (document.getElementById('custCompany').value || '').trim();
            const qty = (document.getElementById('custQty').value || '').trim();
            const material = document.getElementById('custMaterial').value;
            const printing = document.getElementById('custPrinting').value;
            const plyData = PLY_DATA[state.ply];

            const today = new Date();
            const dateStr = today.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
            const timeStr = today.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });

            const sizeStr = `${state.length} × ${state.width} × ${state.height} mm`;

            let msg = `*Quotation Request – Corrugated Box*\n`;
            msg += `Date: ${dateStr}  Time: ${timeStr}\n\n`;

            msg += `*Customer Details*\n`;
            msg += `• Name: ${name}\n`;
            msg += `• Mobile: ${phone}\n`;
            msg += `• Company (if any): ${company || '—'}\n\n`;

            msg += `*Box Specification*\n`;
            msg += `• Box Type: Corrugated Box (RSC)\n`;
            msg += `• Ply: ${state.ply}-Ply (${plyData.label.split('(')[1]}\n`;
            msg += `• Size (L × W × H): ${sizeStr}\n`;
            msg += `• Wall Thickness: ${plyData.thickness} mm\n`;
            msg += `• Weight Capacity: ${plyData.capacity}\n`;
            msg += `• Material: ${material}\n`;
            msg += `• Printing: ${printing}\n`;
            msg += `• Quantity Required: ${qty || '—'} pcs\n\n`;

            msg += `Please share quotation and delivery timeline for the above specification.\n`;
            msg += `Thank you.`;

            const waUrl = `https://wa.me/917066959760?text=${encodeURIComponent(msg)}`;
            window.open(waUrl, '_blank');
        });
    }

    /* ── BOOT ── */
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();

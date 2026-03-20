/**
 * @file 3D Box Configurator — Premium Edition
 * @description Interactive Three.js configurator with exploded view,
 *              dimension lines, zoom, strength meter, and GSM selection.
 * @author ARTI ENTERPRISES
 * @version 1.2.0
 * @requires THREE.js r128, CSS2DRenderer
 */

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

    const { 
        getSiteConfig = () => window.ARTI_SITE || {},
        buildLeadMessage = () => 'Quotation Request',
        buildWhatsAppUrl = (msg) => `https://wa.me/919420996107?text=${encodeURIComponent(msg)}`
    } = window.ARTI_SITE_UTILS || {};

    /* ── STATE ── */
    let state = {
        length: 300,
        width: 200,
        height: 150,
        gsm: 150,
        ply: 3,
        unit: 'mm',
        exploded: false
    };

    let scene, camera, renderer, mainGroup, labelRenderer, groundPlane;
    let isDragging = false;
    let previousMouse = { x: 0, y: 0 };
    let rotationTarget = { x: -0.3, y: 0.5 };
    let rotationCurrent = { x: -0.3, y: 0.5 };
    const INERTIA = 0.06;
    let zoomTarget = 5;
    let zoomCurrent = 5;
    const ZOOM_MIN = 2.5;
    const ZOOM_MAX = 10;
    const AUTO_ROTATE_SPEED = 0.42;
    const AUTO_ROTATE_DELAY = 1200;
    const FLOAT_AMPLITUDE = 0.07;
    const FLOAT_SPEED = 1.35;

    /* ── keep a list of CSS2D labels so we can clean them up ── */
    let css2dLabels = [];
    let animationFrameId = null;
    let clock = null;
    let lastInteractionAt = 0;
    let textureCache = {
        kraft: null,
        corrugated: null
    };

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
        setupDownloadSpec();
        updateSpecs();

        container.addEventListener('pointerdown', () => {
            const hint = document.getElementById('viewerHint');
            if (hint) hint.classList.add('hidden');
        }, { once: true });

        window.addEventListener('resize', onResize);
    }

    /* ── KRAFT TEXTURE (procedural canvas) ── */
    function createKraftTexture() {
        if (textureCache.kraft) return textureCache.kraft;

        const size = 512;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');

        /* base fill with noise grain */
        const gradient = ctx.createLinearGradient(0, 0, size, size);
        gradient.addColorStop(0, '#d8b982');
        gradient.addColorStop(0.5, '#c59d5f');
        gradient.addColorStop(1, '#a67b46');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, size, size);

        /* fiber grain */
        for (let i = 0; i < 350; i++) {
            const y = Math.random() * size;
            const alpha = 0.02 + Math.random() * 0.04;
            ctx.strokeStyle = `rgba(90,60,30,${alpha})`;
            ctx.lineWidth = 0.8 + Math.random() * 1.5;
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(size, y + (Math.random() - 0.5) * 20);
            ctx.stroke();
        }

        /* recycled pulp specks */
        for (let i = 0; i < 25000; i++) {
            const x = Math.random() * size;
            const y = Math.random() * size;
            const len = 1 + Math.random() * 4;
            const angle = Math.random() * Math.PI * 2;
            const dark = Math.random() > 0.85;
            const alpha = 0.05 + Math.random() * 0.15;
            ctx.strokeStyle = dark ? `rgba(60,40,20,${alpha})` : `rgba(255,250,230,${alpha})`;
            ctx.lineWidth = 0.4 + Math.random() * 0.4;
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(x + Math.cos(angle) * len, y + Math.sin(angle) * len);
            ctx.stroke();
        }

        /* water stains / unevenness */
        for (let i = 0; i < 15; i++) {
            const x = Math.random() * size;
            const y = Math.random() * size;
            const r = 20 + Math.random() * 60;
            const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
            grad.addColorStop(0, `rgba(130,100,60,${0.03 + Math.random() * 0.04})`);
            grad.addColorStop(1, 'rgba(130,100,60,0)');
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(x, y, r, 0, Math.PI * 2);
            ctx.fill();
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
        tex.repeat.set(1.6, 1.6);
        if (renderer && renderer.capabilities && typeof renderer.capabilities.getMaxAnisotropy === 'function') {
            tex.anisotropy = Math.min(renderer.capabilities.getMaxAnisotropy(), 8);
        }
        textureCache.kraft = tex;
        return tex;
    }

    /* ── THREE.JS SCENE ── */
    function setupScene(container) {
        scene = new THREE.Scene();
        scene.background = null;
        clock = new THREE.Clock();

        camera = new THREE.PerspectiveCamera(
            40, container.clientWidth / container.clientHeight, 0.1, 1000
        );
        camera.position.set(0, 0.2, zoomCurrent);
        camera.lookAt(0, 0.05, 0);

        renderer = new THREE.WebGLRenderer({
            antialias: true,
            alpha: true,
            powerPreference: 'high-performance'
        });
        renderer.setSize(container.clientWidth, container.clientHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2.25));
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        renderer.outputEncoding = THREE.sRGBEncoding;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.08;
        renderer.physicallyCorrectLights = true;
        renderer.setClearColor(0x000000, 0);
        container.appendChild(renderer.domElement);

        /* CSS2D label renderer */
        if (typeof THREE.CSS2DRenderer !== 'undefined') {
            labelRenderer = new THREE.CSS2DRenderer();
            labelRenderer.setSize(container.clientWidth, container.clientHeight);
            labelRenderer.domElement.style.position = 'absolute';
            labelRenderer.domElement.style.top = '0';
            labelRenderer.domElement.style.left = '0';
            labelRenderer.domElement.style.pointerEvents = 'none';
            labelRenderer.domElement.style.zIndex = '2';
            container.appendChild(labelRenderer.domElement);
        }

        /* Lights — studio setup */
        const ambient = new THREE.HemisphereLight(0xffffff, 0xeef2ff, 0.95);
        scene.add(ambient);

        const dirLight = new THREE.DirectionalLight(0xfffcf5, 1.8);
        dirLight.position.set(-5, 8, 6);
        dirLight.castShadow = true;
        dirLight.shadow.mapSize.set(2048, 2048);
        dirLight.shadow.camera.near = 0.5;
        dirLight.shadow.camera.far = 25;
        dirLight.shadow.bias = -0.0002;
        scene.add(dirLight);

        const fillLight = new THREE.DirectionalLight(0xffffff, 1.1);
        fillLight.position.set(6, 3, -4);
        scene.add(fillLight);

        const rimLight = new THREE.DirectionalLight(0xe0f2fe, 0.75);
        rimLight.position.set(-2, 4, -8);
        scene.add(rimLight);

        const warmKick = new THREE.PointLight(0xffd4a3, 0.55, 12, 2);
        warmKick.position.set(0, 1.2, 3.2);
        scene.add(warmKick);

        /* Ground shadow plane */
        const groundGeo = new THREE.PlaneGeometry(20, 20);
        const groundMat = new THREE.ShadowMaterial({ opacity: 0.12 });
        groundPlane = new THREE.Mesh(groundGeo, groundMat);
        groundPlane.rotation.x = -Math.PI / 2;
        groundPlane.position.y = -0.8;
        groundPlane.receiveShadow = true;
        scene.add(groundPlane);
    }

    /* ── MATERIALS ── */
    function createBoxMaterial(ply) {
        const tex = createKraftTexture();
        const data = PLY_DATA[ply];
        return new THREE.MeshStandardMaterial({
            map: tex,
            color: data.color,
            roughness: 0.78,
            metalness: 0.02,
            envMapIntensity: 0.18,
            flatShading: false
        });
    }

    function createLayerMaterial(colorHex, isFlute) {
        const mat = new THREE.MeshStandardMaterial({
            color: colorHex,
            roughness: isFlute ? 0.88 : 0.72,
            metalness: 0.0,
            transparent: true,
            opacity: 0.92,
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
        if (mainGroup) {
            scene.remove(mainGroup);
            disposeObjectTree(mainGroup);
        }
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
        frameView();
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
            color: edgeColor, roughness: 0.95, metalness: 0.0,
            bumpMap: createCorrugatedBumpMap(), bumpScale: 0.015
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
        const flapL_major = l;
        const flapW_major = w / 2;
        const flapL_minor = w - (mainPanelThickness * 2);
        const flapW_minor = l / 2;

        const angleFront = -0.5; 
        const angleBack = 0.6;
        const angleLeft = -0.4;
        const angleRight = 0.45;

        // Front Flap
        const frontFlapGeo = new THREE.BoxGeometry(flapL_major, mainPanelThickness, flapW_major);
        frontFlapGeo.translate(0, mainPanelThickness / 2, flapW_major / 2);
        const frontFlap = new THREE.Mesh(frontFlapGeo, bottomMats);
        frontFlap.castShadow = true;
        frontFlap.receiveShadow = true;
        const pivotFront = new THREE.Group();
        pivotFront.position.set(0, h / 2, w / 2 - mainPanelThickness);
        pivotFront.rotation.x = angleFront;
        pivotFront.add(frontFlap);
        mainGroup.add(pivotFront);

        // Back Flap
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

        // Left Flap
        const leftFlapGeo = new THREE.BoxGeometry(flapW_minor, mainPanelThickness, flapL_minor);
        leftFlapGeo.translate(-flapW_minor / 2, mainPanelThickness / 2, 0);
        const leftFlap = new THREE.Mesh(leftFlapGeo, sideMats);
        leftFlap.castShadow = true;
        leftFlap.receiveShadow = true;
        const pivotLeft = new THREE.Group();
        pivotLeft.position.set(-l / 2 + mainPanelThickness, h / 2, 0);
        pivotLeft.rotation.z = angleLeft;
        pivotLeft.add(leftFlap);
        mainGroup.add(pivotLeft);

        // Right Flap
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

    /* Helper: Corrugated edge bump map */
    function createCorrugatedBumpMap() {
        if (textureCache.corrugated) return textureCache.corrugated;
        const size = 128;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#111';
        ctx.fillRect(0, 0, size, size);
        ctx.fillStyle = '#FFF';
        for (let y = 0; y < size; y += 8) {
            ctx.fillRect(0, y, size, 4);
        }
        const tex = new THREE.CanvasTexture(canvas);
        tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
        tex.repeat.set(1, 10);
        if (renderer && renderer.capabilities && typeof renderer.capabilities.getMaxAnisotropy === 'function') {
            tex.anisotropy = Math.min(renderer.capabilities.getMaxAnisotropy(), 4);
        }
        textureCache.corrugated = tex;
        return tex;
    }

    /* ── DIMENSION LINES ── */
    function buildDimensionLines(l, w, h) {
        const lineMat = new THREE.LineBasicMaterial({ color: 0xa8c8f9, transparent: true, opacity: 0.95 });
        const maxSpan = Math.max(l, w, h);
        const offset = Math.max(0.62, maxSpan * 0.4);
        const tickSize = Math.max(0.12, offset * 0.22);

        const lenPts = [
            new THREE.Vector3(l / 2 + offset, -h / 2, -w / 2),
            new THREE.Vector3(l / 2 + offset, -h / 2, w / 2)
        ];
        const lenGeo = new THREE.BufferGeometry().setFromPoints(lenPts);
        mainGroup.add(new THREE.Line(lenGeo, lineMat));
        addTick(mainGroup, l / 2 + offset, -h / 2, -w / 2, tickSize, 0, 0, lineMat);
        addTick(mainGroup, l / 2 + offset, -h / 2, w / 2, tickSize, 0, 0, lineMat);
        const lenLabel = makeLabel(formatDim(state.length), 'dim-label');
        if (lenLabel) {
            lenLabel.position.set(l / 2 + offset, -h / 2 - 0.2, 0);
            mainGroup.add(lenLabel);
        }

        const widPts = [
            new THREE.Vector3(-l / 2, -h / 2, w / 2 + offset),
            new THREE.Vector3(l / 2, -h / 2, w / 2 + offset)
        ];
        const widGeo = new THREE.BufferGeometry().setFromPoints(widPts);
        mainGroup.add(new THREE.Line(widGeo, lineMat));
        addTick(mainGroup, -l / 2, -h / 2, w / 2 + offset, 0, 0, tickSize, lineMat);
        addTick(mainGroup, l / 2, -h / 2, w / 2 + offset, 0, 0, tickSize, lineMat);
        const widLabel = makeLabel(formatDim(state.width), 'dim-label');
        if (widLabel) {
            widLabel.position.set(0, -h / 2 - 0.2, w / 2 + offset);
            mainGroup.add(widLabel);
        }

        const hPts = [
            new THREE.Vector3(-l / 2 - offset * 0.5, -h / 2, -w / 2),
            new THREE.Vector3(-l / 2 - offset * 0.5, h / 2, -w / 2)
        ];
        const hGeo = new THREE.BufferGeometry().setFromPoints(hPts);
        mainGroup.add(new THREE.Line(hGeo, lineMat));
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
        const layerColors = [0xC4A86B, 0xD4C49A, 0xB89A5A, 0xD4C49A, 0xB89A5A, 0xD4C49A, 0xA8824A];

        for (let i = 0; i < layers; i++) {
            const isFlute = i % 2 === 1;
            const layerH = isFlute ? thickness * 1.8 : thickness * 0.6;
            const yPos = (i - (layers - 1) / 2) * gap;

            if (isFlute) {
                buildFluteLayer(l * 0.88, layerH, w * 0.68, yPos, layerColors[i] || 0xD4C49A);
            } else {
                const geo = new THREE.BoxGeometry(l * 0.88, layerH, w * 0.68);
                const mat = createLayerMaterial(layerColors[i] || 0xC4A86B, false);
                const mesh = new THREE.Mesh(geo, mat);
                mesh.position.y = yPos;
                mesh.castShadow = true;
                mesh.receiveShadow = true;
                mainGroup.add(mesh);
            }
            const name = data.layerNames[i] || ('Layer ' + (i + 1));
            const label = makeLabel(name, 'layer-label');
            if (label) {
                label.position.set(l * 0.52, yPos, 0);
                mainGroup.add(label);
            }
        }
    }

    function buildFluteLayer(layerW, layerH, layerD, yPos, color) {
        const segments = 30;
        const amplitude = layerH * 0.4;
        const frequency = 8;
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
            color: color, roughness: 0.9, metalness: 0.0, transparent: true, opacity: 0.85, side: THREE.DoubleSide
        });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.castShadow = true;
        mainGroup.add(mesh);
    }

    function setupControls() {
        const container = document.getElementById('boxViewer');
        container.addEventListener('pointerdown', (e) => {
            isDragging = true;
            lastInteractionAt = performance.now();
            previousMouse.x = e.clientX;
            previousMouse.y = e.clientY;
        });
        window.addEventListener('pointermove', (e) => {
            if (!isDragging) return;
            lastInteractionAt = performance.now();
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
            lastInteractionAt = performance.now();
        });
        container.addEventListener('wheel', (e) => {
            e.preventDefault();
            lastInteractionAt = performance.now();
            zoomTarget += e.deltaY * 0.005;
            zoomTarget = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, zoomTarget));
        }, { passive: false });
    }

    function animate() {
        animationFrameId = requestAnimationFrame(animate);
        const delta = Math.min(clock ? clock.getDelta() : 1 / 60, 0.05);
        const smoothing = 1 - Math.pow(1 - INERTIA, delta * 60);
        const zoomSmoothing = 1 - Math.pow(1 - 0.08, delta * 60);
        const now = performance.now();
        const shouldAutoRotate = !isDragging && (now - lastInteractionAt) > AUTO_ROTATE_DELAY;

        if (shouldAutoRotate) rotationTarget.y += AUTO_ROTATE_SPEED * delta;
        rotationCurrent.x += (rotationTarget.x - rotationCurrent.x) * smoothing;
        rotationCurrent.y += (rotationTarget.y - rotationCurrent.y) * smoothing;

        if (mainGroup) {
            mainGroup.rotation.x = rotationCurrent.x;
            mainGroup.rotation.y = rotationCurrent.y;
            mainGroup.position.y = shouldAutoRotate ? Math.sin(now * 0.001 * FLOAT_SPEED) * FLOAT_AMPLITUDE : 0;
        }

        zoomCurrent += (zoomTarget - zoomCurrent) * zoomSmoothing;
        camera.position.set(0, 0.2, zoomCurrent);
        camera.lookAt(0, 0.05, 0);

        renderer.render(scene, camera);
        if (labelRenderer) labelRenderer.render(scene, camera);
    }

    function onResize() {
        const container = document.getElementById('boxViewer');
        if (!container) return;
        camera.aspect = container.clientWidth / container.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(container.clientWidth, container.clientHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2.25));
        if (labelRenderer) labelRenderer.setSize(container.clientWidth, container.clientHeight);
        frameView();
    }

    function setupSliders() {
        const sliders = { 
            sliderLength: 'length', 
            sliderWidth: 'width', 
            sliderHeight: 'height',
            sliderGsm: 'gsm'
        };
        Object.entries(sliders).forEach(([id, key]) => {
            const el = document.getElementById(id);
            if (!el) return;
            el.addEventListener('input', () => {
                state[key] = parseInt(el.value);
                const displayId = id === 'sliderLength' ? 'valLength' : 
                                 id === 'sliderWidth' ? 'valWidth' : 
                                 id === 'sliderHeight' ? 'valHeight' : 'valGsm';
                updateSliderDisplay(displayId, state[key]);
                if (key !== 'gsm') buildBox();
                updateSpecs();
            });
        });
    }

    function updateSliderDisplay(id, val) {
        const el = document.getElementById(id);
        if (!el) return;
        // GSM is always displayed as-is (no unit conversion)
        if (id === 'valGsm') {
            el.textContent = val;
            return;
        }
        el.textContent = state.unit === 'in' ? (val / 25.4).toFixed(1) : val;
    }

    function updateAllDisplays() {
        updateSliderDisplay('valLength', state.length);
        updateSliderDisplay('valWidth', state.width);
        updateSliderDisplay('valHeight', state.height);
        updateSliderDisplay('valGsm', state.gsm);
        document.querySelectorAll('.cfg-unit-label').forEach(l => l.textContent = state.unit);
        buildBox();
    }

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

    function updateSpecs() {
        const data = PLY_DATA[state.ply];
        const el = (id) => document.getElementById(id);
        if (el('specThickness')) el('specThickness').textContent = data.thickness + ' mm';
        if (el('specCapacity')) el('specCapacity').textContent = data.capacity;
        if (el('specLayers')) el('specLayers').textContent = data.layers;
        if (el('specRecommendedUse')) el('specRecommendedUse').textContent = data.recommendedUse;

        const volume = state.length * state.width * state.height;
        const sizePenalty = (volume / (800 * 600 * 600)) * 25;
        let strength = Math.max(5, Math.min(100, data.strengthScore - sizePenalty));
        let label, color;
        if (strength <= 33) { label = 'Low'; color = '#EF4444'; }
        else if (strength <= 66) { label = 'Medium'; color = '#F59E0B'; }
        else { label = 'High'; color = '#22C55E'; }

        if (el('specStrengthLabel')) el('specStrengthLabel').textContent = label;
        const bar = el('specStrengthFill');
        if (bar) { bar.style.width = strength + '%'; bar.style.background = color; }
    }

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

    function setupReset() {
        const btn = document.getElementById('btnReset');
        if (!btn) return;
        btn.addEventListener('click', () => {
            rotationTarget.x = -0.3; rotationTarget.y = 0.5;
            lastInteractionAt = 0; state.exploded = false;
            const exBtn = document.getElementById('btnExplode');
            if (exBtn) {
                exBtn.classList.remove('active');
                const s = exBtn.querySelector('span');
                if (s) s.textContent = 'Show Layers';
            }
            buildBox();
        });
    }

    function setupSuggestion() {
        const btn = document.getElementById('btnSuggest');
        if (!btn) return;
        btn.addEventListener('click', () => {
            const weight = parseFloat(document.getElementById('productWeight').value);
            const shipping = document.getElementById('shippingType').value;
            const result = document.getElementById('suggestionResult');
            if (!weight || !shipping) {
                result.innerHTML = '<p>Please enter weight and shipping type.</p>';
                result.style.display = 'block'; return;
            }
            let rPly, rSize, rMargin, warning = '';
            if (weight <= 5) { rPly = '3-Ply'; rSize = '10x8x6 in'; rMargin = 'Safe'; }
            else if (weight <= 15) { rPly = shipping === 'longdist' ? '5-Ply' : '3-Ply'; rSize = '15x10x10 in'; rMargin = 'Balanced'; }
            else if (weight <= 40) { rPly = '5-Ply'; rSize = '18x12x12 in'; rMargin = 'Heavy Duty'; }
            else { rPly = '7-Ply'; rSize = '22x22x30 in'; rMargin = 'Export Grade'; }

            const maxW = state.ply === 3 ? 15 : state.ply === 5 ? 40 : 200;
            if (weight > maxW) warning = `<p style="color:#DC2626">⚠️ Selection may be weak for ${weight}kg.</p>`;
            result.innerHTML = `<h4>✅ Recommendation</h4><p>Ply: ${rPly}</p><p>Size: ${rSize}</p><p>Note: ${rMargin}</p>${warning}`;
            result.style.display = 'block';
        });
    }

    function setupWhatsAppQuote() {
        const btn = document.getElementById('btnQuoteWhatsApp');
        if (!btn) return;
        btn.addEventListener('click', () => {
            const name = document.getElementById('custName').value.trim();
            const phone = document.getElementById('custPhone').value.trim();
            if (!name || !phone) { alert('Please enter Name and Mobile.'); return; }
            const company = document.getElementById('custCompany').value.trim();
            const qty = document.getElementById('custQty').value.trim();
            const material = document.getElementById('custMaterial').value;
            const printing = document.getElementById('custPrinting').value;
            const plyData = PLY_DATA[state.ply];
            const sizeStr = `${state.length} × ${state.width} × ${state.height} mm`;
            const details = [
                'Box Type: Corrugated Box (RSC)',
                `Source Page: 3D Configurator`,
                `Dimensions: ${sizeStr}`,
                `Ply: ${state.ply}-Ply (${plyData.label})`,
                `Paper Quality: ${state.gsm} GSM`,
                `Wall Thickness: ${plyData.thickness} mm`,
                `Weight Capacity: ${plyData.capacity}`,
                `Material: ${material}`,
                `Printing: ${printing}`,
                `Quantity Required: ${qty || '—'} pcs`
            ];
            const message = buildLeadMessage({
                requestType: '3D Configurator Quote',
                source: '3D Configurator',
                name,
                phone,
                company,
                details,
                notes: 'Best for instant price discussion and custom sizing.',
                closing: 'Please share quotation and delivery timeline for the configured box above.'
            });

            window.open(buildWhatsAppUrl(message), '_blank', 'noopener');
        });
    }

    function setupDownloadSpec() {
        const ctaBox = document.querySelector('.cfg-cta-box');
        if (!ctaBox) return;
        // Guard: prevent duplicate button creation
        if (ctaBox.querySelector('.btn-download-spec')) return;
        const btn = document.createElement('button');
        btn.className = 'btn btn-outline btn-lg btn-download-spec';
        btn.style.width = '100%';
        btn.style.marginTop = '0.5rem';
        btn.textContent = 'Download Specification Sheet';
        btn.addEventListener('click', () => {
            const plyData = PLY_DATA[state.ply];
            const site = getSiteConfig();
            const content = [
                'ARTI ENTERPRISES - BOX SPECIFICATION SHEET',
                '-------------------------------------------',
                'Product: Corrugated Box (RSC)',
                `Dimensions: ${state.length} x ${state.width} x ${state.height} ${state.unit}`,
                `Ply Type: ${plyData.label}`,
                `Paper Quality: ${state.gsm} GSM`,
                `Wall Thickness: ${plyData.thickness} mm`,
                `Weight Capacity: ${plyData.capacity}`,
                `Recommended Use: ${plyData.recommendedUse}`,
                '-------------------------------------------',
                `Generated on: ${new Date().toLocaleDateString()}`,
                `Contact: ${site.phoneDisplay} (WhatsApp)`
            ].join('\n');
            const blob = new Blob([content], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Arti-Box-Spec-${state.length}x${state.width}.txt`;
            a.click();
            setTimeout(() => URL.revokeObjectURL(url), 100);
        });
        ctaBox.appendChild(btn);
    }

    function frameView() {
        if (!mainGroup || !camera) return;
        const bounds = new THREE.Box3().setFromObject(mainGroup);
        const size = bounds.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z, 0.5);
        const dist = maxDim / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov * 0.5))) * 1.5;
        zoomTarget = THREE.MathUtils.clamp(dist, ZOOM_MIN, ZOOM_MAX);
        if (groundPlane) groundPlane.position.y = bounds.min.y - 0.08;
    }

    function disposeMaterial(mat) {
        if (!mat) return;
        if (Array.isArray(mat)) { mat.forEach(disposeMaterial); return; }
        if (mat.map && mat.map !== textureCache.kraft) mat.map.dispose();
        if (mat.bumpMap && mat.bumpMap !== textureCache.corrugated) mat.bumpMap.dispose();
        mat.dispose();
    }

    function disposeObjectTree(obj) {
        obj.traverse((child) => {
            if (child.geometry) child.geometry.dispose();
            if (child.material) disposeMaterial(child.material);
        });
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();

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
    const hasThreeSupport = typeof window.THREE !== 'undefined';

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

        if (hasThreeSupport) {
            setupScene(container);
            buildBox();
            animate();
            setupControls();

            container.addEventListener('pointerdown', () => {
                const hint = document.getElementById('viewerHint');
                if (hint) hint.classList.add('hidden');
            }, { once: true });

            window.addEventListener('resize', onResize);
        } else {
            setViewerFallback(container);
            disableViewerActions();
        }

        setupSliders();
        setupPlyButtons();
        setupUnitToggle();
        setupSuggestion();
        setupExplode();
        setupReset();
        setupWhatsAppQuote();
        setupDownloadSpec();
        updateSpecs();
    }

    function setViewerFallback(container) {
        container.classList.add('cfg-viewer--fallback');
        container.replaceChildren();

        const fallback = document.createElement('div');
        fallback.className = 'cfg-viewer-fallback';

        const title = document.createElement('strong');
        title.textContent = '3D preview unavailable';

        const message = document.createElement('p');
        message.textContent = 'The interactive viewer could not load, but you can still configure dimensions, compare ply strength, and request a quote.';

        fallback.append(title, message);
        container.appendChild(fallback);
    }

    function disableViewerActions() {
        document.querySelectorAll('#btnExplode, #btnReset').forEach((button) => {
            button.disabled = true;
            button.setAttribute('aria-disabled', 'true');
        });
    }

    /* ── KRAFT TEXTURE (procedural canvas) ── */
    function createKraftTexture() {
        if (textureCache.kraft) return textureCache.kraft;

        const size = 512;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');

        /* base fill with very soft gradient for a clean, premium look */
        const gradient = ctx.createLinearGradient(0, 0, size, size);
        gradient.addColorStop(0, '#e5cba2');
        gradient.addColorStop(0.5, '#d6ba8f');
        gradient.addColorStop(1, '#c5a77a');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, size, size);

        /* subtle fiber grain, reduced for a cleaner vector-like reference style */
        for (let i = 0; i < 150; i++) {
            const y = Math.random() * size;
            const alpha = 0.01 + Math.random() * 0.02;
            ctx.strokeStyle = `rgba(90,60,30,${alpha})`;
            ctx.lineWidth = 0.8 + Math.random() * 1.5;
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(size, y + (Math.random() - 0.5) * 10);
            ctx.stroke();
        }

        /* very faint pulp specks */
        for (let i = 0; i < 5000; i++) {
            const x = Math.random() * size;
            const y = Math.random() * size;
            const len = 1 + Math.random() * 3;
            const angle = Math.random() * Math.PI * 2;
            const dark = Math.random() > 0.85;
            const alpha = 0.02 + Math.random() * 0.05;
            ctx.strokeStyle = dark ? `rgba(60,40,20,${alpha})` : `rgba(255,250,230,${alpha})`;
            ctx.lineWidth = 0.4 + Math.random() * 0.4;
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(x + Math.cos(angle) * len, y + Math.sin(angle) * len);
            ctx.stroke();
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
        renderer.toneMappingExposure = 1.15; // slightly brighter
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

        /* Lights — studio setup matching the reference */
        const ambient = new THREE.HemisphereLight(0xffffff, 0xeef2ff, 1.1);
        scene.add(ambient);

        const dirLight = new THREE.DirectionalLight(0xfffcf5, 1.6);
        dirLight.position.set(-6, 10, 5); // Moves shadow to bottom right
        dirLight.castShadow = true;
        dirLight.shadow.mapSize.set(2048, 2048);
        dirLight.shadow.camera.near = 0.5;
        dirLight.shadow.camera.far = 25;
        dirLight.shadow.bias = -0.0002;
        scene.add(dirLight);

        const fillLight = new THREE.DirectionalLight(0xffffff, 0.8);
        fillLight.position.set(6, 4, -4);
        scene.add(fillLight);

        /* Ground shadow plane */
        const groundGeo = new THREE.PlaneGeometry(20, 20);
        // Darkened shadow opacity from 0.12 to 0.25 to make it distinct like the reference
        const groundMat = new THREE.ShadowMaterial({ opacity: 0.25 });
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
        if (!hasThreeSupport || !scene) return;
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
        // Subtle thickness boost, not too blocky
        const visualThickness = Math.max(thickness * 1.1, 0.06);
        
        // Enhance exterior with fiber bump map
        const materialExterior = createBoxMaterial(ply);
        const tex = createKraftTexture();
        materialExterior.bumpMap = tex;
        materialExterior.bumpScale = 0.0035;
        materialExterior.needsUpdate = true;

        const materialInterior = new THREE.MeshStandardMaterial({
            map: tex,
            bumpMap: tex,
            bumpScale: 0.002,
            color: 0xE2CEAD, // Lighter, premium unbleached interior
            roughness: 0.8,
            metalness: 0.02
        });

        const edgeColor = 0x907248; // Darkened the corrugated edge color
        const edgeMaterial = new THREE.MeshStandardMaterial({
            color: edgeColor, roughness: 1.0, metalness: 0.0,
            bumpMap: createCorrugatedBumpMap(), bumpScale: 0.04 // Deeper flutes
        });

        const frontBackW = l;
        const sideW = w - (visualThickness * 2);

        // 0: right, 1: left, 2: top, 3: bottom, 4: front (ext), 5: back (int)
        const frontMats = [edgeMaterial, edgeMaterial, edgeMaterial, edgeMaterial, materialExterior, materialInterior];
        // 0: right, 1: left, 2: top, 3: bottom, 4: front (int), 5: back (ext)
        const backMats = [edgeMaterial, edgeMaterial, edgeMaterial, edgeMaterial, materialInterior, materialExterior];
        
        // 0: right (ext), 1: left (int), 2: top, 3: bottom, 4: front, 5: back
        const rightMats = [materialExterior, materialInterior, edgeMaterial, edgeMaterial, edgeMaterial, edgeMaterial];
        // 0: right (int), 1: left (ext), 2: top, 3: bottom, 4: front, 5: back
        const leftMats = [materialInterior, materialExterior, edgeMaterial, edgeMaterial, edgeMaterial, edgeMaterial];

        // 0: right, 1: left, 2: top (int), 3: bottom (ext), 4: front, 5: back
        const bottomMats = [edgeMaterial, edgeMaterial, materialInterior, materialExterior, edgeMaterial, edgeMaterial];

        const panels = [
            { size: [frontBackW, h, visualThickness], pos: [0, 0, w / 2 - visualThickness / 2], mats: frontMats },
            { size: [frontBackW, h, visualThickness], pos: [0, 0, -w / 2 + visualThickness / 2], mats: backMats },
            { size: [visualThickness, h, sideW], pos: [-l / 2 + visualThickness / 2, 0, 0], mats: leftMats },
            { size: [visualThickness, h, sideW], pos: [l / 2 - visualThickness / 2, 0, 0], mats: rightMats },
            { size: [l - visualThickness * 2, visualThickness, sideW], pos: [0, -h / 2 + visualThickness / 2, 0], mats: bottomMats }
        ];

        panels.forEach(p => {
            const geo = new THREE.BoxGeometry(p.size[0], p.size[1], p.size[2]);
            const mesh = new THREE.Mesh(geo, p.mats);
            mesh.position.set(p.pos[0], p.pos[1], p.pos[2]);
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            mainGroup.add(mesh);
        });

        /* ── REALISTIC OPEN FLAPS ── */
        const flapL_major = l;
        const flapW_major = w / 2;
        const flapL_minor = w - (visualThickness * 2);
        const flapW_minor = l / 2;

        // Upward leaning open flaps. 0 = perfectly horizontal flat. 
        // -PI/2 (approx -1.57) = closed vertically inwards.
        const angleFront = -0.85; 
        const angleBack = 0.85;
        const angleLeft = -0.7;
        const angleRight = 0.7;

        // Front Flap
        const frontFlapGeo = new THREE.BoxGeometry(flapL_major, visualThickness, flapW_major);
        frontFlapGeo.translate(0, visualThickness / 2, flapW_major / 2);
        const flapFrontMats = [edgeMaterial, edgeMaterial, materialInterior, materialExterior, edgeMaterial, edgeMaterial];
        const frontFlap = new THREE.Mesh(frontFlapGeo, flapFrontMats);
        frontFlap.castShadow = true;
        frontFlap.receiveShadow = true;
        const pivotFront = new THREE.Group();
        pivotFront.position.set(0, h / 2, w / 2 - visualThickness);
        pivotFront.rotation.x = angleFront;
        pivotFront.add(frontFlap);
        mainGroup.add(pivotFront);

        // Back Flap
        const backFlapGeo = new THREE.BoxGeometry(flapL_major, visualThickness, flapW_major);
        backFlapGeo.translate(0, visualThickness / 2, -flapW_major / 2);
        const flapBackMats = [edgeMaterial, edgeMaterial, materialInterior, materialExterior, edgeMaterial, edgeMaterial];
        const backFlap = new THREE.Mesh(backFlapGeo, flapBackMats);
        backFlap.castShadow = true;
        backFlap.receiveShadow = true;
        const pivotBack = new THREE.Group();
        pivotBack.position.set(0, h / 2, -w / 2 + visualThickness);
        pivotBack.rotation.x = angleBack;
        pivotBack.add(backFlap);
        mainGroup.add(pivotBack);

        // Left Flap
        const leftFlapGeo = new THREE.BoxGeometry(flapW_minor, visualThickness, flapL_minor);
        leftFlapGeo.translate(-flapW_minor / 2, visualThickness / 2, 0);
        const flapLeftMats = [edgeMaterial, edgeMaterial, materialInterior, materialExterior, edgeMaterial, edgeMaterial];
        const leftFlap = new THREE.Mesh(leftFlapGeo, flapLeftMats);
        leftFlap.castShadow = true;
        leftFlap.receiveShadow = true;
        const pivotLeft = new THREE.Group();
        pivotLeft.position.set(-l / 2 + visualThickness, h / 2, 0);
        pivotLeft.rotation.z = angleLeft;
        pivotLeft.add(leftFlap);
        mainGroup.add(pivotLeft);

        // Right Flap
        const rightFlapGeo = new THREE.BoxGeometry(flapW_minor, visualThickness, flapL_minor);
        rightFlapGeo.translate(flapW_minor / 2, visualThickness / 2, 0);
        const flapRightMats = [edgeMaterial, edgeMaterial, materialInterior, materialExterior, edgeMaterial, edgeMaterial];
        const rightFlap = new THREE.Mesh(rightFlapGeo, flapRightMats);
        rightFlap.castShadow = true;
        rightFlap.receiveShadow = true;
        const pivotRight = new THREE.Group();
        pivotRight.position.set(l / 2 - visualThickness, h / 2, 0);
        pivotRight.rotation.z = angleRight;
        pivotRight.add(rightFlap);
        mainGroup.add(pivotRight);
    }

    /* Helper: Corrugated edge bump map */
    function createCorrugatedBumpMap() {
        if (textureCache.corrugated) return textureCache.corrugated;
        const size = 256;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        
        ctx.fillStyle = '#1a1a1a'; // Deep shadows in the flute gaps
        ctx.fillRect(0, 0, size, size);
        
        // Draw wavy flutes
        const flutes = 16;
        const width = size / flutes;
        for (let i = 0; i < flutes; i++) {
            const x = i * width;
            const grad = ctx.createLinearGradient(x, 0, x + width, 0);
            grad.addColorStop(0, '#1a1a1a');
            grad.addColorStop(0.5, '#ffffff'); // Peak of the flute
            grad.addColorStop(1, '#1a1a1a');
            
            ctx.fillStyle = grad;
            ctx.fillRect(x, 0, width, size);
        }

        const tex = new THREE.CanvasTexture(canvas);
        tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
        tex.repeat.set(8, 1); // Repeat often along the length of the edge
        if (renderer && renderer.capabilities && typeof renderer.capabilities.getMaxAnisotropy === 'function') {
            tex.anisotropy = Math.min(renderer.capabilities.getMaxAnisotropy(), 8);
        }
        textureCache.corrugated = tex;
        return tex;
    }

    /* ── DIMENSION LINES ── */
    function buildDimensionLines(l, w, h) {
        const lineMat = new THREE.LineBasicMaterial({ color: 0x93c5fd, transparent: true, opacity: 0.8 });
        const maxSpan = Math.max(l, w, h);
        // Push offset to 65% of max span so it clears the flaps completely
        const offset = Math.max(0.62, maxSpan * 0.65);
        const tickSize = Math.max(0.12, offset * 0.15);

        // LENGTH Line (along X axis, placed in front of the box at +Z)
        const lenPts = [
            new THREE.Vector3(-l / 2, -h / 2, w / 2 + offset),
            new THREE.Vector3(l / 2, -h / 2, w / 2 + offset)
        ];
        const lenGeo = new THREE.BufferGeometry().setFromPoints(lenPts);
        mainGroup.add(new THREE.Line(lenGeo, lineMat));
        addTick(mainGroup, -l / 2, -h / 2, w / 2 + offset, 0, 0, tickSize, lineMat);
        addTick(mainGroup, l / 2, -h / 2, w / 2 + offset, 0, 0, tickSize, lineMat);
        const lenLabel = makeLabel(formatDim(state.length), 'dim-label');
        if (lenLabel) {
            lenLabel.position.set(0, -h / 2, w / 2 + offset + 0.35); // centered on X
            mainGroup.add(lenLabel);
        }

        // WIDTH Line (along Z axis, placed to the right of the box at +X)
        const widPts = [
            new THREE.Vector3(l / 2 + offset, -h / 2, -w / 2),
            new THREE.Vector3(l / 2 + offset, -h / 2, w / 2)
        ];
        const widGeo = new THREE.BufferGeometry().setFromPoints(widPts);
        mainGroup.add(new THREE.Line(widGeo, lineMat));
        addTick(mainGroup, l / 2 + offset, -h / 2, -w / 2, tickSize, 0, 0, lineMat);
        addTick(mainGroup, l / 2 + offset, -h / 2, w / 2, tickSize, 0, 0, lineMat);
        const widLabel = makeLabel(formatDim(state.width), 'dim-label');
        if (widLabel) {
            widLabel.position.set(l / 2 + offset + 0.35, -h / 2, 0); // centered on Z
            mainGroup.add(widLabel);
        }

        // HEIGHT Line (along Y axis, placed to the left and back)
        const hPts = [
            new THREE.Vector3(-l / 2 - offset * 0.5, -h / 2, -w / 2 - offset * 0.3),
            new THREE.Vector3(-l / 2 - offset * 0.5, h / 2, -w / 2 - offset * 0.3)
        ];
        const hGeo = new THREE.BufferGeometry().setFromPoints(hPts);
        mainGroup.add(new THREE.Line(hGeo, lineMat));
        addTick(mainGroup, -l / 2 - offset * 0.5, -h / 2, -w / 2 - offset * 0.3, tickSize, 0, 0, lineMat);
        addTick(mainGroup, -l / 2 - offset * 0.5, h / 2, -w / 2 - offset * 0.3, tickSize, 0, 0, lineMat);
        const hLabel = makeLabel(formatDim(state.height), 'dim-label');
        if (hLabel) {
            hLabel.position.set(-l / 2 - offset * 0.5 - 0.45, 0, -w / 2 - offset * 0.3);
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
        if (!hasThreeSupport || !renderer || !camera) return;
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
        if (!hasThreeSupport || !camera || !renderer) return;
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
        document.querySelectorAll('.cfg-unit-label').forEach((label) => {
            label.textContent = getDisplayUnitLabel();
        });
        buildBox();
    }

    function getDisplayUnitLabel() {
        return state.unit === 'in' ? 'in' : 'mm';
    }

    function formatConfiguredDimension(value) {
        return state.unit === 'in' ? (value / 25.4).toFixed(1) : value;
    }

    function getDisplayDimensions() {
        return `${formatConfiguredDimension(state.length)} × ${formatConfiguredDimension(state.width)} × ${formatConfiguredDimension(state.height)} ${getDisplayUnitLabel()}`;
    }

    function getMetricDimensions() {
        return `${state.length} × ${state.width} × ${state.height} mm`;
    }

    function getQuoteDimensionSummary() {
        if (state.unit === 'in') {
            return `${getDisplayDimensions()} (${getMetricDimensions()})`;
        }
        return getMetricDimensions();
    }

    function renderSuggestionResult(title, lines, warningText) {
        const result = document.getElementById('suggestionResult');
        if (!result) return;

        result.replaceChildren();
        result.classList.remove('is-error');

        const heading = document.createElement('h4');
        heading.textContent = title;
        result.appendChild(heading);

        lines.forEach((line) => {
            const paragraph = document.createElement('p');
            paragraph.textContent = line;
            result.appendChild(paragraph);
        });

        if (warningText) {
            const warning = document.createElement('p');
            warning.className = 'cfg-warning';
            warning.textContent = warningText;
            result.appendChild(warning);
        }

        result.style.display = 'block';
    }

    function renderSuggestionError(message) {
        const result = document.getElementById('suggestionResult');
        if (!result) return;

        result.replaceChildren();
        result.classList.add('is-error');

        const paragraph = document.createElement('p');
        paragraph.textContent = message;
        result.appendChild(paragraph);
        result.style.display = 'block';
    }

    function setQuoteFeedback(message, type) {
        const feedback = document.getElementById('quoteFeedback');
        if (!feedback) return;

        feedback.hidden = false;
        feedback.textContent = message;
        feedback.className = `cfg-form-feedback is-${type}`;
    }

    function clearQuoteFeedback() {
        const feedback = document.getElementById('quoteFeedback');
        if (!feedback) return;

        feedback.hidden = true;
        feedback.textContent = '';
        feedback.className = 'cfg-form-feedback';
    }

    function setFieldValidity(field, isValid) {
        if (!field) return;
        field.classList.toggle('is-invalid', !isValid);
        field.setAttribute('aria-invalid', String(!isValid));
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
            if (!weight || !shipping) {
                renderSuggestionError('Please enter both product weight and shipping type.');
                return;
            }
            let rPly, rSize, rMargin, warning = '';
            if (weight <= 5) { rPly = '3-Ply'; rSize = '10x8x6 in'; rMargin = 'Safe'; }
            else if (weight <= 15) { rPly = shipping === 'longdist' ? '5-Ply' : '3-Ply'; rSize = '15x10x10 in'; rMargin = 'Balanced'; }
            else if (weight <= 40) { rPly = '5-Ply'; rSize = '18x12x12 in'; rMargin = 'Heavy Duty'; }
            else { rPly = '7-Ply'; rSize = '22x22x30 in'; rMargin = 'Export Grade'; }

            const recommendedPly = parseInt(rPly, 10);
            const selectedMaxWeight = state.ply === 3 ? 15 : state.ply === 5 ? 40 : 200;
            if (weight > selectedMaxWeight && state.ply !== recommendedPly) {
                warning = `The current ${state.ply}-ply selection may be weak for ${weight} kg. Switch to the suggested ${rPly} setup.`;
            }
            renderSuggestionResult('Recommended Box Setup', [
                `Suggested Ply: ${rPly}`,
                `Typical Size: ${rSize}`,
                `Handling Note: ${rMargin}`
            ], warning);
        });
    }

    function setupWhatsAppQuote() {
        const btn = document.getElementById('btnQuoteWhatsApp');
        if (!btn) return;

        const nameField = document.getElementById('custName');
        const phoneField = document.getElementById('custPhone');

        [nameField, phoneField].forEach((field) => {
            if (!field) return;
            field.addEventListener('input', () => {
                setFieldValidity(field, true);
                clearQuoteFeedback();
            });
        });

        btn.addEventListener('click', () => {
            const name = nameField ? nameField.value.trim() : '';
            const phone = phoneField ? phoneField.value.trim() : '';
            const phoneDigits = phone.replace(/\D/g, '');

            if (!name) {
                setFieldValidity(nameField, false);
                setQuoteFeedback('Please enter your full name before requesting a quote.', 'error');
                if (nameField) nameField.focus();
                return;
            }

            if (phoneDigits.length < 10) {
                setFieldValidity(phoneField, false);
                setQuoteFeedback('Please enter a valid mobile number with at least 10 digits.', 'error');
                if (phoneField) phoneField.focus();
                return;
            }

            setFieldValidity(nameField, true);
            setFieldValidity(phoneField, true);
            clearQuoteFeedback();

            const company = document.getElementById('custCompany').value.trim();
            const qty = document.getElementById('custQty').value.trim();
            const material = document.getElementById('custMaterial').value;
            const printing = document.getElementById('custPrinting').value;
            const plyData = PLY_DATA[state.ply];
            const details = [
                'Box Type: Corrugated Box (RSC)',
                `Source Page: 3D Configurator`,
                `Dimensions: ${getQuoteDimensionSummary()}`,
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
            setQuoteFeedback('Opening WhatsApp with your configured quotation request.', 'success');
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
            const displayDimensions = getDisplayDimensions();
            const content = [
                'ARTI ENTERPRISES - BOX SPECIFICATION SHEET',
                '-------------------------------------------',
                'Product: Corrugated Box (RSC)',
                `Configured Dimensions: ${displayDimensions}`,
                ...(state.unit === 'in' ? [`Metric Reference: ${getMetricDimensions()}`] : []),
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
        if (!hasThreeSupport || !mainGroup || !camera) return;
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

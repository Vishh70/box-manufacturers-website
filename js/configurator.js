/* ============================================
   3D Box Configurator — JavaScript
   Three.js Scene + Controls + Logic
   ============================================ */

(function () {
    'use strict';

    // ---- PLY DATA ----
    const PLY_DATA = {
        3: {
            thickness: 3.2,
            capacity: '5 - 15 kg',
            layers: 'Outer + Flute + Inner',
            layerCount: 3,
            color: 0xC4A86B,
            label: '3-Ply (Single Wall)'
        },
        5: {
            thickness: 6.1,
            capacity: '12 - 40 kg',
            layers: 'Outer + Flute + Mid + Flute + Inner',
            layerCount: 5,
            color: 0xB8955A,
            label: '5-Ply (Double Wall)'
        },
        7: {
            thickness: 10,
            capacity: '50+ kg',
            layers: 'Outer + 3 Flutes + 3 Liners',
            layerCount: 7,
            color: 0xA8824A,
            label: '7-Ply (Triple Wall)'
        }
    };

    // ---- STATE ----
    let state = {
        length: 300,
        width: 200,
        height: 150,
        ply: 3,
        unit: 'mm',
        exploded: false
    };

    let scene, camera, renderer, boxGroup, explodedGroup;
    let isDragging = false;
    let previousMouse = { x: 0, y: 0 };
    let rotationTarget = { x: -0.3, y: 0.5 };
    let rotationCurrent = { x: -0.3, y: 0.5 };
    const INERTIA = 0.08;

    // ---- INIT ----
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
        updateSpecs();

        // Hide hint after first interaction
        container.addEventListener('pointerdown', () => {
            const hint = document.getElementById('viewerHint');
            if (hint) hint.classList.add('hidden');
        }, { once: true });

        window.addEventListener('resize', onResize);
    }

    // ---- THREE.JS SCENE ----
    function setupScene(container) {
        scene = new THREE.Scene();
        scene.background = new THREE.Color(0xF4F8FB);

        camera = new THREE.PerspectiveCamera(40, container.clientWidth / container.clientHeight, 0.1, 1000);
        camera.position.set(4, 3, 5);
        camera.lookAt(0, 0, 0);

        renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setSize(container.clientWidth, container.clientHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        renderer.outputEncoding = THREE.sRGBEncoding;
        container.appendChild(renderer.domElement);

        // Lights
        const ambient = new THREE.AmbientLight(0xffffff, 0.6);
        scene.add(ambient);

        const dirLight = new THREE.DirectionalLight(0xffffff, 0.5);
        dirLight.position.set(5, 8, 5);
        dirLight.castShadow = true;
        dirLight.shadow.mapSize.set(1024, 1024);
        dirLight.shadow.camera.near = 0.5;
        dirLight.shadow.camera.far = 20;
        dirLight.shadow.camera.left = -5;
        dirLight.shadow.camera.right = 5;
        dirLight.shadow.camera.top = 5;
        dirLight.shadow.camera.bottom = -5;
        scene.add(dirLight);

        const fillLight = new THREE.DirectionalLight(0xE8DDD0, 0.3);
        fillLight.position.set(-3, 2, -2);
        scene.add(fillLight);

        // Ground plane
        const groundGeo = new THREE.PlaneGeometry(20, 20);
        const groundMat = new THREE.ShadowMaterial({ opacity: 0.06 });
        const ground = new THREE.Mesh(groundGeo, groundMat);
        ground.rotation.x = -Math.PI / 2;
        ground.position.y = -1.5;
        ground.receiveShadow = true;
        scene.add(ground);
    }

    function createBoxMaterial(ply) {
        const data = PLY_DATA[ply];
        return new THREE.MeshStandardMaterial({
            color: data.color,
            roughness: 0.75,
            metalness: 0.0,
            flatShading: false
        });
    }

    function buildBox() {
        // Remove old
        if (boxGroup) scene.remove(boxGroup);
        if (explodedGroup) scene.remove(explodedGroup);

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
        }
    }

    function buildSolidBox(l, w, h, ply, thickness) {
        boxGroup = new THREE.Group();

        const material = createBoxMaterial(ply);

        // Main box body (hollow box using panels)
        const panels = [
            // Front
            { size: [l, h, thickness], pos: [0, 0, w / 2] },
            // Back
            { size: [l, h, thickness], pos: [0, 0, -w / 2] },
            // Left
            { size: [thickness, h, w], pos: [-l / 2, 0, 0] },
            // Right
            { size: [thickness, h, w], pos: [l / 2, 0, 0] },
            // Bottom
            { size: [l, thickness, w], pos: [0, -h / 2, 0] },
            // Top flap (slightly open)
            { size: [l, thickness, w * 0.45], pos: [0, h / 2, w * 0.275], rot: [0.15, 0, 0] },
            { size: [l, thickness, w * 0.45], pos: [0, h / 2, -w * 0.275], rot: [-0.15, 0, 0] }
        ];

        panels.forEach(p => {
            const geo = new THREE.BoxGeometry(p.size[0], p.size[1], p.size[2]);
            const mesh = new THREE.Mesh(geo, material);
            mesh.position.set(p.pos[0], p.pos[1], p.pos[2]);
            if (p.rot) mesh.rotation.set(p.rot[0], p.rot[1], p.rot[2]);
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            boxGroup.add(mesh);
        });

        // Inner edge lines for realism
        const edgeMat = new THREE.LineBasicMaterial({ color: 0x9B8560, linewidth: 1 });
        const edgeGeo = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(-l / 2, -h / 2, -w / 2),
            new THREE.Vector3(-l / 2, h / 2, -w / 2),
            new THREE.Vector3(l / 2, h / 2, -w / 2),
            new THREE.Vector3(l / 2, -h / 2, -w / 2),
            new THREE.Vector3(-l / 2, -h / 2, -w / 2),
            new THREE.Vector3(-l / 2, -h / 2, w / 2),
            new THREE.Vector3(-l / 2, h / 2, w / 2),
            new THREE.Vector3(l / 2, h / 2, w / 2),
            new THREE.Vector3(l / 2, -h / 2, w / 2),
            new THREE.Vector3(-l / 2, -h / 2, w / 2)
        ]);
        boxGroup.add(new THREE.Line(edgeGeo, edgeMat));

        scene.add(boxGroup);
    }

    function buildExplodedView(l, w, h, ply, thickness, scale) {
        explodedGroup = new THREE.Group();
        const layers = PLY_DATA[ply].layerCount;
        const gap = 0.25;
        const layerColors = [0xC4A86B, 0xD4C49A, 0xB89A5A, 0xD4C49A, 0xB89A5A, 0xD4C49A, 0xA8824A];

        for (let i = 0; i < layers; i++) {
            const isFlute = i % 2 === 1;
            const layerH = isFlute ? thickness * 1.5 : thickness * 0.5;
            const yPos = (i - (layers - 1) / 2) * gap;

            const geo = new THREE.BoxGeometry(l * 0.9, layerH, w * 0.7);
            const mat = new THREE.MeshStandardMaterial({
                color: layerColors[i] || 0xC4A86B,
                roughness: 0.8,
                metalness: 0.0,
                transparent: true,
                opacity: 0.9
            });

            const mesh = new THREE.Mesh(geo, mat);
            mesh.position.y = yPos;
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            explodedGroup.add(mesh);

            // Flute wave indicator
            if (isFlute) {
                const waveMat = new THREE.LineBasicMaterial({ color: 0x8B7340 });
                const points = [];
                const segments = 20;
                for (let s = 0; s <= segments; s++) {
                    const x = (s / segments - 0.5) * l * 0.85;
                    const z = Math.sin(s * Math.PI * 2) * 0.03;
                    points.push(new THREE.Vector3(x, yPos, z));
                }
                const waveGeo = new THREE.BufferGeometry().setFromPoints(points);
                explodedGroup.add(new THREE.Line(waveGeo, waveMat));
            }
        }

        scene.add(explodedGroup);
    }

    // ---- INTERACTION ----
    function setupControls() {
        const container = document.getElementById('boxViewer');

        container.addEventListener('pointerdown', (e) => {
            isDragging = true;
            previousMouse.x = e.clientX;
            previousMouse.y = e.clientY;
        });

        window.addEventListener('pointermove', (e) => {
            if (!isDragging) return;
            const dx = e.clientX - previousMouse.x;
            const dy = e.clientY - previousMouse.y;
            rotationTarget.y += dx * 0.008;
            rotationTarget.x += dy * 0.005;
            rotationTarget.x = Math.max(-1.2, Math.min(0.8, rotationTarget.x));
            previousMouse.x = e.clientX;
            previousMouse.y = e.clientY;
        });

        window.addEventListener('pointerup', () => {
            isDragging = false;
        });
    }

    // ---- ANIMATION LOOP ----
    function animate() {
        requestAnimationFrame(animate);

        rotationCurrent.x += (rotationTarget.x - rotationCurrent.x) * INERTIA;
        rotationCurrent.y += (rotationTarget.y - rotationCurrent.y) * INERTIA;

        const group = state.exploded ? explodedGroup : boxGroup;
        if (group) {
            group.rotation.x = rotationCurrent.x;
            group.rotation.y = rotationCurrent.y;
        }

        renderer.render(scene, camera);
    }

    function onResize() {
        const container = document.getElementById('boxViewer');
        if (!container) return;
        camera.aspect = container.clientWidth / container.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(container.clientWidth, container.clientHeight);
    }

    // ---- SLIDERS ----
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
    }

    // ---- PLY BUTTONS ----
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

    // ---- UNIT TOGGLE ----
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

    // ---- SPECS ----
    function updateSpecs() {
        const data = PLY_DATA[state.ply];
        const el = (id) => document.getElementById(id);
        if (el('specThickness')) el('specThickness').textContent = data.thickness + ' mm';
        if (el('specCapacity')) el('specCapacity').textContent = data.capacity;
        if (el('specLayers')) el('specLayers').textContent = data.layers;
    }

    // ---- EXPLODED VIEW ----
    function setupExplode() {
        const btn = document.getElementById('btnExplode');
        if (!btn) return;
        btn.addEventListener('click', () => {
            state.exploded = !state.exploded;
            btn.classList.toggle('active', state.exploded);
            buildBox();
        });
    }

    // ---- RESET ----
    function setupReset() {
        const btn = document.getElementById('btnReset');
        if (!btn) return;
        btn.addEventListener('click', () => {
            rotationTarget.x = -0.3;
            rotationTarget.y = 0.5;
            state.exploded = false;
            const explodeBtn = document.getElementById('btnExplode');
            if (explodeBtn) explodeBtn.classList.remove('active');
            buildBox();
        });
    }

    // ---- SMART SUGGESTION ----
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
                recSize = '10 x 8 x 6 inches';
                margin = 'Good safety margin';
            } else if (weight <= 15) {
                recPly = shipping === 'longdist' ? '5-Ply (Double Wall)' : '3-Ply (Single Wall)';
                recSize = '15 x 10 x 10 inches';
                margin = shipping === 'longdist' ? 'Extra protection for long distance' : 'Adequate for standard courier';
            } else if (weight <= 40) {
                recPly = '5-Ply (Double Wall)';
                recSize = '18 x 12 x 12 inches';
                margin = 'Suitable for heavy items';
            } else {
                recPly = '7-Ply (Triple Wall)';
                recSize = '22 x 22 x 30 inches';
                margin = 'Industrial-grade protection';
            }

            // Check if current ply is under-rated
            const currentMaxWeight = state.ply === 3 ? 15 : state.ply === 5 ? 40 : 200;
            if (weight > currentMaxWeight) {
                warning = '<p class="cfg-warning">Warning: Currently selected ply is under-rated for this weight. Consider upgrading.</p>';
            }

            result.innerHTML = `
        <h4>Recommendation</h4>
        <p><strong>Suggested Ply:</strong> ${recPly}</p>
        <p><strong>Suggested Size:</strong> ${recSize}</p>
        <p><strong>Safety Margin:</strong> ${margin}</p>
        ${warning}
      `;
            result.style.display = 'block';
        });
    }

    // ---- BOOT ----
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();

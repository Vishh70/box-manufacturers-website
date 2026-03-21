# 📦 Arti Enterprises - B2B Packaging & 3D Configurator

A cutting-edge, highly responsive vanilla web application designed for Arti Enterprises, a leading B2B corrugated box manufacturer. This platform showcases their packaging catalog and features an extremely robust, interactive **Photorealistic 3D Box Configurator** integrated with a streamlined WhatsApp Quotation Lead Generation system.

---

## ✨ Core Features

### 1. Photorealistic 3D Box Configurator (`/configurator.html`)
The crown jewel of the platform, the B2B configuration engine features a fully interactive 3D WebGL viewer built entirely in vanilla Three.js.
* **Accurate Box Geometry:** Mathematical recreation of Slotted Containers (RSC) with physically accurate folded flaps, thickness dynamics driven by ply type, and dynamically placed dimension UI labels.
* **Micro-Fiber Texturing:** Custom procedural bump-mapping applies realistic kraft paper fibers, pores, and corrugated fluting directly to the physical 3D materials.
* **Cinematic Studio Lighting:** Rim lighting, variable focal dropshadows, and realistic fill lighting to achieve a pristine commercial render aesthetic.
* **Interactive Exploded View:** Smoothly transitions the mesh into an exploded layer view revealing the inner corrugated fluting walls of 3-Ply, 5-Ply, and 7-Ply structures perfectly.

### 2. Multi-Channel WhatsApp Inquiry Hub
An aggressive, zero-friction lead generation architecture built for immediate B2B sales conversions.
* **Direct Lead Routing:** Instantly constructs heavily formatted quotation arrays and pre-fills the user's WhatsApp directly connecting them to the sales team.
* **Granular Configurations:** Converts 3D box attributes (Length, Width, Height, GSM, Ply, Target Weight) directly into a standardized WhatsApp manifest for the agents to read.
* **Specialized Tiers:** Intelligent quote generation supporting E-Commerce lightweight dispatch and Industrial Export heavy-duty configurations.

### 3. High-Performance Architecture
* **0 Dependencies (Vanilla):** No bloated frameworks. Everything is written using pure Vanilla JS, raw CSS `var()` token systems, and semantic HTML5 for blazingly fast load times and maximum SEO dominance.
* **CSS Modern Aesthetics:** Features glassmorphism modals, dynamic micro-animations, premium B2B blue/amber branding, and flawless mobile-first responsiveness.
* **Dynamic Hydration:** Reusable HTML utility components injected purely via the DOM.

---

## 🛠️ Tech Stack & Libraries
* **Frontend Execution:** HTML5, Vanilla JavaScript (ES11+), Vanilla CSS3.
* **3D Rendering Engine:** `Three.js` (WebGL) + `CSS2DRenderer` for non-clipping HTML dimension labels.
* **Animations:** Native CSS Transitions and `requestAnimationFrame()` inertia smoothing.
* **Icons:** Lucide Icons (client-side script injection).
* **Live Chat & Bot Integration:** Tidio Live Chat Widget.

---

## 🚀 How to Run Locally

Because the 3D Viewer relies on cross-origin texture loading and module capabilities, it must be run on a local development server (not via `file://`).

1. Open this repository in **Visual Studio Code**.
2. Install the **Live Server** extension by Ritwick Dey.
3. Right-click on `index.html` (or `configurator.html`) and select **"Open with Live Server"**.
4. The site will instantly spin up on `http://127.0.0.1:5500`.

---

## ☁️ Deployment
The project is completely static and ready for instant deployment. It is currently configured for autonomous edge deployment via **Vercel** via GitHub integration. Every push to the `main` branch automatically builds and scales the application globally.

*Designed specifically to elevate manufacturing presentation and B2B conversion metrics.*

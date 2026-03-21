# ARTI ENTERPRISES Website

[![Vite](https://img.shields.io/badge/Vite-7.3.1-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![React](https://img.shields.io/badge/React-18.3.1-61DAFB?logo=react&logoColor=111827)](https://react.dev/)
[![JavaScript](https://img.shields.io/badge/JavaScript-ES%20Modules-F7DF1E?logo=javascript&logoColor=111827)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![Three.js](https://img.shields.io/badge/Three.js-CDN-000000?logo=three.js&logoColor=white)](https://threejs.org/)
[![Vercel](https://img.shields.io/badge/Deploy-Vercel-000000?logo=vercel&logoColor=white)](https://vercel.com/)
[![Site Type](https://img.shields.io/badge/Site-Multi--page%20Static-2563EB)](#architecture)

Production-focused website for **ARTI ENTERPRISES**, a corrugated box manufacturer in Pune. The project combines a polished marketing site, product catalog, product detail pages, a WebGL-based 3D box configurator, and WhatsApp-first lead generation for B2B packaging inquiries.

This repository contains both the website code and a supporting `whatsapp-business/` package used to align website lead capture with catalog, profile, and messaging workflows.

## Table of Contents

- [Overview](#overview)
- [Feature Highlights](#feature-highlights)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Pages and User Flow](#pages-and-user-flow)
- [Local Development](#local-development)
- [Build and Deployment](#build-and-deployment)
- [Project Structure](#project-structure)
- [WhatsApp Business Package](#whatsapp-business-package)
- [Customization Guide](#customization-guide)
- [Preview Assets](#preview-assets)
- [Roadmap](#roadmap)
- [License](#license)

## Overview

This project powers the public web presence for ARTI ENTERPRISES and is structured as a **hybrid Vite multi-page site**:

- The homepage is bootstrapped through React.
- The homepage content itself is injected from a raw HTML template.
- Legacy browser scripts handle shared interactions, navigation behavior, WhatsApp CTA hydration, and the hero/configurator rendering.
- Additional site pages remain standalone HTML entrypoints handled by Vite during build.

The result is a practical setup for a business site that needs static deployment, custom interactions, and a richer configurator without converting the entire codebase into a fully componentized SPA.

## Feature Highlights

### Marketing and conversion pages

- Premium homepage for corrugated packaging and manufacturing positioning
- About, contact, privacy, and terms pages
- Blog listing and article pages for packaging education and SEO

### Product catalog flows

- Product listing page with client-side filters
- Product detail page backed by centralized product data
- Product categories covering 3 Ply, 5 Ply, 7 Ply, die-cut, printed, food-grade, export, and e-commerce packaging

### 3D box configurator

- Interactive box viewer rendered with Three.js
- Adjustable dimensions, ply selection, exploded layer view, and spec generation
- Quote handoff directly into WhatsApp with structured configuration details

### Lead generation and business ops alignment

- WhatsApp CTAs hydrated across pages using shared site configuration
- Contact and quotation messaging built around business-friendly formatting
- Separate WhatsApp Business documentation package for profile, catalog, labels, and workflow setup

### Static delivery readiness

- Vite multi-page build
- Static asset copy step into `dist/`
- Ready for Vercel deployment with an additional Cloudflare-style config present in the repo

## Architecture

The repo is not a pure vanilla static site anymore, and it is not a full React app either. The current implementation is intentionally hybrid.

### How the homepage works

1. `index.html` loads the React entrypoint from `src/main.jsx`.
2. `src/main.jsx` renders `src/App.jsx`.
3. `src/App.jsx` injects the homepage markup from `src/templates/home.html`.
4. After render, it loads browser scripts such as:
   - `js/main.js`
   - `js/hero3d.js`
5. Those scripts initialize shared site behavior and the visual hero experience.

### How the rest of the site works

- Vite is configured as a **multi-page build** in `vite.config.js`.
- Root HTML files such as `about.html`, `products.html`, `configurator.html`, and `contact.html` are treated as first-class page entrypoints.
- Static folders and assets are copied into the build output using a custom Vite plugin:
  - `css/`
  - `js/`
  - `images/`
  - `robots.txt`
  - `sitemap.xml`

### Why this setup exists

This structure lets the site keep simple static pages where that is practical, while still using React where it adds value for homepage composition and Vite bundling. It also preserves the existing investment in browser-side scripts for navigation, data hydration, filtering, and 3D rendering.

## Tech Stack

### Package-managed dependencies

- **Vite** for local development, bundling, and multi-page builds
- **React 18** and **React DOM** for the homepage entry shell

### Browser-side runtime

- **JavaScript (ES modules + legacy browser scripts)**
- **HTML5**
- **CSS3**
- **Three.js** loaded via CDN for the hero experience and 3D configurator
- **GSAP** loaded via CDN where homepage animation support is needed

### Deployment and hosting

- **Vercel** configured via `vercel.json`
- Additional static hosting configuration via `wrangler.jsonc`

## Pages and User Flow

### Main pages

| Page | Purpose |
| --- | --- |
| `index.html` | Homepage with brand positioning, trust signals, featured products, and lead generation CTAs |
| `products.html` | Product catalog with filters and category browsing |
| `product-detail.html` | Product-specific detail view and quotation path |
| `configurator.html` | Interactive 3D box configuration and spec/quote workflow |
| `about.html` | Company overview and manufacturing credibility |
| `contact.html` | Contact and inquiry page |
| `blog.html` | Packaging content index |
| `blog-article.html` | Individual article page |
| `privacy.html` | Privacy policy |
| `terms.html` | Terms of service |

### Typical user flow

1. Visitor lands on `index.html` from search, referral, or direct traffic.
2. They review the company offer and move to either:
   - `products.html` to browse standard packaging options, or
   - `configurator.html` to define custom box requirements.
3. Shared CTAs route the visitor into WhatsApp with preformatted messages.
4. ARTI ENTERPRISES can continue the quotation workflow from WhatsApp using the business assets documented in `whatsapp-business/`.

## Local Development

### Prerequisites

- Node.js 18+ recommended
- npm

### Install dependencies

```bash
npm install
```

### Start the Vite development server

```bash
npm run dev
```

By default, the project is configured to run on:

```text
http://localhost:3000
```

The `dev` script binds to `0.0.0.0`, which is useful for local network testing.

### Build for production

```bash
npm run build
```

### Preview the production build

```bash
npm run preview
```

### Development notes

- The homepage and configurator depend on browser-loaded libraries such as Three.js and GSAP from CDNs.
- Static assets are expected to remain in the existing root-level folders used by the Vite copy step.
- Vite is the canonical local workflow for this repo.

## Build and Deployment

### Output

- Production assets are generated in `dist/`.

### Vercel

`vercel.json` currently defines:

- framework: `vite`
- build command: `npm run build`
- output directory: `dist`

This means the repo is ready for GitHub-connected Vercel deployment as a static build output.

### Additional hosting config

`wrangler.jsonc` is also present and points at the project directory as a static asset source. That suggests the repo has also been prepared, at least partially, for a Cloudflare-style static deployment workflow.

The README intentionally does not overstate the Cloudflare path beyond what is visible in the repo configuration.

## Project Structure

```text
box-manufacturers-website/
├── css/
│   ├── configurator.css
│   └── styles.css
├── images/
├── js/
│   ├── configurator.js
│   ├── hero3d.js
│   ├── index-page.js
│   ├── main.js
│   ├── product-data.js
│   ├── product-detail-page.js
│   └── site-config.js
├── src/
│   ├── App.jsx
│   ├── main.jsx
│   └── templates/
│       └── home.html
├── whatsapp-business/
│   ├── assets/
│   ├── business-profile.md
│   ├── catalog.json
│   ├── catalog.md
│   ├── messaging-and-workflow.md
│   └── README.md
├── dist/
├── about.html
├── blog-article.html
├── blog.html
├── configurator.html
├── contact.html
├── index.html
├── package.json
├── privacy.html
├── product-detail.html
├── products.html
├── robots.txt
├── sitemap.xml
├── terms.html
├── vercel.json
├── vite.config.js
└── wrangler.jsonc
```

### Folder responsibilities

- `src/`: React entrypoint and homepage template composition
- `js/`: shared site logic, product data, configurator logic, and page behaviors
- `css/`: global and configurator-specific styling
- `images/`: product imagery, visual assets, and favicon
- `whatsapp-business/`: operational documentation for WhatsApp Business setup and handling
- root HTML files: page entrypoints for the multi-page build
- `dist/`: generated output after `npm run build`

## WhatsApp Business Package

The `whatsapp-business/` directory is not runtime application code. It is a supporting operations package for the business team.

It contains:

- business profile copy
- catalog content
- structured catalog JSON
- quick reply and label workflow documentation
- business messaging guidance
- profile avatar assets

This package complements the website’s lead-generation behavior:

- the website sends visitors into WhatsApp using shared links and prefilled messages
- the business package documents how ARTI ENTERPRISES should operate that WhatsApp channel consistently after the lead arrives

Start with:

- `whatsapp-business/README.md`

## Customization Guide

If you need to update business content or maintain the site, these are the main touchpoints:

| File | Responsibility |
| --- | --- |
| `js/site-config.js` | Business name, phone, email, WhatsApp settings, address, and shared site metadata |
| `src/templates/home.html` | Homepage markup and content blocks |
| `js/main.js` | Shared site interactivity, nav state, WhatsApp link hydration, filtering, and page-level initialization |
| `js/product-data.js` | Product catalog content and quote-related product metadata |
| `js/product-detail-page.js` | Product detail rendering behavior |
| `js/configurator.js` | 3D configurator logic, quote generation, and viewer interactions |
| `js/hero3d.js` | Homepage 3D hero behavior |
| `css/styles.css` | Global site styling |
| `css/configurator.css` | Configurator and related visual styling |

## Preview Assets

The repository already includes usable visual assets in `images/`, including:

- `images/hero-banner.png`
- `images/about-factory.png`
- `images/product-boxes.png`
- `images/product-3ply.png`
- `images/product-5ply.png`
- `images/product-7ply.png`

If you want a more polished GitHub landing experience later, the next step is to add actual site screenshots or a short GIF and reference them from this section.

## Roadmap

- Consolidate more legacy browser scripts into a clearer module structure
- Document the product data model more explicitly
- Add automated validation or test coverage for core flows
- Expand deployment notes if Cloudflare deployment becomes an active path
- Add real homepage/configurator screenshots to the README

## License

This repository is currently marked as **ISC** in `package.json`.

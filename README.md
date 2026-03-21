# ARTI ENTERPRISES Website

[![Vite](https://img.shields.io/badge/Vite-7.3.1-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![React](https://img.shields.io/badge/React-18.3.1-61DAFB?logo=react&logoColor=111827)](https://react.dev/)
[![JavaScript](https://img.shields.io/badge/JavaScript-ES%20Modules-F7DF1E?logo=javascript&logoColor=111827)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![Three.js](https://img.shields.io/badge/Three.js-CDN-000000?logo=three.js&logoColor=white)](https://threejs.org/)
[![Vercel](https://img.shields.io/badge/Deploy-Vercel-000000?logo=vercel&logoColor=white)](https://vercel.com/)
[![Site Type](https://img.shields.io/badge/Site-Multi--page%20Static-2563EB)](#architecture)

Production-focused website for **ARTI ENTERPRISES**, a corrugated box manufacturer in Pune. The project combines a polished marketing site, product catalog, product detail pages, a WebGL-based 3D box configurator, and WhatsApp-first lead generation for B2B packaging inquiries.

This repository contains both the website code and a supporting `whatsapp-business/` package used to align website lead capture with catalog, profile, and messaging workflows.

## At a Glance

| Item | Details |
| --- | --- |
| Business | ARTI ENTERPRISES |
| Domain target | `https://arti-enterprises.vercel.app` |
| Primary audience | B2B packaging buyers, wholesalers, factories, exporters, e-commerce brands |
| Product focus | 3 Ply, 5 Ply, 7 Ply, die-cut, printed, food-grade, export, and e-commerce corrugated boxes |
| App style | Hybrid React + static multi-page site |
| Core conversion path | Product browse or 3D configurator -> WhatsApp inquiry |
| Build tool | Vite |
| Output | Static `dist/` bundle |

## Table of Contents

- [At a Glance](#at-a-glance)
- [Overview](#overview)
- [Feature Highlights](#feature-highlights)
- [Business and Product Scope](#business-and-product-scope)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Pages and User Flow](#pages-and-user-flow)
- [Local Development](#local-development)
- [Build and Deployment](#build-and-deployment)
- [Project Structure](#project-structure)
- [Core Runtime Modules](#core-runtime-modules)
- [WhatsApp Business Package](#whatsapp-business-package)
- [Customization Guide](#customization-guide)
- [SEO and Metadata](#seo-and-metadata)
- [Known Constraints](#known-constraints)
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

## Business and Product Scope

The site is built around a packaging manufacturer workflow, not a generic product landing page. The current content and runtime data indicate support for:

- 3 Ply corrugated boxes
- 5 Ply heavy-duty boxes
- 7 Ply industrial boxes
- E-commerce mailer boxes
- Die-cut custom boxes
- Custom printed corrugated boxes
- Food grade boxes
- Export quality boxes

Business messaging is centered on:

- custom dimensions
- bulk and MOQ-based quoting
- printing and branding requirements
- shipping and delivery destination capture
- WhatsApp-based quotation handling

This matters for future maintenance because product copy, quote templates, CTA wording, and the configurator all assume a manufacturing and inquiry-driven sales model.

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

### Rendering model summary

| Layer | Responsibility |
| --- | --- |
| `index.html` | Homepage document shell, metadata, and root mount |
| `src/main.jsx` | React bootstrapping |
| `src/App.jsx` | Injects homepage template and loads browser scripts |
| `src/templates/home.html` | Homepage markup content |
| `js/main.js` | Shared site behavior and CTA hydration |
| `js/hero3d.js` | Homepage visual 3D experience |
| `js/configurator.js` | Configurator viewer, controls, and quotation flow |
| root HTML pages | Multi-page static entrypoints handled by Vite |

### Build model summary

| Build concern | Current implementation |
| --- | --- |
| Bundling | Vite |
| React integration | `@vitejs/plugin-react` |
| Multi-page inputs | Declared in `vite.config.js` |
| Static asset copying | Custom Vite plugin using `cpSync` |
| Production output | `dist/` |
| Primary deployment config | `vercel.json` |
| Secondary hosting config | `wrangler.jsonc` |

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

### Repo dependencies worth noting

- `react` and `react-dom` are used directly by the homepage shell
- `chrome-launcher` and `puppeteer-core` are installed in the repo even though the current README does not expose a browser automation workflow yet
- Three.js and GSAP are currently loaded through browser script tags rather than npm imports in the core site flow

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

### Conversion surfaces used across the site

- header CTA buttons
- homepage hero CTA buttons
- featured product cards
- product detail quotation prompts
- configurator-generated WhatsApp quote requests
- contact-page WhatsApp trigger

### Lead information typically collected

Based on the current JavaScript utilities and WhatsApp workflow docs, the project is optimized to capture:

- request type
- source page or flow
- customer name
- phone number
- company name
- box dimensions
- ply type
- quantity
- printing requirement
- delivery location
- additional notes

That information is then formatted into a structured WhatsApp message for quotation follow-up.

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

### Recommended local workflow

1. Install dependencies with `npm install`.
2. Start the dev server with `npm run dev`.
3. Validate the homepage, product catalog, and configurator page individually.
4. Run `npm run build` before deploying or handing off changes.
5. Use `npm run preview` to inspect the production bundle locally.

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

### Deployment checklist

- Confirm all page entrypoints build successfully
- Confirm `dist/` contains copied `css/`, `js/`, and `images/` assets
- Confirm canonical URLs and metadata still point at the intended production site
- Confirm WhatsApp links and site config values are correct for the live business account
- Confirm no local-only assets or unpublished credentials are referenced in content

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

## Core Runtime Modules

This section is the quickest way for a developer to understand where behavior lives.

| File | What it does |
| --- | --- |
| `src/main.jsx` | Creates the React root and mounts the homepage shell |
| `src/App.jsx` | Injects the homepage HTML template and loads legacy runtime scripts |
| `js/main.js` | Exposes shared site utilities, hydrates business/contact links, handles nav behavior, reveal animations, product filters, price tier selection, and active nav state |
| `js/site-config.js` | Central source for business identity, phone, email, address, WhatsApp, and public site metadata |
| `js/product-data.js` | Catalog data store used by product detail flows and quote messaging |
| `js/product-detail-page.js` | Product-specific UI behavior driven by product data |
| `js/hero3d.js` | Homepage 3D box presentation and visual animation |
| `js/configurator.js` | Full configurator runtime including viewer rendering, controls, dimensions, spec generation, exploded layers, and WhatsApp quote output |

### Shared utility behavior in `js/main.js`

The shared runtime currently handles several critical concerns:

- hydration of business contact links through `data-site-*` attributes
- construction of WhatsApp URLs and lead message formatting
- sticky header behavior
- mobile navigation state
- scroll reveal animation
- product page filtering
- contact CTA behavior
- product detail tier interaction
- active navigation highlighting

This makes `js/main.js` one of the highest-impact files in the project for behavior changes.

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

### Operational documents included

| File | Purpose |
| --- | --- |
| `whatsapp-business/business-profile.md` | Business profile text for the WhatsApp Business account |
| `whatsapp-business/catalog.md` | Catalog listing content |
| `whatsapp-business/catalog.json` | Structured version of catalog data |
| `whatsapp-business/messaging-and-workflow.md` | Greeting, away message, quick replies, labels, and lead handling workflow |
| `whatsapp-business/assets/profile-avatar.svg` | Profile avatar asset |

### Current WhatsApp operating model

The supporting workflow documentation currently standardizes:

- greeting message
- away message
- quick replies such as `/quote`, `/products`, `/hours`, `/location`, `/website`, `/configurator`, and `/followup`
- lead labels such as `New Lead`, `Hot Quote`, `Bulk Order`, `Custom Size`, `Printed Box`, `Follow Up`, `Quoted`, and `Order Confirmed`
- manual follow-up timing and business-hour handling

That package is useful because the website already pushes visitors into WhatsApp as the primary sales conversion channel.

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

### Common update tasks

#### Update business contact details

Edit:

- `js/site-config.js`

Use this for:

- phone number
- WhatsApp number
- email
- website URL
- business hours
- address
- reply promise copy

#### Update homepage content

Edit:

- `src/templates/home.html`

Use this for:

- hero text
- featured products section
- trust signals
- CTA copy
- footer copy

#### Update product catalog data

Edit:

- `js/product-data.js`

Use this for:

- product names
- slugs
- metadata
- specs
- quote guidance
- related products
- product imagery references

#### Update configurator behavior

Edit:

- `js/configurator.js`
- `css/configurator.css`

Use this for:

- box dimension logic
- ply behavior
- viewer interaction
- exploded view
- quote output format
- configurator UI styling

## SEO and Metadata

The root pages already include important SEO-oriented metadata patterns such as:

- `title`
- `meta description`
- `canonical`
- Open Graph tags
- Twitter card tags
- favicon references

The homepage also includes structured organization metadata in JSON-LD.

Primary files involved:

- `index.html`
- `about.html`
- `products.html`
- `product-detail.html`
- `contact.html`
- `blog.html`
- `blog-article.html`
- `configurator.html`
- `privacy.html`
- `terms.html`
- `robots.txt`
- `sitemap.xml`

If you make content or URL changes, update these files together rather than treating them as isolated page edits.

## Known Constraints

- The current architecture mixes React bootstrapping with legacy browser scripts, so refactors need to respect both layers.
- Three.js and GSAP are currently CDN-loaded in runtime rather than bundled through npm in the homepage/configurator flow.
- There is no documented automated test suite in the current repo.
- The project depends heavily on static file paths and direct asset references.
- `dist/` exists in the repo, but it should still be treated as generated output from `npm run build`.
- The README does not assume that every installed dependency is part of an active documented developer workflow.

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
- Add a documented browser automation or QA flow if `puppeteer-core` becomes part of active maintenance
- Expand deployment notes if Cloudflare deployment becomes an active path
- Add real homepage/configurator screenshots to the README

## License

This repository is currently marked as **ISC** in `package.json`.

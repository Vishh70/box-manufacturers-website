# Project Developer Tooling & QA Scripts

This folder contains automated verification and maintenance tools for the **ARTI ENTERPRISES** website.

---

### Available Scripts

#### 1. Mobile Responsiveness Audit
Tests all 14 routes across 5 viewport widths (360px, 375px, 390px, 412px, 768px).
Detects horizontal scroll/overflow (`scrollWidth > innerWidth`), mobile navigation toggle, 3D canvas loading, and runtime exceptions.

```bash
npm run audit:mobile
# or test against local dev server:
npm run audit:mobile -- http://localhost:3000
```

#### 2. Route Integrity & Network Audit
Tests all 14 routes for HTTP 200 responses, 0 console errors, 0 runtime exceptions, and 0 failed asset requests.

```bash
npm run audit:routes
# or test against local dev server:
npm run audit:routes -- http://localhost:3000
```

#### 3. Custom Domain Synchronization
When you purchase and connect a custom domain (e.g. `https://artienterprises.in` or `https://artienterprises.com`), run this command to automatically update all canonical URLs, Open Graph tags, Schema.org links, `sitemap.xml`, `robots.txt`, and `js/site-config.js` in a single transaction:

```bash
npm run domain:update -- https://artienterprises.in
```

#### 4. Forensic Domain, Asset & Schema Sweep
Performs an automated repository-wide sweep checking for stale domains, broken local assets, case-sensitivity issues, duplicate SEO headers, single `<h1>` hierarchy, unverified claims, and product/blog slug integrity.

```bash
npm run audit:forensic
```


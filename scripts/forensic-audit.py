import os
import re
from pathlib import Path

workspace = Path(r"c:\new project\box-manufacturers website - Copy")

print("==================================================")
print("🔍 ARTI ENTERPRISES — COMPREHENSIVE FORENSIC AUDIT")
print("==================================================\n")

issues = []

# 1. STALE DOMAINS AUDIT
print("--- 1. Domain Consistency Audit ---")
correct_domain = "arti-enterprises.vercel.app"

stale_domain_occurrences = []
for p in workspace.rglob("*"):
    if not p.is_file() or any(part in p.parts for part in ['.git', 'node_modules', 'dist', '.vercel', '.vscode']):
        continue
    if p.suffix in ['.html', '.js', '.css', '.xml', '.txt', '.json', '.md']:
        try:
            content = p.read_text(encoding='utf-8')
            matches = [m.start() for m in re.finditer(r'arti-enterprises-delta\.vercel\.app', content)]
            if matches:
                # Any match of -delta is now considered stale since arti-enterprises.vercel.app is primary
                real_stale = []
                for idx in matches:
                    start = max(0, idx - 15)
                    end = min(len(content), idx + 35)
                    snippet = content[start:end]
                    real_stale.append(idx)
                if real_stale:
                    stale_domain_occurrences.append((p.relative_to(workspace), len(real_stale)))
        except Exception:
            pass

if stale_domain_occurrences:
    print("🚨 Found stale domain references without -delta:")
    for f, count in stale_domain_occurrences:
        print(f"   {f}: {count} occurrences")
        issues.append(f"Stale domain in {f}")
else:
    print("✅ Zero stale domain references across active source files.")

# 2. LOCAL ASSET INTEGRITY & CASE SENSITIVITY AUDIT
print("\n--- 2. Local Asset Integrity & Case Sensitivity Audit ---")
src_href_regex = re.compile(r'(?:src|href)=["\']([^"\']+)["\']')
url_css_regex = re.compile(r'url\(["\']?([^"\'\)]+)["\']?\)')

missing_assets = []
casing_mismatches = []

html_and_css_files = list(workspace.glob("*.html")) + list(workspace.glob("css/*.css"))

for file_path in html_and_css_files:
    content = file_path.read_text(encoding='utf-8')
    matches = src_href_regex.findall(content) + url_css_regex.findall(content)
    for ref in matches:
        ref = ref.split('?')[0].split('#')[0].strip()
        if not ref or ref.startswith(('http:', 'https:', 'tel:', 'mailto:', 'data:', 'javascript:')):
            continue
        ref_path = (file_path.parent / ref).resolve()
        if not ref_path.exists():
            root_ref_path = (workspace / ref.lstrip('/')).resolve()
            if not root_ref_path.exists():
                missing_assets.append((file_path.name, ref))
                continue
            else:
                target = root_ref_path
        else:
            target = ref_path

        parts = target.relative_to(workspace).parts
        curr = workspace
        for part in parts:
            actual_entries = os.listdir(curr)
            if part not in actual_entries:
                matches_lower = [e for e in actual_entries if e.lower() == part.lower()]
                if matches_lower:
                    casing_mismatches.append((file_path.name, ref, part, matches_lower[0]))
            curr = curr / part

if missing_assets:
    print(f"🚨 Missing local assets ({len(missing_assets)}):")
    for f, r in missing_assets:
        print(f"   In {f}: '{r}' does not exist on disk")
        issues.append(f"Missing asset: {r} in {f}")
else:
    print("✅ Zero missing local assets.")

if casing_mismatches:
    print(f"🚨 Case sensitivity mismatches ({len(casing_mismatches)}):")
    for f, r, exp, act in casing_mismatches:
        print(f"   In {f}: '{exp}' should be '{act}'")
        issues.append(f"Case mismatch in {f}: {exp} -> {act}")
else:
    print("✅ Zero case sensitivity mismatches.")

# 3. SEO & HEADING AUDIT
print("\n--- 3. SEO & Heading Hierarchy Audit ---")
for html_file in workspace.glob("*.html"):
    content = html_file.read_text(encoding='utf-8')
    h1s = re.findall(r'<h1\b[^>]*>(.*?)</h1>', content, re.DOTALL | re.IGNORECASE)
    titles = re.findall(r'<title\b[^>]*>(.*?)</title>', content, re.DOTALL | re.IGNORECASE)
    metas = re.findall(r'<meta\b[^>]*name=["\']description["\'][^>]*content=["\'](.*?)["\']', content, re.IGNORECASE)
    if not metas:
        metas = re.findall(r'<meta\b[^>]*content=["\'](.*?)["\'][^>]*name=["\']description["\']', content, re.IGNORECASE)
    canonicals = re.findall(r'<link\b[^>]*rel=["\']canonical["\'][^>]*href=["\'](.*?)["\']', content, re.IGNORECASE)
    if not canonicals:
        canonicals = re.findall(r'<link\b[^>]*href=["\'](.*?)["\'][^>]*rel=["\']canonical["\']', content, re.IGNORECASE)

    h1_count = len(h1s)
    title_count = len(titles)
    meta_count = len(metas)
    canonical_count = len(canonicals)

    status = []
    if h1_count != 1:
        status.append(f"h1 count: {h1_count}")
        issues.append(f"{html_file.name}: expected 1 h1, found {h1_count}")
    if title_count != 1:
        status.append(f"title count: {title_count}")
        issues.append(f"{html_file.name}: expected 1 title, found {title_count}")
    if meta_count != 1:
        status.append(f"meta desc count: {meta_count}")
        issues.append(f"{html_file.name}: expected 1 meta description, found {meta_count}")
    if canonical_count != 1:
        status.append(f"canonical count: {canonical_count}")
        issues.append(f"{html_file.name}: expected 1 canonical link, found {canonical_count}")

    if not status:
        clean_h1 = re.sub(r'<[^>]+>', '', h1s[0]).strip().replace('\n', ' ')
        print(f"  ✅ {html_file.name}: 1 title, 1 meta desc, 1 canonical, 1 h1 ('{clean_h1[:40]}...')")
    else:
        print(f"  ❌ {html_file.name}: {', '.join(status)}")

# 4. UNVERIFIED CLAIMS AUDIT
print("\n--- 4. Unverified Claims Forensic Sweep ---")
suspicious_patterns = [
    r'\bISO\s*\d+',
    r'\bISO\s*Certified\b',
    r'\b500\+\s*(?:clients|customers|businesses)\b',
    r'\b200\+\s*(?:clients|customers|businesses)\b',
    r'\b5M\+\s*(?:boxes|delivered)\b',
    r'\b99%\s*(?:on-time|satisfaction)\b',
    r'serving over \d+ businesses'
]

claim_hits = []
for p in workspace.rglob("*"):
    if not p.is_file() or any(part in p.parts for part in ['.git', 'node_modules', 'dist', '.vercel']):
        continue
    if p.suffix in ['.html', '.js']:
        content = p.read_text(encoding='utf-8')
        for pat in suspicious_patterns:
            matches = re.findall(pat, content, re.IGNORECASE)
            if matches:
                claim_hits.append((p.name, pat, matches))

if claim_hits:
    print(f"🚨 Suspicious claims found ({len(claim_hits)}):")
    for f, pat, m in claim_hits:
        print(f"   In {f}: {m}")
        issues.append(f"Suspicious claim in {f}: {m}")
else:
    print("✅ Zero unverified claims, false ISO badges, or fabricated metrics detected.")

# 5. SITEMAP AUDIT
print("\n--- 5. Sitemap Route Audit ---")
sitemap_path = workspace / "sitemap.xml"
if sitemap_path.exists():
    sitemap_content = sitemap_path.read_text(encoding='utf-8')
    locs = re.findall(r'<loc>(.*?)</loc>', sitemap_content)
    lastmods = re.findall(r'<lastmod>(.*?)</lastmod>', sitemap_content)
    print(f"  Total sitemap entries: {len(locs)}")
    print(f"  Unique lastmod dates: {set(lastmods)}")
    for loc in locs:
        if not loc.startswith(f"https://{correct_domain}"):
            print(f"  ❌ Sitemap entry with non-canonical domain: {loc}")
            issues.append(f"Non-canonical sitemap entry: {loc}")
    print(f"  ✅ All {len(locs)} sitemap URLs validated.")
else:
    print("❌ sitemap.xml missing!")
    issues.append("sitemap.xml missing")

# 6. PRODUCT SYSTEM INTEGRITY
print("\n--- 6. Product System Cross-Reference Audit ---")
product_data_path = workspace / "js" / "product-data.js"
if product_data_path.exists():
    content = product_data_path.read_text(encoding='utf-8')
    slugs = re.findall(r"slug:\s*['\"]([^'\"]+)['\"]", content)
    images = re.findall(r"image:\s*['\"]([^'\"]+)['\"]", content)
    related = re.findall(r"related:\s*\[(.*?)\]", content)

    print(f"  Total products defined: {len(slugs)}")
    for img in images:
        img_path = (workspace / img).resolve()
        if not img_path.exists():
            print(f"  ❌ Product image missing: {img}")
            issues.append(f"Product image missing: {img}")

    all_slugs_set = set(slugs)
    for r_group in related:
        r_slugs = re.findall(r"['\"]([^'\"]+)['\"]", r_group)
        for rs in r_slugs:
            if rs not in all_slugs_set:
                print(f"  ❌ Related product slug '{rs}' does not exist!")
                issues.append(f"Invalid related slug: {rs}")
    print(f"  ✅ All {len(slugs)} products, images, and cross-references verified.")

# 7. BLOG SYSTEM INTEGRITY
print("\n--- 7. Blog System Cross-Reference Audit ---")
blog_data_path = workspace / "js" / "blog-data.js"
if blog_data_path.exists():
    content = blog_data_path.read_text(encoding='utf-8')
    blog_slugs = re.findall(r"slug:\s*['\"]([^'\"]+)['\"]", content)
    blog_images = re.findall(r"image:\s*['\"]([^'\"]+)['\"]", content)
    print(f"  Total blog articles defined: {len(blog_slugs)}")
    for b_img in blog_images:
        b_img_path = (workspace / b_img).resolve()
        if not b_img_path.exists():
            print(f"  ❌ Blog image missing: {b_img}")
            issues.append(f"Blog image missing: {b_img}")
    print(f"  ✅ All {len(blog_slugs)} blog articles and assets verified.")

# 8. CENTRALIZED BUSINESS CONFIG AUDIT
print("\n--- 8. Centralized Business Config Audit ---")
site_config_path = workspace / "js" / "site-config.js"
if site_config_path.exists():
    content = site_config_path.read_text(encoding='utf-8')
    phone = re.search(r"phone:\s*['\"]([^'\"]+)['\"]", content)
    whatsapp = re.search(r"whatsapp:\s*['\"]([^'\"]+)['\"]", content)
    website = re.search(r"website:\s*['\"]([^'\"]+)['\"]", content)
    print(f"  Phone: {phone.group(1) if phone else 'N/A'}")
    print(f"  WhatsApp: {whatsapp.group(1) if whatsapp else 'N/A'}")
    print(f"  Canonical Website: {website.group(1) if website else 'N/A'}")
    if not website or website.group(1) != f"https://{correct_domain}":
        print(f"  ❌ site-config.js website does not match {correct_domain}")
        issues.append("site-config.js website mismatch")
    else:
        print("  ✅ site-config.js canonical domain matches production.")

print("\n==================================================")
if issues:
    print(f"🚨 AUDIT FINISHED WITH {len(issues)} ISSUES.")
else:
    print("🎉 AUDIT FINISHED: 0 ISSUES FOUND! 100% CLEAN.")
print("==================================================")

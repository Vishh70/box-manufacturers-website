/**
 * @file Blog Article Page Controller — ARTI ENTERPRISES
 * @description Dynamically loads and populates blog article content, SEO metadata,
 *              breadcrumbs, and related reading based on the ?slug URL parameter.
 * @author ARTI ENTERPRISES
 * @version 1.0.0
 */

(function () {
  'use strict';

  const BLOG = window.ARTI_BLOG || {};
  const BLOG_KEYS = Object.keys(BLOG);

  if (!BLOG_KEYS.length) return;

  function getArticle() {
    const params = new URLSearchParams(window.location.search);
    const slug = params.get('slug');
    return BLOG[slug] || BLOG['how-to-choose-the-right-corrugated-box'] || BLOG[BLOG_KEYS[0]];
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, function (char) {
      return ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
      })[char];
    });
  }

  function buildSchema(article, site) {
    const siteUrl = (site.website || 'https://arti-enterprises.vercel.app').replace(/\/$/, '');
    const pageUrl = `${siteUrl}/blog-article.html?slug=${encodeURIComponent(article.slug)}`;
    const imageUrl = `${siteUrl}/${article.image.replace(/^\//, '')}`;

    return {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: article.title,
      description: article.metaDescription,
      image: imageUrl,
      datePublished: article.dateIso || '2026-01-15',
      dateModified: '2026-03-01',
      author: {
        '@type': 'Organization',
        name: site.businessName || 'ARTI ENTERPRISES',
        url: siteUrl
      },
      publisher: {
        '@type': 'Organization',
        name: site.businessName || 'ARTI ENTERPRISES',
        logo: {
          '@type': 'ImageObject',
          url: `${siteUrl}/images/favicon.png`
        }
      },
      mainEntityOfPage: {
        '@type': 'WebPage',
        '@id': pageUrl
      }
    };
  }

  function renderRelatedArticles(article) {
    const container = document.getElementById('relatedArticles');
    if (!container) return;

    const relatedSlugs = article.related || [];
    container.innerHTML = relatedSlugs.map(function (slug) {
      const rel = BLOG[slug];
      if (!rel) return '';
      return `
        <article class="blog-card reveal visible">
          <div class="blog-card-img">
            <img loading="lazy" src="${escapeHtml(rel.image)}" alt="${escapeHtml(rel.imageAlt || rel.title)}">
          </div>
          <div class="blog-card-body">
            <span class="blog-card-tag">${escapeHtml(rel.tag)}</span>
            <h3 class="blog-card-title">
              <a href="blog-article.html?slug=${encodeURIComponent(rel.slug)}">${escapeHtml(rel.title)}</a>
            </h3>
            <p class="blog-card-excerpt">${escapeHtml(rel.excerpt)}</p>
            <div class="blog-card-meta">
              <span>${escapeHtml(rel.date)}</span>
              <span>•</span>
              <span>${escapeHtml(rel.readTime)}</span>
            </div>
          </div>
        </article>`;
    }).join('');
  }

  function updatePage() {
    const article = getArticle();
    const site = (typeof window.ARTI_SITE_UTILS !== 'undefined' && window.ARTI_SITE_UTILS.getSiteConfig)
      ? window.ARTI_SITE_UTILS.getSiteConfig()
      : (window.ARTI_SITE || {});

    const siteUrl = (site.website || 'https://arti-enterprises.vercel.app').replace(/\/$/, '');
    const pageUrl = `${siteUrl}/blog-article.html?slug=${encodeURIComponent(article.slug)}`;
    const imageUrl = `${siteUrl}/${article.image.replace(/^\//, '')}`;

    // 1. Document Title
    document.title = `${article.title} — ARTI ENTERPRISES Blog`;

    // 2. Meta Description
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) metaDesc.setAttribute('content', article.metaDescription);

    // 3. Canonical Link
    const canonical = document.querySelector('link[rel="canonical"]');
    if (canonical) canonical.setAttribute('href', pageUrl);

    // 4. Open Graph & Twitter Tags
    const ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) ogTitle.setAttribute('content', `${article.title} — ARTI ENTERPRISES Blog`);

    const ogDesc = document.querySelector('meta[property="og:description"]');
    if (ogDesc) ogDesc.setAttribute('content', article.metaDescription);

    const ogImage = document.querySelector('meta[property="og:image"]');
    if (ogImage) ogImage.setAttribute('content', imageUrl);

    const twitterImage = document.querySelector('meta[name="twitter:image"]');
    if (twitterImage) twitterImage.setAttribute('content', imageUrl);

    // 5. Article Schema JSON-LD
    const schemaEl = document.getElementById('articleSchema');
    if (schemaEl) {
      schemaEl.textContent = JSON.stringify(buildSchema(article, site), null, 2);
    }

    // 6. DOM Elements
    const titleEl = document.getElementById('articleTitle');
    if (titleEl) titleEl.textContent = article.title;

    const breadcrumbEl = document.getElementById('breadcrumbCurrent');
    if (breadcrumbEl) breadcrumbEl.textContent = article.shortTitle || article.title;

    const heroImg = document.getElementById('articleHeroImg');
    if (heroImg) {
      heroImg.setAttribute('src', article.image);
      heroImg.setAttribute('alt', article.imageAlt || article.title);
    }

    const dateEl = document.getElementById('articleDate');
    if (dateEl) dateEl.textContent = `📅 ${article.date}`;

    const readTimeEl = document.getElementById('articleReadTime');
    if (readTimeEl) readTimeEl.textContent = `📖 ${article.readTime}`;

    const tagEl = document.getElementById('articleTag');
    if (tagEl) tagEl.textContent = article.tag;

    const bodyEl = document.getElementById('articleBody');
    if (bodyEl) bodyEl.innerHTML = article.contentHtml;

    // 7. Render Related Articles
    renderRelatedArticles(article);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', updatePage);
  } else {
    updatePage();
  }
})();

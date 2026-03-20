(function () {
  'use strict';

  const PRODUCTS = window.ARTI_PRODUCTS || {};
  const PRODUCT_KEYS = Object.keys(PRODUCTS);

  if (!PRODUCT_KEYS.length) return;

  function getSiteUtils() {
    return window.ARTI_SITE_UTILS || {};
  }

  function getSiteConfig() {
    if (typeof getSiteUtils().getSiteConfig === 'function') {
      return getSiteUtils().getSiteConfig();
    }
    return window.ARTI_SITE || {
      businessName: 'ARTI ENTERPRISES',
      website: 'https://arti-enterprises.vercel.app',
      catalogPriceLabel: 'Price on request'
    };
  }

  function buildWhatsAppUrl(message) {
    if (typeof getSiteUtils().buildWhatsAppUrl === 'function') {
      return getSiteUtils().buildWhatsAppUrl(message);
    }
    const site = getSiteConfig();
    return `${site.whatsappBase || 'https://wa.me/919420996107'}?text=${encodeURIComponent(message)}`;
  }

  function buildLeadMessage(payload) {
    if (typeof getSiteUtils().buildLeadMessage === 'function') {
      return getSiteUtils().buildLeadMessage(payload);
    }
    return payload.closing || payload.requestType || 'Please share quotation and delivery timeline.';
  }

  function getProduct() {
    const params = new URLSearchParams(window.location.search);
    const slug = params.get('product');
    return PRODUCTS[slug] || PRODUCTS['3ply-corrugated-box'] || PRODUCTS[PRODUCT_KEYS[0]];
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

  function buildSchema(product, site) {
    return {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: product.name,
      description: product.metaDescription,
      sku: product.sku,
      brand: {
        '@type': 'Brand',
        name: site.businessName || 'ARTI ENTERPRISES'
      },
      manufacturer: {
        '@type': 'Organization',
        name: site.businessName || 'ARTI ENTERPRISES'
      },
      image: `${site.website.replace(/\/$/, '')}/${product.image.replace(/^\//, '')}`,
      category: 'Corrugated Box',
      material: 'Corrugated Fiberboard',
      additionalProperty: product.specs.map(function (spec) {
        return {
          '@type': 'PropertyValue',
          name: spec[0],
          value: spec[1]
        };
      })
    };
  }

  function renderSpecs(product) {
    const body = document.getElementById('productSpecsBody');
    if (!body) return;
    body.innerHTML = product.specs.map(function (spec) {
      return `<tr><td>${escapeHtml(spec[0])}</td><td>${escapeHtml(spec[1])}</td></tr>`;
    }).join('');
  }

  function renderQuoteGuidance(product) {
    const container = document.getElementById('productQuoteGuidance');
    if (!container) return;
    container.innerHTML = product.quoteGuidance.map(function (item, index) {
      const activeClass = index === 1 ? ' active' : '';
      return `<div class="price-tier${activeClass}"><div class="tier-qty">${escapeHtml(item[0])}</div><div class="tier-price">${escapeHtml(item[1])}</div></div>`;
    }).join('');
  }

  function renderRelatedProducts(product, site) {
    const container = document.getElementById('relatedProducts');
    if (!container) return;

    container.innerHTML = product.related.map(function (slug) {
      const related = PRODUCTS[slug];
      if (!related) return '';
      return `
        <div class="product-card">
          <div class="product-card-img">
            <img loading="lazy" src="${escapeHtml(related.image)}" alt="${escapeHtml(related.imageAlt)}">
          </div>
          <div class="product-card-body">
            <h3 class="product-card-title">${escapeHtml(related.name)}</h3>
            <div class="product-card-specs">
              <span>${escapeHtml(related.specs[0][1])}</span>
              <span>${escapeHtml(related.specs[1][1])}</span>
            </div>
            <div class="product-card-price"><span>${escapeHtml(site.catalogPriceLabel || 'Price on request')}</span></div>
            <div class="product-card-actions">
              <a href="product-detail.html?product=${encodeURIComponent(related.slug)}" class="btn btn-outline btn-sm btn-flex">View</a>
            </div>
          </div>
        </div>`;
    }).join('');
  }

  function updatePage() {
    const product = getProduct();
    const site = getSiteConfig();
    const pageUrl = `${site.website.replace(/\/$/, '')}/product-detail.html?product=${encodeURIComponent(product.slug)}`;
    const imageUrl = `${site.website.replace(/\/$/, '')}/${product.image.replace(/^\//, '')}`;

    document.title = `${product.name} — ${site.businessName || 'ARTI ENTERPRISES'}`;

    const metaDescription = document.getElementById('productMetaDescription');
    if (metaDescription) metaDescription.setAttribute('content', product.metaDescription);

    const canonical = document.getElementById('productCanonical');
    if (canonical) canonical.setAttribute('href', pageUrl);

    const ogTitle = document.getElementById('productOgTitle');
    if (ogTitle) ogTitle.setAttribute('content', `${product.name} — ${site.businessName || 'ARTI ENTERPRISES'}`);

    const ogDescription = document.getElementById('productOgDescription');
    if (ogDescription) ogDescription.setAttribute('content', product.metaDescription);

    const ogImage = document.getElementById('productOgImage');
    if (ogImage) ogImage.setAttribute('content', imageUrl);

    const twitterImage = document.getElementById('productTwitterImage');
    if (twitterImage) twitterImage.setAttribute('content', imageUrl);

    const pageProductTitle = document.getElementById('pageProductTitle');
    if (pageProductTitle) pageProductTitle.textContent = product.name;

    const breadcrumbCurrent = document.getElementById('breadcrumbCurrent');
    if (breadcrumbCurrent) breadcrumbCurrent.textContent = product.name;

    const productImage = document.getElementById('productImage');
    if (productImage) {
      productImage.setAttribute('src', product.image);
      productImage.setAttribute('alt', product.imageAlt);
    }

    const productTitle = document.getElementById('productTitle');
    if (productTitle) productTitle.textContent = product.name;

    const productSku = document.getElementById('productSku');
    if (productSku) productSku.textContent = `SKU: ${product.sku} | HSN: ${product.hsn}`;

    const productPriceMain = document.getElementById('productPriceMain');
    if (productPriceMain) productPriceMain.textContent = site.catalogPriceLabel || 'Price on request';

    const productIdealText = document.getElementById('productIdealText');
    if (productIdealText) productIdealText.textContent = product.idealFor;

    const quoteCta = document.getElementById('productQuoteCta');
    if (quoteCta) {
      const message = buildLeadMessage({
        requestType: 'Product Quote',
        source: `Product Detail - ${product.name}`,
        name: '',
        phone: '',
        company: '',
        details: [
          `Product: ${product.name}`,
          `SKU: ${product.sku}`,
          `Page Context: Product Detail`,
          `Requirement: Custom quote requested`
        ],
        closing: 'Please share quotation and delivery timeline for this product requirement.'
      });
      quoteCta.setAttribute('href', buildWhatsAppUrl(message));
      quoteCta.dataset.whatsappText = message;
    }

    const productSchema = document.getElementById('productSchema');
    if (productSchema) {
      productSchema.textContent = JSON.stringify(buildSchema(product, site));
    }

    renderSpecs(product);
    renderQuoteGuidance(product);
    renderRelatedProducts(product, site);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', updatePage);
  } else {
    updatePage();
  }
})();

/**
 * @file ARTI ENTERPRISES — Main JavaScript
 * @description Global utilities, DOM hydration, and UI interactions.
 * @author ARTI ENTERPRISES
 * @version 1.1.0
 */

let _cachedConfig = null;

function getSiteConfig() {
  if (_cachedConfig) return _cachedConfig;
  const site = window.ARTI_SITE || {};
  _cachedConfig = {
    businessName: site.businessName || 'ARTI ENTERPRISES',
    businessCategory: site.businessCategory || 'Packaging Supplier',
    businessAbout: site.businessAbout || 'Corrugated box manufacturer in Pune for 3 Ply, 5 Ply, 7 Ply, die-cut, printed, and custom packaging solutions. Bulk and custom orders welcome.',
    businessDescription: site.businessDescription || 'Premium corrugated box manufacturer in Pune. We supply 3 Ply, 5 Ply, 7 Ply, die-cut, custom printed, food-grade, export-quality, and e-commerce corrugated boxes for bulk and custom orders.',
    website: site.website || 'https://arti-enterprises.vercel.app',
    addressDisplay: site.addressDisplay || 'GAT NO 1297, Chikhali, PANCHAWATI HOUSING SOC NO 3, Pimpri Chinchwad, Pune, Maharashtra 411062',
    businessHoursDisplay: site.businessHoursDisplay || 'Monday to Saturday: 9:00 AM to 7:00 PM | Sunday: Closed',
    catalogPriceLabel: site.catalogPriceLabel || 'Price on request',
    phoneDisplay: site.phoneDisplay || '+91 9420996107',
    phoneHref: site.phoneHref || 'tel:+919420996107',
    whatsappNumber: site.whatsappNumber || '919420996107',
    whatsappBase: site.whatsappBase || 'https://wa.me/919420996107',
    whatsappGreeting: site.whatsappGreeting || 'Hello ARTI ENTERPRISES',
    email: site.email || 'artienterprises17@rediffmail.com',
    contactReplyPromise: site.contactReplyPromise || 'Reply within 24 hours'
  };
  return _cachedConfig;
}

function buildWhatsAppUrl(message) {
  const site = getSiteConfig();
  return `${site.whatsappBase}?text=${encodeURIComponent(message || site.whatsappGreeting)}`;
}

function formatLeadTimestamp() {
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
  const timeStr = now.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });

  return `${dateStr} ${timeStr}`;
}

function buildLeadMessage({
  requestType,
  source,
  name,
  phone,
  company,
  details,
  notes,
  closing
}) {
  const lines = [];

  lines.push('*Quotation Request – ARTI ENTERPRISES*');
  lines.push(`Date: ${formatLeadTimestamp()}`);
  lines.push('');
  lines.push('*Request Details*');
  lines.push(`• Request Type: ${requestType}`);
  lines.push(`• Source: ${source}`);
  lines.push('');
  lines.push('*Customer Details*');
  lines.push(`• Name: ${name}`);
  lines.push(`• Mobile: ${phone}`);
  if (company) {
    lines.push(`• Company: ${company}`);
  }
  lines.push('');

  if (details && details.length) {
    lines.push('*Requirements*');
    details.forEach((detail) => {
      if (detail) lines.push(`• ${detail}`);
    });
    lines.push('');
  }

  if (notes) {
    lines.push('*Additional Notes*');
    lines.push(notes);
    lines.push('');
  }

  lines.push(closing || 'Please share quotation and delivery timeline for the above requirement.');
  lines.push('Thank you.');

  return lines.join('\n');
}

window.ARTI_SITE_UTILS = {
  getSiteConfig,
  buildWhatsAppUrl,
  buildLeadMessage,
  formatLeadTimestamp
};

function bootstrapMainScripts() {
  hydrateSiteLinks();
  initHeader();
  initMobileNav();
  initScrollReveal();
  initProductFilters();
  // Form removed as per user request for WhatsApp standardization
  // initContactForm();
  initContactWhatsApp();
  initPriceTiers();
  initActiveNav();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootstrapMainScripts);
} else {
  bootstrapMainScripts();
}

function hydrateSiteLinks() {
  const site = getSiteConfig();

  const hydrationMap = {
    'phone': { attr: 'href', val: site.phoneHref, text: site.phoneDisplay },
    'email': { attr: 'href', val: `mailto:${site.email}`, text: site.email },
    'website': { attr: 'href', val: site.website, text: site.website },
    'whatsapp': { 
      attr: 'href', 
      val: (el) => buildWhatsAppUrl(el.dataset.whatsappText || site.whatsappGreeting),
      text: `${site.phoneDisplay} (WhatsApp)` 
    },
    'whatsapp-base': { attr: 'href', val: site.whatsappBase, text: `${site.phoneDisplay} (WhatsApp)` },
    'reply-promise': { text: site.contactReplyPromise },
    'description': { text: site.businessDescription },
    'about': { text: site.businessAbout },
    'address': { text: site.addressDisplay },
    'business-hours': { text: site.businessHoursDisplay },
    'catalog-price': { text: site.catalogPriceLabel }
  };

  Object.entries(hydrationMap).forEach(([key, config]) => {
    document.querySelectorAll(`[data-site-${key}]`).forEach((el) => {
      if (config.attr) {
        const val = typeof config.val === 'function' ? config.val(el) : config.val;
        el.setAttribute(config.attr, val);
      }
      const dataKey = `site${key.split('-').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join('')}`;
      if (el.dataset[dataKey] === 'display' || !config.attr) {
        el.textContent = config.text;
      }
    });
  });
}

/* ---- Sticky Header with scroll effect ---- */
function initHeader() {
  const header = document.getElementById('header');
  if (!header) return;
  const onScroll = () => {
    header.classList.toggle('scrolled', window.scrollY > 30);
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
}

/**
 * Mobile Navigation
 * @description Handles hamburger menu toggle, outside click close, and
 *              hides floating widgets (Tidio/WhatsApp) while menu is open.
 */
function initMobileNav() {
  const hamburger = document.getElementById('hamburger');
  const nav = document.getElementById('nav');
  if (!hamburger || !nav) return;

  /** Close the mobile menu and restore page state */
  function closeMenu() {
    hamburger.classList.remove('open');
    nav.classList.remove('open');
    document.body.style.overflow = '';
    document.body.classList.remove('menu-open');
    if (window.tidioChatApi) window.tidioChatApi.show();
  }

  hamburger.addEventListener('click', () => {
    const willOpen = !nav.classList.contains('open');
    if (willOpen) {
      hamburger.classList.add('open');
      nav.classList.add('open');
      document.body.style.overflow = 'hidden';
      document.body.classList.add('menu-open');
      if (window.tidioChatApi) window.tidioChatApi.hide();
    } else {
      closeMenu();
    }
  });

  nav.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', closeMenu);
  });

  document.addEventListener('click', (e) => {
    if (!nav.contains(e.target) && !hamburger.contains(e.target) && nav.classList.contains('open')) {
      closeMenu();
    }
  });
}

/**
 * Scroll Reveal Animation
 * @description Uses IntersectionObserver to animate elements into view
 *              when they enter the viewport. Each element animates once.
 */
function initScrollReveal() {
  const reveals = document.querySelectorAll('.reveal');
  if (!reveals.length) return;

  if (!('IntersectionObserver' in window)) {
    // Fallback: show all elements if IO not supported
    reveals.forEach((el) => el.classList.add('visible'));
    return;
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });

  reveals.forEach((el) => observer.observe(el));
}

/* ---- Product Filters (products.html) ---- */
function initProductFilters() {
  const grid = document.getElementById('productsGrid');
  const noResults = document.getElementById('noResults');
  if (!grid) return;

  const checkboxes = document.querySelectorAll('[data-filter]');
  const cards = grid.querySelectorAll('.product-card');

  checkboxes.forEach((cb) => {
    cb.addEventListener('change', applyFilters);
  });

  function applyFilters() {
    const activeFilters = {};

    checkboxes.forEach((cb) => {
      if (cb.checked) {
        const type = cb.dataset.filter;
        if (!activeFilters[type]) activeFilters[type] = [];
        activeFilters[type].push(cb.value);
      }
    });

    const filterTypes = Object.keys(activeFilters);
    let visibleCount = 0;

    cards.forEach((card) => {
      let show = true;

      filterTypes.forEach((type) => {
        const cardValue = card.dataset[type] || '';
        const matches = activeFilters[type].some((v) => cardValue.includes(v));
        if (!matches) show = false;
      });

      card.style.display = show ? '' : 'none';
      if (show) visibleCount++;
    });

    if (noResults) {
      noResults.style.display = visibleCount === 0 ? 'block' : 'none';
    }
  }
}

function clearFilters() {
  document.querySelectorAll('[data-filter]').forEach((cb) => { cb.checked = false; });
  document.querySelectorAll('#productsGrid .product-card').forEach((card) => { card.style.display = ''; });
  const noResults = document.getElementById('noResults');
  if (noResults) noResults.style.display = 'none';
}

window.clearFilters = clearFilters;

/**
 * Contact WhatsApp Quote Button
 * @description Simple fallback button that opens WhatsApp with a greeting.
 */
function initContactWhatsApp() {
  const btn = document.getElementById('btnContactWhatsApp');
  if (!btn) return;

  btn.addEventListener('click', () => {
    const site = getSiteConfig();
    window.open(buildWhatsAppUrl(site.whatsappGreeting), '_blank', 'noopener');
  });
}

/* ---- Price Tier Selection (product detail) ---- */
function initPriceTiers() {
  if (document.documentElement.dataset.priceTierDelegated === 'true') return;
  document.documentElement.dataset.priceTierDelegated = 'true';

  document.addEventListener('click', (event) => {
    const target = event.target instanceof Element ? event.target : null;
    const tier = target ? target.closest('.price-tier') : null;
    if (!tier) return;

    const group = tier.parentElement;
    if (!group || !group.classList.contains('price-tiers')) return;

    group.querySelectorAll('.price-tier').forEach((item) => {
      item.classList.toggle('active', item === tier);
    });
  });
}

/**
 * Active Navigation Highlighting
 * @description Automatically highlights the current page in the navigation menu.
 */
function initActiveNav() {
  const path = window.location.pathname;
  const fileName = path.split('/').pop() || 'index.html';
  const routeAliases = {
    'product-detail.html': 'products.html',
    'blog-article.html': 'blog.html'
  };
  const activeFile = routeAliases[fileName] || fileName;
  
  document.querySelectorAll('.nav a').forEach((link) => {
    const href = link.getAttribute('href');
    if (!href || link.classList.contains('btn')) return;

    // Normalize comparison
    const isHome = activeFile === 'index.html' && href === 'index.html';
    const isMatch = href === activeFile || isHome;

    if (isMatch) {
      link.classList.add('active');
    } else {
      link.classList.remove('active');
    }
  });
}

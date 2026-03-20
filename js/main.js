/* ============================================
   ARTI ENTERPRISES — Main JavaScript
   Light Theme — Clean & Professional
   ============================================ */

function getSiteConfig() {
  const site = window.ARTI_SITE || {};
  return {
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
  buildLeadMessage
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

  document.querySelectorAll('[data-site-phone]').forEach((el) => {
    el.setAttribute('href', site.phoneHref);
    if (el.dataset.sitePhone === 'display') {
      el.textContent = site.phoneDisplay;
    }
  });

  document.querySelectorAll('[data-site-email]').forEach((el) => {
    el.setAttribute('href', `mailto:${site.email}`);
    if (el.dataset.siteEmail === 'display') {
      el.textContent = site.email;
    }
  });

  document.querySelectorAll('[data-site-website]').forEach((el) => {
    el.setAttribute('href', site.website);
    if (el.dataset.siteWebsite === 'display') {
      el.textContent = site.website;
    }
  });

  document.querySelectorAll('[data-site-whatsapp]').forEach((el) => {
    const rawText = el.dataset.whatsappText || site.whatsappGreeting;
    el.setAttribute('href', buildWhatsAppUrl(rawText));
    if (el.dataset.siteWhatsapp === 'display') {
      el.textContent = `${site.phoneDisplay} (WhatsApp)`;
    }
  });

  document.querySelectorAll('[data-site-whatsapp-base]').forEach((el) => {
    el.setAttribute('href', site.whatsappBase);
    if (el.dataset.siteWhatsappBase === 'display') {
      el.textContent = `${site.phoneDisplay} (WhatsApp)`;
    }
  });

  document.querySelectorAll('[data-site-reply-promise]').forEach((el) => {
    el.textContent = site.contactReplyPromise;
  });

  document.querySelectorAll('[data-site-description]').forEach((el) => {
    el.textContent = site.businessDescription;
  });

  document.querySelectorAll('[data-site-about]').forEach((el) => {
    el.textContent = site.businessAbout;
  });

  document.querySelectorAll('[data-site-address]').forEach((el) => {
    el.textContent = site.addressDisplay;
  });

  document.querySelectorAll('[data-site-business-hours]').forEach((el) => {
    el.textContent = site.businessHoursDisplay;
  });

  document.querySelectorAll('[data-site-catalog-price]').forEach((el) => {
    el.textContent = site.catalogPriceLabel;
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

/* ---- Mobile Navigation ---- */
function initMobileNav() {
  const hamburger = document.getElementById('hamburger');
  const nav = document.getElementById('nav');
  if (!hamburger || !nav) return;

  hamburger.addEventListener('click', () => {
    hamburger.classList.toggle('open');
    nav.classList.toggle('open');
    document.body.style.overflow = nav.classList.contains('open') ? 'hidden' : '';
  });

  nav.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => {
      hamburger.classList.remove('open');
      nav.classList.remove('open');
      document.body.style.overflow = '';
    });
  });

  document.addEventListener('click', (e) => {
    if (!nav.contains(e.target) && !hamburger.contains(e.target) && nav.classList.contains('open')) {
      hamburger.classList.remove('open');
      nav.classList.remove('open');
      document.body.style.overflow = '';
    }
  });
}

/* ---- Scroll Reveal Animation ---- */
function initScrollReveal() {
  const reveals = document.querySelectorAll('.reveal');
  if (!reveals.length) return;

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

/* ---- Contact WhatsApp Quote ---- */
function initContactWhatsApp() {
  const btn = document.getElementById('btnContactWhatsApp');
  if (!btn) return;

  btn.addEventListener('click', () => {
    // Basic redirect if form is missing
    const site = getSiteConfig();
    window.open(buildWhatsAppUrl(site.whatsappGreeting), '_blank', 'noopener');
  });
}

/* ---- Price Tier Selection (product detail) ---- */
function initPriceTiers() {
  const tiers = document.querySelectorAll('.price-tier');
  if (!tiers.length) return;

  tiers.forEach((tier) => {
    tier.addEventListener('click', () => {
      tiers.forEach((t) => t.classList.remove('active'));
      tier.classList.add('active');
    });
  });
}

/* ---- Active Navigation Highlighting ---- */
function initActiveNav() {
  const currentPage = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav a').forEach((link) => {
    const href = link.getAttribute('href');
    // Account for WhatsApp links in nav
    if (href === currentPage || (currentPage === 'contact.html' && href.includes('wa.me'))) {
      link.classList.add('active');
    } else if (link.classList.contains('active') && !link.classList.contains('btn')) {
       // Only remove if it's not the current page
       if (href !== currentPage) link.classList.remove('active');
    }
  });
}

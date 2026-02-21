/* ============================================
   ARTI ENTERPRISES — Main JavaScript
   Light Theme — Clean & Professional
   ============================================ */

document.addEventListener('DOMContentLoaded', () => {
  initHeader();
  initMobileNav();
  initScrollReveal();
  initProductFilters();
  initContactForm();
  initPriceTiers();
  initActiveNav();
});

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

  // Close on link click
  nav.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      hamburger.classList.remove('open');
      nav.classList.remove('open');
      document.body.style.overflow = '';
    });
  });

  // Close on outside click
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

  reveals.forEach(el => observer.observe(el));
}

/* ---- Product Filters (products.html) ---- */
function initProductFilters() {
  const grid = document.getElementById('productsGrid');
  const noResults = document.getElementById('noResults');
  if (!grid) return;

  const checkboxes = document.querySelectorAll('[data-filter]');
  const cards = grid.querySelectorAll('.product-card');

  checkboxes.forEach(cb => {
    cb.addEventListener('change', applyFilters);
  });

  function applyFilters() {
    const activeFilters = {};

    checkboxes.forEach(cb => {
      if (cb.checked) {
        const type = cb.dataset.filter;
        if (!activeFilters[type]) activeFilters[type] = [];
        activeFilters[type].push(cb.value);
      }
    });

    const filterTypes = Object.keys(activeFilters);
    let visibleCount = 0;

    cards.forEach(card => {
      let show = true;

      filterTypes.forEach(type => {
        const cardValue = card.dataset[type] || '';
        const matches = activeFilters[type].some(v => cardValue.includes(v));
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

// Global clear filters function
function clearFilters() {
  document.querySelectorAll('[data-filter]').forEach(cb => { cb.checked = false; });
  document.querySelectorAll('#productsGrid .product-card').forEach(card => { card.style.display = ''; });
  const noResults = document.getElementById('noResults');
  if (noResults) noResults.style.display = 'none';
}

/* ---- Contact Form ---- */
function initContactForm() {
  const form = document.getElementById('contactForm');
  if (!form) return;

  const successMsg = document.getElementById('formSuccess');
  const errorMsg = document.getElementById('formError');
  const submitBtn = document.getElementById('submitBtn');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    successMsg.style.display = 'none';
    errorMsg.style.display = 'none';

    // Basic validation
    const name = form.querySelector('#name');
    const email = form.querySelector('#email');
    const message = form.querySelector('#message');

    if (!name.value.trim() || !email.value.trim() || !message.value.trim()) {
      errorMsg.textContent = 'Please fill in all required fields.';
      errorMsg.style.display = 'block';
      return;
    }

    if (!isValidEmail(email.value)) {
      errorMsg.textContent = 'Please enter a valid email address.';
      errorMsg.style.display = 'block';
      return;
    }

    // Submit
    submitBtn.disabled = true;
    submitBtn.textContent = 'Sending...';

    try {
      const response = await fetch(form.action, {
        method: 'POST',
        body: new FormData(form),
        headers: { 'Accept': 'application/json' }
      });

      if (response.ok) {
        successMsg.style.display = 'block';
        form.reset();
        successMsg.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else {
        throw new Error('Form submission failed');
      }
    } catch (err) {
      errorMsg.textContent = 'Something went wrong. Please email us at artienterprises17@rediffmail.com';
      errorMsg.style.display = 'block';
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Send Message';
    }
  });
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/* ---- Price Tier Selection (product detail) ---- */
function initPriceTiers() {
  const tiers = document.querySelectorAll('.price-tier');
  if (!tiers.length) return;

  tiers.forEach(tier => {
    tier.addEventListener('click', () => {
      tiers.forEach(t => t.classList.remove('active'));
      tier.classList.add('active');
    });
  });
}

/* ---- Active Navigation Highlighting ---- */
function initActiveNav() {
  const currentPage = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav a').forEach(link => {
    const href = link.getAttribute('href');
    if (href === currentPage) {
      link.classList.add('active');
    } else if (link.classList.contains('active') && href !== currentPage && !link.classList.contains('btn')) {
      link.classList.remove('active');
    }
  });
}

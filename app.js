/* =========================================================================
   WeBridge Digital — app.js
   Vanilla JS. No dependencies. ES2017+ syntax.
   Handles: product render, cart, drawer, modals, checkout, validation,
   newsletter, contact form, focus trap, localStorage persistence.
   ========================================================================= */

(() => {
  'use strict';

  // ---------- STATE ----------
  let CATALOG = null;
  let CART = loadCart();
  let lastFocused = null;

  // ---------- DOM REFS ----------
  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => Array.from(root.querySelectorAll(s));

  const els = {
    productGrid: $('#product-grid'),
    filterBtns: $$('.filter-btn'),
    cartOpen: $('#cart-open'),
    cartClose: $('#cart-close'),
    cartDrawer: $('#cart-drawer'),
    cartBody: $('#cart-body'),
    cartFoot: $('#cart-foot'),
    cartCount: $('#cart-count'),
    cartSubtotal: $('#cart-subtotal'),
    cartTax: $('#cart-tax'),
    cartShipping: $('#cart-shipping'),
    cartTotal: $('#cart-total'),
    overlay: $('#overlay'),
    checkoutOpen: $('#checkout-open'),
    checkoutModal: $('#checkout-modal'),
    checkoutClose: $('#checkout-close'),
    checkoutForm: $('#checkout-form'),
    checkoutSummary: $('#checkout-summary'),
    successModal: $('#success-modal'),
    successClose: $('#success-close'),
    successDone: $('#success-done'),
    successPrint: $('#success-print'),
    successName: $('#success-name'),
    successId: $('#success-id'),
    successEmail: $('#success-email'),
    quickviewModal: $('#quickview-modal'),
    quickviewClose: $('#quickview-close'),
    qvImg: $('#qv-img'),
    qvCat: $('#qv-cat'),
    qvTitle: $('#qv-title'),
    qvPrice: $('#qv-price'),
    qvDesc: $('#qv-desc'),
    qvDelivery: $('#qv-delivery'),
    qvAdd: $('#qv-add'),
    contactForm: $('#contact-form'),
    contactSuccess: $('#cf-success'),
    menuToggle: $('#menu-toggle'),
    primaryNav: $('.primary-nav'),
    newsletterForm: $('#newsletter-form'),
    newsletterMsg: $('#ns-msg'),
  };

  // ---------- BOOT ----------
  document.addEventListener('DOMContentLoaded', init);

  async function init() {
    try {
      const res = await fetch('products.json');
      if (!res.ok) throw new Error('catalog fetch failed: ' + res.status);
      CATALOG = await res.json();
    } catch (err) {
      console.error(err);
      els.productGrid.innerHTML = `
        <li class="noscript-msg">
          We couldn't load the product catalog. Please refresh, or contact
          <a href="mailto:hello@webridgedigital.example">hello@webridgedigital.example</a>.
        </li>`;
      return;
    }
    renderProducts('all');
    bindFilters();
    bindCart();
    bindModals();
    bindCheckout();
    bindContactForm();
    bindNewsletter();
    bindMenu();
    bindKeyboard();
    updateCartUI();
  }

  // ---------- PRODUCTS ----------
  function renderProducts(filter) {
    const items = CATALOG.products.filter(p =>
      filter === 'all' ? true : p.category === filter
    );
    els.productGrid.innerHTML = items.map(productCardHTML).join('');
    $$('.product-add', els.productGrid).forEach(btn => {
      btn.addEventListener('click', () => addToCart(btn.dataset.id));
    });
    $$('.product-quickview', els.productGrid).forEach(btn => {
      btn.addEventListener('click', () => openQuickview(btn.dataset.id));
    });
  }

  function productCardHTML(p) {
    return `
      <li class="product-card" data-id="${p.id}">
        <div class="product-media">
          <span class="product-cat">${p.category}</span>
          <img src="${p.image}" alt="${p.name}" loading="lazy" width="800" height="800" />
          <button class="product-quickview" data-id="${p.id}" aria-label="Quick view: ${p.name}">⊙</button>
        </div>
        <div class="product-info">
          <h3>${p.name}</h3>
          <p>${p.description}</p>
        </div>
        <div class="product-foot">
          <span class="product-price">${formatPrice(p.price)}</span>
          <button class="product-add" data-id="${p.id}" aria-label="Add ${p.name} to cart">Add to cart</button>
        </div>
      </li>`;
  }

  function bindFilters() {
    els.filterBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        els.filterBtns.forEach(b => {
          b.classList.remove('is-active');
          b.setAttribute('aria-selected', 'false');
        });
        btn.classList.add('is-active');
        btn.setAttribute('aria-selected', 'true');
        renderProducts(btn.dataset.filter);
      });
    });
  }

  // ---------- QUICK VIEW ----------
  function openQuickview(id) {
    const p = CATALOG.products.find(x => x.id === id);
    if (!p) return;
    els.qvImg.src = p.image;
    els.qvImg.alt = p.name;
    els.qvCat.textContent = p.category;
    els.qvTitle.textContent = p.name;
    els.qvPrice.textContent = formatPrice(p.price);
    els.qvDesc.textContent = p.longDescription;
    els.qvDelivery.textContent = p.deliveryNote;
    els.qvAdd.onclick = () => {
      addToCart(id);
      closeModal(els.quickviewModal);
      openCart();
    };
    openModal(els.quickviewModal);
  }

  // ---------- CART ----------
  function loadCart() {
    try {
      return JSON.parse(localStorage.getItem('wbd:cart') || '[]');
    } catch {
      return [];
    }
  }
  function saveCart() {
    localStorage.setItem('wbd:cart', JSON.stringify(CART));
  }

  function addToCart(id) {
    const existing = CART.find(i => i.id === id);
    if (existing) existing.qty += 1;
    else CART.push({ id, qty: 1 });
    saveCart();
    updateCartUI();
    const btn = document.querySelector(`.product-add[data-id="${id}"]`);
    if (btn) {
      btn.textContent = 'Added ✓';
      btn.classList.add('is-added');
      setTimeout(() => {
        btn.textContent = 'Add to cart';
        btn.classList.remove('is-added');
      }, 1400);
    }
  }

  function removeFromCart(id) {
    CART = CART.filter(i => i.id !== id);
    saveCart();
    updateCartUI();
  }

  function changeQty(id, delta) {
    const item = CART.find(i => i.id === id);
    if (!item) return;
    item.qty = Math.max(0, item.qty + delta);
    if (item.qty === 0) {
      removeFromCart(id);
      return;
    }
    saveCart();
    updateCartUI();
  }

  function cartCount() {
    return CART.reduce((sum, i) => sum + i.qty, 0);
  }

  function cartSubtotal() {
    return CART.reduce((sum, i) => {
      const p = CATALOG.products.find(x => x.id === i.id);
      return p ? sum + p.price * i.qty : sum;
    }, 0);
  }

  function hasMerchandise() {
    return CART.some(i => {
      const p = CATALOG.products.find(x => x.id === i.id);
      return p && p.category === 'Merchandise';
    });
  }

  function cartTotals() {
    const subtotal = cartSubtotal();
    const tax = Math.round(subtotal * CATALOG.taxRate);
    const merch = hasMerchandise();
    let shipping = 0;
    if (merch) {
      shipping = subtotal >= CATALOG.freeShippingThreshold ? 0 : CATALOG.shippingFlat;
    }
    return { subtotal, tax, shipping, total: subtotal + tax + shipping };
  }

  function updateCartUI() {
    const count = cartCount();
    els.cartCount.textContent = count;
    els.cartCount.style.display = count > 0 ? 'inline-flex' : 'none';

    if (CART.length === 0) {
      els.cartBody.innerHTML = `
        <p class="cart-empty">
          Your cart is empty.<br />
          <small style="color:var(--gray-600); display:block; margin-top:8px;">
            Browse the shop to add services or merch.
          </small>
        </p>`;
      els.cartFoot.hidden = true;
      return;
    }

    els.cartBody.innerHTML = CART.map(i => {
      const p = CATALOG.products.find(x => x.id === i.id);
      if (!p) return '';
      return `
        <div class="cart-item">
          <img src="${p.image}" alt="" loading="lazy" />
          <div class="cart-item-info">
            <h4>${p.name}</h4>
            <span class="price">${formatPrice(p.price * i.qty)}</span>
            <div class="qty-control" role="group" aria-label="Quantity for ${p.name}">
              <button data-act="dec" data-id="${p.id}" aria-label="Decrease quantity">−</button>
              <span>${i.qty}</span>
              <button data-act="inc" data-id="${p.id}" aria-label="Increase quantity">+</button>
            </div>
          </div>
          <button class="cart-remove" data-id="${p.id}" aria-label="Remove ${p.name}">Remove</button>
        </div>`;
    }).join('');

    $$('.qty-control button', els.cartBody).forEach(b => {
      b.addEventListener('click', () => {
        changeQty(b.dataset.id, b.dataset.act === 'inc' ? 1 : -1);
      });
    });
    $$('.cart-remove', els.cartBody).forEach(b => {
      b.addEventListener('click', () => removeFromCart(b.dataset.id));
    });

    const { subtotal, tax, shipping, total } = cartTotals();
    els.cartSubtotal.textContent = formatPrice(subtotal);
    els.cartTax.textContent = formatPrice(tax);
    els.cartShipping.textContent = shipping === 0 && hasMerchandise()
      ? 'Free'
      : (hasMerchandise() ? formatPrice(shipping) : 'Digital only');
    els.cartTotal.textContent = formatPrice(total);
    els.cartFoot.hidden = false;
  }

  function bindCart() {
    els.cartOpen.addEventListener('click', openCart);
    els.cartClose.addEventListener('click', closeCart);
    els.overlay.addEventListener('click', closeCart);
  }
  function openCart() {
    lastFocused = document.activeElement;
    els.cartDrawer.classList.add('is-open');
    els.cartDrawer.setAttribute('aria-hidden', 'false');
    els.overlay.hidden = false;
    requestAnimationFrame(() => els.overlay.classList.add('is-open'));
    document.body.style.overflow = 'hidden';
    els.cartClose.focus();
  }
  function closeCart() {
    els.cartDrawer.classList.remove('is-open');
    els.cartDrawer.setAttribute('aria-hidden', 'true');
    els.overlay.classList.remove('is-open');
    setTimeout(() => { els.overlay.hidden = true; }, 320);
    document.body.style.overflow = '';
    if (lastFocused) lastFocused.focus();
  }

  // ---------- MODALS ----------
  function bindModals() {
    els.quickviewClose.addEventListener('click', () => closeModal(els.quickviewModal));
    els.successClose.addEventListener('click', () => closeModal(els.successModal));
    els.successDone.addEventListener('click', () => closeModal(els.successModal));
    els.successPrint.addEventListener('click', () => window.print());
    els.checkoutClose.addEventListener('click', () => closeModal(els.checkoutModal));

    [els.quickviewModal, els.successModal, els.checkoutModal].forEach(m => {
      m.addEventListener('click', e => {
        if (e.target === m) closeModal(m);
      });
    });
  }
  function openModal(m) {
    lastFocused = document.activeElement;
    m.classList.add('is-open');
    m.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    const focusable = m.querySelector('button, [href], input, textarea, select');
    if (focusable) focusable.focus();
  }
  function closeModal(m) {
    m.classList.remove('is-open');
    m.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    if (lastFocused) lastFocused.focus();
  }

  // ---------- CHECKOUT ----------
  function bindCheckout() {
    els.checkoutOpen.addEventListener('click', () => {
      if (CART.length === 0) return;
      closeCart();
      renderCheckoutSummary();
      openModal(els.checkoutModal);
    });

    els.checkoutForm.addEventListener('submit', e => {
      e.preventDefault();
      if (!validateForm(els.checkoutForm, ['co-name', 'co-email', 'co-phone'])) return;

      if (hasMerchandise()) {
        const addr = $('#co-addr').value.trim();
        const city = $('#co-city').value.trim();
        if (!addr || !city) {
          alert('Shipping address and city are required for merchandise orders.');
          return;
        }
      }

      submitOrder();
    });
  }

  function renderCheckoutSummary() {
    const { subtotal, tax, shipping, total } = cartTotals();
    const lines = CART.map(i => {
      const p = CATALOG.products.find(x => x.id === i.id);
      return `<div class="row"><span>${p.name} × ${i.qty}</span><span>${formatPrice(p.price * i.qty)}</span></div>`;
    }).join('');
    els.checkoutSummary.innerHTML = `
      ${lines}
      <div class="row"><span>Subtotal</span><span>${formatPrice(subtotal)}</span></div>
      <div class="row"><span>VAT</span><span>${formatPrice(tax)}</span></div>
      <div class="row"><span>Shipping</span><span>${shipping === 0 && hasMerchandise() ? 'Free' : (hasMerchandise() ? formatPrice(shipping) : 'Digital only')}</span></div>
      <div class="row total"><span>Total</span><span>${formatPrice(total)}</span></div>
    `;
  }

  function submitOrder() {
    const orderId = '#' + Math.random().toString(36).substring(2, 8).toUpperCase();
    const name = $('#co-name').value.trim();
    const email = $('#co-email').value.trim();

    /* PRODUCTION HOOK
       Replace this block with a POST to your server. See server-example.js. */

    CART = [];
    saveCart();
    updateCartUI();
    closeModal(els.checkoutModal);
    els.successName.textContent = name.split(' ')[0] || 'friend';
    els.successId.textContent = orderId;
    els.successEmail.textContent = email;
    openModal(els.successModal);
  }

  // ---------- VALIDATION ----------
  function validateForm(form, ids) {
    let ok = true;
    ids.forEach(id => {
      const input = document.getElementById(id);
      const field = input.closest('.field');
      const errSpan = form.querySelector(`.error[data-for="${id}"]`);
      const value = input.value.trim();
      let msg = '';

      if (input.required && !value) msg = 'This field is required.';
      else if (input.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) msg = 'Please enter a valid email.';
      else if (input.type === 'tel' && value.replace(/\D/g, '').length < 7) msg = 'Please enter a valid phone number.';

      if (msg) {
        ok = false;
        field.classList.add('is-invalid');
        if (errSpan) errSpan.textContent = msg;
      } else {
        field.classList.remove('is-invalid');
        if (errSpan) errSpan.textContent = '';
      }
    });
    if (!ok) {
      const firstInvalid = form.querySelector('.is-invalid input, .is-invalid textarea');
      if (firstInvalid) firstInvalid.focus();
    }
    return ok;
  }

  // ---------- CONTACT FORM ----------
  function bindContactForm() {
    els.contactForm.addEventListener('submit', e => {
      e.preventDefault();
      if (!validateForm(els.contactForm, ['cf-name', 'cf-email', 'cf-msg'])) return;
      els.contactForm.reset();
      els.contactSuccess.hidden = false;
      setTimeout(() => { els.contactSuccess.hidden = true; }, 8000);
    });
  }

  // ---------- NEWSLETTER ----------
  function bindNewsletter() {
    els.newsletterForm.addEventListener('submit', e => {
      e.preventDefault();
      const input = els.newsletterForm.querySelector('input');
      const val = input.value.trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) {
        els.newsletterMsg.textContent = 'Please enter a valid email.';
        els.newsletterMsg.style.color = '#FF9999';
        return;
      }
      els.newsletterMsg.textContent = 'Subscribed. Field notes incoming.';
      els.newsletterMsg.style.color = 'var(--gold-500)';
      input.value = '';
    });
  }

  // ---------- MOBILE MENU ----------
  function bindMenu() {
    els.menuToggle.addEventListener('click', () => {
      const open = els.primaryNav.classList.toggle('is-open');
      els.menuToggle.setAttribute('aria-expanded', String(open));
      els.menuToggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    });
    $$('a', els.primaryNav).forEach(a => {
      a.addEventListener('click', () => {
        els.primaryNav.classList.remove('is-open');
        els.menuToggle.setAttribute('aria-expanded', 'false');
      });
    });
  }

  // ---------- KEYBOARD ----------
  function bindKeyboard() {
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') {
        if (els.successModal.classList.contains('is-open')) closeModal(els.successModal);
        else if (els.checkoutModal.classList.contains('is-open')) closeModal(els.checkoutModal);
        else if (els.quickviewModal.classList.contains('is-open')) closeModal(els.quickviewModal);
        else if (els.cartDrawer.classList.contains('is-open')) closeCart();
      }
    });
  }

  // ---------- UTILS ----------
  function formatPrice(n) {
    return `${CATALOG?.currencySymbol || 'KSh'} ${n.toLocaleString('en-KE')}`;
  }
})();
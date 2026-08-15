/**
 * ==========================================================================
 * LUVITS - GLOBAL LAYOUT COMPONENT (HEADER, FOOTER & WHATSAPP WIDGET)
 * Renders consistent Dark Luxury Header, Footer & Floating CTA across all routes
 * ==========================================================================
 */

import { authStore } from './auth-store.js';

export function updateNavMenu() {
  const navMenu = document.getElementById('main-nav');
  if (!navMenu) return;

  const isAuthed = authStore.isAuthenticated();
  const isAdmin = authStore.isAdmin();
  let workflowLink = navMenu.querySelector('.nav-link-workflow-wrap');

  if (isAuthed) {
    if (!workflowLink) {
      workflowLink = document.createElement('div');
      workflowLink.className = 'nav-link-workflow-wrap';
      workflowLink.style.display = 'contents';
      workflowLink.innerHTML = `
        ${isAdmin ? '<a href="admin.html" class="nav-link" style="color: #fbbf24; font-weight: 700;"><span>🛡️ Admin</span></a>' : ''}
        <a href="LUVITS_WorkFlow.html" class="nav-link nav-link-workflow"><span>⚡ WorkFlow</span></a>
      `;
      
      const drawerFooter = navMenu.querySelector('.nav-drawer-footer');
      if (drawerFooter) {
        navMenu.insertBefore(workflowLink, drawerFooter);
      } else {
        navMenu.appendChild(workflowLink);
      }
    }
  } else {
    if (workflowLink) workflowLink.remove();
  }

  // Update active route class
  const currentPath = window.location.pathname.replace(/\/index\.html$/, '').replace(/\/$/, '') || '/';
  const navLinks = navMenu.querySelectorAll('.nav-link');
  navLinks.forEach(link => {
    const href = link.getAttribute('href').replace(/\/index\.html$/, '').replace(/\/$/, '') || '/';
    const isExactMatch = href === currentPath;
    const isParentMatch = href !== '/' && currentPath.startsWith(href) && (currentPath.length === href.length || currentPath.charAt(href.length) === '/');
    if (isExactMatch || isParentMatch) {
      link.classList.add('is-active');
    } else {
      link.classList.remove('is-active');
    }
  });
}

export function renderGlobalLayout() {
  const headerContainer = document.querySelector('[data-global-header]');
  const footerContainer = document.querySelector('[data-global-footer]');

  if (headerContainer) {
    headerContainer.innerHTML = `
      <header class="site-header" data-site-header>
        <div class="container header-inner">
          <a href="/" class="brand" aria-label="LUVITS Home">
            <span class="brand-title">LUVITS</span>
          </a>

          <button class="nav-toggle" type="button" aria-expanded="false" aria-controls="main-nav" aria-label="Toggle Navigation">
            <span class="hamburger-bar"></span>
            <span class="hamburger-bar"></span>
            <span class="hamburger-bar"></span>
          </button>

          <nav class="nav-menu" id="main-nav" aria-label="Primary Navigation">
            <a href="/" class="nav-link">Home</a>
            <a href="/services" class="nav-link">Services</a>
            <a href="/portfolio" class="nav-link">Portfolio</a>
            <a href="/about" class="nav-link">About Us</a>
            <a href="/luv-ai" class="nav-link">Luv.AI</a>
            <a href="/pricing" class="nav-link">Pricing</a>
            <a href="/contact" class="nav-link">Contact</a>

            <div class="nav-drawer-footer">
              <a href="https://wa.me/916359435595?text=Hello%20LUVITS%2C%20I%20would%20like%20to%20inquire%20about%20your%20services." 
                 target="_blank" 
                 rel="noopener noreferrer" 
                 class="btn btn-gold btn-sm" 
                 style="width: 100%; justify-content: center; gap: 8px;">
                <span>💬 WhatsApp Quick Chat</span>
              </a>
              <div style="font-size: var(--fs-xs); color: var(--text-muted); text-align: center; margin-top: 4px;">
                Founder: Jay Vaghela • +91 63594 35595
              </div>
            </div>
          </nav>

          <div class="header-actions" data-auth-container>
            <!-- Rendered dynamically by authStore -->
          </div>
        </div>
      </header>
    `;

    updateNavMenu();
    authStore.notifyStateChange();

    window.addEventListener('luvits:auth-change', () => {
      updateNavMenu();
    });
  }

  if (footerContainer) {
    footerContainer.innerHTML = `
      <footer class="site-footer">
        <div class="container">
          <div class="footer-grid">
            <div class="footer-brand">
              <a href="/" class="brand" aria-label="LUVITS Home">
                <span class="brand-title" style="font-size: 2rem;">LUVITS</span>
              </a>
              <p style="margin-top: 1rem; max-width: 320px; font-size: var(--fs-sm); color: var(--text-secondary); line-height: 1.6;">
                Business strategy, digital execution, and brand growth for ambitious businesses ready to move forward.
              </p>
              <div style="margin-top: 1.25rem; font-size: var(--fs-xs); color: var(--text-muted);">
                Founder: <strong style="color: var(--gold-light);">Jay Vaghela</strong>
              </div>
            </div>

            <div>
              <h4 class="footer-heading">Services</h4>
              <div class="footer-links">
                <a href="/services/business-consulting">Business Consulting</a>
                <a href="/services/ecommerce-management">E-commerce Management</a>
                <a href="/services/web-development">Web Development</a>
                <a href="/services/graphic-designing">Graphic Designing</a>
                <a href="/services/brand-building">Brand Building</a>
                <a href="/luv-ai">Luv.AI Assistant</a>
              </div>
            </div>

            <div>
              <h4 class="footer-heading">Explore</h4>
              <div class="footer-links">
                <a href="/">Home</a>
                <a href="/services">All Services</a>
                <a href="/portfolio">Portfolio</a>
                <a href="/about">About Us</a>
                <a href="/pricing">Pricing & Packages</a>
                <a href="/contact">Contact</a>
              </div>
            </div>

            <div>
              <h4 class="footer-heading">Contact & Location</h4>
              <div class="footer-links" style="gap: 0.85rem;">
                <div>
                  <div style="font-size: 0.72rem; text-transform: uppercase; color: var(--gold-primary); font-weight: 700;">Direct Phone</div>
                  <a href="tel:+916359435595" style="color: var(--text-primary); font-weight: 600;">+91 63594 35595</a>
                </div>
                <div>
                  <div style="font-size: 0.72rem; text-transform: uppercase; color: var(--gold-primary); font-weight: 700;">Email Support</div>
                  <a href="mailto:luvits.co@gmail.com" style="color: var(--text-primary);">luvits.co@gmail.com</a>
                </div>
                <div>
                  <div style="font-size: 0.72rem; text-transform: uppercase; color: var(--gold-primary); font-weight: 700;">Instagram</div>
                  <a href="https://instagram.com/luvits.in" target="_blank" rel="noopener noreferrer" style="color: var(--gold-light);">@luvits.in</a>
                </div>
                <div>
                  <div style="font-size: 0.72rem; text-transform: uppercase; color: var(--gold-primary); font-weight: 700;">Office Address</div>
                  <span style="font-size: var(--fs-xs); color: var(--text-secondary); line-height: 1.5; display: inline-block;">
                    TNTC, Virat Nagar Rd, near Kanba Hospital, road, Nikol, Ahmedabad, Gujarat 380049
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div class="footer-bottom">
            <div>© 2026 LUVITS. All rights reserved. • Founded by Jay Vaghela</div>
            <div>WE BUILD BRANDS. YOU GROW BEYOND.</div>
          </div>
        </div>
      </footer>
    `;
  }

  // Render Persistent Floating WhatsApp Direct Chat Widget
  renderWhatsAppWidget();
}

function renderWhatsAppWidget() {
  if (document.querySelector('.whatsapp-floating-btn')) return;

  const waBtn = document.createElement('a');
  waBtn.className = 'whatsapp-floating-btn anime-scale';
  waBtn.href = 'https://wa.me/916359435595?text=Hello%20LUVITS%2C%20I%20would%20like%20to%20inquire%20about%20your%20services.';
  waBtn.target = '_blank';
  waBtn.rel = 'noopener noreferrer';
  waBtn.setAttribute('aria-label', 'Chat with Jay Vaghela at LUVITS on WhatsApp');

  waBtn.innerHTML = `
    <div class="whatsapp-icon-wrap">
      <svg viewBox="0 0 24 24">
        <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.312.045-.698.074-2.123-.521-1.637-.681-2.695-2.348-2.777-2.457-.082-.109-.668-.888-.668-1.698 0-.81.425-1.209.576-1.373.151-.164.33-.206.441-.206.11 0 .221.001.317.006.102.005.239-.039.373.285.144.348.491 1.199.534 1.287.043.088.072.191.014.306-.058.115-.088.187-.174.288-.087.101-.183.226-.261.304-.087.087-.178.182-.077.355.101.173.449.741.964 1.2 0.662.591 1.221.774 1.394.861.173.087.275.072.377-.044.102-.116.438-.51.555-.685.117-.174.234-.145.394-.087.16.058 1.013.477 1.187.564.174.087.29.13.333.203.044.072.044.42-.1.825z"/>
        <path d="M12 2C6.477 2 2 6.477 2 12c0 1.891.524 3.662 1.435 5.179L2 22l4.957-1.399C8.423 21.503 10.153 22 12 22c5.523 0 10-4.477 10-10S17.523 2 12 2zm0 18.2c-1.66 0-3.21-.497-4.52-1.353l-.324-.21-3.357.947.947-3.307-.213-.339C3.597 14.57 3.1 13.33 3.1 12c0-4.908 3.992-8.9 8.9-8.9 4.907 0 8.9 3.992 8.9 8.9 0 4.908-3.993 8.9-8.9 8.9z"/>
      </svg>
    </div>
    <div class="whatsapp-label">
      <span class="whatsapp-label-main">Chat on WhatsApp</span>
      <span class="whatsapp-label-sub">+91 63594 35595</span>
    </div>
  `;

  document.body.appendChild(waBtn);
}


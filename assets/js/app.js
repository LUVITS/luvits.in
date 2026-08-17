/**
 * ==========================================================================
 * LUVITS - GLOBAL MASTER APPLICATION SCRIPT
 * Manages sticky header, active route indicators, auth store & mobile drawer
 * ==========================================================================
 */

import { renderGlobalLayout } from './layout.js';
import { authStore } from './auth-store.js';
import { animationEngine } from './animation-engine.js';

class LuvitsApp {
  constructor() {
    this.initViewportMetrics();
    renderGlobalLayout();
    this.initHeader();
    this.initActiveRoute();
    this.initMobileNav();
    this.initAuth();
  }

  initViewportMetrics() {
    const updateMetrics = () => {
      const vh = (window.visualViewport ? window.visualViewport.height : window.innerHeight) * 0.01;
      document.documentElement.style.setProperty('--vh', `${vh}px`);
      document.documentElement.style.setProperty('--app-height', `${vh * 100}px`);
    };

    updateMetrics();

    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', updateMetrics, { passive: true });
    }
    window.addEventListener('resize', updateMetrics, { passive: true });
    window.addEventListener('orientationchange', () => setTimeout(updateMetrics, 80), { passive: true });
  }

  initHeader() {
    const header = document.querySelector('.site-header');
    if (!header) return;

    const handleScroll = () => {
      if (window.scrollY > 20) {
        header.classList.add('is-scrolled');
      } else {
        header.classList.remove('is-scrolled');
      }
    };

    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
  }

  initActiveRoute() {
    const currentPath = window.location.pathname.replace(/\/index\.html$/, '').replace(/\/$/, '') || '/';
    const navLinks = document.querySelectorAll('.nav-link');

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

  initMobileNav() {
    const toggleBtn = document.querySelector('.nav-toggle');
    const navMenu = document.querySelector('.nav-menu');

    if (!toggleBtn || !navMenu) return;

    const closeNav = () => {
      navMenu.classList.remove('is-open');
      toggleBtn.classList.remove('is-active');
      toggleBtn.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = '';
    };

    toggleBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = navMenu.classList.toggle('is-open');
      toggleBtn.classList.toggle('is-active', isOpen);
      toggleBtn.setAttribute('aria-expanded', String(isOpen));
      document.body.style.overflow = isOpen ? 'hidden' : '';
    });

    // Close mobile nav when clicking any nav link
    navMenu.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => closeNav());
    });

    // Close mobile nav on click outside
    document.addEventListener('click', (e) => {
      if (navMenu.classList.contains('is-open') && !navMenu.contains(e.target) && !toggleBtn.contains(e.target)) {
        closeNav();
      }
    });

    // Close mobile nav on Escape key press
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && navMenu.classList.contains('is-open')) {
        closeNav();
      }
    });
  }

  initAuth() {
    const container = document.querySelector('[data-auth-container]');
    if (container) {
      authStore.renderHeaderAuth(container);
    }
  }
}

// Immediate execution & safety wrapper
function startApp() {
  renderGlobalLayout();
  window.luvitsApp = new LuvitsApp();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', startApp);
} else {
  startApp();
}


/**
 * ==========================================================================
 * LUVITS - ZERO-DEPENDENCY ULTRA-PERFORMANCE ANIMATION ENGINE
 * Hardware-Accelerated 60fps GPU Pipeline, Staggered Reveals & Micro-Interactions
 * Built with native Web Animations API + IntersectionObserver (Zero external CDN)
 * ==========================================================================
 */

class AnimationEngine {
  constructor() {
    this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.hasWaapi = typeof Element !== 'undefined' && 'animate' in Element.prototype;
    this.activeCard = null;

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.boot());
    } else {
      this.boot();
    }
  }

  boot() {
    this.initScrollObserver();
    this.initHeroEntrance();
    this.initCardInteractions();
    this.initCounters();
    this.initHeaderParallax();
  }

  /**
   * Staggered Hero Sequence for Top-of-Page Section
   */
  initHeroEntrance() {
    if (this.reducedMotion) {
      document.querySelectorAll('.hero-headline, .section-header h1, .section-subtitle, .hero-actions').forEach(el => {
        el.style.opacity = '1';
        el.style.transform = 'none';
      });
      return;
    }

    const heroSections = document.querySelectorAll('.section-header, .page-hero, .hero-section');
    heroSections.forEach(hero => {
      const items = hero.querySelectorAll('.eyebrow, h1, .gold-line, .section-subtitle, p, .hero-actions');
      items.forEach((item, index) => {
        item.style.setProperty('--stagger-delay', `${index * 90}ms`);
        item.classList.add('anime-reveal');
        // Trigger reveal after a microtick
        requestAnimationFrame(() => {
          setTimeout(() => item.classList.add('is-visible'), 40 + index * 80);
        });
      });
    });
  }

  /**
   * High-Performance IntersectionObserver for Scroll-Triggered Reveals
   */
  initScrollObserver() {
    const allAnimables = document.querySelectorAll('.anime-reveal, .anime-clip, .anime-scale, .luxury-card:not(.no-auto-reveal), .project-card, .service-tile, .stat-card');

    if (this.reducedMotion || !('IntersectionObserver' in window)) {
      allAnimables.forEach(el => el.classList.add('is-visible'));
      return;
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const target = entry.target;
          
          if (target.hasAttribute('data-anime-section') || target.hasAttribute('data-anime-stagger')) {
            this.animateStaggerGroup(target);
          } else {
            this.revealElement(target);
          }
          
          observer.unobserve(target);
        }
      });
    }, {
      threshold: 0.08,
      rootMargin: '0px 0px -40px 0px'
    });

    // Observe dedicated sections
    const sections = document.querySelectorAll('[data-anime-section], [data-anime-stagger], .grid-2, .grid-3, .grid-4');
    sections.forEach(sec => observer.observe(sec));

    // Observe standalone animable elements
    allAnimables.forEach(el => {
      if (!el.closest('[data-anime-section]') && !el.closest('[data-anime-stagger]')) {
        observer.observe(el);
      }
    });
  }

  /**
   * Staggered animation for grid items or section children
   */
  animateStaggerGroup(container) {
    const children = container.querySelectorAll('.anime-reveal, .anime-scale, .anime-clip, .luxury-card, .project-card, .service-tile');
    
    children.forEach((child, index) => {
      child.style.setProperty('--stagger-delay', `${index * 70}ms`);
      child.classList.add('is-visible');
    });
  }

  /**
   * Reveal a single element smoothly
   */
  revealElement(el) {
    el.classList.add('is-visible');
  }

  /**
   * 3D Luxury Tilt & Specular Lighting Micro-Interactions on Desktop
   */
  initCardInteractions() {
    if (this.reducedMotion || window.innerWidth < 1024) return;

    const cards = document.querySelectorAll('.luxury-card, .project-card, .service-tile, .scrolly-glass-card');

    cards.forEach(card => {
      let bounds = null;
      let rafId = null;
      let targetX = 0;
      let targetY = 0;
      let currentX = 0;
      let currentY = 0;

      const updateMotion = () => {
        currentX += (targetX - currentX) * 0.15;
        currentY += (targetY - currentY) * 0.15;

        const tiltX = (currentY * -6).toFixed(2);
        const tiltY = (currentX * 6).toFixed(2);

        card.style.transform = `perspective(1000px) rotateX(${tiltX}deg) rotateY(${tiltY}deg) translateY(-2px)`;

        if (Math.abs(targetX - currentX) > 0.001 || Math.abs(targetY - currentY) > 0.001) {
          rafId = requestAnimationFrame(updateMotion);
        } else {
          rafId = null;
        }
      };

      card.addEventListener('mouseenter', (e) => {
        bounds = card.getBoundingClientRect();
      });

      card.addEventListener('mousemove', (e) => {
        if (!bounds) bounds = card.getBoundingClientRect();
        const x = (e.clientX - bounds.left) / bounds.width - 0.5;
        const y = (e.clientY - bounds.top) / bounds.height - 0.5;

        targetX = Math.max(-0.5, Math.min(0.5, x));
        targetY = Math.max(-0.5, Math.min(0.5, y));

        // Specular gold shine position
        const shineX = Math.round((x + 0.5) * 100);
        const shineY = Math.round((y + 0.5) * 100);
        card.style.setProperty('--mouse-x', `${shineX}%`);
        card.style.setProperty('--mouse-y', `${shineY}%`);

        if (!rafId) {
          rafId = requestAnimationFrame(updateMotion);
        }
      });

      card.addEventListener('mouseleave', () => {
        targetX = 0;
        targetY = 0;
        bounds = null;
        if (!rafId) {
          rafId = requestAnimationFrame(updateMotion);
        }
        card.style.transform = '';
      });
    });
  }

  /**
   * Smooth number counter animation
   */
  initCounters() {
    const counters = document.querySelectorAll('[data-counter-target]');
    if (counters.length === 0) return;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const el = entry.target;
          const target = parseInt(el.getAttribute('data-counter-target'), 10) || 0;
          const suffix = el.getAttribute('data-counter-suffix') || '';
          const prefix = el.getAttribute('data-counter-prefix') || '';
          const duration = 1200;
          const start = performance.now();

          const step = (now) => {
            const progress = Math.min(1, (now - start) / duration);
            const easeOut = 1 - Math.pow(1 - progress, 3);
            const current = Math.round(target * easeOut);
            el.textContent = `${prefix}${current}${suffix}`;

            if (progress < 1) {
              requestAnimationFrame(step);
            }
          };

          requestAnimationFrame(step);
          observer.unobserve(el);
        }
      });
    }, { threshold: 0.2 });

    counters.forEach(c => observer.observe(c));
  }

  /**
   * Subtle header parallax and glassmorphic state on scroll
   */
  initHeaderParallax() {
    const header = document.querySelector('.site-header');
    if (!header) return;

    let lastScrollY = window.scrollY;
    let ticking = false;

    window.addEventListener('scroll', () => {
      lastScrollY = window.scrollY;
      if (!ticking) {
        requestAnimationFrame(() => {
          if (lastScrollY > 30) {
            header.classList.add('is-scrolled');
          } else {
            header.classList.remove('is-scrolled');
          }
          ticking = false;
        });
        ticking = true;
      }
    }, { passive: true });
  }
}

export const animationEngine = new AnimationEngine();

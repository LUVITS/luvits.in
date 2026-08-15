/**
 * ==========================================================================
 * LUVITS - ANIME.JS ANIMATION ENGINE & MOTION UTILITIES
 * Aesthetic: 90% Static Luxury + 10% Intelligent Micro-interactions
 * Universal Fallback & 60fps GPU acceleration
 * ==========================================================================
 */

let animeLib = null;

// Asynchronously load Anime.js without blocking module initialization
import('https://cdn.jsdelivr.net/npm/animejs@3.2.2/lib/anime.es.js')
  .then(module => {
    animeLib = module.default;
  })
  .catch(err => {
    console.warn('Anime.js CDN not reachable, using CSS motion fallback.', err);
  });

class AnimationEngine {

  constructor() {
    this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        this.initScrollObserver();
        this.initCardInteractions();
      });
    } else {
      this.initScrollObserver();
      this.initCardInteractions();
    }
  }

  /**
   * Hero Entrance Timeline Orchestration
   * @param {Object} elements - Hero elements to orchestrate
   */
  playHeroSequence({ eyebrow, heading, goldLine, lede, ctas, visual }) {
    const elements = [eyebrow, heading, goldLine, lede, ctas, visual].filter(Boolean);

    if (this.reducedMotion || !animeLib) {
      elements.forEach(el => {
        el.style.opacity = '1';
        el.style.transform = 'none';
      });
      return;
    }

    const tl = animeLib.timeline({
      easing: 'cubicBezier(0.16, 1, 0.3, 1)',
      duration: 1000
    });

    if (eyebrow) {
      tl.add({
        targets: eyebrow,
        opacity: [0, 1],
        translateY: [20, 0],
        duration: 700
      });
    }

    if (heading) {
      tl.add({
        targets: heading,
        opacity: [0, 1],
        translateY: [30, 0],
        duration: 900
      }, '-=500');
    }

    if (goldLine) {
      tl.add({
        targets: goldLine,
        width: ['0px', '60px'],
        opacity: [0, 1],
        duration: 600
      }, '-=600');
    }

    if (lede) {
      tl.add({
        targets: lede,
        opacity: [0, 1],
        translateY: [20, 0],
        duration: 800
      }, '-=500');
    }

    if (ctas) {
      tl.add({
        targets: ctas,
        opacity: [0, 1],
        translateY: [15, 0],
        duration: 700
      }, '-=600');
    }

    if (visual) {
      tl.add({
        targets: visual,
        opacity: [0, 1],
        scale: [0.94, 1],
        duration: 1100
      }, '-=800');

      this.startSubtleBreathing(visual);
    }
  }

  /**
   * Scroll Observer for Staggered Section & Standalone Reveals
   */
  initScrollObserver() {
    const allAnimables = document.querySelectorAll('.anime-reveal, .anime-clip, .anime-scale');

    if (this.reducedMotion || !('IntersectionObserver' in window)) {
      allAnimables.forEach(el => el.classList.add('is-visible'));
      return;
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const target = entry.target;
          if (target.hasAttribute('data-anime-section')) {
            this.animateSection(target);
          } else {
            this.animateElement(target);
          }
          observer.unobserve(target);
        }
      });
    }, { threshold: 0.08 });

    const sections = document.querySelectorAll('[data-anime-section]');
    if (sections.length > 0) {
      sections.forEach(sec => observer.observe(sec));
    }

    allAnimables.forEach(el => {
      if (!el.closest('[data-anime-section]')) {
        observer.observe(el);
      }
    });
  }

  /**
   * Animate a section when scrolled into view
   */
  animateSection(section) {
    const reveals = section.querySelectorAll('.anime-reveal:not(.is-visible)');
    if (reveals.length > 0) {
      reveals.forEach(r => r.classList.add('is-visible'));
      if (animeLib && !this.reducedMotion) {
        animeLib({
          targets: reveals,
          opacity: [0, 1],
          translateY: [24, 0],
          delay: animeLib.stagger(90),
          duration: 750,
          easing: 'cubicBezier(0.16, 1, 0.3, 1)'
        });
      }
    }

    const clips = section.querySelectorAll('.anime-clip:not(.is-visible)');
    if (clips.length > 0) {
      clips.forEach(c => c.classList.add('is-visible'));
      if (animeLib && !this.reducedMotion) {
        animeLib({
          targets: clips,
          clipPath: ['inset(0 100% 0 0)', 'inset(0 0% 0 0)'],
          duration: 900,
          delay: animeLib.stagger(100),
          easing: 'easeInOutQuad'
        });
      }
    }

    const scales = section.querySelectorAll('.anime-scale:not(.is-visible)');
    if (scales.length > 0) {
      scales.forEach(s => s.classList.add('is-visible'));
      if (animeLib && !this.reducedMotion) {
        animeLib({
          targets: scales,
          opacity: [0, 1],
          scale: [0.94, 1],
          delay: animeLib.stagger(80),
          duration: 650,
          easing: 'easeOutCubic'
        });
      }
    }
  }

  /**
   * Animate a single standalone element when scrolled into view
   */
  animateElement(el) {
    el.classList.add('is-visible');
    if (!animeLib || this.reducedMotion) return;

    if (el.classList.contains('anime-reveal')) {
      animeLib({
        targets: el,
        opacity: [0, 1],
        translateY: [24, 0],
        duration: 750,
        easing: 'cubicBezier(0.16, 1, 0.3, 1)'
      });
    } else if (el.classList.contains('anime-clip')) {
      animeLib({
        targets: el,
        clipPath: ['inset(0 100% 0 0)', 'inset(0 0% 0 0)'],
        duration: 900,
        easing: 'easeInOutQuad'
      });
    } else if (el.classList.contains('anime-scale')) {
      animeLib({
        targets: el,
        opacity: [0, 1],
        scale: [0.94, 1],
        duration: 650,
        easing: 'easeOutCubic'
      });
    }
  }

  /**
   * Interactive hover micro-interactions for luxury cards
   */
  initCardInteractions() {
    if (this.reducedMotion) return;

    const luxuryCards = document.querySelectorAll('.luxury-card');
    luxuryCards.forEach(card => {
      card.addEventListener('mouseenter', () => {
        if (animeLib) {
          animeLib({
            targets: card,
            scale: 1.015,
            duration: 300,
            easing: 'easeOutQuad'
          });
        }
      });
      card.addEventListener('mouseleave', () => {
        if (animeLib) {
          animeLib({
            targets: card,
            scale: 1.0,
            duration: 300,
            easing: 'easeOutQuad'
          });
        }
      });
    });
  }

  /**
   * Continuous subtle breathing motion for hero visual
   */
  startSubtleBreathing(element) {
    if (this.reducedMotion || !element || !animeLib) return;
    animeLib({
      targets: element,
      translateY: [-6, 6],
      opacity: [0.96, 1],
      duration: 4500,
      direction: 'alternate',
      loop: true,
      easing: 'easeInOutSine'
    });
  }
}

export const animationEngine = new AnimationEngine();


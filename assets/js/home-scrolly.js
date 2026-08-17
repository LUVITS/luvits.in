/**
 * ==========================================================================
 * LUVITS - 60 FPS ULTRA-PERFORMANCE SCROLLYTELLING ENGINE
 * Hardware-Accelerated ImageBitmap Pipeline, Dynamic Viewport (100dvh)
 * Universal Mobile/Desktop Responsive Framing & Fail-Safe Asset Loading
 * ==========================================================================
 */

class HighPerformanceScrollyEngine {
  constructor() {
    this.canvas = document.querySelector('.scrolly-canvas');
    if (!this.canvas) return;

    // Direct 2D context with desynchronized & alpha: false for max frame rate
    this.ctx = this.canvas.getContext('2d', {
      alpha: false,
      desynchronized: true
    });

    this.beats = document.querySelectorAll('.story-beat');
    this.frameCount = 237;
    this.startFrame = 4;
    
    // Cache for pre-decoded ImageBitmaps or HTMLImageElements
    this.frames = new Array(this.frameCount);
    this.loadedCount = 0;
    this.currentRenderedIndex = -1;

    // Physics interpolation state
    this.targetProgress = 0;
    this.currentProgress = 0;
    this.isRendering = false;

    // Cached viewport & canvas dimensions
    this.canvasWidth = 0;
    this.canvasHeight = 0;
    this.dpr = 1;

    this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Story beat active scroll ranges (Leaves smooth clearance before footer)
    this.beatRanges = [
      { start: 0.00, end: 0.18 }, // Beat 1: Intro (Left Flank)
      { start: 0.22, end: 0.45 }, // Beat 2: Services (Split Flanks)
      { start: 0.48, end: 0.70 }, // Beat 3: Portfolio (Left Flank)
      { start: 0.73, end: 0.88 }, // Beat 4: LUV.AI (Right Flank)
      { start: 0.90, end: 0.975 } // Beat 5: Finale (Left Flank, fades before footer arrives)
    ];

    this.renderLoopBound = this.renderLoop.bind(this);

    this.initViewportMetrics();

    if (!this.reducedMotion) {
      this.init();
    } else {
      this.initReducedMotion();
    }
  }

  pad(num, size) {
    let s = num + "";
    while (s.length < size) s = "0" + s;
    return s;
  }

  getFrameUrl(frameNum) {
    const frameStr = this.pad(frameNum, 3);
    return `LUV/website_${frameStr}.webp`;
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

  init() {
    this.handleResize();
    this.preloadAllFrames();

    const debouncedResize = () => {
      clearTimeout(this.resizeTimer);
      this.resizeTimer = setTimeout(() => {
        this.handleResize();
        this.requestRender();
      }, 50);
    };

    window.addEventListener('resize', debouncedResize, { passive: true });
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', debouncedResize, { passive: true });
    }
    window.addEventListener('orientationchange', () => setTimeout(debouncedResize, 80), { passive: true });

    // Smooth, zero-overhead passive scroll listener
    window.addEventListener('scroll', () => {
      this.onScroll();
    }, { passive: true });

    // Initial position trigger
    this.onScroll();
  }

  handleResize() {
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = window.innerWidth;
    const h = window.visualViewport ? window.visualViewport.height : window.innerHeight;

    this.canvasWidth = Math.round(w * this.dpr);
    this.canvasHeight = Math.round(h * this.dpr);

    this.canvas.width = this.canvasWidth;
    this.canvas.height = this.canvasHeight;
    this.canvas.style.width = `${w}px`;
    this.canvas.style.height = `${h}px`;

    // Redraw active frame immediately on resize
    if (this.currentRenderedIndex >= 0) {
      this.drawFrame(this.currentRenderedIndex);
    } else if (this.frames[0]) {
      this.drawFrame(0);
    }
  }

  async preloadAllFrames() {
    const supportsBitmap = typeof window.createImageBitmap === 'function';

    // Priority 1: Load and decode Frame 0 (website_004.webp) immediately for peak LCP
    const firstFrameSrc = this.getFrameUrl(this.startFrame);
    
    // Fail-safe immediate HTMLImage element
    const fallbackImg = new Image();
    fallbackImg.crossOrigin = 'anonymous';
    fallbackImg.decoding = 'async';
    fallbackImg.src = firstFrameSrc;
    fallbackImg.onload = () => {
      if (!this.frames[0]) {
        this.frames[0] = fallbackImg;
        this.loadedCount++;
        this.canvas.classList.add('loaded');
        this.drawFrame(0);
      }
    };

    try {
      if (supportsBitmap) {
        const res = await fetch(firstFrameSrc);
        if (res.ok) {
          const blob = await res.blob();
          const bmp = await createImageBitmap(blob);
          this.frames[0] = bmp;
          this.loadedCount++;
          this.canvas.classList.add('loaded');
          this.drawFrame(0);
        }
      } else {
        if (fallbackImg.decode) {
          await fallbackImg.decode();
          this.frames[0] = fallbackImg;
          this.loadedCount++;
          this.canvas.classList.add('loaded');
          this.drawFrame(0);
        }
      }
    } catch (e) {
      // Fallback img handles it via onload
    }

    // Priority 2: Progressive batched loading for remaining 236 WebP frames
    const loadQueue = [];
    for (let i = 1; i < this.frameCount; i++) {
      const frameNum = this.startFrame + i;
      loadQueue.push({ index: i, src: this.getFrameUrl(frameNum) });
    }

    // Process initial scroll buffer (first 24 frames) with high priority
    const immediateBuffer = loadQueue.splice(0, 24);
    immediateBuffer.forEach(item => this.loadSingleFrame(item.index, item.src, supportsBitmap));

    // Process remainder with throttled queue
    const processRemaining = () => {
      const concurrency = 8;
      let active = 0;
      let currentIndex = 0;

      const next = () => {
        while (active < concurrency && currentIndex < loadQueue.length) {
          const item = loadQueue[currentIndex++];
          active++;
          this.loadSingleFrame(item.index, item.src, supportsBitmap).finally(() => {
            active--;
            next();
          });
        }
      };

      next();
    };

    if ('requestIdleCallback' in window) {
      requestIdleCallback(() => processRemaining(), { timeout: 1200 });
    } else {
      setTimeout(processRemaining, 60);
    }
  }

  async loadSingleFrame(index, src, supportsBitmap) {
    try {
      if (supportsBitmap) {
        const res = await fetch(src);
        if (res.ok) {
          const blob = await res.blob();
          const bmp = await createImageBitmap(blob);
          this.frames[index] = bmp;
          this.loadedCount++;
          if (index === 0 && !this.canvas.classList.contains('loaded')) {
            this.canvas.classList.add('loaded');
            this.drawFrame(0);
          }
          return;
        }
      }
    } catch (e) {
      // Fall through to Image fallback
    }

    // Reliable fallback for Image element
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.decoding = 'async';
    img.src = src;
    if (img.decode) {
      try {
        await img.decode();
        this.frames[index] = img;
        this.loadedCount++;
        if (index === 0 && !this.canvas.classList.contains('loaded')) {
          this.canvas.classList.add('loaded');
          this.drawFrame(0);
        }
        return;
      } catch (e) {}
    }

    img.onload = () => {
      this.frames[index] = img;
      this.loadedCount++;
      if (index === 0 && !this.canvas.classList.contains('loaded')) {
        this.canvas.classList.add('loaded');
        this.drawFrame(0);
      }
    };
  }

  initReducedMotion() {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = this.getFrameUrl(this.startFrame);
    img.onload = () => {
      this.frames[0] = img;
      this.canvas.classList.add('loaded');
      this.handleResize();
      this.drawFrame(0);
    };
    this.beats.forEach(b => b.classList.add('is-active'));
  }

  onScroll() {
    const scrollTrack = document.querySelector('.scrolly-scroll-track');
    const viewportH = window.visualViewport ? window.visualViewport.height : window.innerHeight;
    const scrollMax = scrollTrack
      ? scrollTrack.offsetHeight - viewportH
      : document.documentElement.scrollHeight - viewportH;

    if (scrollMax > 0) {
      const currentY = window.scrollY || window.pageYOffset;
      this.targetProgress = Math.max(0, Math.min(1, currentY / scrollMax));
      this.requestRender();
    }
  }

  requestRender() {
    if (!this.isRendering) {
      this.isRendering = true;
      requestAnimationFrame(this.renderLoopBound);
    }
  }

  renderLoop() {
    // Highly responsive physics easing (0.28 factor eliminates dragging latency)
    const diff = this.targetProgress - this.currentProgress;

    if (Math.abs(diff) < 0.0003) {
      this.currentProgress = this.targetProgress;
    } else {
      this.currentProgress += diff * 0.28;
    }

    // Direct, ultra-fast frame mapping
    const targetIndex = Math.min(
      this.frameCount - 1,
      Math.max(0, Math.round(this.currentProgress * (this.frameCount - 1)))
    );

    if (targetIndex !== this.currentRenderedIndex) {
      this.currentRenderedIndex = targetIndex;
      this.drawFrame(targetIndex);
    }

    this.updateStoryBeats(this.currentProgress);

    // Continue loop if still interpolating, otherwise sleep to save GPU cycles
    if (Math.abs(this.targetProgress - this.currentProgress) >= 0.0003) {
      requestAnimationFrame(this.renderLoopBound);
    } else {
      this.isRendering = false;
    }
  }

  drawFrame(index) {
    let frame = this.frames[index];

    // Ultra-fast search for nearest loaded frame if current isn't ready
    if (!frame) {
      for (let offset = 1; offset < this.frameCount; offset++) {
        const left = index - offset;
        const right = index + offset;
        if (left >= 0 && this.frames[left]) {
          frame = this.frames[left];
          break;
        }
        if (right < this.frameCount && this.frames[right]) {
          frame = this.frames[right];
          break;
        }
      }
    }

    if (!frame) return;

    const cw = this.canvasWidth;
    const ch = this.canvasHeight;
    const fw = frame.width || 1920;
    const fh = frame.height || 1080;

    const isMobile = window.innerWidth <= 768;

    let drawW, drawH, offX, offY;

    if (isMobile) {
      // Mobile: Scale character so head & upper torso are framed in upper 60% above the glass cards
      const targetH = ch * 0.68;
      const scale = targetH / fh;
      drawW = fw * scale;
      drawH = fh * scale;
      offX = (cw - drawW) * 0.5;
      offY = Math.round(50 * this.dpr);
    } else {
      // Desktop / Widescreen: Scale so head & feather sit safely below header with full character visibility
      const headerOffset = Math.round(62 * this.dpr);
      const availableH = ch - headerOffset - Math.round(16 * this.dpr);
      const availableW = cw;

      const scale = Math.min(availableW / fw, availableH / fh);
      drawW = fw * scale;
      drawH = fh * scale;
      offX = (cw - drawW) * 0.5;
      offY = headerOffset + (availableH - drawH) * 0.5;
    }

    // Clear canvas with deep black before blitting
    this.ctx.fillStyle = '#000000';
    this.ctx.fillRect(0, 0, cw, ch);

    // Direct GPU texture blit (0ms CPU decode time with ImageBitmap)
    this.ctx.drawImage(frame, offX, offY, drawW, drawH);
  }

  updateStoryBeats(progress) {
    const scrollTrack = document.querySelector('.scrolly-scroll-track');
    const viewportH = window.visualViewport ? window.visualViewport.height : window.innerHeight;
    const scrollMax = scrollTrack
      ? scrollTrack.offsetHeight - viewportH
      : document.documentElement.scrollHeight - viewportH;
    const currentY = window.scrollY || window.pageYOffset;
    
    // When user scrolls near or into the footer, fade out all fixed overlay cards
    const isOverFooter = scrollMax > 0 && currentY >= (scrollMax - 40);

    for (let i = 0; i < this.beats.length; i++) {
      const beat = this.beats[i];
      const range = this.beatRanges[i];
      if (!range) continue;

      const isActive = !isOverFooter && progress >= range.start && progress <= range.end;

      if (isActive) {
        if (!beat.classList.contains('is-active')) {
          beat.classList.add('is-active');
        }
      } else {
        if (beat.classList.contains('is-active')) {
          beat.classList.remove('is-active');
        }
      }
    }
  }
}

// Launch engine immediately
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => new HighPerformanceScrollyEngine());
} else {
  new HighPerformanceScrollyEngine();
}

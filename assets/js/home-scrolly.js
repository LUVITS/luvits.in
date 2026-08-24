/**
 * ==========================================================================
 * LUVITS - 60 FPS ULTRA-PERFORMANCE SCROLLYTELLING & LAZY-STREAMING ENGINE
 * Hardware-Accelerated ImageBitmap Pipeline, Dynamic Viewport (100dvh)
 * Continuous Cross-Fading Story Beats (Zero Blank Dead Zones)
 * Progressive Lazy Frame Streamer (Peak LCP + Bandwidth Optimization)
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
    this.pendingFrames = new Set();
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

    // Seamless, overlapping story beat ranges (Zero empty dead zones during scroll)
    this.beatRanges = [
      { start: 0.00, end: 0.22 }, // Beat 1: Intro (Left Flank)
      { start: 0.20, end: 0.48 }, // Beat 2: Services (Split Flanks)
      { start: 0.46, end: 0.72 }, // Beat 3: Portfolio (Left Flank)
      { start: 0.70, end: 0.88 }, // Beat 4: LUV.AI (Right Flank)
      { start: 0.86, end: 0.985 } // Beat 5: Finale (Left Flank, fades before footer arrives)
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
    this.preloadInitialStream();

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

    // Activate initial beat & position
    if (this.beats.length > 0) {
      this.beats[0].classList.add('is-active');
    }
    this.onScroll();
  }

  handleResize() {
    const isMobile = window.innerWidth <= 768;
    this.dpr = isMobile ? Math.min(window.devicePixelRatio || 1, 1.5) : Math.min(window.devicePixelRatio || 1, 2);
    const w = window.innerWidth;
    const h = window.visualViewport ? window.visualViewport.height : window.innerHeight;

    this.canvasWidth = Math.round(w * this.dpr);
    this.canvasHeight = Math.round(h * this.dpr);

    this.canvas.width = this.canvasWidth;
    this.canvas.height = this.canvasHeight;
    this.canvas.style.width = `${w}px`;
    this.canvas.style.height = `${h}px`;

    // Configure context performance settings
    this.ctx.imageSmoothingEnabled = true;
    this.ctx.imageSmoothingQuality = isMobile ? 'low' : 'medium';

    // Redraw active frame immediately on resize
    if (this.currentRenderedIndex >= 0) {
      this.drawFrame(this.currentRenderedIndex);
    } else if (this.frames[0]) {
      this.drawFrame(0);
    }
  }

  /**
   * Progressive Lazy Loading: Loads initial viewport buffer first,
   * then streams frames on-demand based on user scroll position.
   */
  async preloadInitialStream() {
    const supportsBitmap = typeof window.createImageBitmap === 'function';

    // Phase 1: High Priority Instant LCP Frame 0 (website_004.webp)
    await this.loadSingleFrame(0, this.getFrameUrl(this.startFrame), supportsBitmap);

    // Phase 2: Preload initial scroll buffer (first 16 frames)
    for (let i = 1; i <= 16 && i < this.frameCount; i++) {
      this.loadSingleFrame(i, this.getFrameUrl(this.startFrame + i), supportsBitmap);
    }

    // Phase 3: Background Idle Streamer
    const idleStreamer = () => {
      let nextIndex = 17;
      const streamChunk = () => {
        const batchSize = 6;
        let count = 0;
        while (nextIndex < this.frameCount && count < batchSize) {
          if (!this.frames[nextIndex] && !this.pendingFrames.has(nextIndex)) {
            this.loadSingleFrame(nextIndex, this.getFrameUrl(this.startFrame + nextIndex), supportsBitmap);
            count++;
          }
          nextIndex++;
        }

        if (nextIndex < this.frameCount) {
          if ('requestIdleCallback' in window) {
            requestIdleCallback(streamChunk, { timeout: 1500 });
          } else {
            setTimeout(streamChunk, 100);
          }
        }
      };

      if ('requestIdleCallback' in window) {
        requestIdleCallback(streamChunk, { timeout: 1000 });
      } else {
        setTimeout(streamChunk, 150);
      }
    };

    idleStreamer();
  }

  /**
   * On-demand frame streaming around current target index (target ± 12 frames)
   */
  prioritizeFramesAround(centerIndex) {
    const supportsBitmap = typeof window.createImageBitmap === 'function';
    const start = Math.max(0, centerIndex - 6);
    const end = Math.min(this.frameCount - 1, centerIndex + 14);

    for (let i = start; i <= end; i++) {
      if (!this.frames[i] && !this.pendingFrames.has(i)) {
        this.loadSingleFrame(i, this.getFrameUrl(this.startFrame + i), supportsBitmap);
      }
    }
  }

  async loadSingleFrame(index, src, supportsBitmap) {
    if (this.frames[index] || this.pendingFrames.has(index)) return;
    this.pendingFrames.add(index);

    try {
      if (supportsBitmap) {
        const res = await fetch(src);
        if (res.ok) {
          const blob = await res.blob();
          const bmp = await createImageBitmap(blob);
          this.frames[index] = bmp;
          this.loadedCount++;
          this.pendingFrames.delete(index);
          if (index === 0 || index === this.currentRenderedIndex) {
            this.canvas.classList.add('loaded');
            this.drawFrame(index);
          }
          return;
        }
      }
    } catch (e) {
      // Fallback to Image element
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.decoding = 'async';
    img.src = src;

    if (img.decode) {
      try {
        await img.decode();
        this.frames[index] = img;
        this.loadedCount++;
        this.pendingFrames.delete(index);
        if (index === 0 || index === this.currentRenderedIndex) {
          this.canvas.classList.add('loaded');
          this.drawFrame(index);
        }
        return;
      } catch (e) {}
    }

    img.onload = () => {
      this.frames[index] = img;
      this.loadedCount++;
      this.pendingFrames.delete(index);
      if (index === 0 || index === this.currentRenderedIndex) {
        this.canvas.classList.add('loaded');
        this.drawFrame(index);
      }
    };

    img.onerror = () => {
      this.pendingFrames.delete(index);
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
    // Responsive physics easing factor
    const diff = this.targetProgress - this.currentProgress;

    if (Math.abs(diff) < 0.0002) {
      this.currentProgress = this.targetProgress;
    } else {
      this.currentProgress += diff * 0.24;
    }

    // Direct frame mapping
    const targetIndex = Math.min(
      this.frameCount - 1,
      Math.max(0, Math.round(this.currentProgress * (this.frameCount - 1)))
    );

    // Prioritize loading frames surrounding active scroll window
    this.prioritizeFramesAround(targetIndex);

    if (targetIndex !== this.currentRenderedIndex) {
      this.currentRenderedIndex = targetIndex;
      this.drawFrame(targetIndex);
    }

    this.updateStoryBeats(this.currentProgress);

    // Continue loop if still interpolating, otherwise sleep to save GPU cycles
    if (Math.abs(this.targetProgress - this.currentProgress) >= 0.0002) {
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
      // Mobile: Scale character so upper body sits above lower bottom cards
      const targetH = ch * 0.70;
      const scale = targetH / fh;
      drawW = Math.round(fw * scale);
      drawH = Math.round(fh * scale);
      offX = Math.round((cw - drawW) * 0.5);
      offY = Math.round(44 * this.dpr);
    } else {
      // Desktop / Widescreen: Scale character safely below header with central alignment
      const headerOffset = Math.round(64 * this.dpr);
      const availableH = ch - headerOffset - Math.round(18 * this.dpr);
      const availableW = cw;

      const scale = Math.min(availableW / fw, availableH / fh);
      drawW = Math.round(fw * scale);
      drawH = Math.round(fh * scale);
      offX = Math.round((cw - drawW) * 0.5);
      offY = Math.round(headerOffset + (availableH - drawH) * 0.5);
    }

    // Clear canvas with deep black before blitting
    this.ctx.fillStyle = '#000000';
    this.ctx.fillRect(0, 0, cw, ch);

    // Direct GPU texture blit
    this.ctx.drawImage(frame, offX, offY, drawW, drawH);
  }

  updateStoryBeats(progress) {
    const scrollTrack = document.querySelector('.scrolly-scroll-track');
    const viewportH = window.visualViewport ? window.visualViewport.height : window.innerHeight;
    const scrollMax = scrollTrack
      ? scrollTrack.offsetHeight - viewportH
      : document.documentElement.scrollHeight - viewportH;
    const currentY = window.scrollY || window.pageYOffset;
    
    // When user scrolls near the footer, cleanly fade out all fixed overlay cards
    const isOverFooter = scrollMax > 0 && currentY >= (scrollMax - 30);

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

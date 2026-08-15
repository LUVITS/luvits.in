/**
 * ==========================================================================
 * LUVITS - 60 FPS ULTRA-PERFORMANCE SCROLLYTELLING ENGINE
 * Hardware-Accelerated ImageBitmap Pipeline & Responsive Physics Scrubbing
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
    this.frameCount = 100;
    this.startFrame = 21;
    
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

    // Story beat active scroll ranges
    this.beatRanges = [
      { start: 0.00, end: 0.18 }, // Beat 1: Intro (Left Flank)
      { start: 0.22, end: 0.45 }, // Beat 2: Services (Split Flanks)
      { start: 0.48, end: 0.70 }, // Beat 3: Portfolio (Left Flank)
      { start: 0.73, end: 0.90 }, // Beat 4: LUV.AI (Right Flank)
      { start: 0.92, end: 1.00 }  // Beat 5: Finale (Bottom Flank)
    ];

    this.renderLoopBound = this.renderLoop.bind(this);

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

  init() {
    this.handleResize();
    this.preloadAllFrames();

    window.addEventListener('resize', () => {
      clearTimeout(this.resizeTimer);
      this.resizeTimer = setTimeout(() => {
        this.handleResize();
        this.requestRender();
      }, 60);
    }, { passive: true });

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
    const h = window.innerHeight;

    this.canvasWidth = Math.round(w * this.dpr);
    this.canvasHeight = Math.round(h * this.dpr);

    this.canvas.width = this.canvasWidth;
    this.canvas.height = this.canvasHeight;
    this.canvas.style.width = `${w}px`;
    this.canvas.style.height = `${h}px`;

    // Redraw active frame immediately on resize
    if (this.currentRenderedIndex >= 0) {
      this.drawFrame(this.currentRenderedIndex);
    }
  }

  async preloadAllFrames() {
    const supportsBitmap = typeof window.createImageBitmap === 'function';

    // Priority 1: Load and decode Frame 0 (website_021.png) first for immediate display
    const firstFrameSrc = `LUV/website_021.png`;
    try {
      if (supportsBitmap) {
        const res = await fetch(firstFrameSrc);
        const blob = await res.blob();
        const bmp = await createImageBitmap(blob);
        this.frames[0] = bmp;
      } else {
        const img = new Image();
        img.src = firstFrameSrc;
        await img.decode();
        this.frames[0] = img;
      }
      this.loadedCount++;
      this.canvas.classList.add('loaded');
      this.drawFrame(0);
    } catch (e) {
      // Fallback
      const img = new Image();
      img.src = firstFrameSrc;
      img.onload = () => {
        this.frames[0] = img;
        this.canvas.classList.add('loaded');
        this.drawFrame(0);
      };
    }

    // Priority 2: Asynchronously pre-decode all remaining 99 frames in parallel
    for (let i = 1; i < this.frameCount; i++) {
      const frameNum = this.startFrame + i;
      const frameStr = this.pad(frameNum, 3);
      const src = `LUV/website_${frameStr}.png`;

      this.loadSingleFrame(i, src, supportsBitmap);
    }
  }

  async loadSingleFrame(index, src, supportsBitmap) {
    try {
      if (supportsBitmap) {
        const res = await fetch(src);
        const blob = await res.blob();
        const bmp = await createImageBitmap(blob);
        this.frames[index] = bmp;
      } else {
        const img = new Image();
        img.src = src;
        if (img.decode) {
          await img.decode();
        }
        this.frames[index] = img;
      }
    } catch (e) {
      const img = new Image();
      img.src = src;
      img.onload = () => {
        this.frames[index] = img;
      };
    }
    this.loadedCount++;
  }

  initReducedMotion() {
    const img = new Image();
    img.src = `LUV/website_021.png`;
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
    const scrollMax = scrollTrack
      ? scrollTrack.offsetHeight - window.innerHeight
      : document.documentElement.scrollHeight - window.innerHeight;

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
      // Mobile: Scale so full upper body & head are framed below mobile header
      const targetH = ch * 0.74;
      const scale = targetH / fh;
      drawW = fw * scale;
      drawH = fh * scale;
      offX = (cw - drawW) * 0.5;
      offY = Math.round(56 * this.dpr);
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
    for (let i = 0; i < this.beats.length; i++) {
      const beat = this.beats[i];
      const range = this.beatRanges[i];
      if (!range) continue;

      const isActive = progress >= range.start && progress <= range.end;

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

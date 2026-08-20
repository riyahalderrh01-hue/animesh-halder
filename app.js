(function () {
  const TOTAL_FRAMES = 25;
  const PRIMARY_DIR = "frames";

  // Elements
  const canvas = document.getElementById("hero-canvas");
  const ctx = canvas.getContext("2d", { alpha: false, desynchronized: true });
  const loader = document.getElementById("loader");
  const progressBar = document.getElementById("progress-bar");
  const progressText = document.getElementById("progress-text");

  // Animation & Frame Caching State
  const images = new Array(TOTAL_FRAMES);
  let loadedCount = 0;
  let currentFrame = 0;
  let targetFrame = 0;
  let isTicking = false;
  let canvasW = 0;
  let canvasH = 0;

  // Single Frame Preloader
  function loadSingleImage(index) {
    return new Promise((resolve) => {
      const img = new Image();
      const numStr = String(index + 1).padStart(2, "0");

      const onCompleted = (success) => {
        loadedCount++;
        const percent = Math.floor((loadedCount / TOTAL_FRAMES) * 100);
        if (progressBar) progressBar.style.width = percent + "%";
        if (progressText) progressText.textContent = percent + "%";
        resolve(success ? img : null);
      };

      img.onload = () => {
        images[index] = img;
        onCompleted(true);
      };

      img.onerror = () => {
        console.error("Failed to load frame " + numStr);
        onCompleted(false);
      };

      img.src = PRIMARY_DIR + "/" + numStr + ".png";
    });
  }

  // Preload all 25 images concurrently
  async function preloadAll() {
    const promises = [];
    for (let i = 0; i < TOTAL_FRAMES; i++) {
      promises.push(loadSingleImage(i));
    }
    await Promise.all(promises);
  }

  // Draw specific frame on Canvas preserving aspect ratio (optimized)
  function renderFrame(frameIndex) {
    const index = Math.min(Math.max(0, Math.round(frameIndex)), TOTAL_FRAMES - 1);
    const img = images[index];

    if (!img || !img.complete || img.naturalWidth === 0) return;

    if (canvasW === 0 || canvasH === 0) {
      canvasW = canvas.width;
      canvasH = canvas.height;
    }

    // Set image smoothing quality for high performance
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "medium";

    ctx.fillStyle = "#050508";
    ctx.fillRect(0, 0, canvasW, canvasH);

    const imgRatio = img.naturalWidth / img.naturalHeight;
    const canvasRatio = canvasW / canvasH;

    let drawWidth, drawHeight, drawX, drawY;

    if (canvasRatio > imgRatio) {
      drawHeight = canvasH;
      drawWidth = canvasH * imgRatio;
    } else {
      drawWidth = canvasW;
      drawHeight = canvasW / imgRatio;
    }

    drawX = (canvasW - drawWidth) / 2;
    drawY = (canvasH - drawHeight) / 2;

    ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);
  }

  // Set internal canvas resolution to match viewport & High-DPI screen
  function resizeCanvas() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = window.innerWidth;
    const height = window.innerHeight;

    canvasW = Math.round(width * dpr);
    canvasH = Math.round(height * dpr);

    canvas.width = canvasW;
    canvas.height = canvasH;

    renderFrame(currentFrame);
  }

  // Calculate target frame based on page scroll position
  function updateScrollTarget() {
    const scrollTop = window.scrollY || document.documentElement.scrollTop || 0;
    const maxScroll = (document.documentElement.scrollHeight || document.body.scrollHeight) - window.innerHeight;

    if (maxScroll > 0) {
      const fraction = Math.min(Math.max(0, scrollTop / maxScroll), 1);
      targetFrame = fraction * (TOTAL_FRAMES - 1);
    } else {
      targetFrame = 0;
    }

    // Active Navbar link highlight tracking
    const sections = document.querySelectorAll("section[id]");
    const navLinks = document.querySelectorAll(".nav-link");
    let currentSectionId = "";

    sections.forEach((sec) => {
      const top = sec.offsetTop - 220;
      const height = sec.offsetHeight;
      if (scrollTop >= top && scrollTop < top + height) {
        currentSectionId = sec.getAttribute("id");
      }
    });

    navLinks.forEach((link) => {
      link.classList.remove("active");
      if (currentSectionId && link.getAttribute("href") === "#" + currentSectionId) {
        link.classList.add("active");
      }
    });

    isTicking = false;
  }

  function onScroll() {
    if (!isTicking) {
      requestAnimationFrame(updateScrollTarget);
      isTicking = true;
    }
  }

  // Smooth Render Loop using Linear Interpolation (Lerp)
  function renderLoop() {
    const diff = targetFrame - currentFrame;

    if (Math.abs(diff) > 0.001) {
      currentFrame += diff * 0.18;
      renderFrame(currentFrame);
    } else if (currentFrame !== targetFrame) {
      currentFrame = targetFrame;
      renderFrame(currentFrame);
    }

    requestAnimationFrame(renderLoop);
  }

  // Main Initialization
  async function init() {
    try {
      await preloadAll();

      // Fade out preloader screen
      if (loader) {
        loader.classList.add("hidden");
      }

      // Initial canvas setup
      resizeCanvas();
      window.addEventListener("resize", resizeCanvas, { passive: true });

      // Bind passive scroll & touch events
      window.addEventListener("scroll", onScroll, { passive: true });
      window.addEventListener("touchmove", onScroll, { passive: true });
      window.addEventListener("wheel", onScroll, { passive: true });

      // Initial target frame calculation & draw
      updateScrollTarget();
      renderFrame(0);

      // Start animation loop
      requestAnimationFrame(renderLoop);
    } catch (err) {
      console.error("Initialization error:", err);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();

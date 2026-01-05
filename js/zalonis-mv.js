import 'https://unpkg.com/@google/model-viewer/dist/model-viewer.min.js';

(() => {
  // Defaults (you can edit here once and it updates everywhere)
  const DEFAULTS = {
    poster: "https://github.com/somebody2792-glitch/nikos_karavidas_2/blob/main/sample_comp.png?raw=true",
    logo:   "https://github.com/somebody2792-glitch/nikos_karavidas_2/blob/main/logo.png?raw=true",

    HERO_OFFSET_DEG: -30,
    ROTATE_DURATION_MS: 8000,
    ZOOM_OUT: 1.3,
    MAX_RADIUS_M: 1.30,

    exposure: "1.3",
    shadowIntensity: "1",
    shadowSoftness: "0.2",
    minOrbit: "auto auto 0.20m",
    maxOrbit: "auto auto 1.30m",
    env: "neutral",
    heightPx: 300
  };

  function svgReset() {
    return `
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <path d="M20 12a8 8 0 1 1-2.34-5.66"
              stroke="currentColor" stroke-width="2"
              stroke-linecap="round"/>
        <path d="M20 4v6h-6"
              stroke="currentColor" stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"/>
      </svg>`;
  }

  function svgFs() {
    return `
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <path d="M9 4H4v5M15 4h5v5M9 20H4v-5M15 20h5v-5"
              stroke="currentColor" stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"/>
      </svg>`;
  }

  function ease(t) {
    return t < 0.5 ? 2*t*t : 1 - Math.pow(-2*t + 2, 2) / 2;
  }

  function buildInstance(hostEl, idx) {
    const src = hostEl.dataset.src;
    if (!src) return;

    // Optional per-product overrides:
    const poster = hostEl.dataset.poster || DEFAULTS.poster;
    const logo   = hostEl.dataset.logo   || DEFAULTS.logo;

    const HERO_OFFSET_DEG = Number(hostEl.dataset.heroOffsetDeg ?? DEFAULTS.HERO_OFFSET_DEG);
    const ROTATE_DURATION_MS = Number(hostEl.dataset.rotateDurationMs ?? DEFAULTS.ROTATE_DURATION_MS);
    const ZOOM_OUT = Number(hostEl.dataset.zoomOut ?? DEFAULTS.ZOOM_OUT);
    const MAX_RADIUS_M = Number(hostEl.dataset.maxRadiusM ?? DEFAULTS.MAX_RADIUS_M);

    // Unique IDs per instance
    const idViewer = `zmv_viewer_${idx}`;
    const idReset  = `zmv_reset_${idx}`;
    const idFs     = `zmv_fs_${idx}`;
    const idPoster = `zmv_poster_${idx}`;
    const idCube   = `zmv_cube_${idx}`;

    hostEl.innerHTML = `
      <div class="zmv-wrap">
        <img id="${idPoster}" class="zmv-loadingPoster" src="${poster}" alt="Loading...">

        <img class="zmv-logo" src="${logo}" alt="Logo">

        <button id="${idReset}" class="zmv-btn zmv-btn-reset" aria-label="Reset view">
          ${svgReset()}
        </button>

        <button id="${idFs}" class="zmv-btn zmv-btn-fs" aria-label="Fullscreen">
          ${svgFs()}
        </button>

        <model-viewer
          id="${idViewer}"
          class="zmv-viewer"
          src="${src}"
          camera-controls
          environment-image="${DEFAULTS.env}"
          exposure="${DEFAULTS.exposure}"
          shadow-intensity="${DEFAULTS.shadowIntensity}"
          shadow-softness="${DEFAULTS.shadowSoftness}"
          interaction-prompt="none"
          min-camera-orbit="${DEFAULTS.minOrbit}"
          max-camera-orbit="${DEFAULTS.maxOrbit}"
          style="height:${DEFAULTS.heightPx}px"
        ></model-viewer>

        <div class="ori-gizmo" aria-hidden="true">
          <div class="ori-scene">
            <div id="${idCube}" class="ori-cube">
              <div class="ori-face f-front"  data-face="front">Front</div>
              <div class="ori-face f-back"   data-face="back">Back</div>
              <div class="ori-face f-right"  data-face="right">Right</div>
              <div class="ori-face f-left"   data-face="left">Left</div>
              <div class="ori-face f-top"    data-face="top">Top</div>
              <div class="ori-face f-bottom" data-face="bottom">Bottom</div>
            </div>
          </div>
        </div>

        <div class="zmv-vignette"></div>
      </div>
    `;

    const viewer = document.getElementById(idViewer);
    const resetBtn = document.getElementById(idReset);
    const fsBtn = document.getElementById(idFs);
    const loadingPoster = document.getElementById(idPoster);
    const oriCube = document.getElementById(idCube);

    let rafId = null;
    let stopped = false;

    let heroOrbit = null;     // {theta, phi, radius}
    let heroOrbitStr = null;  // "Xrad Yrad Zm"
    let targetStr = "auto auto auto";

    function stopIntro() {
      stopped = true;
      if (rafId) cancelAnimationFrame(rafId);
      rafId = null;
    }

    function startIntro() {
      if (!heroOrbit) return;
      stopped = false;

      viewer.cameraOrbit = heroOrbitStr;
      viewer.cameraTarget = targetStr;
      viewer.jumpCameraToGoal?.();

      const startTime = performance.now();
      const TWO_PI = Math.PI * 2;

      function frame(now) {
        if (stopped) return;

        const t = Math.min(1, (now - startTime) / ROTATE_DURATION_MS);
        const theta = heroOrbit.theta + TWO_PI * ease(t);

        viewer.cameraOrbit = `${theta}rad ${heroOrbit.phi}rad ${heroOrbit.radius}m`;

        if (t < 1) {
          rafId = requestAnimationFrame(frame);
        } else {
          viewer.cameraOrbit = heroOrbitStr;
          viewer.cameraTarget = targetStr;
          viewer.jumpCameraToGoal?.();
          rafId = null;
        }
      }

      rafId = requestAnimationFrame(frame);
    }

    function updateGizmo() {
      if (!oriCube) return;
      const o = viewer.getCameraOrbit();
      if (!o) return;

      const thetaDeg = (o.theta * 180 / Math.PI);
      const phiDeg   = (o.phi   * 180 / Math.PI);

      const rotY = -thetaDeg;
      const rotX = (phiDeg - 90);

      oriCube.style.transform = `rotateX(${rotX}deg) rotateY(${rotY}deg)`;
    }

    function snapToFace(face) {
      stopIntro();

      const o = viewer.getCameraOrbit();
      const r = o?.radius ?? (heroOrbit?.radius ?? 1);

      const map = {
        front:  `0deg 90deg ${r}m`,
        back:   `180deg 90deg ${r}m`,
        right:  `90deg 90deg ${r}m`,
        left:   `-90deg 90deg ${r}m`,
        top:    `0deg 0deg ${r}m`,
        bottom: `0deg 180deg ${r}m`,
      };

      viewer.cameraTarget = targetStr;
      viewer.cameraOrbit = map[face] || heroOrbitStr;
      viewer.jumpCameraToGoal?.();
      updateGizmo();
    }

    // Clickable cube faces
    hostEl.querySelectorAll(".ori-face").forEach(faceEl => {
      faceEl.addEventListener("click", (e) => {
        e.stopPropagation();
        snapToFace(faceEl.dataset.face);
      });
    });

    // Stop intro when user interacts with the viewer
    viewer.addEventListener("pointerdown", stopIntro, { passive:true });
    viewer.addEventListener("wheel", stopIntro, { passive:true });
    viewer.addEventListener("touchstart", stopIntro, { passive:true });

    fsBtn.onclick = () => viewer.requestFullscreen?.();
    viewer.addEventListener("camera-change", updateGizmo);

    viewer.addEventListener("load", async () => {
      await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));

      // Hide poster
      if (loadingPoster) {
        loadingPoster.style.opacity = "0";
        setTimeout(() => loadingPoster.remove(), 400);
      }

      const baseOrbit = viewer.getCameraOrbit();
      const heroOffsetRad = HERO_OFFSET_DEG * Math.PI / 180;

      const desiredRadius = baseOrbit.radius * ZOOM_OUT;
      const clampedRadius = Math.min(desiredRadius, MAX_RADIUS_M);

      heroOrbit = {
        theta: baseOrbit.theta + heroOffsetRad,
        phi: baseOrbit.phi,
        radius: clampedRadius
      };

      heroOrbitStr = `${heroOrbit.theta}rad ${heroOrbit.phi}rad ${heroOrbit.radius}m`;

      if (viewer.getCameraTarget) {
        const t = viewer.getCameraTarget();
        targetStr = `${t.x}m ${t.y}m ${t.z}m`;
      }

      viewer.cameraOrbit = heroOrbitStr;
      viewer.cameraTarget = targetStr;
      viewer.jumpCameraToGoal?.();

      updateGizmo();
      startIntro();
    }, { once:true });

    resetBtn.onclick = () => {
      stopIntro();
      viewer.cameraOrbit = heroOrbitStr;
      viewer.cameraTarget = targetStr;
      viewer.jumpCameraToGoal?.();
      updateGizmo();
      startIntro();
    };
  }

  function initAll() {
    const els = document.querySelectorAll('.zalonis-mv, .zalonis-mv-ready, .zmv, .zalonis-mv-container');
    // Support your chosen class only:
    const targets = document.querySelectorAll('.zalonis-mv, .zalonis-mv-ready, .zmv, .zalonis-mv-container, .zalonis-mv');
    // Actually use the one we specified in the embed:
    const nodes = document.querySelectorAll('.zalonis-mv');
    nodes.forEach((el, i) => buildInstance(el, i + 1));
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initAll);
  } else {
    initAll();
  }
})();

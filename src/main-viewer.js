/**
 * main-viewer.js — Entry point for viewer.html
 */

import { fetchTopicData } from './data/content.js';
import { createScene, flyCamera } from './viewer/scene.js';
import { loadModel } from './viewer/loader.js';
import { enhanceModel } from './viewer/enhancer.js';
import { ModelAnimator } from './viewer/animator.js';
import { Picker } from './viewer/picking.js';
import { Highlighter } from './viewer/highlight.js';
import { PinManager } from './viewer/pins.js';
import { ExploreMode } from './modes/explore.js';
import { LabelMode } from './modes/label.js';
import { QuizMode } from './modes/quiz.js';
import { InfoPanel } from './ui/panel.js';
import { Toast } from './ui/toast.js';
import { LevelToggle } from './ui/levelToggle.js';
import { tl } from './i18n/t.js';
import { TOPIC_PART_COLORS } from './viewer/procedural/index.js';
import './styles/base.css';
import './styles/viewer.css';

// ── DOM helpers ─────────────────────────────────────────────────────
const $ = id => document.getElementById(id);

function showError(msg) {
  $('loading-overlay').hidden = true;
  $('error-state').hidden = false;
  $('error-msg').textContent = msg;
}

function setProgress(fraction) {
  $('progress-bar').style.width = Math.round(fraction * 100) + '%';
}

// ── Main ─────────────────────────────────────────────────────────────
async function main() {
  const topicId = new URLSearchParams(location.search).get('topic');
  if (!topicId) { showError('No topic specified in URL.'); return; }

  $('loading-text').textContent = 'Loading topic data…';
  setProgress(0.1);

  // 1. Fetch topic data
  let topicData;
  try {
    topicData = await fetchTopicData(topicId);
  } catch (e) {
    showError(`Failed to load topic: ${e.message}`);
    return;
  }

  document.title = `${tl(topicData.title)} — Bio3D`;
  $('topic-title').textContent = tl(topicData.title);

  setProgress(0.3);
  $('loading-text').textContent = 'Building 3D model…';

  // 2. Create Three.js scene
  const container = $('canvas-container');
  const {
    scene, camera, renderer, labelRenderer, controls,
    requestRender, setAutoRotate, setTickCallback, dispose
  } = createScene(container, topicData.camera);

  // Reveal app so container has real layout dimensions
  $('loading-overlay').hidden = true;
  $('viewer-app').hidden = false;
  setProgress(0.4);

  requestAnimationFrame(() => {
    const w = container.clientWidth;
    const h = container.clientHeight;
    if (w > 0 && h > 0) {
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h, false);
      labelRenderer.setSize(w, h);
      requestRender();
    }
  });

  // 3. Load & enhance model
  let modelResult;
  try {
    modelResult = await loadModel(topicData, scene, (p) => setProgress(0.4 + p * 0.6));
  } catch (e) {
    showError(`Failed to load 3D model: ${e.message}`);
    dispose();
    return;
  }

  const { group, pickables, allMeshes } = modelResult;
  enhanceModel(topicData.id, group);
  const animator = new ModelAnimator(topicData.id, group);
  setTickCallback((dt) => animator.update(dt));
  setProgress(1);

  // 4. Shared utilities
  const toast  = new Toast($('toast'));
  const picker = new Picker(camera, renderer.domElement, pickables);
  const highlighter = new Highlighter();
  const pinManager  = new PinManager(scene, labelRenderer.domElement);

  // Info panel (mobile + desktop)
  const panel = new InfoPanel({
    mobileEl:         $('info-panel-mobile'),
    nameElsMobile:    $('info-name-mobile'),
    descElsMobile:    $('info-desc-mobile'),
    detailElsMobile:  $('info-detail-mobile'),
    dotElMobile:      $('info-dot-mobile'),
    stepElMobile:     $('info-step-mobile'),
    prevElMobile:     $('info-prev-mobile'),
    nextElMobile:     $('info-next-mobile'),
    nameElsDesktop:   $('info-name-desktop'),
    descElsDesktop:   $('info-desc-desktop'),
    detailElsDesktop: $('info-detail-desktop'),
    dotElDesktop:     $('info-dot-desktop'),
    stepElDesktop:    $('info-step-desktop'),
    prevElDesktop:    $('info-prev-desktop'),
    nextElDesktop:    $('info-next-desktop'),
    desktopPanelEl:   $('info-panel-desktop'),
  });

  // Level toggle
  const levelToggle = new LevelToggle($('level-toggle-viewer'));
  const levelFn = () => levelToggle.value;

  // 5. Mode controllers (shared context)
  const sharedCtx = {
    picker, highlighter, pinManager, panel, toast,
    camera, controls,
    topicData, levelFn, allMeshes, requestRender,
    partsList: $('parts-list'),
    labelUi: $('label-ui'),
    quizUi: $('quiz-ui'),
    trayEl: $('label-tray'),
    scoreTextEl: $('label-score-text'),
    labelRendererEl: labelRenderer.domElement,
    tl, partColors: TOPIC_PART_COLORS[topicData.id] ?? {},
  };

  const exploreMode = new ExploreMode(sharedCtx);
  const labelMode   = new LabelMode(sharedCtx);
  const quizMode    = new QuizMode({
    ...sharedCtx,
    onExplore: () => setMode('explore'),
  });

  let currentModeName = null;
  let currentMode = null;

  // ── HUD Controls ────────────────────────────────────────────────────
  const btnTour = $('btn-tour');
  const btnExplode = $('btn-explode');
  const explodeWrap = $('explode-wrap');
  const explodeSlider = $('explode-slider');
  const btnAnimate = $('btn-animate');
  const btnAutoRotate = $('btn-autorotate');

  function setExplode(pct) {
    explodeSlider.value = String(pct);
    animator.setExplode(pct / 100);
    const active = pct > 0;
    btnExplode.classList.toggle('active', active);
    btnExplode.setAttribute('aria-pressed', active);
  }

  btnTour?.addEventListener('click', () => {
    if (currentModeName !== 'explore') setMode('explore');
    exploreMode.startTour();
    toast.show('Guided tour — use Next / Prev or arrow keys');
  });

  btnExplode?.addEventListener('click', () => {
    const isOpening = explodeWrap.hidden;
    explodeWrap.hidden = !isOpening;
    if (isOpening && Number(explodeSlider.value) === 0) {
      setExplode(65);
    } else if (!isOpening) {
      setExplode(0);
    }
  });

  explodeSlider?.addEventListener('input', () => {
    setExplode(Number(explodeSlider.value));
  });

  // Sync Motion button initial state
  btnAnimate?.classList.toggle('active', animator.animating);
  btnAnimate?.setAttribute('aria-pressed', animator.animating);
  btnAnimate?.addEventListener('click', () => {
    const next = !animator.animating;
    animator.setAnimating(next);
    btnAnimate.classList.toggle('active', next);
    btnAnimate.setAttribute('aria-pressed', next);
    toast.show(next ? 'Living motion on' : 'Living motion paused');
  });

  let autoSpin = false;
  btnAutoRotate?.addEventListener('click', () => {
    autoSpin = !autoSpin;
    setAutoRotate(autoSpin);
    btnAutoRotate.classList.toggle('active', autoSpin);
    btnAutoRotate.setAttribute('aria-pressed', autoSpin);
  });

  function setMode(name) {
    if (name === currentModeName) return;
    currentMode?.deactivate();
    currentModeName = name;

    // Update tabs
    document.querySelectorAll('.mode-tab').forEach(tab => {
      const isActive = tab.dataset.mode === name;
      tab.classList.toggle('active', isActive);
      tab.setAttribute('aria-selected', isActive);
    });

    // Show/hide mode-specific UIs
    $('label-ui').hidden  = name !== 'label';
    $('quiz-ui').hidden   = name !== 'quiz';

    // Explode & Tour only apply in Explore mode (reset explode so pins match exact anchors)
    const isExplore = name === 'explore';
    btnTour.hidden = !isExplore;
    btnExplode.hidden = !isExplore;
    if (!isExplore) {
      explodeWrap.hidden = true;
      setExplode(0);
    }

    switch (name) {
      case 'explore': currentMode = exploreMode; break;
      case 'label':   currentMode = labelMode;   break;
      case 'quiz':    currentMode = quizMode;    break;
    }
    currentMode?.activate();
    requestRender();
  }

  // 6. Wire up mode tabs
  document.querySelectorAll('.mode-tab').forEach(btn => {
    btn.addEventListener('click', () => setMode(btn.dataset.mode));
  });

  // 7. Level toggle — re-activate current mode when level changes
  levelToggle.onChange(() => {
    if (currentMode) {
      currentMode.deactivate();
      currentMode.activate();
      requestRender();
    }
  });

  // 8. Reset view button
  $('reset-view').addEventListener('click', () => {
    setExplode(0);
    explodeWrap.hidden = true;
    flyCamera(
      camera, controls,
      topicData.camera.position,
      topicData.camera.target,
      requestRender
    );
    toast.show('View reset');
  });

  // 9. Label mode Finish button
  $('label-finish')?.addEventListener('click', () => {
    labelMode._finish?.();
  });

  // 10. Start in Explore mode
  setMode('explore');
  requestRender();
}

main().catch(err => {
  console.error('[bio3d] Fatal error:', err);
  showError('Something went wrong loading the viewer.');
});

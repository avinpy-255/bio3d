/**
 * scene.js — Three.js scene setup.
 * Creates renderer, CSS2DRenderer, camera, lights, and OrbitControls.
 * Uses render-on-demand to save battery on mobile.
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS2DRenderer } from 'three/addons/renderers/CSS2DRenderer.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

/**
 * Create a soft circular glow sprite texture for ambient background bio-particles.
 */
function createParticleTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
  grad.addColorStop(0.4, 'rgba(34, 211, 238, 0.35)');
  grad.addColorStop(1, 'rgba(34, 211, 238, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(canvas);
}

/**
 * @param {HTMLElement} container
 * @param {object} cameraConfig  { position, target, minDistance, maxDistance }
 * @returns {{ scene, camera, renderer, labelRenderer, controls, requestRender, setAutoRotate, setTickCallback, dispose }}
 */
export function createScene(container, cameraConfig) {
  // ── WebGL Renderer ──────────────────────────────────────────────────
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = false;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  container.appendChild(renderer.domElement);

  // ── CSS2D Renderer (for label pins) ─────────────────────────────────
  const labelRenderer = new CSS2DRenderer();
  labelRenderer.setSize(container.clientWidth, container.clientHeight);
  labelRenderer.domElement.className = 'css2d-layer';
  labelRenderer.domElement.style.position = 'absolute';
  labelRenderer.domElement.style.top = '0';
  labelRenderer.domElement.style.left = '0';
  labelRenderer.domElement.style.pointerEvents = 'none'; // toggled in label mode
  container.appendChild(labelRenderer.domElement);

  // ── Scene & Studio Reflections ──────────────────────────────────────
  const scene = new THREE.Scene();
  // Transparent background so the CSS bio-lab radial backdrop shines through
  scene.background = null;

  const pmremGenerator = new THREE.PMREMGenerator(renderer);
  const envTex = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environment = envTex;
  pmremGenerator.dispose();

  // ── Floating Micro-Particles Backdrop ───────────────────────────────
  const particleCount = 90;
  const pPos = new Float32Array(particleCount * 3);
  for (let i = 0; i < particleCount; i++) {
    const r = 2.6 + Math.random() * 4.5;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    pPos[i * 3]     = r * Math.sin(phi) * Math.cos(theta);
    pPos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    pPos[i * 3 + 2] = r * Math.cos(phi);
  }
  const pGeo = new THREE.BufferGeometry();
  pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
  const pTex = createParticleTexture();
  const pMat = new THREE.PointsMaterial({
    size: 0.14,
    map: pTex,
    transparent: true,
    opacity: 0.45,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const particles = new THREE.Points(pGeo, pMat);
  scene.add(particles);

  // ── Lighting ────────────────────────────────────────────────────────
  const hemi = new THREE.HemisphereLight(0x6688cc, 0x112233, 0.7);
  scene.add(hemi);

  const key = new THREE.DirectionalLight(0xffffff, 1.6);
  key.position.set(3, 5, 4);
  scene.add(key);

  const fill = new THREE.DirectionalLight(0x38bdf8, 0.55);
  fill.position.set(-4, -1, -3);
  scene.add(fill);

  const rim = new THREE.DirectionalLight(0xa78bfa, 0.5);
  rim.position.set(0, -3, -5);
  scene.add(rim);

  // ── Camera ──────────────────────────────────────────────────────────
  const { position = [0, 0, 4], target = [0, 0, 0] } = cameraConfig ?? {};
  const camera = new THREE.PerspectiveCamera(
    45,
    (container.clientWidth || 1) / (container.clientHeight || 1),
    0.1,
    100
  );
  camera.position.set(...position);

  // ── OrbitControls ───────────────────────────────────────────────────
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(...target);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.minDistance = cameraConfig?.minDistance ?? 1.5;
  controls.maxDistance = cameraConfig?.maxDistance ?? 8;
  controls.enablePan = true;
  controls.panSpeed = 0.6;
  controls.rotateSpeed = 0.7;
  controls.autoRotate = false;
  controls.autoRotateSpeed = 0.9;
  controls.update();

  // Pause auto-rotate briefly while user drags
  let userDragging = false;
  let wantAutoRotate = false;
  renderer.domElement.addEventListener('pointerdown', () => {
    userDragging = true;
    controls.autoRotate = false;
  });
  window.addEventListener('pointerup', () => {
    if (userDragging) {
      userDragging = false;
      controls.autoRotate = wantAutoRotate;
    }
  });

  function setAutoRotate(enabled) {
    wantAutoRotate = enabled;
    if (!userDragging) controls.autoRotate = enabled;
  }

  // ── Render loop (smooth animation & interaction) ───────────────────
  let isRunning = true;
  let lastTime = performance.now();
  let tickCallback = null;

  function setTickCallback(fn) {
    tickCallback = fn;
  }

  function renderLoop(now) {
    if (!isRunning) return;
    requestAnimationFrame(renderLoop);
    const dt = (now - lastTime) / 1000;
    lastTime = now;

    // Gentle drift of bio-particles
    particles.rotation.y += dt * 0.03;
    particles.rotation.x += dt * 0.01;

    tickCallback?.(dt);
    controls.update();
    renderer.render(scene, camera);
    labelRenderer.render(scene, camera);
  }

  requestAnimationFrame(renderLoop);

  function requestRender() {
    controls.update();
    renderer.render(scene, camera);
    labelRenderer.render(scene, camera);
  }

  // ── Resize handling ─────────────────────────────────────────────────
  const ro = new ResizeObserver(() => {
    const w = container.clientWidth;
    const h = container.clientHeight;
    if (w === 0 || h === 0) return;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
    labelRenderer.setSize(w, h);
    requestRender();
  });
  ro.observe(container);

  // Initial immediate render
  requestRender();

  function dispose() {
    isRunning = false;
    ro.disconnect();
    controls.dispose();
    envTex.dispose();
    pGeo.dispose();
    pTex.dispose();
    pMat.dispose();
    renderer.dispose();
  }

  return {
    scene, camera, renderer, labelRenderer, controls,
    requestRender, setAutoRotate, setTickCallback, dispose
  };
}

let activeFlyId = 0;

/**
 * Smoothly fly the camera to a new position/target.
 * Automatically cancels if another flyCamera starts or user touches the canvas.
 */
export function flyCamera(camera, controls, position, target, requestRender, duration = 600) {
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const flyId = ++activeFlyId;

  if (prefersReduced) {
    camera.position.set(...position);
    controls.target.set(...target);
    controls.update();
    requestRender();
    return;
  }

  const startPos = camera.position.clone();
  const endPos = new THREE.Vector3(...position);
  const startTgt = controls.target.clone();
  const endTgt = new THREE.Vector3(...target);
  const startTime = performance.now();

  const cancelOnDrag = () => { activeFlyId++; };
  controls.domElement?.addEventListener('pointerdown', cancelOnDrag, { once: true });

  function animate(now) {
    if (flyId !== activeFlyId) return;
    const t = Math.min((now - startTime) / duration, 1);
    const ease = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t; // ease-in-out quad

    camera.position.lerpVectors(startPos, endPos, ease);
    controls.target.lerpVectors(startTgt, endTgt, ease);
    controls.update();
    requestRender();

    if (t < 1) {
      requestAnimationFrame(animate);
    } else {
      controls.domElement?.removeEventListener('pointerdown', cancelOnDrag);
    }
  }

  requestAnimationFrame(animate);
}


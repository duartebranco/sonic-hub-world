import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

import { buildWorld, groundY } from './world/index.js';
import { Player }              from './player.js';
import { ThirdPersonCamera }   from './camera.js';

const $ = id => document.getElementById(id);

function setLoad(p, msg) {
  $('ldbar').style.width = p + '%';
  if (msg) $('ldtxt').textContent = msg;
}
function hideLoader() {
  const el = $('loading');
  el.classList.add('out');
  setTimeout(() => { el.style.display = 'none'; }, 600);
}

// ─── Renderer ────────────────────────────────────────────
const container = $('canvas-container');
const renderer  = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled   = true;
renderer.shadowMap.type      = THREE.PCFSoftShadowMap;
renderer.toneMapping         = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
container.appendChild(renderer.domElement);

// ─── Scene ───────────────────────────────────────────────
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x4fc3f7);
scene.fog        = new THREE.FogExp2(0x87ceeb, 0.018);

// ─── Camera ──────────────────────────────────────────────
const camera = new THREE.PerspectiveCamera(58, 1, 0.05, 400);
camera.position.set(0, 6, 12);

// ─── Lights ──────────────────────────────────────────────
const sun = new THREE.DirectionalLight(0xfff9e6, 3.0);
sun.position.set(20, 35, 15);
sun.castShadow             = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.near     =   0.5;
sun.shadow.camera.far      = 140;
sun.shadow.camera.left     = -50;
sun.shadow.camera.right    =  50;
sun.shadow.camera.top      =  50;
sun.shadow.camera.bottom   = -50;
sun.shadow.bias            = -0.0003;
scene.add(sun, sun.target);
scene.add(new THREE.AmbientLight(0xb3e5fc, 1.1));
const skyFill = new THREE.DirectionalLight(0x80d8ff, 0.5);
skyFill.position.set(-10, 12, -8);
scene.add(skyFill);

// ─── World ───────────────────────────────────────────────
const { flowerSpinners, cloudDrifters, rings, sparkleSystem, ambientParticles }
  = buildWorld(scene);

// ─── Player + camera controller ──────────────────────────
const player = new Player(scene);
const tpCam  = new ThirdPersonCamera(camera, renderer.domElement);

// ─── Resize ──────────────────────────────────────────────
function onResize() {
  const w = container.clientWidth;
  const h = container.clientHeight;
  renderer.setSize(w, h);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', onResize);
onResize();

// ─── Asset loading ───────────────────────────────────────
setLoad(8, 'Loading Sonic...');

async function loadAssets() {
  const loader = new GLTFLoader();

  await new Promise((res, rej) => {
    loader.load('../models/sonic.glb', gltf => {
      player.setModel(gltf.scene);
      setLoad(55, 'Loading animations...');
      res();
    }, undefined, rej);
  });

  await new Promise((res, rej) => {
    fetch('../animations/walking.json')
      .then(r => r.json())
      .then(d => { player.setWalkKeyframes(d.keyframes); setLoad(92, 'Ready!'); res(); })
      .catch(rej);
  });

  setLoad(100, 'Ready!');
  await new Promise(r => setTimeout(r, 350));
  hideLoader();
}

loadAssets().catch(err => {
  console.error('Asset load error:', err);
  setLoad(100, 'Some assets missing');
  setTimeout(hideLoader, 800);
});

// ─── Ring state ──────────────────────────────────────────
let ringCount = 0;

// ─── Game loop ───────────────────────────────────────────
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);

  const dt  = Math.min(clock.getDelta(), 0.05);
  const now = performance.now() / 1000;

  player.update(dt, tpCam.yaw);
  tpCam.update(dt, player.pos);

  sun.position.set(player.pos.x + 20, 35, player.pos.z + 15);
  sun.target.position.set(player.pos.x, player.pos.y, player.pos.z);

  rings.forEach(r => {
    if (r.collected) return;

    r.mesh.rotation.z += dt * 2.8;
    r.mesh.position.y  =
      groundY(r.mesh.position.x, r.mesh.position.z) + 1.0
      + Math.sin(now * 2.5 + r.phase) * 0.13;

    const dx = player.pos.x - r.mesh.position.x;
    const dy = (player.pos.y + 0.5) - r.mesh.position.y;
    const dz = player.pos.z - r.mesh.position.z;
    if (dx*dx + dy*dy + dz*dz < 0.9) {
      r.collected = true;
      sparkleSystem.spawn(r.mesh.position.clone());
      scene.remove(r.mesh);
      ringCount++;
      $('ring-count').textContent = ringCount;
    }
  });

  sparkleSystem.update(dt);

  cloudDrifters.forEach(c => {
    c.mesh.position.x += c.speed * dt * 0.3;
    if (c.mesh.position.x > 110) c.mesh.position.x = -110;
  });

  flowerSpinners.forEach(f => { f.head.rotation.y += dt * 1.2; });

  const ap = ambientParticles.geo.attributes.position;
  for (let i = 0; i < ap.count; i++) {
    let y = ap.getY(i) + dt * 0.35;
    if (y > 14) y = 0.3;
    ap.setY(i, y);
  }
  ap.needsUpdate = true;
  ambientParticles.pts.material.opacity = 0.38 + Math.sin(now * 1.8) * 0.18;

  renderer.render(scene, camera);
}

animate();

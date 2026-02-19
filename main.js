/**
 * main.js
 * Entry point. Wires renderer, scene, and all modules together.
 */

import * as THREE from 'three';
import { buildSky }                         from './js/sky.js';
import { buildLighting }                    from './js/lighting.js';
import { buildWorld }                       from './js/world.js';
import { loadPlayer, updatePlayer,
         sonicGroup, sonicFacing }          from './js/player.js';
import { camera, setupCameraInput,
         updateCamera, onResize, camYaw }   from './js/camera.js';
import { updateHUD }                        from './js/hud.js';
import { keys }                             from './js/input.js';

// ─── renderer ─────────────────────────────────────────────────────────────────
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace  = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type    = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

// ─── scene ────────────────────────────────────────────────────────────────────
const scene = new THREE.Scene();

// ─── modules ──────────────────────────────────────────────────────────────────
buildSky(scene);
buildLighting(scene);
buildWorld(scene);
loadPlayer(scene);
setupCameraInput(renderer.domElement);

// ─── loop ─────────────────────────────────────────────────────────────────────
const clock = new THREE.Clock();

function animate() {
    requestAnimationFrame(animate);
    const dt     = Math.min(clock.getDelta(), 0.05);
    const moving = updatePlayer(dt, keys, camYaw);
    updateCamera(dt, sonicGroup, sonicFacing, moving);
    updateHUD(sonicGroup);
    renderer.render(scene, camera);
}

animate();

// ─── resize ───────────────────────────────────────────────────────────────────
window.addEventListener('resize', () => {
    onResize();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

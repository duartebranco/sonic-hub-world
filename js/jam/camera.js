/**
 * camera.js
 * Third-person spring camera for the Saturn-style Sonic Jam world.
 * Mouse drag → yaw/pitch. Scroll → zoom distance.
 * When Sonic moves, the look-at target drifts ahead of him.
 *
 * Exports:
 *   camera             — THREE.PerspectiveCamera
 *   camYaw             — current horizontal angle (read by player.js)
 *   setupCameraInput(domElement)
 *   updateCamera(dt, sonicGroup, sonicFacing, moving)
 *   onResize()
 */

import * as THREE from 'three';

// ─── constants ────────────────────────────────────────────────────────────────

const CAM_DISTANCE  = 7;
const CAM_HEIGHT    = 3;
const CAM_PITCH_MIN = 0.05;
const CAM_PITCH_MAX = 0.65;
const CAM_LAG       = 0.08;
const CAM_LOOKAHEAD = 2.0;

// ─── state ────────────────────────────────────────────────────────────────────

export const camera = new THREE.PerspectiveCamera(
    60, window.innerWidth / window.innerHeight, 0.1, 500
);
camera.position.set(0, CAM_HEIGHT + 2, CAM_DISTANCE);

export let camYaw  = 0;
let camPitch       = 0.28;
let camDist        = CAM_DISTANCE;

const camPos       = new THREE.Vector3().copy(camera.position);
const camLookAhead = new THREE.Vector3();

// ─── input wiring ─────────────────────────────────────────────────────────────

export function setupCameraInput(domElement) {
    let down = false;
    let lx = 0, ly = 0;

    const start = (x, y) => { down = true; lx = x; ly = y; };
    const end   = ()      => { down = false; };
    const move  = (x, y) => {
        if (!down) return;
        camYaw  -= (x - lx) * 0.005;
        camPitch = Math.max(CAM_PITCH_MIN, Math.min(CAM_PITCH_MAX, camPitch + (y - ly) * 0.004));
        lx = x;
        ly = y;
    };

    domElement.addEventListener('mousedown', e => start(e.clientX, e.clientY));
    window.addEventListener('mouseup', end);
    window.addEventListener('mousemove', e => move(e.clientX, e.clientY));

    domElement.addEventListener('touchstart', e => start(e.touches[0].clientX, e.touches[0].clientY), { passive: true });
    window.addEventListener('touchend', end);
    window.addEventListener('touchmove', e => move(e.touches[0].clientX, e.touches[0].clientY), { passive: true });

    window.addEventListener('wheel', e => {
        camDist = Math.max(3, Math.min(18, camDist + e.deltaY * 0.01));
    });
}

// ─── per-frame update ─────────────────────────────────────────────────────────

export function updateCamera(dt, sonicGroup, sonicFacing, moving) {
    const sx = sonicGroup.position.x;
    const sy = sonicGroup.position.y;
    const sz = sonicGroup.position.z;

    // Gentle look-ahead when moving
    const tlax = moving ? Math.sin(sonicFacing + Math.PI) * CAM_LOOKAHEAD : 0;
    const tlaz = moving ? Math.cos(sonicFacing + Math.PI) * CAM_LOOKAHEAD : 0;
    camLookAhead.x += (tlax - camLookAhead.x) * Math.min(1, dt * 3);
    camLookAhead.z += (tlaz - camLookAhead.z) * Math.min(1, dt * 3);

    // Target camera position on the orbit sphere
    const tx = sx + Math.sin(camYaw) * camDist * Math.cos(camPitch);
    const ty = sy + CAM_HEIGHT + Math.sin(camPitch) * camDist;
    const tz = sz + Math.cos(camYaw) * camDist * Math.cos(camPitch);

    // Exponential ease toward target
    const e = 1 - Math.exp(-dt / CAM_LAG);
    camPos.x += (tx - camPos.x) * e;
    camPos.y += (ty - camPos.y) * e;
    camPos.z += (tz - camPos.z) * e;

    camera.position.copy(camPos);
    camera.lookAt(sx + camLookAhead.x, sy + 1.0, sz + camLookAhead.z);
}

// ─── resize handler ───────────────────────────────────────────────────────────

export function onResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
}
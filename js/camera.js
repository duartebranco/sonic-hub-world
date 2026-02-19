/**
 * camera.js
 * Third-person spring camera.
 * Mouse drag → yaw/pitch. Scroll → zoom distance.
 * When Sonic moves, the look-at target drifts ahead of him.
 *
 * Exports:
 *   camera        — THREE.PerspectiveCamera
 *   camYaw        — current horizontal angle (read by player.js for movement)
 *   setupCameraInput(domElement)
 *   updateCamera(dt, sonicGroup, sonicFacing, moving)
 */

import * as THREE from 'three';

const CAM_DISTANCE  = 7;
const CAM_HEIGHT    = 3;
const CAM_LAG       = 0.08;
const CAM_PITCH_MIN = 0.05;
const CAM_PITCH_MAX = 0.65;
const CAM_LOOKAHEAD = 2.5;

export const camera = new THREE.PerspectiveCamera(
    60, window.innerWidth / window.innerHeight, 0.1, 500
);
camera.position.set(0, CAM_HEIGHT + 2, CAM_DISTANCE);

export let camYaw   = 0;
let camPitch        = 0.25;
let camDist         = CAM_DISTANCE;

const camPos              = new THREE.Vector3().copy(camera.position);
const camLookAhead        = new THREE.Vector3();

// ─── input wiring ─────────────────────────────────────────────────────────────
export function setupCameraInput(domElement) {
    let mouseDown  = false;
    let lastX = 0, lastY = 0;

    const onDown = (x, y) => { mouseDown = true; lastX = x; lastY = y; };
    const onUp   = ()      => { mouseDown = false; };
    const onMove = (x, y) => {
        if (!mouseDown) return;
        camYaw   -= (x - lastX) * 0.005;
        camPitch  = Math.max(CAM_PITCH_MIN, Math.min(CAM_PITCH_MAX, camPitch + (y - lastY) * 0.004));
        lastX = x; lastY = y;
    };

    domElement.addEventListener('mousedown',  e => onDown(e.clientX, e.clientY));
    window.addEventListener('mouseup',         onUp);
    window.addEventListener('mousemove',       e => onMove(e.clientX, e.clientY));

    domElement.addEventListener('touchstart',  e => onDown(e.touches[0].clientX, e.touches[0].clientY));
    window.addEventListener('touchend',        onUp);
    window.addEventListener('touchmove',       e => onMove(e.touches[0].clientX, e.touches[0].clientY));

    window.addEventListener('wheel', e => {
        camDist = Math.max(3, Math.min(18, camDist + e.deltaY * 0.01));
    });
}

// ─── per-frame update ─────────────────────────────────────────────────────────
export function updateCamera(dt, sonicGroup, sonicFacing, moving) {
    const sx = sonicGroup.position.x;
    const sy = sonicGroup.position.y;
    const sz = sonicGroup.position.z;

    // Look-ahead: drift toward a point ahead of Sonic when moving
    const targetLAX = moving ? Math.sin(sonicFacing + Math.PI) * CAM_LOOKAHEAD : 0;
    const targetLAZ = moving ? Math.cos(sonicFacing + Math.PI) * CAM_LOOKAHEAD : 0;
    camLookAhead.x += (targetLAX - camLookAhead.x) * Math.min(1, dt * 4);
    camLookAhead.z += (targetLAZ - camLookAhead.z) * Math.min(1, dt * 4);

    // Target camera position
    const tx = sx + Math.sin(camYaw) * camDist * Math.cos(camPitch);
    const ty = sy + CAM_HEIGHT + Math.sin(camPitch) * camDist;
    const tz = sz + Math.cos(camYaw) * camDist * Math.cos(camPitch);

    const ease = 1 - Math.exp(-dt / CAM_LAG);
    camPos.x += (tx - camPos.x) * ease;
    camPos.y += (ty - camPos.y) * ease;
    camPos.z += (tz - camPos.z) * ease;

    camera.position.copy(camPos);
    camera.lookAt(sx + camLookAhead.x, sy + 1.0, sz + camLookAhead.z);
}

// ─── resize handler ───────────────────────────────────────────────────────────
export function onResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
}

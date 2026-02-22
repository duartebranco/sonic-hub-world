/**
 * player.js
 * Loads sonic.glb, handles WASD movement, gravity, and jump.
 * Exports:
 *   sonicGroup      — THREE.Group that moves around the world
 *   sonicFacing     — current facing angle
 *   loadPlayer(scene)
 *   updatePlayer(dt, keys, camYaw) — call every frame, returns whether moving
 */

import * as THREE     from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { islandHeight, ISLAND_R } from './world.js';

// ─── constants ────────────────────────────────────────────────────────────────
const MOVE_SPEED = 8;
const JUMP_POWER = 12;
const GRAVITY    = -28;

// ─── state ────────────────────────────────────────────────────────────────────
export const sonicGroup = new THREE.Group();
sonicGroup.position.set(0, islandHeight(0, 0), 6);

let mixer    = null;
let velY     = 0;
let onGround = false;

export let sonicFacing = 0;

// ─── load model ───────────────────────────────────────────────────────────────
export function loadPlayer(scene) {
    scene.add(sonicGroup);

    const loader = new GLTFLoader();
    loader.load(
        'sonic.glb',
        (gltf) => {
            const model = gltf.scene;
            const box   = new THREE.Box3().setFromObject(model);
            const size  = box.getSize(new THREE.Vector3());
            model.scale.setScalar(1.6 / Math.max(size.x, size.y, size.z));

            const box2 = new THREE.Box3().setFromObject(model);
            model.position.y -= box2.min.y;
            model.traverse(o => { if (o.isMesh) o.castShadow = true; });
            sonicGroup.add(model);

            if (gltf.animations.length > 0) {
                mixer = new THREE.AnimationMixer(model);
                mixer.clipAction(gltf.animations[0]).play();
            }
        },
        undefined,
        (err) => {
            console.warn('sonic.glb not found — using capsule placeholder', err);
            const cap = new THREE.Mesh(
                new THREE.CapsuleGeometry(0.35, 0.9, 8, 16),
                new THREE.MeshLambertMaterial({ color: 0x0033cc }),
            );
            cap.position.y = 0.8;
            cap.castShadow = true;
            sonicGroup.add(cap);
        },
    );
}

// ─── per-frame update ─────────────────────────────────────────────────────────
export function updatePlayer(dt, keys, camYaw) {
    if (mixer) mixer.update(dt);

    const forward = keys['KeyS']  || keys['ArrowDown'];
    const back    = keys['KeyW']  || keys['ArrowUp'];
    const left    = keys['KeyD']  || keys['ArrowRight'];
    const right   = keys['KeyA']  || keys['ArrowLeft'];
    const jump    = keys['Space'];
    const moving  = forward || back || left || right;

    // Resolve eight-way direction
    let moveDir = 0;
    if      (forward && left)  moveDir =  Math.PI * 0.25;
    else if (forward && right) moveDir = -Math.PI * 0.25;
    else if (back    && left)  moveDir =  Math.PI * 0.75;
    else if (back    && right) moveDir = -Math.PI * 0.75;
    else if (forward)          moveDir =  0;
    else if (back)             moveDir =  Math.PI;
    else if (left)             moveDir =  Math.PI * 0.5;
    else if (right)            moveDir = -Math.PI * 0.5;

    if (moving) {
        const worldAngle = camYaw + moveDir;
        sonicGroup.position.x += Math.sin(worldAngle) * MOVE_SPEED * dt;
        sonicGroup.position.z += Math.cos(worldAngle) * MOVE_SPEED * dt;

        // Clamp to island boundary
        const d = Math.sqrt(sonicGroup.position.x ** 2 + sonicGroup.position.z ** 2);
        if (d > ISLAND_R - 1) {
            const a = Math.atan2(sonicGroup.position.x, sonicGroup.position.z);
            sonicGroup.position.x = Math.sin(a) * (ISLAND_R - 1);
            sonicGroup.position.z = Math.cos(a) * (ISLAND_R - 1);
        }

        sonicFacing = camYaw + moveDir + Math.PI;
        sonicGroup.rotation.y = sonicFacing;
    }

    // Gravity + ground collision
    const groundY = islandHeight(sonicGroup.position.x, sonicGroup.position.z);
    velY += GRAVITY * dt;
    sonicGroup.position.y += velY * dt;

    if (sonicGroup.position.y <= groundY) {
        sonicGroup.position.y = groundY;
        velY     = 0;
        onGround = true;
    } else {
        onGround = false;
    }

    if (jump && onGround) {
        velY     = JUMP_POWER;
        onGround = false;
    }

    return moving;
}
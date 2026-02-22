/**
 * lighting.js
 * Scene lighting for the Saturn-style Sonic Jam world.
 * Hemisphere fill + directional sun. Shadow maps are omitted here
 * because the renderer runs with shadowMap.enabled = false to match
 * the Saturn's lack of real-time shadows.
 */

import * as THREE from 'three';

export function buildLighting(scene) {
    const hemi = new THREE.HemisphereLight(0x87ceeb, 0x3aaa55, 0.8);
    scene.add(hemi);

    const sun = new THREE.DirectionalLight(0xfff8e0, 2.0);
    sun.position.set(30, 60, 20);
    scene.add(sun);
}
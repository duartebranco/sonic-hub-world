/**
 * lighting.js
 * Scene lighting: hemisphere fill + directional sun with shadows.
 */

import * as THREE from 'three';

export function buildLighting(scene) {
    const hemi = new THREE.HemisphereLight(0x87ceeb, 0x3aaa55, 0.8);
    scene.add(hemi);

    const sun = new THREE.DirectionalLight(0xfff8e0, 2.0);
    sun.position.set(30, 60, 20);
    sun.castShadow              = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.near      = 1;
    sun.shadow.camera.far       = 200;
    sun.shadow.camera.left      = -80;
    sun.shadow.camera.right     =  80;
    sun.shadow.camera.top       =  80;
    sun.shadow.camera.bottom    = -80;
    scene.add(sun);
}

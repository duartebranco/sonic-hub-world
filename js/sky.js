/**
 * sky.js
 * Sets up the sky background using the pixel-art sky texture.
 * Also configures scene fog to match the sky horizon colour.
 */

import * as THREE from 'three';
import { makeSkyTexture } from './textures.js';

export function buildSky(scene) {
    // Use the pixel sky canvas as a flat scene background.
    // THREE will stretch it to fill the viewport — that's fine,
    // it reads as a painted backdrop just like Sonic Jam's sky.
    scene.background = makeSkyTexture();

    // Fog matches the lower horizon colour of the sky gradient
    scene.fog = new THREE.Fog(0xc4e8ff, 55, 160);
}

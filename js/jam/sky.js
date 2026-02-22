/**
 * js/jam/sky.js
 * Sets up the pixel-art sky background and tight Saturn-style fog.
 */

import * as THREE from 'three';
import { makeSkyTexture } from './textures.js';

export function buildSky(scene) {
    scene.background = makeSkyTexture();

    // Tight fog matching the horizon colour — Saturn's short draw distance
    scene.fog = new THREE.Fog(0xc4e8ff, 30, 90);
}
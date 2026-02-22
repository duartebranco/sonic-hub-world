/**
 * renderer.js
 * Saturn-style low-resolution renderer with colour posterisation.
 *
 * Renders at 320×224 (Saturn native resolution), then blits through a
 * fullscreen shader that quantises colours to 5-bit per channel (32 levels)
 * with a Bayer 4×4 dither matrix — replicating the Saturn VDP look.
 *
 * Exports:
 *   SATURN_W, SATURN_H  — native resolution constants
 *   renderer             — THREE.WebGLRenderer (renders at native res)
 *   renderTarget         — low-res render target
 *   postScene, postCamera — fullscreen quad scene for the posterise pass
 *   initRendererDOM()    — appends canvas to <body> and applies CSS scaling
 */

import * as THREE from 'three';

// ─── Saturn native resolution ─────────────────────────────────────────────────

export const SATURN_W = 320;
export const SATURN_H = 224;

// ─── WebGL renderer ───────────────────────────────────────────────────────────

export const renderer = new THREE.WebGLRenderer({ antialias: false });
renderer.setPixelRatio(1);
renderer.setSize(SATURN_W, SATURN_H);
renderer.outputColorSpace  = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = false;   // shadows too expensive + not Saturn-accurate

// ─── CSS pixel-perfect upscaling ──────────────────────────────────────────────

export function initRendererDOM() {
    const cvs = renderer.domElement;
    cvs.style.width          = '100vw';
    cvs.style.height         = '100vh';
    cvs.style.imageRendering = 'pixelated';     // Chrome / Firefox
    cvs.style.imageRendering = 'crisp-edges';   // Safari fallback
    document.body.appendChild(cvs);
}

// ─── low-res render target ────────────────────────────────────────────────────

export const renderTarget = new THREE.WebGLRenderTarget(SATURN_W, SATURN_H, {
    minFilter: THREE.NearestFilter,
    magFilter: THREE.NearestFilter,
});

// ─── posterisation post-process ───────────────────────────────────────────────
//
// Fullscreen quad + custom shader that:
//   1. Reads the low-res scene texture
//   2. Applies Bayer 4×4 ordered dithering
//   3. Quantises each channel to 5-bit (32 levels) — Saturn VDP colour depth

const posterMat = new THREE.ShaderMaterial({
    uniforms: {
        tDiffuse: { value: renderTarget.texture },
    },
    vertexShader: /* glsl */ `
        varying vec2 vUv;
        void main() {
            vUv = uv;
            gl_Position = vec4(position, 1.0);
        }
    `,
    fragmentShader: /* glsl */ `
        uniform sampler2D tDiffuse;
        varying vec2 vUv;

        // Bayer 4x4 dither matrix (normalised to [0,1])
        float bayer(ivec2 p) {
            int x = p.x & 3, y = p.y & 3;
            int idx = x + y * 4;
            float m[16];
            m[ 0] =  0.0; m[ 1] =  8.0; m[ 2] =  2.0; m[ 3] = 10.0;
            m[ 4] = 12.0; m[ 5] =  4.0; m[ 6] = 14.0; m[ 7] =  6.0;
            m[ 8] =  3.0; m[ 9] = 11.0; m[10] =  1.0; m[11] =  9.0;
            m[12] = 15.0; m[13] =  7.0; m[14] = 13.0; m[15] =  5.0;
            return m[idx] / 16.0;
        }

        void main() {
            vec4 c = texture2D(tDiffuse, vUv);

            // Quantise to 5-bit per channel (32 levels)
            float steps  = 31.0;
            ivec2 px     = ivec2(vUv * vec2(320.0, 224.0));
            float thresh = (bayer(px) - 0.5) / steps;

            vec3 col = c.rgb + thresh;
            col = floor(col * steps + 0.5) / steps;

            gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
        }
    `,
    depthWrite: false,
});

export const postScene  = new THREE.Scene();
export const postCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

postScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), posterMat));
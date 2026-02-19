/**
 * textures.js
 * Procedural pixel-art texture generators (NearestFilter throughout).
 * All textures mimic the chunky Saturn-era look of Sonic Jam.
 */

import * as THREE from 'three';

// ─── shared utility ───────────────────────────────────────────────────────────

function makeSeededRand(seed) {
    let s = seed;
    return () => {
        s = (s * 1664525 + 1013904223) & 0xffffffff;
        return (s >>> 0) / 0xffffffff;
    };
}

function pixelTex({ tileW, tileH, scale = 2, paint, repeat = [1, 1] }) {
    const W  = tileW * scale;
    const H  = tileH * scale;
    const cv = document.createElement('canvas');
    cv.width = W; cv.height = H;
    const ctx = cv.getContext('2d');
    for (let py = 0; py < tileH; py++) {
        for (let px = 0; px < tileW; px++) {
            const col = paint(px, py);
            if (col) {
                ctx.fillStyle = col;
                ctx.fillRect(px * scale, py * scale, scale, scale);
            }
        }
    }
    const tex = new THREE.CanvasTexture(cv);
    tex.magFilter       = THREE.NearestFilter;
    tex.minFilter       = THREE.NearestMipmapNearestFilter;
    tex.wrapS           = THREE.RepeatWrapping;
    tex.wrapT           = THREE.RepeatWrapping;
    tex.repeat.set(...repeat);
    tex.generateMipmaps = true;
    return tex;
}

// ─── grass ────────────────────────────────────────────────────────────────────

export function makeGrassTexture() {
    const palette = ['#3aaa22','#2e9418','#46c42a','#228811','#56d436','#1e7810'];
    const rand = makeSeededRand(42);
    return pixelTex({
        tileW: 32, tileH: 32, scale: 2, repeat: [28, 28],
        paint(px, py) {
            const r = rand();
            let col = r < 0.38 ? palette[0]
                    : r < 0.58 ? palette[1]
                    : r < 0.72 ? palette[2]
                    : r < 0.84 ? palette[3]
                    : r < 0.93 ? palette[4]
                    : palette[5];
            if (py % 4 === 0 && rand() < 0.18) col = palette[4];
            if (py % 8 === 7 && rand() < 0.55) col = palette[5];
            return col;
        }
    });
}

// ─── rock  ────────────────────────────────────────────────────────────────────
//
//  Classic Sonic checkerboard rock: 2×2 pixel squares alternating between
//  two brown/orange tones — the exact pattern seen in Green Hill, Marble,
//  and most Sonic level walls.

export function makeRockTexture() {
    const A = '#c8723a';   // warm orange-brown
    const B = '#a85a28';   // darker brown
    const H = '#d4885a';   // highlight (occasional lighter square)
    const D = '#7a3e18';   // deep shadow seam
    const CELL = 4;        // each checkerboard square = 4 canvas px (2×2 "pixels")

    return pixelTex({
        tileW: 32, tileH: 32, scale: 1, repeat: [18, 18],
        paint(px, py) {
            // Which 2×2 cell are we in?
            const cx = Math.floor(px / 2);
            const cy = Math.floor(py / 2);
            // Hard horizontal mortar seam every 4 cells
            if (cy % 4 === 3 && py % 2 === 1) return D;
            // Vertical seam offset per row (brick-bond pattern)
            const offset = Math.floor(cy / 4) % 2;
            const effectiveCx = cx + offset;
            const checker = (effectiveCx + cy) % 2 === 0 ? A : B;
            // Occasional highlight on top-left of a cell
            if (px % 2 === 0 && py % 2 === 0 && (cx + cy) % 7 === 0) return H;
            return checker;
        }
    });
}

// ─── snow / peak  ─────────────────────────────────────────────────────────────

export function makeSnowTexture() {
    const whites = ['#eef6ff','#d8eeff','#ffffff','#cce0f8','#b8d4f0'];
    const rand = makeSeededRand(19);
    return pixelTex({
        tileW: 16, tileH: 16, scale: 4, repeat: [14, 14],
        paint(px, py) {
            const r = rand();
            return r < 0.5 ? whites[0]
                 : r < 0.72 ? whites[1]
                 : r < 0.85 ? whites[2]
                 : r < 0.93 ? whites[3]
                 : whites[4];
        }
    });
}

// ─── sky gradient + pixel clouds  ────────────────────────────────────────────
//
//  Returns a THREE.Texture suitable for scene.background.
//  The canvas is NOT tiled — it's a full 512×256 sky image with:
//    • vertical blue gradient
//    • ~12 hand-placed chunky pixel clouds

export function makeSkyTexture() {
    const W = 512, H = 256;
    const cv = document.createElement('canvas');
    cv.width = W; cv.height = H;
    const ctx = cv.getContext('2d');

    // Sky gradient — top deep blue → lower hazy
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0,    '#3a8ed4');
    grad.addColorStop(0.45, '#6ec6f0');
    grad.addColorStop(0.80, '#a8dcf8');
    grad.addColorStop(1.0,  '#c4e8ff');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    // Draw pixel clouds
    // Each cloud = a cluster of rectangles in 3 brightness levels
    const CLOUD_COLOR = [
        ['#ffffff', '#f0f8ff', '#d8eeff'],  // bright white
        ['#f8fbff', '#e4f2ff', '#cce4f8'],  // mid cloud
        ['#eef4ff', '#d8ecff', '#bcd8f4'],  // shadow underside
    ];

    function drawCloud(cx, cy, scale) {
        // A cloud is defined as a small grid of "macro-pixels"
        // Each macro-pixel = scale×scale canvas pixels
        // Bit-pattern: rows of 0/1/2 meaning shadow/mid/bright
        const pattern = [
            [0,0,1,1,1,0,0,0],
            [0,1,2,2,2,1,1,0],
            [1,2,2,2,2,2,2,1],
            [1,2,2,2,2,2,1,0],
            [0,1,1,2,1,1,0,0],
            [0,0,0,1,0,0,0,0],
        ];
        // rows 0-1 are bright top, row 4-5 are shadow base
        const rowShade = [2, 2, 2, 1, 1, 0];
        for (let row = 0; row < pattern.length; row++) {
            for (let col = 0; col < pattern[row].length; col++) {
                const v = pattern[row][col];
                if (v === 0) continue;
                const shade = rowShade[row];
                ctx.fillStyle = CLOUD_COLOR[shade][2 - v];
                ctx.fillRect(
                    cx + col * scale,
                    cy + row * scale,
                    scale, scale
                );
            }
        }
    }

    // Fixed cloud positions (x, y, scale) — deterministic, nice layout
    const clouds = [
        [20,  18, 8],
        [130, 10, 10],
        [260, 22, 9],
        [390, 8,  11],
        [460, 30, 7],
        [60,  50, 7],
        [200, 42, 8],
        [330, 48, 9],
        [430, 55, 6],
        [100, 70, 6],
        [280, 68, 7],
        [480, 72, 5],
    ];
    clouds.forEach(([x, y, s]) => drawCloud(x, y, s));

    const tex = new THREE.CanvasTexture(cv);
    // No mipmaps / repeat for the sky backdrop
    tex.magFilter = THREE.NearestFilter;
    tex.minFilter = THREE.NearestFilter;
    return tex;
}

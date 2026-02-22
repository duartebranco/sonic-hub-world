/**
 * textures.js
 * Procedural pixel-art texture generators for the Saturn-style Sonic Jam world.
 * All textures use NearestFilter for the chunky retro look.
 */

import * as THREE from 'three';

// ─── shared utilities ─────────────────────────────────────────────────────────

export function seededRand(seed) {
    let s = seed;
    return () => {
        s = (s * 1664525 + 1013904223) & 0xffffffff;
        return (s >>> 0) / 0xffffffff;
    };
}

export function pixelTex({ tileW, tileH, scale = 2, repeat = [1, 1], paint }) {
    const cv = document.createElement('canvas');
    cv.width = tileW * scale;
    cv.height = tileH * scale;
    const ctx = cv.getContext('2d');

    for (let py = 0; py < tileH; py++) {
        for (let px = 0; px < tileW; px++) {
            const col = paint(px, py);
            if (!col) continue;
            ctx.fillStyle = col;
            ctx.fillRect(px * scale, py * scale, scale, scale);
        }
    }

    const tex = new THREE.CanvasTexture(cv);
    tex.magFilter = THREE.NearestFilter;
    tex.minFilter = THREE.NearestMipmapNearestFilter;
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(...repeat);
    tex.generateMipmaps = true;
    return tex;
}

// ─── grass ────────────────────────────────────────────────────────────────────

export function makeGrassTexture() {
    const pal = ['#3aaa22', '#2e9418', '#46c42a', '#228811', '#56d436', '#1e7810'];
    const rand = seededRand(42);

    return pixelTex({
        tileW: 32, tileH: 32, scale: 2, repeat: [28, 28],
        paint(px, py) {
            const r = rand();
            let c = r < 0.38 ? pal[0]
                  : r < 0.58 ? pal[1]
                  : r < 0.72 ? pal[2]
                  : r < 0.84 ? pal[3]
                  : r < 0.93 ? pal[4]
                  : pal[5];
            if (py % 4 === 0 && rand() < 0.18) c = pal[4];
            if (py % 8 === 7 && rand() < 0.55) c = pal[5];
            return c;
        },
    });
}

// ─── rock (checkerboard) ─────────────────────────────────────────────────────

export function makeRockTexture() {
    const A = '#c8723a', B = '#a85a28', H = '#d4885a', D = '#7a3e18';

    return pixelTex({
        tileW: 32, tileH: 32, scale: 1, repeat: [18, 18],
        paint(px, py) {
            const cx = Math.floor(px / 2);
            const cy = Math.floor(py / 2);
            if (cy % 4 === 3 && py % 2 === 1) return D;
            const off = Math.floor(cy / 4) % 2;
            const checker = ((cx + off) + cy) % 2 === 0 ? A : B;
            if (px % 2 === 0 && py % 2 === 0 && (cx + cy) % 7 === 0) return H;
            return checker;
        },
    });
}

// ─── snow ─────────────────────────────────────────────────────────────────────

export function makeSnowTexture() {
    const w = ['#eef6ff', '#d8eeff', '#ffffff', '#cce0f8', '#b8d4f0'];
    const rand = seededRand(19);

    return pixelTex({
        tileW: 16, tileH: 16, scale: 4, repeat: [14, 14],
        paint() {
            const r = rand();
            return r < 0.50 ? w[0]
                 : r < 0.72 ? w[1]
                 : r < 0.85 ? w[2]
                 : r < 0.93 ? w[3]
                 : w[4];
        },
    });
}

// ─── sky (gradient + pixel clouds) ───────────────────────────────────────────

export function makeSkyTexture() {
    const W = 512, H = 512;
    const cv = document.createElement('canvas');
    cv.width = W;
    cv.height = H;
    const ctx = cv.getContext('2d');

    // Gradient — deep blue at top, hazy at horizon
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0,    '#1a6aaa');
    grad.addColorStop(0.30, '#3a8ed4');
    grad.addColorStop(0.60, '#6ec6f0');
    grad.addColorStop(0.82, '#a8dcf8');
    grad.addColorStop(1.0,  '#c4e8ff');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    // Pixel clouds — chunky 3-shade blocks in the upper portion
    const SHADES = [
        ['#ffffff', '#f0f8ff', '#d8eeff'],   // bright top
        ['#f8fbff', '#e4f2ff', '#cce4f8'],   // mid
        ['#eef4ff', '#d8ecff', '#bcd8f4'],   // shadow base
    ];
    const PAT = [
        [0, 0, 1, 1, 1, 1, 0, 0, 0, 0],
        [0, 1, 2, 2, 2, 2, 1, 1, 0, 0],
        [1, 2, 2, 2, 2, 2, 2, 2, 1, 0],
        [1, 2, 2, 2, 2, 2, 2, 1, 0, 0],
        [0, 1, 1, 2, 2, 1, 1, 0, 0, 0],
        [0, 0, 0, 1, 1, 0, 0, 0, 0, 0],
    ];
    const ROW_SHADE = [0, 0, 0, 1, 2, 2];

    function drawCloud(cx, cy, sc) {
        PAT.forEach((row, ri) => {
            row.forEach((v, ci) => {
                if (!v) return;
                ctx.fillStyle = SHADES[ROW_SHADE[ri]][2 - v];
                ctx.fillRect(cx + ci * sc, cy + ri * sc, sc, sc);
            });
        });
    }

    const clouds = [
        [10,  12,  9],  [120,  8, 12],  [260, 18, 10],  [390,  6, 13],
        [455, 22,  8],  [60,  45,  8],  [195, 38, 10],  [330, 42, 11],
        [430, 50,  7],  [105, 65,  7],  [275, 60,  9],  [480, 58,  6],
        [30,  80,  6],  [160, 75,  8],  [310, 78,  7],  [445, 82,  5],
    ];
    clouds.forEach(([x, y, s]) => drawCloud(x, y, s));

    const tex = new THREE.CanvasTexture(cv);
    tex.magFilter = THREE.NearestFilter;
    tex.minFilter = THREE.NearestFilter;
    return tex;
}
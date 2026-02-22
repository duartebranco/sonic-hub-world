/**
 * world.js
 * Builds all static scenery for the Saturn-style Sonic Jam world:
 * terrain island, surrounding cliff columns, portal buildings, trees,
 * and the central pillar.
 *
 * Exports:
 *   ISLAND_R          — island radius (used by player.js for clamping)
 *   PORTAL_DEFS       — portal definitions (used by hud.js)
 *   islandHeight(x,z) — terrain height at any (x,z) position
 *   buildWorld(scene)  — populates the scene with all world geometry
 */

import * as THREE from 'three';
import { makeGrassTexture, makeRockTexture, makeSnowTexture } from './textures.js';

// ─── constants ────────────────────────────────────────────────────────────────

export const ISLAND_R     = 38;
const TERRAIN_SIZE = 100;
const TERRAIN_SEGS = 18;   // Low-poly Saturn chunky terrain

// ─── height function ─────────────────────────────────────────────────────────

export function islandHeight(x, z) {
    const dist    = Math.sqrt(x * x + z * z);
    const falloff = Math.max(0, 1 - (dist / ISLAND_R) ** 2);
    const h = Math.sin(x * 0.18) * Math.cos(z * 0.18) * 2.2
            + Math.sin(x * 0.35 + 1.1) * Math.cos(z * 0.28) * 1.1
            + Math.sin(x * 0.07 - 0.5) * Math.cos(z * 0.09 + 0.8) * 1.5;
    return h * falloff * falloff;
}

// ─── terrain ─────────────────────────────────────────────────────────────────

function buildTerrain(scene) {
    const geo = new THREE.PlaneGeometry(TERRAIN_SIZE, TERRAIN_SIZE, TERRAIN_SEGS, TERRAIN_SEGS);
    geo.rotateX(-Math.PI / 2);

    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
        pos.setY(i, islandHeight(pos.getX(i), pos.getZ(i)));
    }
    geo.computeVertexNormals();

    // Height-based brightness tint via vertex colours
    const colors = [];
    for (let i = 0; i < pos.count; i++) {
        const v = 0.55 + Math.min(1, Math.max(0, (pos.getY(i) + 1) / 3)) * 0.45;
        colors.push(v, v, v);
    }
    geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

    const mesh = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({
        map: makeGrassTexture(),
        vertexColors: true,
    }));
    mesh.receiveShadow = true;
    scene.add(mesh);
}

// ─── cliff columns ───────────────────────────────────────────────────────────
//
// Sonic Jam's world boundary is a ring of tall rocky cliff columns — vertical
// cylinders packed tightly together with no gaps, varying heights and radii,
// like Green Hill Zone cliff edges seen from inside.

function buildCliffs(scene) {
    const rockMat = new THREE.MeshLambertMaterial({ map: makeRockTexture() });
    const snowMat = new THREE.MeshLambertMaterial({ map: makeSnowTexture() });

    // Seeded random for reproducible variation
    let seed = 77;
    const rand = () => {
        seed = (seed * 1664525 + 1013904223) & 0xffffffff;
        return (seed >>> 0) / 0xffffffff;
    };

    const RING_R      = 44;    // radius of the cliff ring
    const N_COLS      = 110;   // total columns — tight enough to leave no gaps
    const BASE_Y      = -2;    // columns start below ground level
    const MIN_H       = 14;
    const MAX_H       = 38;
    const MIN_R       = 2.2;
    const MAX_R       = 4.0;
    const SNOW_THRESH = 22;    // columns taller than this get a snow cap

    for (let i = 0; i < N_COLS; i++) {
        const angle = (i / N_COLS) * Math.PI * 2;
        // Slight radial jitter so the wall looks organic
        const r    = RING_R + (rand() - 0.5) * 4;
        const cx   = Math.sin(angle) * r;
        const cz   = Math.cos(angle) * r;
        const colH = MIN_H + rand() * (MAX_H - MIN_H);
        const colR = MIN_R + rand() * (MAX_R - MIN_R);

        const group = new THREE.Group();
        group.position.set(cx, BASE_Y, cz);

        // Main rocky column body
        const segs = Math.round(5 + rand() * 3);   // 5–8 segments for chunky facets
        const body = new THREE.Mesh(
            new THREE.CylinderGeometry(colR * 0.75, colR, colH, segs, 1),
            rockMat,
        );
        body.position.y    = colH / 2;
        body.castShadow    = true;
        body.receiveShadow = true;
        group.add(body);

        // Snow cap on tall columns
        if (colH > SNOW_THRESH) {
            const capH = 2.5 + rand() * 2.5;
            const cap = new THREE.Mesh(
                new THREE.ConeGeometry(colR * 0.85, capH, segs),
                snowMat,
            );
            cap.position.y = colH + capH / 2 - 0.3;
            cap.castShadow = true;
            group.add(cap);
        }

        scene.add(group);
    }

    // Flat dark ground disk behind cliffs (hides the void beyond)
    const disk = new THREE.Mesh(
        new THREE.CircleGeometry(300, 64),
        new THREE.MeshLambertMaterial({ color: 0x1a4a10 }),
    );
    disk.rotation.x = -Math.PI / 2;
    disk.position.y = -2.5;
    scene.add(disk);
}

// ─── portals ─────────────────────────────────────────────────────────────────

export const PORTAL_DEFS = [
    { label: 'SONIC 1',   color: 0x4444cc, x: -18, z: -12 },
    { label: 'SONIC 2',   color: 0xcc8800, x:  18, z: -12 },
    { label: 'SONIC 3&K', color: 0x22aa44, x: -18, z:  14 },
    { label: 'SONIC CD',  color: 0xaa2222, x:  18, z:  14 },
];

function makeLabelSprite(text) {
    const cv = document.createElement('canvas');
    cv.width = 256;
    cv.height = 64;
    const ctx = cv.getContext('2d');
    ctx.clearRect(0, 0, 256, 64);
    ctx.font        = 'bold 22px Arial';
    ctx.fillStyle   = '#fff';
    ctx.textAlign   = 'center';
    ctx.shadowColor = '#000';
    ctx.shadowBlur  = 6;
    ctx.fillText(text, 128, 44);

    const spr = new THREE.Sprite(
        new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(cv), transparent: true }),
    );
    spr.scale.set(4, 1, 1);
    spr.position.y = 7;
    return spr;
}

function buildPortals(scene) {
    PORTAL_DEFS.forEach(p => {
        const g = new THREE.Group();

        const add = (geo, color, y = 0) => {
            const m = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ color }));
            m.position.y  = y;
            m.castShadow  = true;
            g.add(m);
        };

        add(new THREE.CylinderGeometry(1.8, 2.2, 0.5, 7), 0xddddcc, 0);
        add(new THREE.CylinderGeometry(1.2, 1.5, 3.5, 7), p.color, 2.25);
        add(new THREE.ConeGeometry(1.6, 1.8, 7), 0xcc2222, 4.9);

        const door = new THREE.Mesh(
            new THREE.BoxGeometry(0.8, 1.4, 0.2),
            new THREE.MeshLambertMaterial({ color: 0x222244 }),
        );
        door.position.set(0, 0.95, 1.51);
        g.add(door);

        g.add(makeLabelSprite(p.label));
        g.position.set(p.x, islandHeight(p.x, p.z), p.z);
        scene.add(g);
    });
}

// ─── trees ───────────────────────────────────────────────────────────────────

const TREE_POSITIONS = [
    [-10, -20], [10, -22], [-22,  0], [22,  2],
    [-14,   8], [14,  10], [  0,-28], [-6, 22],
    [  6,  24], [-28,-10], [ 28, -8], [ 5,-10],
    [ -5,  12], [ 20,-20], [-20, 18],
];

function buildTrees(scene) {
    TREE_POSITIONS.forEach(([x, z]) => {
        const g = new THREE.Group();

        const trunk = new THREE.Mesh(
            new THREE.CylinderGeometry(0.12, 0.18, 1.2, 5),
            new THREE.MeshLambertMaterial({ color: 0x7a4e2d }),
        );
        g.add(trunk);

        const top = new THREE.Mesh(
            new THREE.ConeGeometry(0.7, 1.8, 5),
            new THREE.MeshLambertMaterial({ color: 0x228833 }),
        );
        top.position.y  = 1.5;
        top.castShadow  = true;
        g.add(top);

        g.position.set(x, islandHeight(x, z), z);
        scene.add(g);
    });
}

// ─── central pillar ──────────────────────────────────────────────────────────

function buildPillar(scene) {
    const pillar = new THREE.Mesh(
        new THREE.CylinderGeometry(0.4, 0.6, 6, 6),
        new THREE.MeshLambertMaterial({ color: 0xddaa44 }),
    );
    pillar.position.set(0, islandHeight(0, 0) + 3, 0);
    pillar.castShadow = true;
    scene.add(pillar);
}

// ─── public entry point ──────────────────────────────────────────────────────

export function buildWorld(scene) {
    buildTerrain(scene);
    buildCliffs(scene);
    buildPortals(scene);
    buildTrees(scene);
    buildPillar(scene);
}
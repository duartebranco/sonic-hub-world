/**
 * world.js
 * Builds all static scenery: terrain island, surrounding mountains,
 * trees, portal buildings, and the central pillar.
 * Exports: { islandHeight, portals }
 */

import * as THREE from 'three';
import { makeGrassTexture, makeRockTexture, makeSnowTexture } from './textures.js';

const ISLAND_R    = 38;
const TERRAIN_SIZE = 100;
const TERRAIN_SEGS = 80;

// ─── height function (shared with player.js) ─────────────────────────────────

export function islandHeight(x, z) {
    const dist    = Math.sqrt(x * x + z * z);
    const falloff = Math.max(0, 1 - (dist / ISLAND_R) ** 2);
    const h =
        Math.sin(x * 0.18) * Math.cos(z * 0.18) * 2.2 +
        Math.sin(x * 0.35 + 1.1) * Math.cos(z * 0.28) * 1.1 +
        Math.sin(x * 0.07 - 0.5) * Math.cos(z * 0.09 + 0.8) * 1.5;
    return h * falloff * falloff;
}

// ─── terrain ─────────────────────────────────────────────────────────────────

function buildTerrain(scene) {
    const grassTex = makeGrassTexture();

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
        const t = Math.min(1, Math.max(0, (pos.getY(i) + 1) / 3));
        const v = 0.55 + t * 0.45;
        colors.push(v, v, v);
    }
    geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

    const mat  = new THREE.MeshLambertMaterial({ map: grassTex, vertexColors: true });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.receiveShadow = true;
    scene.add(mesh);
}

// ─── mountains ───────────────────────────────────────────────────────────────
//
//  A ring of mountains replaces the ocean plane.
//  Each mountain: lower body = rock texture, peak cap = snow texture.

function buildMountains(scene) {
    const rockTex  = makeRockTexture();
    const snowTex  = makeSnowTexture();

    const rockMat = new THREE.MeshLambertMaterial({ map: rockTex });
    const snowMat = new THREE.MeshLambertMaterial({ map: snowTex });

    // Mountain placement — varied angles, distances and sizes around the hub
    const mountainDefs = [
        // angle (rad), dist from center, base radius, peak height, snowRatio
        [0.0,           58,  14, 32, 0.28],
        [0.55,          62,  11, 26, 0.30],
        [1.1,           60,  13, 38, 0.25],
        [1.65,          56,  15, 30, 0.32],
        [2.2,           63,  10, 22, 0.35],
        [2.75,          58,  12, 34, 0.27],
        [3.3,           61,  14, 28, 0.30],
        [3.85,          57,  11, 36, 0.24],
        [4.4,           64,  13, 25, 0.33],
        [4.95,          59,  10, 30, 0.29],
        [5.5,           62,  15, 32, 0.26],
        [6.0,           56,  12, 27, 0.31],
        // extra fill peaks between primary ones
        [0.28,          70,   8, 18, 0.38],
        [0.82,          68,   9, 20, 0.36],
        [1.38,          72,   7, 16, 0.40],
        [1.92,          69,   8, 22, 0.34],
        [2.48,          71,   9, 19, 0.37],
        [3.04,          67,   7, 17, 0.39],
        [3.60,          73,   8, 21, 0.35],
        [4.16,          70,   9, 18, 0.38],
        [4.72,          68,   7, 23, 0.33],
        [5.28,          72,   8, 20, 0.36],
        [5.84,          66,   9, 16, 0.40],
    ];

    mountainDefs.forEach(([angle, dist, baseR, height, snowRatio]) => {
        const cx = Math.sin(angle) * dist;
        const cz = Math.cos(angle) * dist;

        const group = new THREE.Group();
        group.position.set(cx, -1, cz);   // sink base slightly below sea level

        // Rocky lower cone
        const rockHeight  = height * (1 - snowRatio);
        const rockGeo     = new THREE.ConeGeometry(baseR, rockHeight, 8, 1);
        const rockMesh    = new THREE.Mesh(rockGeo, rockMat);
        rockMesh.position.y = rockHeight / 2;
        rockMesh.castShadow    = true;
        rockMesh.receiveShadow = true;
        group.add(rockMesh);

        // Snow peak — sits on top of rock section
        const snowBase   = baseR * snowRatio * 1.6;
        const snowHeight = height * snowRatio * 1.4;
        const snowGeo    = new THREE.ConeGeometry(snowBase, snowHeight, 8, 1);
        const snowMesh   = new THREE.Mesh(snowGeo, snowMat);
        snowMesh.position.y = rockHeight + snowHeight / 2;
        snowMesh.castShadow = true;
        group.add(snowMesh);

        scene.add(group);
    });

    // Flat dark ground disk behind mountains (hides the void)
    const groundDisk = new THREE.Mesh(
        new THREE.CircleGeometry(200, 48),
        new THREE.MeshLambertMaterial({ color: 0x2a5a1a })
    );
    groundDisk.rotation.x = -Math.PI / 2;
    groundDisk.position.y = -1.5;
    scene.add(groundDisk);
}

// ─── portals ─────────────────────────────────────────────────────────────────

export const PORTAL_DEFS = [
    { label: 'SONIC 1',   color: 0x4444cc, x: -18, z: -12 },
    { label: 'SONIC 2',   color: 0xcc8800, x:  18, z: -12 },
    { label: 'SONIC 3&K', color: 0x22aa44, x: -18, z:  14 },
    { label: 'SONIC CD',  color: 0xaa2222, x:  18, z:  14 },
];

function makeLabelSprite(label) {
    const cv  = document.createElement('canvas');
    cv.width  = 256; cv.height = 64;
    const ctx = cv.getContext('2d');
    ctx.clearRect(0, 0, 256, 64);
    ctx.font        = 'bold 22px Arial';
    ctx.fillStyle   = '#ffffff';
    ctx.textAlign   = 'center';
    ctx.shadowColor = '#000000';
    ctx.shadowBlur  = 6;
    ctx.fillText(label, 128, 44);
    const tex = new THREE.CanvasTexture(cv);
    const mat = new THREE.SpriteMaterial({ map: tex, transparent: true });
    const spr = new THREE.Sprite(mat);
    spr.scale.set(4, 1, 1);
    spr.position.y = 7;
    return spr;
}

function makePortal(color, label) {
    const g = new THREE.Group();

    const add = (geo, mat, y = 0) => {
        const m = new THREE.Mesh(geo, mat);
        m.position.y  = y;
        m.castShadow  = true;
        g.add(m);
        return m;
    };

    add(new THREE.CylinderGeometry(1.8, 2.2, 0.5, 12),
        new THREE.MeshLambertMaterial({ color: 0xddddcc }), 0);
    add(new THREE.CylinderGeometry(1.2, 1.5, 3.5, 12),
        new THREE.MeshLambertMaterial({ color }), 2.25);
    add(new THREE.ConeGeometry(1.6, 1.8, 12),
        new THREE.MeshLambertMaterial({ color: 0xcc2222 }), 4.9);

    const door = new THREE.Mesh(
        new THREE.BoxGeometry(0.8, 1.4, 0.2),
        new THREE.MeshLambertMaterial({ color: 0x222244 })
    );
    door.position.set(0, 0.95, 1.51);
    g.add(door);

    g.add(makeLabelSprite(label));
    return g;
}

function buildPortals(scene) {
    const group = new THREE.Group();
    PORTAL_DEFS.forEach(p => {
        const portal = makePortal(p.color, p.label);
        portal.position.set(p.x, islandHeight(p.x, p.z), p.z);
        group.add(portal);
    });
    scene.add(group);
}

// ─── trees ───────────────────────────────────────────────────────────────────

function makeTree() {
    const g = new THREE.Group();
    const trunk = new THREE.Mesh(
        new THREE.CylinderGeometry(0.12, 0.18, 1.2, 6),
        new THREE.MeshLambertMaterial({ color: 0x7a4e2d })
    );
    g.add(trunk);
    const top = new THREE.Mesh(
        new THREE.ConeGeometry(0.7, 1.8, 7),
        new THREE.MeshLambertMaterial({ color: 0x228833 })
    );
    top.position.y = 1.5;
    top.castShadow = true;
    g.add(top);
    return g;
}

function buildTrees(scene) {
    const positions = [
        [-10,-20],[10,-22],[-22,0],[22,2],
        [-14,8],[14,10],[0,-28],[-6,22],
        [6,24],[-28,-10],[28,-8],[5,-10],
        [-5,12],[20,-20],[-20,18],
    ];
    positions.forEach(([x, z]) => {
        const t = makeTree();
        t.position.set(x, islandHeight(x, z), z);
        scene.add(t);
    });
}

// ─── central pillar ──────────────────────────────────────────────────────────

function buildPillar(scene) {
    const pillar = new THREE.Mesh(
        new THREE.CylinderGeometry(0.4, 0.6, 6, 10),
        new THREE.MeshLambertMaterial({ color: 0xddaa44 })
    );
    pillar.position.set(0, islandHeight(0, 0) + 3, 0);
    pillar.castShadow = true;
    scene.add(pillar);
}

// ─── public entry point ──────────────────────────────────────────────────────

export function buildWorld(scene) {
    buildTerrain(scene);
    buildMountains(scene);
    buildPortals(scene);
    buildTrees(scene);
    buildPillar(scene);
}

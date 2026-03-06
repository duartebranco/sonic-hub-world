import * as THREE from 'three';

// ─────────────────────────────────────────────────────────
//  GROUND HEIGHT  (single source of truth — imported by
//  everything that needs to sit on the terrain)
// ─────────────────────────────────────────────────────────
export function groundY(x, z) {
  return (
    Math.sin(x * 0.09) * 2.2 +
    Math.sin(z * 0.08) * 2.0 +
    Math.sin((x + z) * 0.055) * 1.4 +
    Math.sin(x * 0.22) * 0.5 +
    Math.sin(z * 0.26) * 0.4 +
    Math.sin((x - z) * 0.13) * 0.35
  );
}

// ─────────────────────────────────────────────────────────
//  TERRAIN MESH  (vertex-coloured, dual-tone checker)
// ─────────────────────────────────────────────────────────
export function buildTerrain(scene) {
  const geo = new THREE.PlaneGeometry(280, 280, 160, 160);
  geo.rotateX(-Math.PI / 2);
  const pos  = geo.attributes.position;
  const cols = new Float32Array(pos.count * 3);

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const y = groundY(x, z);
    pos.setY(i, y);

    // Large-square checker tint — two shades of green
    const cx      = Math.floor(x / 4);
    const cz      = Math.floor(z / 4);
    const even    = (cx + cz) % 2 === 0;
    const t       = Math.max(0, Math.min(1, (y + 3) / 7));

    if (even) {
      cols[i * 3]     = 0.22 + t * 0.18;
      cols[i * 3 + 1] = 0.62 + t * 0.22;
      cols[i * 3 + 2] = 0.14 + t * 0.08;
    } else {
      cols[i * 3]     = 0.16 + t * 0.14;
      cols[i * 3 + 1] = 0.52 + t * 0.18;
      cols[i * 3 + 2] = 0.10 + t * 0.06;
    }
  }

  geo.setAttribute('color', new THREE.BufferAttribute(cols, 3));
  geo.computeVertexNormals();

  const mat  = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness:    0.88,
    metalness:    0.0,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.receiveShadow = true;
  scene.add(mesh);
}

// ─────────────────────────────────────────────────────────
//  CHECKERBOARD FLOOR PATH  (teal + cream — iconic GHZ)
// ─────────────────────────────────────────────────────────
export function buildPath(scene) {
  const matA = new THREE.MeshStandardMaterial({ color: 0xfff9e6, roughness: 0.55 });
  const matB = new THREE.MeshStandardMaterial({ color: 0x26c6da, roughness: 0.55 });
  const S    = 1.4;
  const geo  = new THREE.BoxGeometry(S, 0.14, S);
  const COLS = 5;
  const ROWS = 36;

  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const x   = (c - Math.floor(COLS / 2)) * S;
      const z   = r * S - (ROWS * S) / 2 + S;
      const y   = groundY(x, z) + 0.03;
      const mat = (r + c) % 2 === 0 ? matA : matB;
      const m   = new THREE.Mesh(geo, mat);
      m.position.set(x, y, z);
      m.receiveShadow = true;
      scene.add(m);
    }
  }
}
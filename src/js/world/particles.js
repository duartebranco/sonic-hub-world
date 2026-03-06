import * as THREE from 'three';

// ─────────────────────────────────────────────────────────
//  AMBIENT GOLD SPARKLE PARTICLES
//  Small golden dots that slowly drift upward, giving the
//  GHZ world a magical, alive feel.
//
//  Returns { pts, geo } so the game loop can animate them.
// ─────────────────────────────────────────────────────────

const COUNT = 400;

export function buildAmbientParticles(scene) {
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(COUNT * 3);

  for (let i = 0; i < COUNT; i++) {
    pos[i * 3]     = (Math.random() - 0.5) * 60;   // x: spread across hub
    pos[i * 3 + 1] = Math.random() * 14;            // y: 0 → 14
    pos[i * 3 + 2] = (Math.random() - 0.5) * 60;   // z: spread across hub
  }

  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));

  const mat = new THREE.PointsMaterial({
    color:       0xffd54f,
    size:        0.07,
    transparent: true,
    opacity:     0.55,
    depthWrite:  false,
  });

  const pts = new THREE.Points(geo, mat);
  scene.add(pts);

  return { pts, geo };
}
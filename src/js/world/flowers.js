import * as THREE from 'three';
import { groundY } from './terrain.js';

const STEM_MAT   = new THREE.MeshStandardMaterial({ color: 0x66bb6a });
const CENTRE_MAT = new THREE.MeshStandardMaterial({
  color: 0xfff176, roughness: 0.55,
  emissive: 0xffd600, emissiveIntensity: 0.2,
});
const PETAL_COLORS = [0xff4081, 0xce93d8, 0xffd54f, 0xff5252, 0x80d8ff, 0xf48fb1];

function makeFlower(scene, x, z) {
  const ty  = groundY(x, z);
  const rnd = (a, b) => Math.random() * (b - a) + a;

  const g = new THREE.Group();
  g.position.set(x, ty + 0.01, z);
  g.rotation.y = rnd(0, Math.PI * 2);

  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.04, 0.45, 6), STEM_MAT);
  stem.position.y = 0.225;
  g.add(stem);

  const head = new THREE.Group();
  head.position.y = 0.5;

  const col  = PETAL_COLORS[Math.floor(Math.random() * PETAL_COLORS.length)];
  const pMat = new THREE.MeshStandardMaterial({ color: col, roughness: 0.65 });

  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const p = new THREE.Mesh(new THREE.SphereGeometry(0.09, 6, 5), pMat);
    p.position.set(Math.cos(a) * 0.14, 0, Math.sin(a) * 0.14);
    head.add(p);
  }

  head.add(new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 6), CENTRE_MAT));
  g.add(head);
  scene.add(g);

  return { head };
}

export function buildFlowers(scene) {
  const spinners = [];
  const COUNT    = 100;

  for (let i = 0; i < COUNT; i++) {
    const angle = Math.random() * Math.PI * 2;
    const r     = Math.random() * 22 + 2;
    spinners.push(makeFlower(scene, Math.cos(angle) * r, Math.sin(angle) * r));
  }

  return spinners;
}

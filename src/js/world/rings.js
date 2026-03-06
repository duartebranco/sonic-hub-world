import * as THREE from 'three';
import { groundY } from './terrain.js';

const RING_GEO = new THREE.TorusGeometry(0.3, 0.065, 14, 32);
const RING_MAT = new THREE.MeshStandardMaterial({
  color:             0xffd54f,
  emissive:          0xff8f00,
  emissiveIntensity: 0.5,
  roughness:         0.15,
  metalness:         0.75,
});

const RING_SPOTS = [
  [0,-6],[0,-3],[0,0],[0,3],[0,6],
  [1.4,-1.5],[-1.4,-1.5],[1.4,1.5],[-1.4,1.5],
  [7,8],[8,8],[9,8], [-7,8],[-8,8],
  [5,-12],[-5,-12],[0,-14],
  [10,-4],[-10,-4],
  [4,17],[0,17],[-4,17],
];

export function buildRings(scene) {
  return RING_SPOTS.map(([x, z]) => {
    const mesh = new THREE.Mesh(RING_GEO, RING_MAT.clone());
    mesh.position.set(x, groundY(x, z) + 1.0, z);
    mesh.castShadow = true;
    scene.add(mesh);
    return { mesh, collected: false, phase: Math.random() * Math.PI * 2 };
  });
}

export function buildSparkleSystem(scene) {
  const sparkles = [];

  function spawn(pos) {
    const N   = 14;
    const geo = new THREE.BufferGeometry();
    const v   = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      v[i * 3]     = pos.x;
      v[i * 3 + 1] = pos.y;
      v[i * 3 + 2] = pos.z;
    }
    geo.setAttribute('position', new THREE.BufferAttribute(v, 3));

    const mat = new THREE.PointsMaterial({
      color:       0xffd54f,
      size:        0.22,
      transparent: true,
      opacity:     1,
      depthWrite:  false,
    });

    const pts  = new THREE.Points(geo, mat);
    scene.add(pts);

    const dirs = Array.from({ length: N }, () =>
      new THREE.Vector3(
        Math.random() * 2 - 1,
        Math.random() * 1.1 + 0.3,
        Math.random() * 2 - 1
      ).normalize().multiplyScalar(Math.random() * 2 + 2)
    );

    sparkles.push({ pts, geo, dirs, life: 1.0 });
  }

  function update(dt) {
    for (let i = sparkles.length - 1; i >= 0; i--) {
      const s = sparkles[i];
      s.life -= dt * 2.2;
      if (s.life <= 0) {
        scene.remove(s.pts);
        sparkles.splice(i, 1);
        continue;
      }
      const p = s.geo.attributes.position;
      for (let j = 0; j < s.dirs.length; j++) {
        p.setXYZ(
          j,
          p.getX(j) + s.dirs[j].x * dt,
          p.getY(j) + s.dirs[j].y * dt,
          p.getZ(j) + s.dirs[j].z * dt,
        );
      }
      p.needsUpdate          = true;
      s.pts.material.opacity = Math.max(0, s.life);
    }
  }

  return { spawn, update };
}

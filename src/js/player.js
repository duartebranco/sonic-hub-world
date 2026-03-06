import * as THREE from 'three';
import { groundY } from './world/index.js';

// ─────────────────────────────────────────────────────────
//  CONSTANTS
// ─────────────────────────────────────────────────────────
const WALK_SPD  = 4.8;
const RUN_SPD   = 10.5;
const TURN_SPD  = 5.0;
const WALK_ANIM = 1.9;   // keyframes/sec while walking
const RUN_ANIM  = 4.2;   // keyframes/sec while running

const JUMP_V  = 9.5;
const GRAVITY = -24;

// ─────────────────────────────────────────────────────────
//  HELPERS
// ─────────────────────────────────────────────────────────
const smooth = t => t * t * (3 - 2 * t);

function lerpAngle(a, b, t) {
  let d = b - a;
  while (d >  Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return a + d * t;
}

// ─────────────────────────────────────────────────────────
//  PLAYER CLASS
// ─────────────────────────────────────────────────────────
export class Player {
  constructor(scene) {
    this.scene = scene;

    // World state
    this.pos       = new THREE.Vector3(0, 0, 0);
    this.yaw       = 0;   // direction of travel (radians)
    this.speed     = 0;
    this.isMoving  = false;
    this.isRunning = false;

    // Jump state
    this._jumpVel = 0;
    this._jumpY   = 0;
    this._inAir   = false;

    // Model + bone refs (populated after async load)
    this.model    = null;
    this._bones   = {};   // boneName -> THREE.Bone
    this._initRot = {};   // boneName -> { x, y, z }  (rest pose)

    // Animation
    this._walkKFs = [];
    this._walkT   = 0;

    // Input
    this._keys       = {};
    this._jumpQueued = false;

    this._bindInput();
  }

  // ─────────────────────────────────────────────────────
  //  INPUT
  // ─────────────────────────────────────────────────────
  _bindInput() {
    window.addEventListener('keydown', e => {
      this._keys[e.code] = true;
      if (e.code === 'Space' && !e.repeat) this._jumpQueued = true;
    });
    window.addEventListener('keyup', e => {
      this._keys[e.code] = false;
    });
  }

  // ─────────────────────────────────────────────────────
  //  SETUP  (called by main.js after assets are loaded)
  // ─────────────────────────────────────────────────────
  setModel(gltfScene) {
    this.model = gltfScene;

    this.model.traverse(n => {
      if (n.isMesh) n.castShadow = true;
      if (n.isBone) {
        this._initRot[n.name] = { x: n.rotation.x, y: n.rotation.y, z: n.rotation.z };
        this._bones[n.name]   = n;
      }
    });

    // Scale so Sonic looks right relative to world props
    this.model.scale.setScalar(0.55);

    const gy = groundY(0, 0);
    this.pos.set(0, gy, 0);
    this._jumpY = gy;
    this.model.position.copy(this.pos);
    this.scene.add(this.model);
  }

  setWalkKeyframes(kfs) {
    this._walkKFs = kfs;
  }

  // ─────────────────────────────────────────────────────
  //  ANIMATION HELPERS
  // ─────────────────────────────────────────────────────
  _applyKFInterp(t) {
    const kfs = this._walkKFs;
    if (!this.model || kfs.length < 2) return;

    const n  = kfs.length;
    const fi = Math.floor(t) % n;
    const ni = (fi + 1) % n;
    const a  = smooth(t - Math.floor(t));
    const A  = kfs[fi];
    const B  = kfs[ni];

    for (const name in this._bones) {
      const bone = this._bones[name];
      const rA   = A.rotations[name];
      const rB   = B.rotations[name];
      if (!rA || !rB) continue;
      bone.rotation.x = rA.x + (rB.x - rA.x) * a;
      bone.rotation.y = rA.y + (rB.y - rA.y) * a;
      bone.rotation.z = rA.z + (rB.z - rA.z) * a;
    }
  }

  _restPose() {
    for (const name in this._bones) {
      const b = this._bones[name];
      const r = this._initRot[name];
      if (r) b.rotation.set(r.x, r.y, r.z);
    }
  }

  // ─────────────────────────────────────────────────────
  //  UPDATE  (call every frame)
  //
  //  camYaw is ThirdPersonCamera.yaw.
  //
  //  The camera orbits at:
  //  camPos = target + ( sin(camYaw), _, cos(camYaw) ) * dist
  //
  //  So at camYaw = 0 the camera sits at +Z relative to the
  //  player and looks toward -Z.
  //
  //  Camera FORWARD (from camera toward player, i.e. "into
  //  screen") is therefore:
  //    cf = ( -sin(camYaw), 0, -cos(camYaw) )
  //
  //  Camera RIGHT (screen-right) is 90° CW from cf around Y:
  //    cr = ( cos(camYaw), 0, -sin(camYaw) )
  //
  //  W → move along cf  (into screen, away from camera)
  //  S → move along -cf (toward camera)
  //  D → move along cr  (screen-right)
  //  A → move along -cr (screen-left)
  //
  //  The sonic.glb model faces +X in local space (rotation.y=0).
  //  In Three.js, rotation.y=θ rotates local +X to world (cos θ, 0, -sin θ).
  //  So to make the model face moveDir = (dx, 0, dz):
  //    cos θ = dx  and  -sin θ = dz
  //    → θ = atan2(-dz, dx)
  // ─────────────────────────────────────────────────────
  update(dt, camYaw) {
    if (!this.model) return;

    const k     = this._keys;
    const fwd   = k['KeyW']     || k['ArrowUp'];
    const back  = k['KeyS']     || k['ArrowDown'];
    const left  = k['KeyA']     || k['ArrowLeft'];
    const right = k['KeyD']     || k['ArrowRight'];
    const run   = k['ShiftLeft'] || k['ShiftRight'];

    const mx = (right ? 1 : 0) - (left ? 1 : 0);
    const mz = (fwd   ? 1 : 0) - (back ? 1 : 0);

    this.isMoving  = mx !== 0 || mz !== 0;
    this.isRunning = this.isMoving && run;

    // Speed ramp
    const tgtSpd = this.isMoving ? (this.isRunning ? RUN_SPD : WALK_SPD) : 0;
    this.speed  += (tgtSpd - this.speed) * Math.min(1, dt * 9);

    // ── World-space movement direction ──────────────────
    const moveDir = new THREE.Vector3();

    if (this.isMoving) {
      // Camera forward = direction from camera TO player = into screen
      const cf = new THREE.Vector3(-Math.sin(camYaw), 0, -Math.cos(camYaw));
      // Camera right  = screen right
      const cr = new THREE.Vector3( Math.cos(camYaw), 0, -Math.sin(camYaw));

      moveDir
        .addScaledVector(cf, mz)   // W/S
        .addScaledVector(cr, mx)   // A/D
        .normalize();

      // Model faces +X in local space.
      // rotation.y = atan2(-dz, dx) makes local +X align with moveDir.
      const travelYaw = Math.atan2(moveDir.x, moveDir.z) + Math.PI * 0.5;
      this.yaw = lerpAngle(this.yaw, travelYaw, Math.min(1, dt * TURN_SPD));
    }

    this.pos.x += moveDir.x * this.speed * dt;
    this.pos.z += moveDir.z * this.speed * dt;

    // ── Jump / gravity ───────────────────────────────────
    const curGround   = groundY(this.pos.x, this.pos.z);
    const doJump      = this._jumpQueued;
    this._jumpQueued  = false;

    if (!this._inAir) {
      this.pos.y  = curGround;
      this._jumpY = curGround;
      if (doJump) {
        this._inAir   = true;
        this._jumpVel = JUMP_V;
      }
    } else {
      this._jumpVel += GRAVITY * dt;
      this._jumpY   += this._jumpVel * dt;
      this.pos.y     = this._jumpY;
      if (this._jumpY <= curGround) {
        this.pos.y    = curGround;
        this._jumpY   = curGround;
        this._jumpVel = 0;
        this._inAir   = false;
      }
    }

    // ── Apply position + rotation to model ──────────────
    this.model.position.copy(this.pos);
    this.model.rotation.y = this.yaw;

    // ── Animation ───────────────────────────────────────
    if (this.isMoving && this._walkKFs.length >= 2) {
      const aspd  = this.isRunning ? RUN_ANIM : WALK_ANIM;
      this._walkT += dt * aspd;
      this._applyKFInterp(this._walkT);
    } else {
      this._restPose();
      this._walkT   = 0;
      const now     = performance.now() / 1000;

      // Cute idle sway
      const root = this._bones['GLTF_created_0_rootJoint'];
      if (root) {
        root.rotation.z = Math.sin(now * 1.3)  * 0.022;
        root.rotation.x = Math.sin(now * 0.85) * 0.016;
      }

      // Head look-around
      const head = this._bones['Bone001_23'];
      if (head) {
        head.rotation.y = Math.sin(now * 0.55) * 0.14;
        head.rotation.x = -0.175 + Math.sin(now * 0.38) * 0.04;
      }
    }

    // Jump lean forward
    if (this._inAir) {
      const root = this._bones['GLTF_created_0_rootJoint'];
      if (root) root.rotation.x += Math.max(0, this._jumpVel / JUMP_V) * -0.28;
    }
  }

  // Public getters used by main.js
  get inAir()   { return this._inAir;   }
  get jumpVel() { return this._jumpVel; }
}

import * as THREE from "three";
import { groundY } from "./world/index.js";

// Physics
const ACCEL = 28.0; // acceleration along input direction
const DECEL = 10.0; // friction rate when no input (multiplier per sec)
const BRAKE = 38.0; // decel rate when pressing opposite direction
const TOP_SPEED = 28.0; // max horizontal speed
const TURN_SPEED = 8.0; // yaw snap rate
const GRAVITY = -28.0;
const JUMP_BASE = 8.0; // vertical jump velocity at zero ground speed
const JUMP_BOOST = 5.5; // extra vertical added at full top speed
const SLOPE_ACCEL = 9.0; // how hard slope gravity pushes downhill
const SLOPE_SAMPLE = 0.5; // finite-difference step for gradient
const SLOPE_IDLE_THRESHOLD = 0.18; // slopes below this don't drift when standing still

// Spin dash
const SPIN_HOLD_THRESHOLD = 0.18; // seconds of hold before charging begins
const SPIN_CHARGE_RATE = 1 / 1.2; // full charge in 1.2 s
const SPIN_BOOST_MIN = 22.0; // launch speed at zero charge
const SPIN_BOOST_MAX = 52.0; // launch speed at full charge
const SPIN_TOP_SPEED = 54.0; // speed cap while spin is active
const SPIN_DURATION = 1.0; // seconds before spin state expires
const SPIN_ROLL_CHARGE_MIN = 2.0; // roll speed (rad/s) at start of charge
const SPIN_ROLL_CHARGE_MAX = 16.0; // extra roll speed added at full charge
const SPIN_ROLL_LAUNCH = 24.0; // roll speed after launch

// Animation
const ANIM_WALK = 1.9;
const ANIM_RUN = 5.0;
const RUN_THRESHOLD = 0.65; // fraction of TOP_SPEED where run anim kicks in

const smooth = (t) => t * t * (3 - 2 * t);

function lerpAngle(a, b, t) {
    let d = b - a;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    return a + d * t;
}

export class Player {
    constructor(scene) {
        this.scene = scene;

        this.pos = new THREE.Vector3();
        this.yaw = 0;
        this.speed = 0;

        this._vel = new THREE.Vector3();
        this._jumpVel = 0;
        this._groundY = 0;
        this._inAir = false;
        this._jumpQueued = false;

        this._spinHoldTime = 0;
        this._spinCharging = false;
        this._spinCharge = 0; // 0–1
        this._spinActive = false;
        this._spinActiveTimer = 0;
        this._spinRoll = 0;

        this._spinBall = null;
        this._spinRings = [];
        this._buildSpinBall();

        this.model = null;
        this._bones = {};
        this._initRot = {};
        this._idleKFs = [];
        this._walkKFs = [];
        this._runKFs = [];
        this._walkT = 0;
        this._runT = 0;

        this._keys = {};
        this._bindInput();
    }

    _bindInput() {
        window.addEventListener("keydown", (e) => {
            this._keys[e.code] = true;
            if (e.code === "Space" && !e.repeat) this._jumpQueued = true;
        });
        window.addEventListener("keyup", (e) => {
            this._keys[e.code] = false;
        });
    }

    _buildSpinBall() {
        const group = new THREE.Group();

        // solid sonic-blue core
        group.add(new THREE.Mesh(
            new THREE.SphereGeometry(0.42, 14, 10),
            new THREE.MeshStandardMaterial({
                color: 0x1565c0,
                emissive: 0x002299,
                emissiveIntensity: 0.35,
                metalness: 0.15,
                roughness: 0.35,
            })
        ));

        // wireframe overlay — the "white lines on the ball" effect
        group.add(new THREE.Mesh(
            new THREE.SphereGeometry(0.435, 10, 7),
            new THREE.MeshBasicMaterial({
                color: 0x99ddff,
                wireframe: true,
                transparent: true,
                opacity: 0.55,
            })
        ));

        // 3 energy rings orbiting the ball
        const ringGeo = new THREE.TorusGeometry(0.58, 0.022, 6, 32);
        const ringAngles = [0, Math.PI / 2, Math.PI / 3];
        ringAngles.forEach((a) => {
            const ring = new THREE.Mesh(
                ringGeo,
                new THREE.MeshBasicMaterial({ color: 0xbbecff, transparent: true, opacity: 0.88 })
            );
            ring.rotation.x = a;
            ring.rotation.z = a * 0.7;
            group.add(ring);
            this._spinRings.push(ring);
        });

        group.visible = false;
        this.scene.add(group);
        this._spinBall = group;
    }

    setModel(gltfScene) {
        this.model = gltfScene;
        this.model.traverse((n) => {
            if (n.isMesh) n.castShadow = true;
            if (n.isBone) {
                this._initRot[n.name] = {
                    x: n.rotation.x,
                    y: n.rotation.y,
                    z: n.rotation.z,
                };
                this._bones[n.name] = n;
            }
        });
        this.model.scale.setScalar(0.55);

        const gy = groundY(0, 0);
        this.pos.set(0, gy, 0);
        this._groundY = gy;
        this.model.position.copy(this.pos);
        this.scene.add(this.model);
    }

    setIdleKeyframes(kfs) {
        this._idleKFs = kfs;
    }

    setWalkKeyframes(kfs) {
        this._walkKFs = kfs;
    }

    setRunKeyframes(kfs) {
        this._runKFs = kfs;
    }

    // ─── animation ───────────────────────────────────────

    _applyKFInterp(t, kfs) {
        if (!this.model || kfs.length < 2) return;
        const n = kfs.length;
        const fi = Math.floor(t) % n;
        const ni = (fi + 1) % n;
        const a = smooth(t - Math.floor(t));
        const A = kfs[fi];
        const B = kfs[ni];
        for (const name in this._bones) {
            const bone = this._bones[name];
            const rA = A.rotations[name];
            const rB = B.rotations[name];
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

    // ─── main update ─────────────────────────────────────

    update(dt, camYaw) {
        if (!this.model) return;

        const k = this._keys;
        const fwd = k["KeyW"] || k["ArrowUp"];
        const back = k["KeyS"] || k["ArrowDown"];
        const left = k["KeyA"] || k["ArrowLeft"];
        const right = k["KeyD"] || k["ArrowRight"];
        const spinKey = k["ShiftLeft"] || k["KeyX"];

        const mx = (right ? 1 : 0) - (left ? 1 : 0);
        const mz = (fwd ? 1 : 0) - (back ? 1 : 0);
        const hasInput = mx !== 0 || mz !== 0;

        // Camera-relative flat input direction
        const cf = new THREE.Vector3(-Math.sin(camYaw), 0, -Math.cos(camYaw));
        const cr = new THREE.Vector3(Math.cos(camYaw), 0, -Math.sin(camYaw));

        const inputDir = new THREE.Vector3();
        if (hasInput) {
            inputDir.addScaledVector(cf, mz).addScaledVector(cr, mx).normalize();
        }

        // ── Spin dash ────────────────────────────────────────
        if (spinKey && !this._inAir) {
            this._spinHoldTime += dt;
            if (this._spinHoldTime >= SPIN_HOLD_THRESHOLD) {
                this._spinCharging = true;
                this._spinCharge = Math.min(1, this._spinCharge + dt * SPIN_CHARGE_RATE);
                // spin roll ramps from slow to fast as charge builds
                this._spinRoll += dt * (SPIN_ROLL_CHARGE_MIN + this._spinCharge * SPIN_ROLL_CHARGE_MAX);
                // decelerate to a stop while charging
                const decay = Math.exp(-20 * dt);
                this._vel.x *= decay;
                this._vel.z *= decay;
                this._jumpQueued = false;
            }
        } else {
            if (this._spinCharging) {
                // key released after charging — launch in facing direction
                // recover facing direction from yaw: travelYaw = atan2(-vz, vx) + PI
                // so facing = (cos(yaw - PI), -sin(yaw - PI))
                const boost = SPIN_BOOST_MIN + (SPIN_BOOST_MAX - SPIN_BOOST_MIN) * this._spinCharge;
                this._vel.x = Math.cos(this.yaw - Math.PI) * boost;
                this._vel.z = -Math.sin(this.yaw - Math.PI) * boost;
                this._spinActive = true;
                this._spinActiveTimer = SPIN_DURATION;
            }
            this._spinCharging = false;
            this._spinCharge = 0;
            this._spinHoldTime = 0;
        }

        if (this._spinActive) {
            this._spinActiveTimer -= dt;
            this._spinRoll += dt * SPIN_ROLL_LAUNCH;
            if (this._spinActiveTimer <= 0) {
                this._spinActive = false;
                this._spinRoll = 0;
            }
        }

        // ── Slope gradient (finite difference) ───────────────
        const gC = groundY(this.pos.x, this.pos.z);
        const gX = groundY(this.pos.x + SLOPE_SAMPLE, this.pos.z);
        const gZ = groundY(this.pos.x, this.pos.z + SLOPE_SAMPLE);
        // gradient points uphill; negate to get downhill direction
        const rawSlopeX = (gC - gX) / SLOPE_SAMPLE;
        const rawSlopeZ = (gC - gZ) / SLOPE_SAMPLE;
        const slopeMag = Math.sqrt(rawSlopeX * rawSlopeX + rawSlopeZ * rawSlopeZ);

        // ── Horizontal velocity ───────────────────────────────
        if (!this._spinCharging) {
            if (hasInput) {
                const velLen = Math.sqrt(this._vel.x * this._vel.x + this._vel.z * this._vel.z);
                const dot =
                    velLen > 0.01 ? (this._vel.x * inputDir.x + this._vel.z * inputDir.z) / velLen : 1;

                const accel = dot < -0.15 ? BRAKE : ACCEL;
                this._vel.x += inputDir.x * accel * dt;
                this._vel.z += inputDir.z * accel * dt;
            } else if (!this._spinActive) {
                // exponential friction — fast at high speed, gentle near zero
                const decay = Math.exp(-DECEL * dt);
                this._vel.x *= decay;
                this._vel.z *= decay;
            }
        }

        // Slope gravity — only push when slope is steep enough
        const applySlope = !this._inAir && slopeMag > SLOPE_IDLE_THRESHOLD;
        if (applySlope) {
            this._vel.x += rawSlopeX * SLOPE_ACCEL * dt;
            this._vel.z += rawSlopeZ * SLOPE_ACCEL * dt;
        }

        // Speed cap — relaxed during active spin
        const speedCap = this._spinActive ? SPIN_TOP_SPEED : TOP_SPEED;
        const newFlatSpeed = Math.sqrt(this._vel.x * this._vel.x + this._vel.z * this._vel.z);
        if (newFlatSpeed > speedCap) {
            const s = speedCap / newFlatSpeed;
            this._vel.x *= s;
            this._vel.z *= s;
        }

        this.speed = Math.sqrt(this._vel.x * this._vel.x + this._vel.z * this._vel.z);

        // Facing yaw — follows velocity direction
        if (this.speed > 0.5) {
            // Model's local +X is forward. atan2(-vz, vx) maps velocity to that convention.
            const travelYaw = Math.atan2(-this._vel.z, this._vel.x) + Math.PI;
            this.yaw = lerpAngle(this.yaw, travelYaw, Math.min(1, dt * TURN_SPEED));
        }

        this.pos.x += this._vel.x * dt;
        this.pos.z += this._vel.z * dt;

        // ── Vertical / jump ──────────────────────────────────
        const curGround = groundY(this.pos.x, this.pos.z);
        const doJump = this._jumpQueued;
        this._jumpQueued = false;

        if (!this._inAir) {
            this.pos.y = curGround;
            this._groundY = curGround;
            if (doJump) {
                this._inAir = true;
                // jump height scales with current speed — faster run = bigger jump
                const speedRatio = Math.min(1, this.speed / TOP_SPEED);
                this._jumpVel = JUMP_BASE + JUMP_BOOST * speedRatio;
            }
        } else {
            this._jumpVel += GRAVITY * dt;
            this._groundY += this._jumpVel * dt;
            this.pos.y = this._groundY;
            if (this._groundY <= curGround) {
                this.pos.y = curGround;
                this._groundY = curGround;
                this._jumpVel = 0;
                this._inAir = false;
            }
        }

        // ── Apply to model ────────────────────────────────────
        const inSpin = this._spinCharging || this._spinActive;

        this.model.visible = !inSpin;
        this.model.position.copy(this.pos);
        this.model.rotation.y = this.yaw;
        this.model.rotation.x = 0;

        // spin ball: show in place of model while charging / active
        this._spinBall.visible = inSpin;
        this._spinBall.position.copy(this.pos);
        this._spinBall.rotation.y = this.yaw;
        this._spinBall.rotation.x = this._spinRoll;
        if (inSpin) {
            // treat active (post-launch) as full charge for ring visuals
            const charge = this._spinActive ? 1 : this._spinCharge;
            const ringSpeed = 2.5 + charge * 5;
            this._spinRings.forEach((r) => { r.material.opacity = 0.4 + charge * 0.5; });
            this._spinRings[0].rotation.z += dt * ringSpeed * 1.8;
            this._spinRings[1].rotation.y += dt * ringSpeed * 1.4;
            this._spinRings[2].rotation.x += dt * ringSpeed;
        }

        // ── Animation ────────────────────────────────────────
        if (this._spinCharging || this._spinActive) {
            this._walkT = 0;
            this._runT = 0;
            this._restPose();
        } else {
            const isMoving = this.speed > 0.5;
            const isRunning = this.speed >= TOP_SPEED * RUN_THRESHOLD;

            if (isMoving && isRunning && this._runKFs.length >= 2) {
                this._walkT = 0;
                this._runT += dt * ANIM_RUN;
                this._applyKFInterp(this._runT, this._runKFs);
            } else if (isMoving && this._walkKFs.length >= 2) {
                this._runT = 0;
                const t = Math.min(1, this.speed / (TOP_SPEED * RUN_THRESHOLD));
                const animSpd = ANIM_WALK + (ANIM_RUN - ANIM_WALK) * t;
                this._walkT += dt * animSpd;
                this._applyKFInterp(this._walkT, this._walkKFs);
            } else {
                this._walkT = 0;
                this._runT = 0;
                // apply idle pose from idle.json, falling back to rest pose
                if (this._idleKFs.length >= 1) {
                    this._applyKFInterp(0, [this._idleKFs[0], this._idleKFs[0]]);
                } else {
                    this._restPose();
                }
                // layer subtle sway on top of idle pose
                const now = performance.now() / 1000;
                const root = this._bones["GLTF_created_0_rootJoint"];
                if (root) {
                    root.rotation.z += Math.sin(now * 1.3) * 0.022;
                    root.rotation.x += Math.sin(now * 0.85) * 0.016;
                }
                const head = this._bones["Bone001_23"];
                if (head) {
                    head.rotation.y += Math.sin(now * 0.55) * 0.14;
                    head.rotation.x += Math.sin(now * 0.38) * 0.04;
                }
            }

            if (this._inAir) {
                const root = this._bones["GLTF_created_0_rootJoint"];
                if (root)
                    root.rotation.x += Math.max(0, this._jumpVel / (JUMP_BASE + JUMP_BOOST)) * -0.28;
            }
        }
    }

    get inAir() {
        return this._inAir;
    }
    get jumpVel() {
        return this._jumpVel;
    }
    get spinCharging() {
        return this._spinCharging;
    }
    get spinCharge() {
        return this._spinCharge;
    }
}

import * as THREE from "three";

const HOLD_THRESHOLD = 0.18; // seconds before charging begins
const CHARGE_RATE = 1 / 1.2; // full charge in 1.2 s
const BOOST_MIN = 22.0; // launch speed at zero charge
const BOOST_MAX = 42.0; // launch speed at full charge (= MAX_SPEED)
export const TOP_SPEED = 44.0; // speed cap while spin is active (slight buffer above MAX_SPEED)
const DURATION = 1.8; // seconds before spin state expires
const ROLL_CHARGE_MIN = 2.0; // roll speed (rad/s) at start of charge
const ROLL_CHARGE_MAX = 16.0; // extra roll speed added at full charge
const ROLL_LAUNCH = 24.0; // roll speed after launch

const PARTICLE_COUNT = 48;

export class SpinDash {
    constructor(scene, spinBarEl, spinFillEl) {
        this.charging = false;
        this.charge = 0;
        this.active = false;
        this._holdTime = 0;
        this._activeTimer = 0;
        this._roll = 0;

        this._ball = this._buildBall(scene);
        this._setupParticles(scene);

        this._barEl = spinBarEl;
        this._fillEl = spinFillEl;
    }

    _buildBall(scene) {
        const g = new THREE.Group();

        this._innerBall = new THREE.Mesh(
            new THREE.SphereGeometry(1, 16, 16),
            new THREE.MeshStandardMaterial({
                color: 0x1565c0,
                emissive: 0x002299,
                emissiveIntensity: 0.4,
                roughness: 0.3,
            })
        );
        this._innerBall.add(
            new THREE.Mesh(
                new THREE.SphereGeometry(1.02, 16, 16),
                new THREE.MeshBasicMaterial({
                    color: 0x99ddff,
                    wireframe: true,
                    transparent: true,
                    opacity: 0.55,
                })
            )
        );
        this._innerBall.scale.set(1, 1, 0.7);
        g.add(this._innerBall);

        g.visible = false;
        scene.add(g);
        return g;
    }

    _setupParticles(scene) {
        const pPos = new Float32Array(PARTICLE_COUNT * 3);
        const geo = new THREE.BufferGeometry();
        geo.setAttribute("position", new THREE.BufferAttribute(pPos, 3));
        const mat = new THREE.PointsMaterial({
            size: 0.15,
            transparent: true,
            opacity: 0,
            depthWrite: false,
        });
        scene.add(new THREE.Points(geo, mat));

        this._pGeo = geo;
        this._pMat = mat;
        this._pAngles = Float32Array.from(
            { length: PARTICLE_COUNT },
            (_, i) => (i / PARTICLE_COUNT) * Math.PI * 2
        );
        this._pYOff = Float32Array.from({ length: PARTICLE_COUNT }, () => Math.random() * 0.9);
        this._pSpeeds = Float32Array.from({ length: PARTICLE_COUNT }, () => 3 + Math.random() * 3);
    }

    // modifies vel in-place: decelerates while charging, boosts on release
    update(dt, spinKey, inAir, vel, pos, yaw) {
        if (spinKey && !inAir) {
            this._holdTime += dt;
            if (this._holdTime >= HOLD_THRESHOLD) {
                this.charging = true;
                this.charge = Math.min(1, this.charge + dt * CHARGE_RATE);
                this._roll += dt * (ROLL_CHARGE_MIN + this.charge * ROLL_CHARGE_MAX);
                const decay = Math.exp(-20 * dt);
                vel.x *= decay;
                vel.z *= decay;
            }
        } else {
            if (this.charging) {
                const boost = BOOST_MIN + (BOOST_MAX - BOOST_MIN) * this.charge;
                vel.x = Math.cos(yaw - Math.PI) * boost;
                vel.z = -Math.sin(yaw - Math.PI) * boost;
                this.active = true;
                this._activeTimer = DURATION;
            }
            this.charging = false;
            this.charge = 0;
            this._holdTime = 0;
        }

        if (this.active) {
            this._activeTimer -= dt;
            this._roll += dt * ROLL_LAUNCH;
            if (this._activeTimer <= 0) {
                this.active = false;
                this._roll = 0;
            }
        }

        this._updateBall(dt, pos, yaw);
        this._updateParticles(dt, pos);
        this._updateHUD();
    }

    _updateBall(dt, pos, yaw) {
        const inSpin = this.charging || this.active;
        this._ball.visible = inSpin;
        this._ball.position.set(pos.x, pos.y + 0.8, pos.z);
        this._ball.rotation.y = yaw;

        if (this._innerBall) {
            this._innerBall.rotation.z = this._roll;
        }
    }

    _updateParticles(dt, pos) {
        if (!this.charging) {
            this._pMat.opacity = 0;
            return;
        }
        const { charge } = this;
        const radius = 0.5 + charge * 1.4;
        const orbitSpeed = 4 + charge * 10;
        this._pMat.color.setHSL(0.58, 0.85, 0.72 + charge * 0.18);
        this._pMat.opacity = 0.35 + charge * 0.65;
        this._pMat.size = 0.1 + charge * 0.22;
        const attr = this._pGeo.attributes.position;
        for (let i = 0; i < PARTICLE_COUNT; i++) {
            this._pAngles[i] += dt * (this._pSpeeds[i] + orbitSpeed);
            attr.setXYZ(
                i,
                pos.x + Math.cos(this._pAngles[i]) * radius,
                pos.y + this._pYOff[i] * (0.2 + charge * 0.8),
                pos.z + Math.sin(this._pAngles[i]) * radius
            );
        }
        attr.needsUpdate = true;
    }

    _updateHUD() {
        if (this.charging) {
            this._barEl.classList.remove("hidden");
            this._fillEl.style.width = `${this.charge * 100}%`;
            this._fillEl.classList.toggle("full", this.charge >= 1);
        } else {
            this._barEl.classList.add("hidden");
        }
    }
}

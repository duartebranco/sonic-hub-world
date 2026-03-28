import { groundY } from "../world/index.js";
import { TOP_SPEED as SPIN_TOP_SPEED } from "./spin.js";

export const ACCEL = 28.0; // acceleration along input direction
export const DECEL = 10.0; // friction rate when no input (multiplier per sec)
export const BRAKE = 38.0; // decel rate when pressing opposite direction
export const TOP_SPEED = 28.0; // max horizontal speed
export const TURN_SPEED = 8.0; // yaw snap rate
export const GRAVITY = -28.0;
export const JUMP_BASE = 8.0; // vertical jump velocity at zero ground speed
export const JUMP_BOOST = 5.5; // extra vertical added at full top speed
export const SLOPE_ACCEL = 9.0; // how hard slope gravity pushes downhill
export const SLOPE_SAMPLE = 0.5; // finite-difference step for gradient
export const SLOPE_IDLE_THRESHOLD = 0.18; // slopes below this don't drift when standing still

export function lerpAngle(a, b, t) {
    let d = b - a;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    return a + d * t;
}

export function updatePhysics(player, dt, hasInput, inputDir, doJump) {
    const pos = player.pos;
    const vel = player._vel;
    const spin = player._spin;

    // ── Slope gradient (finite difference) ───────────────
    const gC = groundY(pos.x, pos.z);
    const gX = groundY(pos.x + SLOPE_SAMPLE, pos.z);
    const gZ = groundY(pos.x, pos.z + SLOPE_SAMPLE);
    // gradient points uphill; negate to get downhill direction
    const rawSlopeX = (gC - gX) / SLOPE_SAMPLE;
    const rawSlopeZ = (gC - gZ) / SLOPE_SAMPLE;
    const slopeMag = Math.sqrt(rawSlopeX * rawSlopeX + rawSlopeZ * rawSlopeZ);

    // ── Horizontal velocity ───────────────────────────────
    if (!spin.charging) {
        if (hasInput) {
            const velLen = Math.sqrt(vel.x * vel.x + vel.z * vel.z);
            const dot = velLen > 0.01 ? (vel.x * inputDir.x + vel.z * inputDir.z) / velLen : 1;

            const accel = dot < -0.15 ? BRAKE : ACCEL;
            vel.x += inputDir.x * accel * dt;
            vel.z += inputDir.z * accel * dt;
        } else if (!spin.active) {
            // exponential friction — fast at high speed, gentle near zero
            const decay = Math.exp(-DECEL * dt);
            vel.x *= decay;
            vel.z *= decay;
        }
    }

    // Slope gravity — only push when slope is steep enough
    const applySlope = !player._inAir && slopeMag > SLOPE_IDLE_THRESHOLD;
    if (applySlope) {
        vel.x += rawSlopeX * SLOPE_ACCEL * dt;
        vel.z += rawSlopeZ * SLOPE_ACCEL * dt;
    }

    // speed cap — relaxed during active spin
    const speedCap = spin.active ? SPIN_TOP_SPEED : TOP_SPEED;
    const newFlatSpeed = Math.sqrt(vel.x * vel.x + vel.z * vel.z);
    if (newFlatSpeed > speedCap) {
        const s = speedCap / newFlatSpeed;
        vel.x *= s;
        vel.z *= s;
    }

    player.speed = Math.sqrt(vel.x * vel.x + vel.z * vel.z);

    // Facing yaw — follows velocity direction
    if (player.speed > 0.5) {
        // Model's local +X is forward. atan2(-vz, vx) maps velocity to that convention.
        const travelYaw = Math.atan2(-vel.z, vel.x) + Math.PI;
        player.yaw = lerpAngle(player.yaw, travelYaw, Math.min(1, dt * TURN_SPEED));
    }

    const nextX = pos.x + vel.x * dt;
    const nextZ = pos.z + vel.z * dt;
    const nextGround = groundY(nextX, nextZ);

    const moveDist = Math.sqrt(vel.x * vel.x + vel.z * vel.z) * dt;
    const heightDiff = nextGround - pos.y;

    // Block forward movement if the terrain step is too steep to run up (acts as a wall)
    if ((moveDist > 0.001 && heightDiff / moveDist > 1.2) || heightDiff > 0.5) {
        vel.x = 0;
        vel.z = 0;
    } else {
        pos.x = nextX;
        pos.z = nextZ;
    }

    // ── Vertical / jump ──────────────────────────────────
    const actualGround = groundY(pos.x, pos.z);

    if (!player._inAir) {
        pos.y = actualGround;
        player._groundY = actualGround;
        if (doJump) {
            player._inAir = true;
            // jump height scales with current speed — faster run = bigger jump
            const speedRatio = Math.min(1, player.speed / TOP_SPEED);
            player._jumpVel = JUMP_BASE + JUMP_BOOST * speedRatio;
        }
    } else {
        player._jumpVel += GRAVITY * dt;
        player._groundY += player._jumpVel * dt;
        pos.y = player._groundY;
        if (player._groundY <= actualGround) {
            pos.y = actualGround;
            player._groundY = actualGround;
            player._jumpVel = 0;
            player._inAir = false;
        }
    }
}

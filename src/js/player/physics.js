// HedgePhysics (LakeFeperd / Damizean): https://github.com/ricky-daniel13/HedgePhysicsLite
// velocity = normal (along input) + tangent (perpendicular); tangent bleeds = smooth turning
// jump impulse along surface normal; air has zero friction (full horizontal inertia)

import { groundY } from "../world/index.js";
import { TOP_SPEED as SPIN_TOP_SPEED } from "./spin.js";
import { CYLINDER_COLLIDERS, BOX_COLLIDERS, BRIDGE_SURFACES, WORLD_RADIUS } from "../world/colliders.js";

const PLAYER_RADIUS = 0.45;

// returns bridge plank surface y at (x,z), or -Infinity if not over a bridge
function bridgeSurfaceY(x, z) {
    for (const b of BRIDGE_SURFACES) {
        const halfLen = b.length / 2;
        const halfWid = b.width / 2;
        const localSpan = b.spanAxis === "x" ? x - b.x : z - b.z;
        const localCross = b.spanAxis === "x" ? z - b.z : x - b.x;
        if (Math.abs(localSpan) <= halfLen && Math.abs(localCross) <= halfWid) {
            const arch = Math.cos((localSpan / halfLen) * Math.PI * 0.5) * 2.0;
            return b.y + arch + 0.2;
        }
    }
    return -Infinity;
}

function effectiveGroundY(x, z) {
    return Math.max(groundY(x, z), bridgeSurfaceY(x, z));
}

function resolveColliders(pos, vel) {
    for (const c of CYLINDER_COLLIDERS) {
        const dx = pos.x - c.x;
        const dz = pos.z - c.z;
        const distSq = dx * dx + dz * dz;
        const minDist = c.radius + PLAYER_RADIUS;
        if (distSq < minDist * minDist && distSq > 0.0001) {
            const dist = Math.sqrt(distSq);
            const nx = dx / dist;
            const nz = dz / dist;
            pos.x += nx * (minDist - dist);
            pos.z += nz * (minDist - dist);
            const vDot = vel.x * nx + vel.z * nz;
            if (vDot < 0) {
                vel.x -= vDot * nx;
                vel.z -= vDot * nz;
            }
        }
    }

    for (const b of BOX_COLLIDERS) {
        const dx = Math.abs(pos.x - b.x);
        const dz = Math.abs(pos.z - b.z);
        const px = b.hw + PLAYER_RADIUS - dx;
        const pz = b.hl + PLAYER_RADIUS - dz;
        if (px > 0 && pz > 0) {
            if (px < pz) {
                pos.x += pos.x > b.x ? px : -px;
                vel.x = 0;
            } else {
                pos.z += pos.z > b.z ? pz : -pz;
                vel.z = 0;
            }
        }
    }

    // world border — push player inward from the circular wall
    const distOrigin = Math.sqrt(pos.x * pos.x + pos.z * pos.z);
    const borderLimit = WORLD_RADIUS - PLAYER_RADIUS;
    if (distOrigin > borderLimit) {
        const nx = pos.x / distOrigin;
        const nz = pos.z / distOrigin;
        pos.x = nx * borderLimit;
        pos.z = nz * borderLimit;
        const vDot = vel.x * nx + vel.z * nz;
        if (vDot > 0) {
            vel.x -= vDot * nx;
            vel.z -= vDot * nz;
        }
    }
}

export const WALK_SPEED = 10.0;
export const RUN_SPEED = 24.0;
export const MAX_SPEED = 42.0;
export const MAX_JUMP_SPEED = 18.0; // JUMP_BASE + JUMP_BOOST at full run speed

const ACCEL_LOW = 30.0;
const ACCEL_MID = 18.0;
const TANGENT_DRAG = 30.0; // bleeds perpendicular-to-input vel (HedgePhysics turning)
const AIR_STEER = 5.0;
const BRAKE = 44.0;
const FRICTION = 5.0;
const OVER_SPEED_DECAY = 5.0;
const GRAVITY = -26.0;
const JUMP_BASE = 13.0;
const JUMP_BOOST = 5.0;
const JUMP_CUT = 0.38;
const SLOPE_ACCEL = 14.0;
const SLOPE_SAMPLE = 0.5;
const SLOPE_THRESHOLD = 0.15;

function lerpAngle(a, b, t) {
    let d = b - a;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    return a + d * t;
}

function surfaceNormal(x, z) {
    const gC = groundY(x, z);
    const dhdx = (groundY(x + SLOPE_SAMPLE, z) - gC) / SLOPE_SAMPLE;
    const dhdz = (groundY(x, z + SLOPE_SAMPLE) - gC) / SLOPE_SAMPLE;
    const len = Math.sqrt(dhdx * dhdx + 1 + dhdz * dhdz);
    return { x: -dhdx / len, y: 1 / len, z: -dhdz / len };
}

export function updatePhysics(player, dt, hasInput, inputDir, doJump, jumpHeld) {
    const pos = player.pos;
    const vel = player._vel;
    const spin = player._spin;

    const gC = groundY(pos.x, pos.z);
    const slopeX = (gC - groundY(pos.x + SLOPE_SAMPLE, pos.z)) / SLOPE_SAMPLE;
    const slopeZ = (gC - groundY(pos.x, pos.z + SLOPE_SAMPLE)) / SLOPE_SAMPLE;
    const slopeMag = Math.sqrt(slopeX * slopeX + slopeZ * slopeZ);

    const flatSpeed = Math.sqrt(vel.x * vel.x + vel.z * vel.z);

    if (!spin.charging) {
        if (player._inAir) {
            if (hasInput) {
                vel.x += inputDir.x * AIR_STEER * dt;
                vel.z += inputDir.z * AIR_STEER * dt;
            }
        } else if (hasInput) {
            const dot =
                flatSpeed > 0.01 ? (vel.x * inputDir.x + vel.z * inputDir.z) / flatSpeed : 1;

            if (dot < -0.15) {
                vel.x += inputDir.x * BRAKE * dt;
                vel.z += inputDir.z * BRAKE * dt;
            } else {
                // decompose into normal (along input) + tangent (perpendicular)
                const normalSpeed = vel.x * inputDir.x + vel.z * inputDir.z;
                const tangentVelX = vel.x - inputDir.x * normalSpeed;
                const tangentVelZ = vel.z - inputDir.z * normalSpeed;

                let newNormal = normalSpeed;
                if (normalSpeed < RUN_SPEED) {
                    const accel = normalSpeed < WALK_SPEED ? ACCEL_LOW : ACCEL_MID;
                    newNormal = Math.min(RUN_SPEED, normalSpeed + accel * dt);
                }

                // bleed tangent — produces smooth turning instead of hard snap
                const tangentLen = Math.sqrt(tangentVelX * tangentVelX + tangentVelZ * tangentVelZ);
                const tScale =
                    tangentLen > 0.001
                        ? Math.max(0, tangentLen - TANGENT_DRAG * dt) / tangentLen
                        : 0;

                vel.x = inputDir.x * newNormal + tangentVelX * tScale;
                vel.z = inputDir.z * newNormal + tangentVelZ * tScale;
            }
        } else if (!spin.active) {
            const decay = Math.exp(-FRICTION * dt);
            vel.x *= decay;
            vel.z *= decay;
        }

        if (!player._inAir && !spin.active) {
            const spd = Math.sqrt(vel.x * vel.x + vel.z * vel.z);
            if (spd > RUN_SPEED) {
                const s = Math.max(RUN_SPEED, spd - OVER_SPEED_DECAY * dt) / spd;
                vel.x *= s;
                vel.z *= s;
            }
        }
    }

    if (!player._inAir && slopeMag > SLOPE_THRESHOLD) {
        vel.x += slopeX * SLOPE_ACCEL * dt;
        vel.z += slopeZ * SLOPE_ACCEL * dt;
    }

    const speedCap = spin.active ? SPIN_TOP_SPEED : MAX_SPEED;
    const cappedSpeed = Math.sqrt(vel.x * vel.x + vel.z * vel.z);
    if (cappedSpeed > speedCap) {
        const s = speedCap / cappedSpeed;
        vel.x *= s;
        vel.z *= s;
        player.speed = speedCap;
    } else {
        player.speed = cappedSpeed;
    }

    if (player.speed > 0.5) {
        const travelYaw = Math.atan2(-vel.z, vel.x) + Math.PI;
        const bonus = Math.max(0, 1 - player.speed / WALK_SPEED) * 12;
        player.yaw = lerpAngle(player.yaw, travelYaw, Math.min(1, dt * (8 + bonus)));
    } else if (hasInput) {
        const inputYaw = Math.atan2(-inputDir.z, inputDir.x) + Math.PI;
        player.yaw = lerpAngle(player.yaw, inputYaw, Math.min(1, dt * 20));
    }

    const nextX = pos.x + vel.x * dt;
    const nextZ = pos.z + vel.z * dt;
    const nextGround = effectiveGroundY(nextX, nextZ);
    const heightDiff = nextGround - pos.y;

    if ((player.speed * dt > 0.001 && heightDiff / (player.speed * dt) > 1.2) || heightDiff > 0.5) {
        vel.x = 0;
        vel.z = 0;
    } else {
        pos.x = nextX;
        pos.z = nextZ;
    }

    resolveColliders(pos, vel);

    const actualGround = effectiveGroundY(pos.x, pos.z);

    if (!player._inAir) {
        if (actualGround < pos.y - 0.15) {
            player._inAir = true;
            player._jumpVel = 0;
            player._groundY = pos.y;
            player._jumpHeld = false;
        } else {
            pos.y = actualGround;
            player._groundY = actualGround;

            if (doJump) {
                const jumpSpeed = JUMP_BASE + JUMP_BOOST * Math.min(1, player.speed / RUN_SPEED);
                const n = surfaceNormal(pos.x, pos.z);
                player._jumpVel = jumpSpeed * n.y;
                vel.x += jumpSpeed * n.x;
                vel.z += jumpSpeed * n.z;
                player._inAir = true;
                player._jumpHeld = true;
            }
        }
    } else {
        if (player._jumpHeld && !jumpHeld && player._jumpVel > 0) {
            player._jumpVel *= JUMP_CUT;
            player._jumpHeld = false;
        }

        player._jumpVel += GRAVITY * dt;
        player._groundY += player._jumpVel * dt;
        pos.y = player._groundY;

        if (player._groundY <= actualGround) {
            pos.y = actualGround;
            player._groundY = actualGround;
            player._jumpVel = 0;
            player._inAir = false;
            player._jumpHeld = false;
        }
    }
}

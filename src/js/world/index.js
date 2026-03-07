import { buildTerrain, buildPath, groundY } from "./terrain.js";
import { buildCliffs } from "./cliffs.js";
import { buildTrees } from "./trees.js";
import { buildFlowers } from "./flowers.js";
import { buildRings, buildSparkleSystem } from "./rings.js";
import { buildClouds } from "./clouds.js";
import { buildAmbientParticles } from "./particles.js";

export { groundY };

export function buildWorld(scene) {
    buildTerrain(scene);
    buildPath(scene);
    buildCliffs(scene);
    buildTrees(scene);

    const flowerSpinners = buildFlowers(scene);
    const cloudDrifters = buildClouds(scene);
    const rings = buildRings(scene);
    const sparkleSystem = buildSparkleSystem(scene);
    const ambientParticles = buildAmbientParticles(scene);

    return {
        flowerSpinners,
        cloudDrifters,
        rings,
        sparkleSystem,
        ambientParticles,
    };
}

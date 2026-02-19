/**
 * hud.js
 * Manages the on-screen zone label and portal proximity detection.
 */

import { PORTAL_DEFS } from './world.js';

const zoneLabel = document.getElementById('zone-label');
let lastLabel   = 'SONIC WORLD';

export function updateHUD(sonicGroup) {
    const sx = sonicGroup.position.x;
    const sz = sonicGroup.position.z;
    let nearest  = null;
    let nearDist = Infinity;
    PORTAL_DEFS.forEach(p => {
        const d = Math.sqrt((sx - p.x) ** 2 + (sz - p.z) ** 2);
        if (d < nearDist) { nearDist = d; nearest = p; }
    });
    const label = nearDist < 6 ? `▶  ${nearest.label}` : 'SONIC WORLD';
    if (label !== lastLabel) {
        lastLabel = label;
        zoneLabel.textContent = label;
    }
}

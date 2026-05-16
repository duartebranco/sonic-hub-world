// true on any touch-capable device (phones and tablets)
export const isMobile = navigator.maxTouchPoints > 0;

// phones only: short CSS-pixel dimension ≤ 600 (tablets are ≥ 768)
const isPhone = isMobile && Math.min(screen.width, screen.height) <= 600;

export function initOrientationGuard() {
    if (!isPhone) return;
    const overlay = document.getElementById("rotate-overlay");

    function check() {
        overlay.classList.toggle("visible", window.innerWidth < window.innerHeight);
    }

    window.addEventListener("resize", check);
    check();
}

const HUB_MUSIC_URL = new URL("../../../audio/music/Emerald Lobby Loop.mp3", import.meta.url);
const CHALLENGE_MUSIC_URL = new URL(
    "../../../audio/music/Emerald Breeze Zone.mp3",
    import.meta.url
);

export class AudioManager {
    constructor(muteButton) {
        this._muteButton = muteButton;
        this._ctx = null;
        this._master = null;
        this._isUnlocked = false;
        this._musicMode = "hub";
        this._activeTrack = null;
        this._spinChargeNodes = null;

        this._tracks = {
            hub: this._makeTrack(HUB_MUSIC_URL),
            challenge: this._makeTrack(CHALLENGE_MUSIC_URL),
        };

        this._muted = localStorage.getItem("audioMuted") === "1";
        this._syncMuteUi();

        if (this._muteButton) {
            this._muteButton.addEventListener("click", () => this.toggleMute());
        }
    }

    unlock() {
        if (this._isUnlocked) {
            this._ctx?.resume();
            this._applyMusicState();
            return;
        }

        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) return;

        this._ctx = new AudioCtx();
        this._master = this._ctx.createGain();
        this._master.gain.value = this._muted ? 0 : 1;
        this._master.connect(this._ctx.destination);
        this._isUnlocked = true;

        this._applyMusicState();
    }

    toggleMute() {
        this.setMuted(!this._muted);
    }

    setMuted(muted) {
        this._muted = !!muted;
        localStorage.setItem("audioMuted", this._muted ? "1" : "0");
        this._syncMuteUi();

        if (this._master) {
            this._master.gain.setTargetAtTime(this._muted ? 0 : 1, this._ctx.currentTime, 0.03);
        }

        for (const track of Object.values(this._tracks)) {
            track.muted = this._muted;
        }

        if (!this._muted) {
            this._applyMusicState();
        }
    }

    setMusicMode(mode) {
        const nextMode = mode === "challenge" ? "challenge" : "hub";
        if (this._musicMode === nextMode) return;
        this._musicMode = nextMode;
        this._applyMusicState();
    }

    startSpinCharge() {
        if (!this._canPlaySfx() || this._spinChargeNodes) return;

        const osc = this._ctx.createOscillator();
        const gain = this._ctx.createGain();
        const filter = this._ctx.createBiquadFilter();
        filter.type = "lowpass";
        filter.frequency.value = 920;

        osc.type = "sawtooth";
        osc.frequency.value = 90;
        gain.gain.value = 0;

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this._master);

        const t = this._ctx.currentTime;
        gain.gain.setValueAtTime(0.0001, t);
        gain.gain.exponentialRampToValueAtTime(0.05, t + 0.06);
        osc.start(t);

        this._spinChargeNodes = { osc, gain, filter };
    }

    updateSpinCharge(charge) {
        if (!this._spinChargeNodes || !this._ctx) return;
        const clamped = Math.max(0, Math.min(1, charge));
        const t = this._ctx.currentTime;
        const freq = 90 + clamped * 240;

        this._spinChargeNodes.osc.frequency.setTargetAtTime(freq, t, 0.03);
        this._spinChargeNodes.filter.frequency.setTargetAtTime(900 + clamped * 1300, t, 0.04);
        this._spinChargeNodes.gain.gain.setTargetAtTime(0.04 + clamped * 0.1, t, 0.03);
    }

    stopSpinCharge() {
        if (!this._spinChargeNodes || !this._ctx) return;

        const { osc, gain } = this._spinChargeNodes;
        const t = this._ctx.currentTime;
        gain.gain.cancelScheduledValues(t);
        gain.gain.setTargetAtTime(0.0001, t, 0.03);
        osc.stop(t + 0.12);
        this._spinChargeNodes = null;
    }

    playRing() {
        this._playTone(1260, 1620, 0.07, "square", 0.08);
        this._playTone(1820, 1660, 0.1, "triangle", 0.06, 0.03);
    }

    playJump() {
        this._playTone(580, 840, 0.08, "square", 0.06);
    }

    playLanding() {
        this._playNoise(0.09, 0.12, 300);
        this._playTone(120, 70, 0.12, "triangle", 0.05);
    }

    playSpinRelease() {
        this._playNoise(0.14, 0.15, 1800);
        this._playTone(240, 90, 0.12, "sawtooth", 0.07);
    }

    playWaterSplash() {
        this._playNoise(0.15, 0.14, 1100);
        this._playTone(260, 160, 0.14, "triangle", 0.04);
    }

    playPlayerHit() {
        this._playTone(700, 240, 0.18, "sawtooth", 0.09);
    }

    playRingScatter() {
        this._playTone(1200, 700, 0.12, "square", 0.07);
        this._playTone(900, 520, 0.12, "triangle", 0.06, 0.02);
    }

    playDeath() {
        this._playTone(520, 70, 0.42, "square", 0.1);
        this._playTone(330, 45, 0.46, "triangle", 0.08, 0.04);
    }

    playChallengeStart() {
        this._playTone(780, 980, 0.09, "square", 0.07);
        this._playTone(980, 1320, 0.1, "square", 0.07, 0.05);
    }

    playChallengeComplete() {
        this._playTone(880, 880, 0.08, "triangle", 0.07);
        this._playTone(1180, 1180, 0.08, "triangle", 0.07, 0.09);
        this._playTone(1480, 1480, 0.12, "triangle", 0.07, 0.17);
    }

    _makeTrack(url) {
        const audio = new Audio(url.href);
        audio.loop = true;
        audio.preload = "auto";
        audio.volume = 0.55;
        audio.muted = this._muted;
        return audio;
    }

    _applyMusicState() {
        if (!this._isUnlocked || this._muted) return;

        const target = this._tracks[this._musicMode];
        if (!target) return;

        if (this._activeTrack && this._activeTrack !== target) {
            this._activeTrack.pause();
            this._activeTrack.currentTime = 0;
        }

        this._activeTrack = target;
        target.play().catch(() => {});
    }

    _syncMuteUi() {
        if (!this._muteButton) return;
        this._muteButton.textContent = this._muted ? "Sound: Off (M)" : "Sound: On (M)";
        this._muteButton.setAttribute("aria-pressed", this._muted ? "true" : "false");
    }

    _canPlaySfx() {
        if (!this._isUnlocked || this._muted || !this._ctx || !this._master) return false;
        this._ctx.resume();
        return true;
    }

    _playTone(startHz, endHz, duration, wave, gainAmount, delay = 0) {
        if (!this._canPlaySfx()) return;

        const osc = this._ctx.createOscillator();
        const gain = this._ctx.createGain();
        const t = this._ctx.currentTime + delay;
        osc.type = wave;
        osc.frequency.setValueAtTime(startHz, t);
        osc.frequency.exponentialRampToValueAtTime(Math.max(10, endHz), t + duration);

        gain.gain.setValueAtTime(0.0001, t);
        gain.gain.exponentialRampToValueAtTime(gainAmount, t + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);

        osc.connect(gain);
        gain.connect(this._master);

        osc.start(t);
        osc.stop(t + duration + 0.02);
    }

    _playNoise(duration, gainAmount, cutoffHz) {
        if (!this._canPlaySfx()) return;

        const source = this._ctx.createBufferSource();
        const filter = this._ctx.createBiquadFilter();
        const gain = this._ctx.createGain();
        const buffer = this._ctx.createBuffer(
            1,
            Math.floor(this._ctx.sampleRate * duration),
            this._ctx.sampleRate
        );
        const data = buffer.getChannelData(0);

        for (let i = 0; i < data.length; i++) {
            data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
        }

        filter.type = "lowpass";
        filter.frequency.value = cutoffHz;

        const t = this._ctx.currentTime;
        gain.gain.setValueAtTime(0.0001, t);
        gain.gain.exponentialRampToValueAtTime(gainAmount, t + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);

        source.buffer = buffer;
        source.connect(filter);
        filter.connect(gain);
        gain.connect(this._master);

        source.start(t);
        source.stop(t + duration + 0.02);
    }
}

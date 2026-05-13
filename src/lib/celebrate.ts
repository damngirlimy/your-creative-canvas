// Lightweight celebration: canvas confetti burst + audio chime + haptic.
// No deps. Safe to call on every task completion.

let audioCtx: AudioContext | null = null;
function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    if (!audioCtx) {
      const Ctor = (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext);
      audioCtx = new Ctor();
    }
    return audioCtx;
  } catch {
    return null;
  }
}

export function chime() {
  const ctx = getCtx();
  if (!ctx) return;
  const now = ctx.currentTime;
  // Two-note arpeggio (C5 → G5)
  const notes = [523.25, 783.99];
  notes.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, now + i * 0.08);
    gain.gain.setValueAtTime(0, now + i * 0.08);
    gain.gain.linearRampToValueAtTime(0.18, now + i * 0.08 + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.08 + 0.45);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now + i * 0.08);
    osc.stop(now + i * 0.08 + 0.5);
  });
}

export function haptic(ms = 18) {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    try { navigator.vibrate(ms); } catch { /* noop */ }
  }
}

export function confetti(opts: { x?: number; y?: number; count?: number } = {}) {
  if (typeof window === "undefined" || typeof document === "undefined") return;
  const count = opts.count ?? 70;
  const cssAccent = getComputedStyle(document.documentElement).getPropertyValue("--accent").trim() || "60 95% 60%";
  const palette = [
    `hsl(${cssAccent})`,
    "hsl(0 0% 95%)",
    "hsl(220 70% 60%)",
    "hsl(330 75% 65%)",
    "hsl(40 85% 60%)",
  ];

  const canvas = document.createElement("canvas");
  canvas.style.cssText = "position:fixed;inset:0;pointer-events:none;z-index:9999";
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  document.body.appendChild(canvas);
  const ctx = canvas.getContext("2d");
  if (!ctx) { canvas.remove(); return; }

  const ox = opts.x ?? window.innerWidth / 2;
  const oy = opts.y ?? window.innerHeight / 2;

  type P = { x: number; y: number; vx: number; vy: number; r: number; rot: number; vr: number; color: string; life: number };
  const particles: P[] = Array.from({ length: count }, () => {
    const angle = Math.random() * Math.PI * 2;
    const speed = 3 + Math.random() * 6;
    return {
      x: ox, y: oy,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 2,
      r: 3 + Math.random() * 4,
      rot: Math.random() * Math.PI,
      vr: (Math.random() - 0.5) * 0.3,
      color: palette[Math.floor(Math.random() * palette.length)],
      life: 1,
    };
  });

  let raf = 0;
  const tick = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    let alive = false;
    for (const p of particles) {
      p.vy += 0.18; // gravity
      p.vx *= 0.99;
      p.x += p.vx; p.y += p.vy;
      p.rot += p.vr;
      p.life -= 0.012;
      if (p.life > 0 && p.y < canvas.height + 40) {
        alive = true;
        ctx.save();
        ctx.globalAlpha = Math.max(0, p.life);
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.r, -p.r * 0.4, p.r * 2, p.r * 0.8);
        ctx.restore();
      }
    }
    if (alive) raf = requestAnimationFrame(tick);
    else { cancelAnimationFrame(raf); canvas.remove(); }
  };
  raf = requestAnimationFrame(tick);
}

export function celebrate(opts: { x?: number; y?: number } = {}) {
  confetti(opts);
  chime();
  haptic();
}

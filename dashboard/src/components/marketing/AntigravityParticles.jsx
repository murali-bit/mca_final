import { useEffect, useRef } from 'react';

export default function AntigravityParticles({ className = '' }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let animationFrameId;
    let width = 0;
    let height = 0;

    // Responsive resize with High DPI
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = canvas.parentElement.clientWidth;
      height = canvas.parentElement.clientHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.scale(dpr, dpr);
    };

    resize();
    window.addEventListener('resize', resize);

    // Color interpolation helper based on angle (Google Antigravity color spectrum)
    const getColor = (angle) => {
      // Normalize angle to 0 - 2PI
      let a = (angle + Math.PI * 2) % (Math.PI * 2);
      const deg = (a * 180) / Math.PI;

      // Spectrum: Violet/Purple (top-left) -> Rose/Coral (top-right) -> Amber/Gold (bottom-right) -> Blue (bottom-left)
      if (deg < 90) {
        // 0 to 90 deg: Coral to Gold
        return { r: 245, g: 158, b: 11 }; // Amber
      } else if (deg < 180) {
        // 90 to 180 deg: Gold to Emerald/Blue
        return { r: 59, g: 130, b: 246 }; // Blue
      } else if (deg < 270) {
        // 180 to 270 deg: Blue to Violet/Indigo
        return { r: 139, g: 92, b: 246 }; // Purple
      } else {
        // 270 to 360 deg: Violet to Rose
        return { r: 244, g: 63, b: 94 }; // Rose
      }
    };

    // Generate radial particle points
    const particles = [];
    const numRings = 14;
    const minRadius = Math.min(width, height) * 0.22;
    const maxRadius = Math.min(width, height) * 0.58;

    for (let ring = 0; ring < numRings; ring++) {
      const radius = minRadius + (ring / numRings) * (maxRadius - minRadius);
      const ringParticleCount = Math.floor(18 + ring * 9);

      for (let i = 0; i < ringParticleCount; i++) {
        // Angular jitter for natural organic look
        const baseAngle = (i / ringParticleCount) * Math.PI * 2;
        const jitter = (Math.random() - 0.5) * 0.08;
        const angle = baseAngle + jitter;

        const baseDist = radius + (Math.random() - 0.5) * 12;
        const color = getColor(angle);

        // Aspect ratio stretch (wider horizontal ellipse)
        const stretchX = 1.25;
        const stretchY = 0.88;

        particles.push({
          angle,
          dist: baseDist,
          stretchX,
          stretchY,
          color,
          baseSize: 1.5 + Math.random() * 2,
          length: 5 + Math.random() * 5,
          alpha: 0.35 + Math.random() * 0.45,
          radialSpeed: 0.15 + Math.random() * 0.1,
          phase: Math.random() * Math.PI * 2,
        });
      }
    }

    let time = 0;

    // Animation Loop (Ping / Radial Wave Ripple)
    const render = () => {
      time += 0.015;
      ctx.clearRect(0, 0, width, height);

      const centerX = width / 2;
      const centerY = height / 2;

      // Periodic ping expansion wave
      const pingFrequency = 3.5; // seconds
      const pingProgress = (time % pingFrequency) / pingFrequency; // 0 to 1
      const pingRadius = minRadius + pingProgress * (maxRadius - minRadius) * 1.3;

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        // Breathing oscillation
        const breath = Math.sin(time * 1.5 + p.phase) * 6;
        const currentDist = p.dist + breath;

        // Position on stretched ellipse
        const x = centerX + Math.cos(p.angle) * currentDist * p.stretchX;
        const y = centerY + Math.sin(p.angle) * currentDist * p.stretchY;

        // Radial distance to center
        const dx = (x - centerX) / p.stretchX;
        const dy = (y - centerY) / p.stretchY;
        const distToCenter = Math.sqrt(dx * dx + dy * dy);

        // Ping wave wave-front check
        const distToPing = Math.abs(distToCenter - pingRadius);
        let pingIntensity = 0;
        if (distToPing < 60) {
          pingIntensity = Math.cos((distToPing / 60) * (Math.PI / 2));
        }

        // Particle orientation (pointing radially outwards)
        const rotation = p.angle + Math.PI / 2;

        // Dynamic scale & brightness during ping pulse
        const scale = 1 + pingIntensity * 0.8;
        const opacity = Math.min(1, p.alpha + pingIntensity * 0.55);

        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(rotation);

        ctx.fillStyle = `rgba(${p.color.r}, ${p.color.g}, ${p.color.b}, ${opacity})`;

        // Draw oriented rounded dash
        const w = p.baseSize * scale;
        const h = p.length * scale;

        ctx.beginPath();
        ctx.roundRect(-w / 2, -h / 2, w, h, w / 2);
        ctx.fill();

        ctx.restore();
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className={`absolute inset-0 pointer-events-none ${className}`}
    />
  );
}


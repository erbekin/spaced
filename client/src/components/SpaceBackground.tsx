import { useEffect, useRef } from 'react';

interface Star {
  x: number;
  y: number;
  z: number;
  size: number;
  color: string;
}

interface Comet {
  x: number;
  y: number;
  length: number;
  speed: number;
  angle: number;
  opacity: number;
}

export default function SpaceBackground() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const mouse = { x: 0, y: 0, targetX: 0, targetY: 0 };

    const handleMouseMove = (e: MouseEvent) => {
      mouse.targetX = (e.clientX - width / 2) * 0.04;
      mouse.targetY = (e.clientY - height / 2) * 0.04;
    };

    const handleResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('resize', handleResize);

    const STAR_COUNT = 450;
    const MAX_DEPTH = 1500;

    const starColors = [
      '#0f172a', // Deep slate-900
      '#1e1b4b', // Deep indigo-950
      '#312e81', // Indigo-900
      '#475569', // Slate-600
      '#09090b', // Near black
    ];

    const stars: Star[] = Array.from({ length: STAR_COUNT }, () => ({
      x: (Math.random() - 0.5) * width * 2,
      y: (Math.random() - 0.5) * height * 2,
      z: Math.random() * MAX_DEPTH,
      size: Math.random() * 2 + 1,
      color: starColors[Math.floor(Math.random() * starColors.length)],
    }));

    const comets: Comet[] = [];
    const spawnComet = () => {
      if (Math.random() < 0.02 && comets.length < 3) {
        comets.push({
          x: Math.random() * (width * 0.7),
          y: Math.random() * (height * 0.4),
          length: Math.random() * 100 + 80,
          speed: Math.random() * 9 + 8,
          angle: Math.PI / 4 + (Math.random() - 0.5) * 0.2,
          opacity: 1,
        });
      }
    };

    const render = () => {
      mouse.x += (mouse.targetX - mouse.x) * 0.05;
      mouse.y += (mouse.targetY - mouse.y) * 0.05;

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, width, height);

      const gradient = ctx.createRadialGradient(
        width / 2,
        height / 2,
        50,
        width / 2,
        height / 2,
        Math.max(width, height) * 0.75
      );
      gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
      gradient.addColorStop(1, 'rgba(241, 245, 249, 0.7)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);

      const cx = width / 2 - mouse.x;
      const cy = height / 2 - mouse.y;

      for (let i = 0; i < stars.length; i++) {
        const star = stars[i];
        star.z -= 1.6;
        if (star.z <= 0) {
          star.z = MAX_DEPTH;
          star.x = (Math.random() - 0.5) * width * 2;
          star.y = (Math.random() - 0.5) * height * 2;
        }

        const k = 220 / star.z;
        const px = star.x * k + cx;
        const py = star.y * k + cy;

        if (px >= 0 && px <= width && py >= 0 && py <= height) {
          const depthRatio = 1 - star.z / MAX_DEPTH;
          const radius = star.size * k * 0.8;
          const alpha = Math.min(1, Math.max(0.15, depthRatio * 1.1));

          ctx.beginPath();
          ctx.arc(px, py, Math.max(0.5, radius), 0, Math.PI * 2);
          ctx.fillStyle = star.color;
          ctx.globalAlpha = alpha;
          ctx.fill();
        }
      }

      spawnComet();
      for (let i = comets.length - 1; i >= 0; i--) {
        const c = comets[i];
        const tailX = c.x - Math.cos(c.angle) * c.length;
        const tailY = c.y - Math.sin(c.angle) * c.length;

        const cometGrad = ctx.createLinearGradient(tailX, tailY, c.x, c.y);
        cometGrad.addColorStop(0, 'rgba(255, 255, 255, 0)');
        cometGrad.addColorStop(0.7, `rgba(79, 70, 229, ${c.opacity * 0.5})`);
        cometGrad.addColorStop(1, `rgba(15, 23, 42, ${c.opacity})`);

        ctx.beginPath();
        ctx.moveTo(tailX, tailY);
        ctx.lineTo(c.x, c.y);
        ctx.strokeStyle = cometGrad;
        ctx.lineWidth = 2.2;
        ctx.globalAlpha = c.opacity;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(c.x, c.y, 2.2, 0, Math.PI * 2);
        ctx.fillStyle = '#0f172a';
        ctx.fill();

        c.x += Math.cos(c.angle) * c.speed;
        c.y += Math.sin(c.angle) * c.speed;
        c.opacity -= 0.012;

        if (c.opacity <= 0 || c.x > width + 100 || c.y > height + 100) {
          comets.splice(i, 1);
        }
      }

      ctx.globalAlpha = 1.0;
      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0"
    />
  );
}

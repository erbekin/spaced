import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";

/* ------------------------------------------------------------------ */
/* Tuning                                                              */
/* ------------------------------------------------------------------ */
const MIN_SPEED = 0.02; // depth units per second
const MAX_SPEED = 3;
const START_SPEED = 0.12;
const REDUCED_MOTION_SPEED = 0.03;
const PARALLAX = 0.18; // how far the mouse can steer the camera

const toLevel = (speed: number) =>
  Math.log(speed / MIN_SPEED) / Math.log(MAX_SPEED / MIN_SPEED);

/* ------------------------------------------------------------------ */
/* Shaders (WebGL2)                                                    */
/* ------------------------------------------------------------------ */

// Background nebula: one full-screen triangle, soft drifting clouds.
const NEBULA_VS = `#version 300 es
void main() {
  vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`;

const NEBULA_FS = `#version 300 es
precision highp float;
uniform vec2 u_res;
uniform float u_drift;
uniform vec2 u_cam;
out vec4 o;

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}
float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
}
float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 4; i++) {
    v += a * noise(p);
    p = p * 2.03 + 17.1;
    a *= 0.5;
  }
  return v;
}

void main() {
  vec2 uv = (gl_FragCoord.xy - 0.5 * u_res) / u_res.y;
  vec2 p = uv * 1.6 + u_cam * 0.12 + vec2(u_drift, u_drift * 0.4);
  float n = fbm(p);
  float n2 = fbm(p * 1.7 - u_drift * 0.7 + 5.0);
  float c = smoothstep(0.42, 0.9, n) * (0.35 + 0.65 * n2);
  vec3 col = vec3(0.006, 0.008, 0.014) + c * vec3(0.075, 0.085, 0.14);
  col *= 1.0 - 0.55 * dot(uv, uv);
  o = vec4(col, 1.0);
}`;

// Stars: one instanced quad per star, stretched along its screen-space motion.
const STAR_VS = `#version 300 es
precision highp float;
layout(location = 0) in vec2 a_corner; // x: -1..1 across, y: 0..1 along
layout(location = 1) in vec4 a_star;   // xy: -1..1, z: depth phase, w: brightness

uniform float u_travel;
uniform float u_streak;
uniform vec2 u_cam;
uniform vec2 u_res;
uniform float u_dpr;

out float v_across;
out float v_along;
out float v_len;
out float v_r;
out float v_alpha;
out float v_tint;

const float NEAR = 0.04;

vec2 project(vec2 xy, float d) {
  float z = NEAR + d * (1.0 - NEAR);
  return (xy - u_cam) / z;
}

void main() {
  float d = fract(a_star.z - u_travel);

  vec2 h = project(a_star.xy, d) * 0.5 * u_res;
  vec2 t = project(a_star.xy, d + u_streak) * 0.5 * u_res;

  vec2 delta = t - h;
  float len = length(delta);
  vec2 dir = len > 0.001 ? delta / len : vec2(0.0, 1.0);
  vec2 perp = vec2(-dir.y, dir.x);

  float r = max((0.55 + 0.9 * a_star.w) * u_dpr * mix(2.2, 0.7, d), 0.9 * u_dpr);
  float along = mix(-r, len + r, a_corner.y);
  float across = a_corner.x * r;

  vec2 pos = h + dir * along + perp * across;
  gl_Position = vec4(pos / (0.5 * u_res), 0.0, 1.0);

  float fadeFar = 1.0 - smoothstep(0.82, 1.0, d);
  float fadeNear = smoothstep(0.0, 0.1, d);

  v_across = across;
  v_along = along;
  v_len = len;
  v_r = r;
  v_alpha = fadeFar * fadeNear * mix(1.0, 0.4, d) * (0.4 + 0.6 * a_star.w);
  v_tint = a_star.w;
}`;

const STAR_FS = `#version 300 es
precision highp float;
in float v_across;
in float v_along;
in float v_len;
in float v_r;
in float v_alpha;
in float v_tint;
out vec4 o;

void main() {
  float a = clamp(v_along, 0.0, v_len);
  float dist = length(vec2(v_across, v_along - a)) / v_r;
  float core = pow(smoothstep(1.0, 0.0, dist), 1.5);

  // Dim the tail of a streak
  float f = v_len > 0.5 ? clamp(v_along / v_len, 0.0, 1.0) : 0.0;
  float b = core * v_alpha * mix(1.0, 0.25, f);

  vec3 col = mix(vec3(0.78, 0.86, 1.0), vec3(1.0, 0.93, 0.82), v_tint);
  o = vec4(col * b, 1.0);
}`;

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */
function createProgram(gl: WebGL2RenderingContext, vsSrc: string, fsSrc: string) {
  const compile = (type: number, src: string) => {
    const shader = gl.createShader(type)!;
    gl.shaderSource(shader, src);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      throw new Error(gl.getShaderInfoLog(shader) ?? "Shader compile failed");
    }
    return shader;
  };
  const vs = compile(gl.VERTEX_SHADER, vsSrc);
  const fs = compile(gl.FRAGMENT_SHADER, fsSrc);
  const program = gl.createProgram()!;
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  gl.deleteShader(vs);
  gl.deleteShader(fs);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    throw new Error(gl.getProgramInfoLog(program) ?? "Program link failed");
  }
  return program;
}

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

/** Live value of the user's reduced-motion preference. */
function useReducedMotion() {
  return useSyncExternalStore(
    (onChange) => {
      const mq = window.matchMedia(REDUCED_MOTION_QUERY);
      mq.addEventListener("change", onChange);
      return () => mq.removeEventListener("change", onChange);
    },
    () => window.matchMedia(REDUCED_MOTION_QUERY).matches,
    () => false
  );
}

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */
export default function WatchSpace() {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const reduced = useReducedMotion();

  const speedRef = useRef(START_SPEED); // target speed
  const reduceRef = useRef(reduced);
  const mouseRef = useRef({ x: 0, y: 0 });

  const [supported, setSupported] = useState(true);
  const [userLevel, setUserLevel] = useState(toLevel(START_SPEED));
  // With reduced motion the speed is fixed, so the meter is derived, not stored
  const level = reduced ? toLevel(REDUCED_MOTION_SPEED) : userLevel;

  // Let the render loop read the latest preference without restarting
  useEffect(() => {
    reduceRef.current = reduced;
  }, [reduced]);

  const adjustSpeed = useCallback((factor: number) => {
    if (reduceRef.current) return;
    const next = Math.min(MAX_SPEED, Math.max(MIN_SPEED, speedRef.current * factor));
    speedRef.current = next;
    setUserLevel(toLevel(next));
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    // Report failure after the effect body (not synchronously inside it)
    const reportUnsupported = () => queueMicrotask(() => setSupported(false));

    const gl = canvas.getContext("webgl2", {
      antialias: false,
      alpha: false,
      powerPreference: "high-performance",
    });
    if (!gl) {
      console.warn("WatchSpace: canvas.getContext('webgl2') returned null");
      reportUnsupported();
      return;
    }

    let nebulaProgram: WebGLProgram;
    let starProgram: WebGLProgram;
    try {
      nebulaProgram = createProgram(gl, NEBULA_VS, NEBULA_FS);
      starProgram = createProgram(gl, STAR_VS, STAR_FS);
    } catch (err) {
      console.error("WatchSpace: shader error", err);
      reportUnsupported();
      return;
    }

    // Uniform locations
    const nu = {
      res: gl.getUniformLocation(nebulaProgram, "u_res"),
      drift: gl.getUniformLocation(nebulaProgram, "u_drift"),
      cam: gl.getUniformLocation(nebulaProgram, "u_cam"),
    };
    const su = {
      travel: gl.getUniformLocation(starProgram, "u_travel"),
      streak: gl.getUniformLocation(starProgram, "u_streak"),
      cam: gl.getUniformLocation(starProgram, "u_cam"),
      res: gl.getUniformLocation(starProgram, "u_res"),
      dpr: gl.getUniformLocation(starProgram, "u_dpr"),
    };

    // Geometry: one quad, instanced per star
    const quadBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, 0, 1, 0, -1, 1, 1, 1]),
      gl.STATIC_DRAW
    );

    const starCount = window.innerWidth < 640 ? 8000 : 20000;
    const starData = new Float32Array(starCount * 4);
    for (let i = 0; i < starCount; i++) {
      starData[i * 4] = Math.random() * 2 - 1;
      starData[i * 4 + 1] = Math.random() * 2 - 1;
      starData[i * 4 + 2] = Math.random();
      starData[i * 4 + 3] = Math.random() ** 2; // few bright stars, many faint
    }
    const starBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, starBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, starData, gl.STATIC_DRAW);

    const starVao = gl.createVertexArray();
    gl.bindVertexArray(starVao);
    gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, starBuffer);
    gl.enableVertexAttribArray(1);
    gl.vertexAttribPointer(1, 4, gl.FLOAT, false, 0, 0);
    gl.vertexAttribDivisor(1, 1);
    gl.bindVertexArray(null);

    const emptyVao = gl.createVertexArray(); // nebula needs no attributes

    // Animation state
    let raf = 0;
    let last = performance.now();
    let travel = Math.random();
    let drift = 0;
    let speed = reduceRef.current ? REDUCED_MOTION_SPEED : speedRef.current;
    const cam = { x: 0, y: 0 };

    const render = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      const reduce = reduceRef.current;

      // Ease toward the target speed (fixed and slow with reduced motion)
      const target = reduce ? REDUCED_MOTION_SPEED : speedRef.current;
      speed += (target - speed) * (1 - Math.exp(-dt * 3));
      travel = (travel + speed * dt) % 1;
      drift += speed * dt * 0.25;

      // Parallax: ease the camera toward the mouse, plus a faint idle sway
      const ease = 1 - Math.exp(-dt * 4);
      const tx = reduce ? 0 : mouseRef.current.x * PARALLAX;
      const ty = reduce ? 0 : mouseRef.current.y * PARALLAX;
      cam.x += (tx - cam.x) * ease;
      cam.y += (ty - cam.y) * ease;
      const camX = cam.x + (reduce ? 0 : 0.03 * Math.sin(now * 0.0003));
      const camY = cam.y + (reduce ? 0 : 0.03 * Math.cos(now * 0.00023));

      // Resize (capped pixel ratio keeps phones cool)
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = Math.max(1, Math.floor(canvas.clientWidth * dpr));
      const h = Math.max(1, Math.floor(canvas.clientHeight * dpr));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
        gl.viewport(0, 0, w, h);
      }

      // Pass 1: nebula
      gl.disable(gl.BLEND);
      gl.useProgram(nebulaProgram);
      gl.uniform2f(nu.res, w, h);
      gl.uniform1f(nu.drift, drift);
      gl.uniform2f(nu.cam, camX, camY);
      gl.bindVertexArray(emptyVao);
      gl.drawArrays(gl.TRIANGLES, 0, 3);

      // Pass 2: stars (additive)
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.ONE, gl.ONE);
      gl.useProgram(starProgram);
      gl.uniform1f(su.travel, travel);
      gl.uniform1f(su.streak, reduce ? 0 : speed * 0.1);
      gl.uniform2f(su.cam, camX, camY);
      gl.uniform2f(su.res, w, h);
      gl.uniform1f(su.dpr, dpr);
      gl.bindVertexArray(starVao);
      gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, starCount);

      raf = requestAnimationFrame(render);
    };
    raf = requestAnimationFrame(render);

    // Scroll to change speed (non-passive so the page doesn't scroll)
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const dy = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY;
      adjustSpeed(Math.exp(-dy * 0.0015));
    };
    container.addEventListener("wheel", onWheel, { passive: false });

    // Save battery when the tab is hidden
    const onVisibility = () => {
      cancelAnimationFrame(raf);
      if (!document.hidden) {
        last = performance.now();
        raf = requestAnimationFrame(render);
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelAnimationFrame(raf);
      container.removeEventListener("wheel", onWheel);
      document.removeEventListener("visibilitychange", onVisibility);
      gl.deleteBuffer(quadBuffer);
      gl.deleteBuffer(starBuffer);
      gl.deleteVertexArray(starVao);
      gl.deleteVertexArray(emptyVao);
      gl.deleteProgram(nebulaProgram);
      gl.deleteProgram(starProgram);
      // Don't call loseContext() here: a canvas keeps the same context object,
      // so React StrictMode's remount would get a dead context. The browser
      // frees it when the canvas element is removed.
    };
  }, [adjustSpeed]);

  if (!supported) {
    return (
      <div className="flex h-[calc(100vh-4rem)] min-h-100 w-full items-center justify-center bg-black px-4 text-center text-sm text-white">
        Your browser doesn't support WebGL 2, so the space view can't start.
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      role="img"
      aria-label="Animated flight through space. Scroll or use the arrow keys to change speed."
      onPointerMove={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        mouseRef.current.x = ((e.clientX - r.left) / r.width) * 2 - 1;
        mouseRef.current.y = -(((e.clientY - r.top) / r.height) * 2 - 1);
      }}
      onPointerLeave={() => {
        mouseRef.current.x = 0;
        mouseRef.current.y = 0;
      }}
      onKeyDown={(e) => {
        if (e.key === "ArrowUp" || e.key === "ArrowRight") {
          e.preventDefault();
          adjustSpeed(1.25);
        } else if (e.key === "ArrowDown" || e.key === "ArrowLeft") {
          e.preventDefault();
          adjustSpeed(1 / 1.25);
        }
      }}
      className="relative h-[calc(100vh-4rem)] min-h-100 w-full touch-none select-none overflow-hidden bg-black focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white"
    >
      <canvas ref={canvasRef} className="absolute inset-0 block h-full w-full" />

      <p className="pointer-events-none absolute left-4 top-4 text-xs text-white/60">
        Scroll to change speed
      </p>

      <div className="pointer-events-none absolute inset-x-0 bottom-6 flex justify-center">
        <div className="pointer-events-auto flex items-center gap-3 rounded-full border border-white/30 bg-black/60 px-3 py-2 text-white backdrop-blur">
          <button
            type="button"
            aria-label="Slow down"
            onClick={() => adjustSpeed(1 / 1.5)}
            className="h-7 w-7 rounded-full border border-white/40 text-sm leading-none transition-colors hover:bg-white hover:text-black focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            −
          </button>
          <div
            role="meter"
            aria-label="Speed"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(level * 100)}
            className="h-1 w-28 overflow-hidden rounded-full bg-white/20"
          >
            <div className="h-full bg-white" style={{ width: `${level * 100}%` }} />
          </div>
          <button
            type="button"
            aria-label="Speed up"
            onClick={() => adjustSpeed(1.5)}
            className="h-7 w-7 rounded-full border border-white/40 text-sm leading-none transition-colors hover:bg-white hover:text-black focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            +
          </button>
        </div>
      </div>
    </div>
  );
}

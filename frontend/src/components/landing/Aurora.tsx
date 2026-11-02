"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/cn";

const VERTEX = "attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}";

/* Duas fitas de seda em pastel, descendo na diagonal do lado direito da tela. */
const FRAGMENT = `
precision mediump float;
uniform float t;
uniform vec2 r;
vec3 PEACH = vec3(1.0, 0.80, 0.68);
vec3 ROSE = vec3(0.98, 0.72, 0.86);
vec3 LILAC = vec3(0.72, 0.70, 1.0);
vec3 SKY = vec3(0.66, 0.85, 1.0);

vec4 ribbon(vec2 uv, float base, float tilt, float width, float seed) {
  float wave = sin(uv.y * 2.3 + t * 0.16 + seed) * 0.07 + sin(uv.y * 5.1 - t * 0.11 + seed * 2.0) * 0.022;
  float d = (uv.x - (base + tilt * (1.0 - uv.y) + wave)) / (width + 0.05 * sin(uv.y * 3.0 + t * 0.13 + seed));
  float body = smoothstep(1.0, 0.1, abs(d));
  float silk = 0.5 + 0.5 * sin(d * 26.0 + sin(uv.y * 7.0 + t * 0.2 + seed) * 2.2);
  float along = 0.5 + 0.5 * sin(uv.y * 2.6 + d * 1.5 + t * 0.09 + seed);
  vec3 color = mix(mix(LILAC, SKY, along), mix(PEACH, ROSE, along), smoothstep(-0.8, 0.8, d));
  color = mix(color, vec3(1.0), 0.22 * silk * (1.0 - abs(d)));
  return vec4(color, body * (0.72 + 0.16 * silk));
}

void main() {
  vec2 uv = gl_FragCoord.xy / r;
  float wide = clamp(r.x / r.y, 0.6, 2.4);
  vec2 q = vec2(uv.x * wide / 1.8, uv.y);
  vec4 a = ribbon(q, 0.64 * wide / 1.8, 0.2, 0.2, 0.0);
  vec4 b = ribbon(q, 0.78 * wide / 1.8, 0.12, 0.11, 2.4);
  vec3 color = mix(a.rgb, b.rgb, b.a * 0.75);
  float alpha = 1.0 - (1.0 - a.a) * (1.0 - b.a * 0.75);
  gl_FragColor = vec4(color * alpha, alpha);
}`;

function compile(gl: WebGLRenderingContext, type: number, source: string) {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  return gl.getShaderParameter(shader, gl.COMPILE_STATUS) ? shader : null;
}

/**
 * O fundo animado: uma fita de seda em tons pastel, desenhada na placa de vídeo em
 * baixa resolução (é um desenho sem detalhes finos), a 30 quadros por segundo e só
 * enquanto está na tela. O degradê de .aurora fica por baixo: é ele que aparece no
 * primeiro quadro, sem WebGL e, com "reduzir movimento", a fita fica parada.
 */
export function Aurora({ className }: { className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const gl = canvas?.getContext("webgl", { alpha: true, antialias: false, premultipliedAlpha: true, powerPreference: "low-power" });
    if (!canvas || !gl) return;
    const vertex = compile(gl, gl.VERTEX_SHADER, VERTEX);
    const fragment = compile(gl, gl.FRAGMENT_SHADER, FRAGMENT);
    const program = gl.createProgram();
    if (!vertex || !fragment || !program) return;
    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return;
    gl.useProgram(program);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.bindAttribLocation(program, 0, "p");
    gl.vertexAttribPointer(gl.getAttribLocation(program, "p"), 2, gl.FLOAT, false, 0, 0);
    const time = gl.getUniformLocation(program, "t");
    const size = gl.getUniformLocation(program, "r");
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let frame = 0;
    let last = 0;
    let visible = false;

    function draw(now: number) {
      gl!.uniform1f(time, now / 1000 + 40);
      gl!.drawArrays(gl!.TRIANGLES, 0, 3);
      canvas!.dataset.ready = "";
    }
    function fit() {
      const scale = Math.min(window.devicePixelRatio || 1, 1) * 0.7;
      canvas!.width = Math.max(1, Math.round(canvas!.clientWidth * scale));
      canvas!.height = Math.max(1, Math.round(canvas!.clientHeight * scale));
      gl!.viewport(0, 0, canvas!.width, canvas!.height);
      gl!.uniform2f(size, canvas!.width, canvas!.height);
      draw(performance.now());
    }
    function loop(now: number) {
      frame = requestAnimationFrame(loop);
      if (now - last < 33) return;
      last = now;
      draw(now);
    }
    function sync() {
      cancelAnimationFrame(frame);
      if (visible && !document.hidden && !still) frame = requestAnimationFrame(loop);
    }

    const resize = new ResizeObserver(fit);
    resize.observe(canvas);
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      sync();
    });
    observer.observe(canvas);
    document.addEventListener("visibilitychange", sync);
    return () => {
      cancelAnimationFrame(frame);
      resize.disconnect();
      observer.disconnect();
      document.removeEventListener("visibilitychange", sync);
    };
  }, []);

  return (
    <div aria-hidden="true" className={cn("aurora", className)}>
      <canvas ref={ref} />
    </div>
  );
}

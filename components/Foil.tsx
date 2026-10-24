"use client";

import { useEffect, useRef } from "react";
import { cn } from "cn";

import { lessMotion } from "@/components/game/glide";
import { FOIL_STRENGTHS, FRAME_FOIL, type FrameTier } from "@/lib/frame-tier";

const VERT = `#version 300 es
in vec2 aPos;
void main() { gl_Position = vec4(aPos, 0., 1.); }`;

// One card: a border round a rounded face, and over the art whichever of the looks the tier turns on,
// all lit from where the tilt says the eye is.
const FRAG = `#version 300 es
precision highp float;
uniform vec2 uOrigin, uRes, uTilt;
uniform float uTime, uBorder, uRadius, uPad, uQuiet, uOverlay, uPlain;
uniform sampler2D uArt;
uniform vec3 uGem, uGem2;
uniform float uMetal, uCut, uBend, uGlint, uHolo, uRainbow, uSheen, uFire, uVeins, uNebula;
out vec4 o;

float hash(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
vec2 hash2(vec2 p) { return vec2(hash(p), hash(p + 7.13)); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y);
}
float fbm(vec2 p) { float v = 0., a = 0.5; for (int i = 0; i < 4; i++) { v += a * noise(p); p = p * 2.1 + 7.; a *= 0.5; } return v; }
float box(vec2 p, vec2 b, float r) { vec2 q = abs(p) - b + r; return length(max(q, 0.)) + min(max(q.x, q.y), 0.) - r; }
vec3 rainbow(float t) { return 0.5 + 0.5 * cos(6.2832 * (t + vec3(0., 0.33, 0.67))); }
vec3 hue(float t) { return mix(mix(uGem, uGem2, 0.5 + 0.5 * sin(6.2832 * t)), rainbow(t), uRainbow); }
vec3 screen(vec3 a, vec3 b) { return 1. - (1. - a) * (1. - b); }
// A stone seen close: a few large flat planes, cut by long straight lines, each plane shaded by a smooth
// gradient of its own. A plane's lean in xy, its own tone in z, its gradient in w; the nearest cut in edge.
vec4 gem(vec2 uv, float seed, out float edge) {
  vec2 q = (uv - 0.5 - uTilt * 0.05) * vec2(1., 1.411);
  float id = 0.;
  edge = 1.;
  for (int i = 0; i < 6; i++) {
    float fi = float(i) * 3.7 + seed;
    float a = hash(vec2(fi, 1.)) * 3.1416;
    float d = dot(q, vec2(cos(a), sin(a))) - (hash(vec2(fi, 2.)) - 0.5);
    id += step(0., d) * pow(2., float(i));
    edge = min(edge, abs(d));
  }
  vec2 ida = vec2(id, seed);
  float ga = hash(ida + 2.7) * 6.2832;
  float grad = clamp(dot(q, vec2(cos(ga), sin(ga))) * 0.9 + 0.5 + (hash(ida + 4.1) - 0.5) * 0.8, 0., 1.);
  return vec4((hash2(ida + 1.3) - 0.5) * 0.8, hash(ida), grad);
}
// A plane's colour: from the deep tone up to near white by its own tone, its gradient and how squarely it faces the light.
vec3 facetColor(vec4 g, float nh) {
  float light = clamp(g.z * 0.6 + g.w * 0.6 + pow(nh, 8.) - 0.4, 0., 1.);
  return mix(uGem * 0.3, mix(uGem2, vec3(1.), 0.5), light);
}

void main() {
  vec2 p = gl_FragCoord.xy - uOrigin - uRes * 0.5;
  vec2 card = uRes * 0.5 - uPad;
  vec2 uv = (p + card) / (card * 2.);
  vec2 lim = card - uBorder;
  float outer = box(p, card, uRadius + uBorder);
  float inner = box(p, lim, uRadius);
  float alpha = 1. - smoothstep(-1., 1., outer);
  // The tier's glow round the card, as the CSS frame casts one; a grain of noise keeps it from banding.
  float glow = max(pow(clamp(1. - outer / uPad, 0., 1.), 2.2) * 0.75 + (hash(p) - 0.5) * 0.02, 0.) * uSheen;
  if (alpha <= 0.) { o = vec4(uGem * glow, glow); return; }
  // Border and glow only: the face is left to what is under the canvas, and costs nothing.
  if (uPlain > 0.5 && inner < -1.) { o = vec4(0.); return; }

  vec3 V = normalize(vec3(uTilt * 0.7, 1.));
  vec3 L = normalize(vec3(-0.5, 0.8, 1.));
  vec3 H = normalize(V + L);

  // The border: a polished bevel for metal, cut facets round the ring for a stone.
  float dx = lim.x - abs(p.x), dy = lim.y - abs(p.y);
  vec2 side = dx < dy ? vec2(sign(p.x), 0.) : vec2(0., sign(p.y));
  vec3 Nbevel = normalize(vec3(side * 0.7, 1.));
  float NbH = max(dot(Nbevel, H), 0.);
  float ang = atan(p.y, p.x) + uTilt.x * 0.9 + uTilt.y * 0.6;
  vec2 fn = (hash2(vec2(floor(ang / 6.2832 * 18.), 3.)) - 0.5) * 0.9;
  float specF = pow(max(dot(normalize(vec3(fn, 1.)), H), 0.), 20.);
  float band = 0.55 + 0.45 * cos(ang * 4. + uTime * 0.2);
  vec3 ringStone = uGem * (0.45 + 0.6 * band) + vec3(specF) * 0.9;
  vec3 ringMetal = mix(uGem * 0.6, uGem2, pow(NbH, 6.)) + vec3(pow(NbH, 40.)) * 0.6;
  vec3 border = mix(uGem * (0.75 + 0.25 * band), mix(ringStone, ringStone * 0.7 + ringMetal * 0.5, uMetal), uSheen);

  // The shards: a coarse mesh and a finer one under it, each triangle leaning its own way.
  float ea, eb, ec;
  vec4 ga = gem(uv, 0., ea), gb = gem(uv, 10., eb), gc = gem(uv, 20., ec);
  vec2 facetN = ga.xy * max(uCut, uBend * 0.6);

  // Brushed metal: fine lines across the plate that scatter the light into one long highlight.
  float brush = (noise(vec2(uv.y * 220., uv.x * 2.)) - 0.5) * uMetal;

  // Crushed foil under the holographic tiers.
  float foil = (noise(uv * 24. + uTime * 0.03) - 0.5) * 0.35 * uHolo;

  vec3 N = normalize(vec3(facetN + vec2(0., brush * 0.04) + foil, 1.));
  float NH = max(dot(N, H), 0.);
  vec2 bend = N.xy * uBend * 0.03;
  vec3 art = vec3(texture(uArt, uv + bend * 1.3).r, texture(uArt, uv + bend).g, texture(uArt, uv + bend * 0.7).b);
  vec3 face = art;

  // A band of light crossing the face, where the tilt puts it.
  float d = dot(uv - 0.5, vec2(0.8, 0.6)) + uTilt.x * 0.35 - uTilt.y * 0.25;
  float sheen = exp(-d * d * 16.) * uSheen;

  // Metal: the art as if printed on the plate; the plate goes from dark to bright as it turns to the light, with a horizon line.
  vec3 R = reflect(-V, N);
  float look = R.y * 0.6 + R.x * 0.4 + brush * 0.06 + uTilt.y * 0.4 + uTilt.x * 0.3 - (uv.y - 0.5) * 1.6 - (uv.x - 0.5) * 0.8;
  vec3 shine = mix(uGem, uGem2, smoothstep(-0.7, 0.9, look));
  float d2 = dot(uv - 0.5, vec2(-0.6, 0.8)) - uTilt.x * 0.25 + uTilt.y * 0.3;
  float shineBand = exp(-pow(look * 2.2, 2.)) * 0.45 + exp(-pow((look - 0.45) * 8., 2.)) * 0.4 + exp(-d2 * d2 * 40.) * 0.35
    + exp(-dot(uv - 0.5 - uTilt * 0.3, uv - 0.5 - uTilt * 0.3) * 6.) * 0.25;
  // A pale metal (silver, platinum) gets less of the wash, or the art would go white.
  float pale = 1. - 0.6 * dot(uGem, vec3(0.33));
  face = mix(face, screen(face, uGem * 0.4 * pale), 0.6 * uMetal);
  face += (shine * shineBand * pale + uGem2 * pow(NH, 60.) * 0.5 + uGem2 * sheen * 0.25 * pale) * uMetal;

  // Stone: the facets over the art, a second finer cut ghosting through them; dark facets dim the art a little, bright ones light it.
  float NHb = max(dot(normalize(vec3(gb.xy, 1.)), H), 0.), NHc = max(dot(normalize(vec3(gc.xy, 1.)), H), 0.);
  vec3 stone = facetColor(ga, NH) * 0.5 + facetColor(gb, NHb) * 0.3 + facetColor(gc, NHc) * 0.2;
  // A thread of rainbow where the light breaks at a cut.
  stone += rainbow(ea * 40. + ga.z) * smoothstep(0.015, 0., ea) * 0.2;
  face = mix(face, face * (0.6 + 0.8 * stone) + stone * 0.3, 0.9 * uCut);
  face += mix(uGem, uGem2, 0.5) * sheen * 0.3 * (1. - uMetal) * (1. - uHolo);

  // Fire: rainbow sparks off the shards, as a diamond throws them.
  float sparkT = pow(max(0., cos(noise(uv * 9.) * 12. + dot(uTilt, vec2(5., 7.)) + uTime * 0.3)), 30.);
  face += (rainbow(dot(N, V) * 4. + ga.z + uTilt.x) * pow(NH, 24.) * 0.5 * uCut + rainbow(noise(uv * 6.) * 3. + uTilt.y) * sparkT * 0.35) * uFire;

  // The holographic hue, where the eye is to the foil, over fine prizm lines.
  float t = dot(N, V) * 2.5 + noise(uv * 3.) * 0.6 + d * 1.5 + uTime * 0.04;
  float stripes = smoothstep(0.7, 0.9, fract((uv.x * 0.9 + uv.y * 0.45) * 55.));
  float holo = uHolo * (sheen * 0.6 + stripes * 0.1 + 0.05);
  face = mix(face, screen(face, hue(t)), holo);
  face = screen(face, rainbow(uv.x * 0.6 + uv.y * 0.4 + uTilt.x * 0.2) * 0.18 * uRainbow * uHolo);

  // A nebula flowing under the face, in the two tones.
  vec2 w = uv * 3. + uTilt * 0.4;
  float n1 = fbm(w + uTime * 0.05);
  float n2 = fbm(w + n1 * 2. - uTime * 0.03);
  vec3 nebula = mix(uGem, uGem2, smoothstep(0.5, 0.8, n2)) * smoothstep(0.3, 0.85, n1 + n2 * 0.5) * 0.9 * uNebula;
  face = screen(face, nebula);

  // Veins of the bright tone, as gold through marble, catching the light.
  float vein = pow(1. - abs(2. * fbm(uv * 4. + noise(uv * 5. + uTilt * 0.3 + uTime * 0.02)) - 1.), 6.);
  face += uGem2 * vein * (0.6 + 0.6 * pow(NH, 2.)) * uVeins;

  // Glints: points that light up and go out as the angle changes.
  vec2 gp = uv * vec2(22., 31.), gi = floor(gp), gf = fract(gp) - 0.1 - hash2(gi) * 0.8;
  float gh = hash(gi + 1.7);
  float on = pow(max(0., cos(gh * 6.2832 + dot(uTilt, vec2(4., 5.)) + uTime * 0.5 * (0.5 + gh))), 50.);
  float star = smoothstep(0.1, 0., abs(gf.x) * abs(gf.y) * 12. + length(gf) * 0.5);
  face += star * on * uGlint * step(0.4, gh);

  // The gem's glow round the edge of the face.
  float vig = 1. - smoothstep(0., uRes.x * 0.2, -inner);
  face = mix(face, uGem, vig * 0.35 * uSheen);

  // A face that must stay the point, as a player's picture: the art back through the effects.
  face = mix(face, art, uQuiet);
  // With no picture of its own, the face is only the light the effects add, laid over what is under the canvas.
  float inFace = 1. - smoothstep(-1., 1., inner);
  vec3 col = mix(border, mix(face, max(face - 0.5, 0.) * 2.2, uOverlay) * (1. - uPlain), inFace);
  float a = mix(1., (1. - uOverlay) * (1. - uPlain), inFace);
  o = vec4(mix(uGem * glow, col, alpha), mix(glow, a, alpha));
}`;

/** Browsers allow only so many WebGL contexts on a page; past this many, frames stay CSS. */
const MAX_LAYERS = 6;
let liveLayers = 0;

const clamp = (v: number) => Math.max(-1, Math.min(1, v));

// Where the phone is tilted, relative to how it was held when the gyroscope was switched on; null until then.
let gyroTilt: [number, number] | null = null;
let gyroBase: [number, number] | null = null;

/** Lets the frames turn with the phone. Call from a tap: iPhones only allow the ask there. */
export async function enableGyro(): Promise<boolean> {
  const ask = (DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<string> }).requestPermission;
  if (ask && (await ask()) !== "granted") return false;
  window.addEventListener(
    "deviceorientation",
    (e) => {
      const now: [number, number] = [e.gamma ?? 0, e.beta ?? 0];
      gyroBase ??= now;
      gyroTilt = [clamp((now[0] - gyroBase[0]) / 16), clamp((gyroBase[1] - now[1]) / 18)];
    },
    true,
  );
  return true;
}

function compile(gl: WebGL2RenderingContext, type: number, src: string): WebGLShader {
  const s = gl.createShader(type)!;
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) ?? "shader");
  return s;
}

/** The slot's own picture as a texture, once it has loaded and is from this site; null until then. */
function artTexture(gl: WebGL2RenderingContext, cache: Map<string, WebGLTexture>, slot: HTMLElement): WebGLTexture | null {
  const img = slot.querySelector("img");
  if (!img?.complete || !img.naturalWidth || !img.currentSrc) return null;
  const have = cache.get(img.currentSrc);
  if (have) return have;
  if (new URL(img.currentSrc, location.href).origin !== location.origin) return null;
  const tex = gl.createTexture()!;
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
  gl.generateMipmap(gl.TEXTURE_2D);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  cache.set(img.currentSrc, tex);
  return tex;
}

interface FoilLayerProps {
  /** Pinned over a scrolling list it is the first child of, instead of laid over its parent. */
  sticky?: boolean;
  /** Covers its parent with a little room round it, for a screen with several slots; otherwise it reaches well past the parent for one slot's glow. */
  tight?: boolean;
  /** Holds the light still at this tilt (each -1..1), for a screenshot. */
  tilt?: [number, number];
}

/**
 * Draws the tier frames of every `data-foil="<tier>"` slot in its parent on one canvas, each over its own
 * picture: the border, the glow and the tier's light, turning with the pointer over the parent, the phone
 * once `enableGyro` has run, or drifting on its own. A slot's CSS frame stays under it, and is all that
 * shows while its picture loads, where WebGL is missing, or past the page's share of contexts. A slot
 * with `data-foil-round` is a circle; with `data-foil-quiet` its face keeps half the picture; with
 * `data-foil-plain` it gets only the border and the glow, its face left alone. A slot whose
 * picture can't be a texture (not loaded yet, from another host, or none) gets the border, the glow and the
 * light laid over whatever is under the canvas.
 */
export function FoilLayer({ sticky, tight, tilt: fixed }: FoilLayerProps) {
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const el = canvas.current;
    const parent = sticky ? el?.parentElement?.parentElement : el?.parentElement;
    if (!el || !parent || liveLayers >= MAX_LAYERS) return;
    const gl = el.getContext("webgl2", { premultipliedAlpha: true });
    if (!gl) return;
    liveLayers++;
    parent.dataset.foilLive = "";

    const prog = gl.createProgram()!;
    gl.attachShader(prog, compile(gl, gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, compile(gl, gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog);
    gl.useProgram(prog);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const aPos = gl.getAttribLocation(prog, "aPos");
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);
    const u = (name: string) => gl.getUniformLocation(prog, name);
    gl.enable(gl.SCISSOR_TEST);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.clearColor(0, 0, 0, 0);
    const textures = new Map<string, WebGLTexture>();
    const grey = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, grey);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([128, 128, 128, 255]));
    // A slot's border width is read from its styles once, not every frame.
    const borders = new WeakMap<HTMLElement, number>();

    // Pinned at the top of a list's content, the canvas also reaches up over the list's top padding, where the rows
    // fade out, so a frame half-way out is faded like its row instead of cut flat.
    const padTop = sticky ? parseFloat(getComputedStyle(parent).paddingTop) || 0 : 0;
    if (sticky) {
      // And out over the side padding, no further: past the padding it would give the list a sideways scroll.
      const padX = parseFloat(getComputedStyle(parent).paddingLeft) || 0;
      el.style.top = `-${padTop}px`;
      el.style.left = `-${padX}px`;
      el.style.width = `calc(100% + ${padX * 2}px)`;
    }
    const still = lessMotion();
    const tilt: [number, number] = fixed ?? [0, 0];
    let pointer: [number, number] | null = null;
    let lastPointer = 0;
    const onMove = (e: PointerEvent) => {
      const r = parent.getBoundingClientRect();
      pointer = [clamp(((e.clientX - r.left) / r.width) * 2 - 1), clamp(1 - ((e.clientY - r.top) / r.height) * 2)];
      lastPointer = performance.now();
    };
    if (!fixed) parent.addEventListener("pointermove", onMove);

    let frame = 0;
    const draw = (now: number) => {
      frame = requestAnimationFrame(draw);
      if (document.hidden) return;
      const time = still || fixed ? 0 : now / 1000;
      if (!fixed) {
        // The finger steers, then the phone, then it drifts on its own.
        const want =
          now - lastPointer < 1500 ? pointer : (gyroTilt ?? (still ? [0, 0] : [Math.sin(time * 0.6) * 0.7, Math.cos(time * 0.45) * 0.6]));
        if (want) {
          tilt[0] += (want[0] - tilt[0]) * 0.08;
          tilt[1] += (want[1] - tilt[1]) * 0.08;
        }
      }
      if (sticky) {
        // The canvas is the height of the list's window, not of the list.
        const h = `${parent.clientHeight + padTop}px`;
        if (el.style.height !== h) el.style.height = h;
      }
      const slots = [...parent.querySelectorAll<HTMLElement>("[data-foil]")];
      if (parent.dataset.foil) slots.unshift(parent);
      // A screen full of slots is drawn at one pixel per CSS pixel, or the shader drags.
      const dpr = slots.length > 12 ? 1 : Math.min(devicePixelRatio, 2);
      const r = el.getBoundingClientRect();
      const w = Math.round(r.width * dpr);
      const h = Math.round(r.height * dpr);
      if (el.width !== w || el.height !== h) {
        el.width = w;
        el.height = h;
      }
      gl.scissor(0, 0, w, h);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.uniform2f(u("uTilt"), tilt[0], tilt[1]);
      gl.uniform1f(u("uTime"), time);
      for (const slot of slots) {
        const foil = FRAME_FOIL[slot.dataset.foil as FrameTier];
        const s = slot.getBoundingClientRect();
        if (!foil || s.bottom < r.top || s.top > r.bottom || s.right < r.left || s.left > r.right) continue;
        const plain = "foilPlain" in slot.dataset;
        const tex = plain ? null : artTexture(gl, textures, slot);
        // Room round the card for its glow; less in a grid, where the glows would pile up in the gaps.
        const pad = Math.round((slots.length > 12 ? s.width * 0.1 : s.width * 0.14 + 12) * dpr);
        const x = Math.round((s.left - r.left) * dpr) - pad;
        const y = Math.round((r.bottom - s.bottom) * dpr) - pad;
        const sw = Math.round(s.width * dpr) + pad * 2;
        const sh = Math.round(s.height * dpr) + pad * 2;
        gl.viewport(x, y, sw, sh);
        gl.scissor(x, y, sw, sh);
        gl.uniform2f(u("uOrigin"), x, y);
        gl.uniform2f(u("uRes"), sw, sh);
        gl.uniform1f(u("uPad"), pad);
        let border = borders.get(slot);
        if (border === undefined) borders.set(slot, (border = parseFloat(getComputedStyle(slot).borderTopWidth) || s.width * 0.03));
        gl.uniform1f(u("uBorder"), border * dpr);
        gl.uniform1f(u("uRadius"), (sw - pad * 2) * ("foilRound" in slot.dataset ? 0.5 : 0.1));
        // A small card keeps more of its art: the light that suits a card held large swamps one in a grid.
        gl.uniform1f(u("uQuiet"), "foilQuiet" in slot.dataset ? 0.35 : s.width < 160 ? 0.55 : 0);
        gl.uniform1f(u("uOverlay"), tex ? 0 : 1);
        gl.uniform1f(u("uPlain"), plain ? 1 : 0);
        gl.uniform3fv(u("uGem"), foil.gem);
        gl.uniform3fv(u("uGem2"), foil.gem2);
        for (const k of FOIL_STRENGTHS) gl.uniform1f(u("u" + k[0].toUpperCase() + k.slice(1)), foil[k]);
        gl.bindTexture(gl.TEXTURE_2D, tex ?? grey);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      }
    };
    frame = requestAnimationFrame(draw);
    // Lost to the GPU: the CSS frames take over.
    const onLost = () => {
      cancelAnimationFrame(frame);
      delete parent.dataset.foilLive;
    };
    el.addEventListener("webglcontextlost", onLost);
    return () => {
      onLost();
      el.removeEventListener("webglcontextlost", onLost);
      parent.removeEventListener("pointermove", onMove);
      liveLayers--;
    };
  }, [sticky, fixed]);

  const el = (
    <canvas
      ref={canvas}
      className={cn(
        "pointer-events-none absolute z-[1]",
        sticky
          ? ""
          : tight
            ? "-inset-6 h-[calc(100%+var(--spacing)*12)] w-[calc(100%+var(--spacing)*12)]"
            : "-top-[30%] -left-[30%] h-[160%] w-[160%]",
      )}
    />
  );
  return sticky ? <div className="pointer-events-none sticky top-0 z-[1] h-0 w-full">{el}</div> : el;
}

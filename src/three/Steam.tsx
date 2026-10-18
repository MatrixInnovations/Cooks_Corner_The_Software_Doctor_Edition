import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { steamState } from './steamState'

/**
 * Cook's Corner steam v2 - "same steam, much more movement".
 *
 * Drop-in replacement for src/three/Steam.tsx: same default export (no props), same imports
 * (`steamState.level` is still the only thing the page writes), same DOM (`.steam > canvas`), same three
 * anchored layers on the open tray. Density is deliberately NOT increased: layer alpha is old x1.05 and the
 * only extra brightness is a +-12% breathing pulse (peak = old x1.18, under the +25% ceiling). Nothing new is
 * added to the scene - no extra layers, no hazy blobs. What changes is motion:
 *
 *   - rise     : ~2.2x faster (period 4.4-6.4 s vs 6.5-9 s, rise 70-110 px vs 40-70 px)
 *   - curl     : the wisp texture is domain-warped by two slow noise fields that move in different directions,
 *                so strands bend, fold and swirl instead of sliding straight up
 *   - billow   : each plume widens and stretches vertically as it rises (mesh scale + shader stretch)
 *   - sway     : centre-line sways ~4x faster and ~1.6x wider, plus a slow gentle gust that shoves the top sideways
 *   - layers   : three different speeds / curl / warp so they never move in lockstep (parallax)
 *   - breathing: slow +-12% alpha pulse, a different phase per layer
 *
 * Rules kept from v1: transparent canvas over the static photo, shader + mesh transform/opacity only (no layout
 * work, no DOM writes per frame), pauses when the tab is hidden / scrolled out of view / the tray is gone
 * (steamState.level ~ 0), cheap fbm, capped DPR. New: prefers-reduced-motion (live) = very slow, faint steam.
 */

// Mobile / touch devices get a cheaper fbm (2 octaves instead of 3) and a lower DPR cap. Steam is soft, so it
// does not need native resolution. Evaluated once at module load (this chunk is lazy-loaded in the browser).
const COARSE = typeof matchMedia !== 'undefined' && matchMedia('(pointer: coarse)').matches
const OCT = COARSE ? 2 : 3

const vert = /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`
const frag = /* glsl */ `
varying vec2 vUv;
uniform float uTime;   // this layer's animation clock (seconds)
uniform float uAlpha;  // fade envelope * level * pulse * layer alpha
uniform float uSeed;
uniform float uSpeed;  // how fast the wisp texture scrolls upward (v1: 0.35 for every layer)
uniform float uCurl;   // sideways curl of the strands as they rise
uniform float uWarp;   // domain-warp strength (folding / swirling of the wisps)
uniform vec3 uColor;
uniform float uResY;   // drawing-buffer height in px, for the soft fade at the top edge of the canvas
float h(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)) + uSeed) * 43758.5453); }
float n(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
  return mix(mix(h(i),h(i+vec2(1,0)),f.x), mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x), f.y); }
float fbm(vec2 p){ float a=.5, s=0.; for(int i=0;i<${OCT};i++){ s+=a*n(p); p*=2.03; a*=.5; } return s; }
// cheap 2-octave version for the sway and warp fields
float fbm2(vec2 p){ return .6*n(p) + .4*n(p*2.03); }
void main(){
  vec2 uv = vUv;
  float t = uTime;

  // centre-line sway + a slow gust that pushes the upper plume sideways (v1: time 0.12, amp 0.5)
  float gust = sin(t*0.55 + uSeed*3.0) * sin(t*0.23 + uSeed);
  float sway = (fbm2(vec2(uv.y*2.2 + uSeed, t*0.55)) - .5) * 1.0 + gust * 0.26;
  float x = uv.x - 0.5 - sway * (0.3 + uv.y*0.7);

  // billow: plume widens with height and breathes in width
  float breath = 0.5 + 0.5*sin(t*1.1 + uSeed*2.0);
  float width = mix(0.2, 0.44, uv.y) * (1.0 + 0.1*breath);
  float body = exp(-pow(x/width, 2.0));
  body *= 1.0 - smoothstep(0.34, 0.5, abs(uv.x - 0.5)); // never clip on the plane edge while swaying

  // texture coords: scroll upward, strands stretch vertically as they climb (v1: uv.y*4 - t*0.35)
  vec2 p = vec2(x*4.4, uv.y*(4.4 - 1.5*uv.y) - t*uSpeed) + uSeed;
  // curl: helical sideways drift that grows with height
  p.x += uCurl * sin(uv.y*7.5 - t*1.8 + uSeed) * (0.2 + uv.y);
  // domain warp: two noise fields drifting in different directions fold the wisps into swirls
  vec2 w = vec2(fbm2(p*1.7 + vec2(0.0, -t*0.5)), fbm2(p*1.7 + vec2(7.3, 2.1 + t*0.45))) - .5;
  p += w * uWarp;
  float tex = fbm(p);

  float vert = smoothstep(0.0, 0.25, uv.y) * (1.0 - smoothstep(0.55, 1.0, uv.y));
  float a = body * vert * smoothstep(0.29, 0.87, tex);
  // plumes now climb further/faster, so melt them out before the top edge of the canvas instead of cutting them
  a *= smoothstep(0.0, 0.14 * uResY, uResY - gl_FragCoord.y);
  gl_FragColor = vec4(uColor, a * uAlpha);
}`

/** live, shared between the Gate and the layers (module scope = no React re-renders) */
const ctl = { reduced: false }

type LayerProps = {
  seed: number
  /** seconds for one rise/fade loop (all layers share it so their fades stay evenly staggered = no haze surges) */
  period: number
  /** loop phase offset, 0..1 (layers are spaced 1/3 apart) */
  phase: number
  /** px (at the 1180px-wide design plate) the plume climbs per loop */
  rise: number
  /** peak layer opacity before envelope/pulse */
  alpha: number
  /** anchor on the plate, fraction of the plate box */
  fx: number; fy: number; w: number; h: number
  /** wisp texture scroll speed */
  speed: number
  /** sideways curl amount */
  curl: number
  /** domain-warp amount */
  warp: number
}

function Layer({ seed, period, phase, rise, alpha, fx, fy, w, h, speed, curl, warp }: LayerProps) {
  const mesh = useRef<THREE.Mesh>(null)
  const mat = useRef<THREE.ShaderMaterial>(null)
  const size = useThree((s) => s.size)
  const t0 = seed * 3.1 // noise-field offset, so layers never sample the same pattern
  const clock = useRef({ t: t0, last: performance.now() }) // own clock: pausing/resuming never makes a jump
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 }, uAlpha: { value: 0 }, uSeed: { value: seed },
      uSpeed: { value: speed }, uCurl: { value: curl }, uWarp: { value: warp }, uResY: { value: 450 },
      uColor: { value: new THREE.Color('#f4ecdd') }, // bone
    }),
    [seed, speed, curl, warp],
  )
  useFrame((state) => {
    const now = performance.now()
    const c = clock.current
    const dt = Math.min(0.1, (now - c.last) / 1000)
    c.last = now
    const rm = ctl.reduced
    c.t += dt * (rm ? 0.08 : 1) // reduced motion: 8% speed = very slow drift
    const t = c.t
    const ph = ((t - t0) / period + phase) % 1
    const fade = Math.min(1, ph / 0.2) * Math.min(1, (1 - ph) / 0.3)
    const pulse = rm ? 0.8 : 1 + 0.1 * Math.sin(((t - t0) / 3.6 + phase) * Math.PI * 2) // slow breathing, +-10%, phases 120 deg apart
    const u = mat.current?.uniforms
    if (u) {
      u.uTime.value = t
      u.uResY.value = state.gl.domElement.height
      u.uAlpha.value = alpha * fade * pulse * Math.max(0, Math.min(1, steamState.level))
    }
    const m = mesh.current
    if (m) {
      const k = size.width / 1180
      const r = rm ? 0.15 : 1
      m.position.y = (0.5 - fy) * size.height + ph * rise * k * r
      // lazy sideways drift and a little roll that grow as the plume climbs
      m.position.x = (fx - 0.5) * size.width + Math.sin(t * 0.9 + seed) * 0.014 * size.width * ph * r
      m.rotation.z = Math.sin(t * 0.7 + seed * 2) * 0.06 * r
      // billow + stretch while rising
      m.scale.set(1 + 0.16 * ph * r, 1 + 0.12 * ph * r, 1)
    }
  })
  return (
    <mesh ref={mesh} position={[(fx - 0.5) * size.width, (0.5 - fy) * size.height, 0]}>
      <planeGeometry args={[w * size.width, h * size.height]} />
      <shaderMaterial ref={mat} vertexShader={vert} fragmentShader={frag} uniforms={uniforms} transparent depthWrite={false} />
    </mesh>
  )
}

/**
 * Stops rendering entirely (frameloop 'never') while the tab is hidden, the steam is scrolled out of view,
 * or the tray is gone (steamState.level ~ 0 for 0.5 s); restarts as soon as any of that changes.
 * Also tracks prefers-reduced-motion live.
 */
function Gate() {
  const setFrameloop = useThree((s) => s.setFrameloop)
  const dom = useThree((s) => s.gl.domElement)
  useEffect(() => {
    const mq = matchMedia('(prefers-reduced-motion: reduce)')
    ctl.reduced = mq.matches
    const onMq = (e: MediaQueryListEvent) => { ctl.reduced = e.matches }
    mq.addEventListener('change', onMq)
    let onScreen = true, idle = 0, running = true
    const io = 'IntersectionObserver' in window ? new IntersectionObserver((es) => { onScreen = es[es.length - 1].isIntersecting }) : null
    io?.observe(dom)
    const sync = () => {
      const run = !document.hidden && onScreen && idle < 2
      if (run !== running) { running = run; setFrameloop(run ? 'always' : 'never') }
    }
    const id = setInterval(() => { idle = steamState.level > 0.004 ? 0 : idle + 1; sync() }, 250)
    document.addEventListener('visibilitychange', sync)
    return () => {
      clearInterval(id); io?.disconnect(); mq.removeEventListener('change', onMq)
      document.removeEventListener('visibilitychange', sync)
    }
  }, [dom, setFrameloop])
  return null
}

export default function Steam() {
  return (
    <div className="steam" aria-hidden="true">
      <Canvas orthographic dpr={COARSE ? [1, 1.25] : [1, 1.5]} gl={{ alpha: true, antialias: false, powerPreference: 'low-power' }} camera={{ position: [0, 0, 5], zoom: 1, near: 0.1, far: 20 }} frameloop="always" style={{ background: 'transparent' }}>
        <Gate />
        {/* anchored on the open tray (hero plate coordinates, fraction of the plate box) - same anchors as v1 */}
        <Layer seed={1.1} period={5} phase={0} rise={95} alpha={0.13} fx={0.6} fy={0.3} w={0.2} h={0.46} speed={1.2} curl={0.18} warp={1.0} />
        <Layer seed={2.7} period={5} phase={0.333} rise={80} alpha={0.108} fx={0.53} fy={0.32} w={0.17} h={0.42} speed={0.9} curl={0.14} warp={0.85} />
        <Layer seed={4.3} period={5} phase={0.667} rise={62} alpha={0.087} fx={0.67} fy={0.28} w={0.15} h={0.4} speed={1.55} curl={0.22} warp={1.2} />
      </Canvas>
    </div>
  )
}

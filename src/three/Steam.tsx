import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { steamState } from './steamState'

/**
 * Subtle steam drift over the open tray (motion spec: 2-3 soft layers at 8-14% opacity, drifting up
 * 40-70px over 6-9s, linear, looping, phase-offset, fade in first 20% and out last 30%).
 * Transparent canvas on top of the static photo; pauses when the tab is hidden or the tray is gone.
 */
const vert = /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`
const frag = /* glsl */ `
varying vec2 vUv; uniform float uTime; uniform float uAlpha; uniform float uSeed; uniform vec3 uColor;
float h(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)) + uSeed) * 43758.5453); }
float n(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
  return mix(mix(h(i),h(i+vec2(1,0)),f.x), mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x), f.y); }
float fbm(vec2 p){ float a=.5, s=0.; for(int i=0;i<4;i++){ s+=a*n(p); p*=2.03; a*=.5; } return s; }
void main(){
  vec2 uv = vUv;
  float sway = (fbm(vec2(uv.y*2.5 + uSeed, uTime*0.12)) - .5) * 0.5;
  float x = uv.x - 0.5 - sway * (0.3 + uv.y*0.7);
  float width = mix(0.22, 0.42, uv.y);
  float body = exp(-pow(x/width, 2.0));
  float tex = fbm(vec2(uv.x*3.0, uv.y*4.0 - uTime*0.35) + uSeed);
  float vert = smoothstep(0.0, 0.25, uv.y) * (1.0 - smoothstep(0.55, 1.0, uv.y));
  float a = body * vert * smoothstep(0.30, 0.85, tex);
  gl_FragColor = vec4(uColor, a * uAlpha);
}`

const T0 = performance.now() / 1000
function Layer({ seed, period, rise, alpha, fx, fy, w, h }: { seed: number; period: number; rise: number; alpha: number; fx: number; fy: number; w: number; h: number }) {
  const mesh = useRef<THREE.Mesh>(null)
  const mat = useRef<THREE.ShaderMaterial>(null)
  const size = useThree((s) => s.size)
  const uniforms = useMemo(() => ({ uTime: { value: 0 }, uAlpha: { value: 0 }, uSeed: { value: seed }, uColor: { value: new THREE.Color('#f4ecdd') } }), [seed])
  useFrame(() => {
    const t = performance.now() / 1000 - T0
    const ph = (t / period + seed * 0.37) % 1
    const fade = Math.min(1, ph / 0.2) * Math.min(1, (1 - ph) / 0.3)
    const u = mat.current?.uniforms
    if (u) {
      u.uTime.value = t
      u.uAlpha.value = alpha * fade * Math.max(0, Math.min(1, steamState.level))
    }
    if (mesh.current) mesh.current.position.y = (0.5 - fy) * size.height + ph * rise * (size.width / 1180)
  })
  return (
    <mesh ref={mesh} position={[(fx - 0.5) * size.width, (0.5 - fy) * size.height, 0]}>
      <planeGeometry args={[w * size.width, h * size.height]} />
      <shaderMaterial ref={mat} vertexShader={vert} fragmentShader={frag} uniforms={uniforms} transparent depthWrite={false} />
    </mesh>
  )
}

export default function Steam() {
  return (
    <div className="steam" aria-hidden="true">
      <Canvas orthographic dpr={[1, 1.5]} gl={{ alpha: true, antialias: false, powerPreference: 'low-power' }} camera={{ position: [0, 0, 5], zoom: 1, near: 0.1, far: 20 }} frameloop="always" style={{ background: 'transparent' }}>
        {/* anchored on the open tray (hero plate coordinates, fraction of the plate box) */}
        <Layer seed={1.1} period={8} rise={70} alpha={0.12} fx={0.6} fy={0.3} w={0.2} h={0.46} />
        <Layer seed={2.7} period={9} rise={55} alpha={0.1} fx={0.53} fy={0.32} w={0.17} h={0.42} />
        <Layer seed={4.3} period={6.5} rise={40} alpha={0.08} fx={0.67} fy={0.28} w={0.15} h={0.4} />
      </Canvas>
    </div>
  )
}

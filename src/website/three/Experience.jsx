/* ============================================================================
   THE NEURAL FIELD
   A single point cloud + connection graph that morphs through seven states,
   a full-screen shader backdrop, and a glowing core. Everything is driven by
   the smoothed story state — React never re-renders any of it per frame.
   ========================================================================== */
import { useMemo, useRef, Suspense } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import * as THREE from 'three';

import { buildLayouts, buildConnections } from '../lib/shapes';
import {
  POINT_VERT, POINT_FRAG, LINE_VERT, LINE_FRAG,
  BG_VERT, BG_FRAG, GLOW_VERT, GLOW_FRAG, MORPH_GLSL
} from '../lib/shaders';
import { current, pointer, fx, stepStory, syncCSSVars, scroll } from '../lib/engine';

THREE.ColorManagement.enabled = false;

const withMorph = s => s.replace('${MORPH_GLSL}', MORPH_GLSL);
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

/* -------------------------------------------------------------- backdrop */
function Backdrop () {
  const uniforms = useMemo(() => ({
    uTop: { value: new THREE.Color('#12100B') },
    uBot: { value: new THREE.Color('#08070A') },
    uGlow: { value: new THREE.Color('#8C6A1E') },
    uGlowPos: { value: new THREE.Vector2(0.5, 0.55) },
    uRes: { value: new THREE.Vector2(1, 1) },
    uTime: { value: 0 },
    uStr: { value: 0.34 }
  }), []);

  useFrame(({ size }, dt) => {
    uniforms.uTop.value.copy(current.top);
    uniforms.uBot.value.copy(current.bot);
    uniforms.uGlow.value.copy(current.glow);
    uniforms.uStr.value = current.gstr;
    uniforms.uTime.value += dt;
    uniforms.uRes.value.set(size.width, size.height);
    uniforms.uGlowPos.value.set(0.5 + pointer.x * 0.06, 0.55 + pointer.y * 0.05 - scroll.p * 0.12);
  });

  return (
    <mesh frustumCulled={false} renderOrder={-100}>
      <planeGeometry args={[2, 2]} />
      <shaderMaterial
        vertexShader={BG_VERT}
        fragmentShader={BG_FRAG}
        uniforms={uniforms}
        depthTest={false}
        depthWrite={false}
      />
    </mesh>
  );
}

/* ---------------------------------------------------------- neural field */
function NeuralField ({ count, maxLines, connectDist }) {
  const pointsMat = useRef(), linesMat = useRef();

  const { pointGeo, lineGeo } = useMemo(() => {
    const L = buildLayouts(count);
    const pairs = buildConnections(L.T[1], count, L.cluster, connectDist, 3, maxLines);

    const pg = new THREE.BufferGeometry();
    pg.setAttribute('position', new THREE.BufferAttribute(L.T[0], 3));
    for (let i = 1; i < 7; i++) pg.setAttribute('aP' + i, new THREE.BufferAttribute(L.T[i], 3));
    pg.setAttribute('aSize', new THREE.BufferAttribute(L.size, 1));
    pg.setAttribute('aRand', new THREE.BufferAttribute(L.rand, 1));
    pg.setAttribute('aPhase', new THREE.BufferAttribute(L.phase, 1));
    pg.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 600);

    const nL = pairs.length / 2;
    const bufs = [];
    for (let i = 0; i < 7; i++) bufs.push(new Float32Array(nL * 2 * 3));
    const lRand = new Float32Array(nL * 2), lPhase = new Float32Array(nL * 2), lLen = new Float32Array(nL * 2);
    let maxLen = 1;

    for (let s = 0; s < nL; s++) {
      const i = pairs[s * 2], j = pairs[s * 2 + 1];
      const dx = L.T[1][i * 3] - L.T[1][j * 3];
      const dy = L.T[1][i * 3 + 1] - L.T[1][j * 3 + 1];
      const dz = L.T[1][i * 3 + 2] - L.T[1][j * 3 + 2];
      const len = Math.sqrt(dx * dx + dy * dy + dz * dz);
      if (len > maxLen) maxLen = len;
      for (let e = 0; e < 2; e++) {
        const src = e === 0 ? i : j, v = s * 2 + e;
        for (let t = 0; t < 7; t++) {
          bufs[t][v * 3] = L.T[t][src * 3];
          bufs[t][v * 3 + 1] = L.T[t][src * 3 + 1];
          bufs[t][v * 3 + 2] = L.T[t][src * 3 + 2];
        }
        lRand[v] = L.rand[i]; lPhase[v] = L.phase[i]; lLen[v] = len;
      }
    }
    for (let v = 0; v < nL * 2; v++) lLen[v] /= maxLen;

    const lg = new THREE.BufferGeometry();
    lg.setAttribute('position', new THREE.BufferAttribute(bufs[0], 3));
    for (let i = 1; i < 7; i++) lg.setAttribute('aP' + i, new THREE.BufferAttribute(bufs[i], 3));
    lg.setAttribute('aRand', new THREE.BufferAttribute(lRand, 1));
    lg.setAttribute('aPhase', new THREE.BufferAttribute(lPhase, 1));
    lg.setAttribute('aLen', new THREE.BufferAttribute(lLen, 1));
    lg.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 600);

    return { pointGeo: pg, lineGeo: lg };
  }, [count, maxLines, connectDist]);

  const pointUniforms = useMemo(() => ({
    uTime: { value: 0 }, uMorph: { value: 1 }, uSize: { value: 1 }, uDrift: { value: 0.55 },
    uEnergy: { value: 0 }, uPR: { value: Math.min(typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1, 1.5) },
    uColA: { value: new THREE.Color('#D9B44A') }, uColB: { value: new THREE.Color('#A8823A') },
    uOpacity: { value: 1 }, uFogN: { value: 60 }, uFogF: { value: 210 }
  }), []);

  const lineUniforms = useMemo(() => ({
    uTime: { value: 0 }, uMorph: { value: 1 }, uDrift: { value: 0.55 }, uEnergy: { value: 0 },
    uColA: { value: new THREE.Color('#D9B44A') }, uColB: { value: new THREE.Color('#A8823A') },
    uOpacity: { value: 0.07 }, uFogN: { value: 60 }, uFogF: { value: 210 }
  }), []);

  useFrame((_, dt) => {
    const t = pointUniforms.uTime.value + dt;
    pointUniforms.uTime.value = t;
    pointUniforms.uMorph.value = current.morph;
    pointUniforms.uSize.value = current.size * fx.sizeMul;
    pointUniforms.uDrift.value = current.drift * fx.driftMul;
    pointUniforms.uEnergy.value = fx.energy;
    pointUniforms.uColA.value.copy(current.accent);
    pointUniforms.uColB.value.copy(current.accent2);
    pointUniforms.uFogN.value = current.fogN;
    pointUniforms.uFogF.value = current.fogF;

    lineUniforms.uTime.value = t;
    lineUniforms.uMorph.value = current.morph;
    lineUniforms.uDrift.value = current.drift * fx.driftMul;
    lineUniforms.uEnergy.value = fx.energy;
    lineUniforms.uOpacity.value = current.lines * 0.155 * fx.lineMul;
    lineUniforms.uColA.value.copy(current.accent);
    lineUniforms.uColB.value.copy(current.accent2);
    lineUniforms.uFogN.value = current.fogN;
    lineUniforms.uFogF.value = current.fogF;
  });

  return (
    <>
      <points geometry={pointGeo} frustumCulled={false}>
        <shaderMaterial
          ref={pointsMat}
          vertexShader={withMorph(POINT_VERT)}
          fragmentShader={POINT_FRAG}
          uniforms={pointUniforms}
          transparent
          depthWrite={false}
          depthTest={false}
          blending={THREE.AdditiveBlending}
        />
      </points>

      <lineSegments geometry={lineGeo} frustumCulled={false}>
        <shaderMaterial
          ref={linesMat}
          vertexShader={withMorph(LINE_VERT)}
          fragmentShader={LINE_FRAG}
          uniforms={lineUniforms}
          transparent
          depthWrite={false}
          depthTest={false}
          blending={THREE.AdditiveBlending}
        />
      </lineSegments>
    </>
  );
}

/* -------------------------------------------------------------- the core */
function Core () {
  const group = useRef(), shell = useRef(), r1 = useRef(), r2 = useRef();
  const uniforms = useMemo(() => ({
    uColA: { value: new THREE.Color('#ffffff') },
    uColB: { value: new THREE.Color('#D9B44A') },
    uOpacity: { value: 0.2 }, uScale: { value: 6 }, uTime: { value: 0 }
  }), []);

  useFrame((_, dt) => {
    const t = (uniforms.uTime.value += dt);
    const cv = current.core * fx.coreMul;
    uniforms.uOpacity.value = clamp(cv * 0.16, 0, 0.5);
    uniforms.uScale.value = 4.5 + cv * 3.0;
    uniforms.uColB.value.copy(current.accent);

    if (shell.current) {
      shell.current.material.opacity = clamp(cv * 0.085, 0, 0.22);
      shell.current.rotation.y = t * 0.09;
      shell.current.rotation.x = t * 0.05;
      shell.current.scale.setScalar(0.7 + cv * 0.45);
    }
    const ringOp = clamp(cv * 0.10, 0, 0.24);
    if (r1.current) { r1.current.material.opacity = ringOp; r1.current.rotation.z = t * 0.16; r1.current.scale.setScalar(0.75 + cv * 0.35); }
    if (r2.current) { r2.current.material.opacity = ringOp; r2.current.rotation.z = -t * 0.11; r2.current.scale.setScalar(0.75 + cv * 0.35); }
    if (group.current) group.current.visible = cv > 0.02;
  });

  return (
    <group ref={group}>
      <mesh frustumCulled={false}>
        <planeGeometry args={[1, 1]} />
        <shaderMaterial
          vertexShader={GLOW_VERT}
          fragmentShader={GLOW_FRAG}
          uniforms={uniforms}
          transparent
          depthWrite={false}
          depthTest={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      <mesh ref={shell}>
        <icosahedronGeometry args={[3.1, 2]} />
        <meshBasicMaterial color="#f0d98a" wireframe transparent opacity={0.2} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>

      <mesh ref={r1} rotation={[1.15, 0, 0]}>
        <torusGeometry args={[6.2, 0.028, 3, 160]} />
        <meshBasicMaterial color="#d9b44a" transparent opacity={0.2} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
      <mesh ref={r2} rotation={[-0.7, 0.5, 0]}>
        <torusGeometry args={[8.4, 0.02, 3, 180]} />
        <meshBasicMaterial color="#d9b44a" transparent opacity={0.2} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
    </group>
  );
}

/* --------------------------------------------------------------- the rig */
const _look = new THREE.Vector3();

function Rig () {
  const { camera } = useThree();
  useFrame((_, delta) => {
    const dt = Math.min(0.08, delta);
    stepStory(dt);
    syncCSSVars();
    camera.position.set(
      current.cam.x + pointer.x * 4.5,
      current.cam.y + pointer.y * 3.2,
      current.cam.z
    );
    _look.set(current.look.x - pointer.x * 1.6, current.look.y - pointer.y * 1.2, current.look.z);
    camera.lookAt(_look);
    camera.rotation.z = pointer.x * 0.018;
  });
  return null;
}

/* ------------------------------------------------------------- the scene */
export default function Experience ({ quality = 'high' }) {
  const low = quality === 'low';
  const dpr = low ? [1, 1.25] : [1, 1.5];

  return (
    <Canvas
      id="gl"
      flat
      linear
      dpr={dpr}
      gl={{ antialias: !low, powerPreference: 'high-performance', stencil: false, alpha: false, depth: true }}
      camera={{ fov: 46, near: 0.5, far: 1400, position: [0, 0, 70] }}
      style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none' }}
      onCreated={({ gl }) => gl.setClearColor(0x04040a, 1)}
    >
      <Suspense fallback={null}>
        <Backdrop />
        <NeuralField
          count={low ? 1400 : 2600}
          maxLines={low ? 1800 : 3800}
          connectDist={low ? 8.4 : 7.5}
        />
        <Core />
        <Rig />
        {!low && (
          <EffectComposer disableNormalPass multisampling={0}>
            <Bloom intensity={0.5} luminanceThreshold={0.28} luminanceSmoothing={0.2} mipmapBlur radius={0.55} />
          </EffectComposer>
        )}
      </Suspense>
    </Canvas>
  );
}

'use client';

/**
 * A soft pastel gradient skydome (procedural, no network). A large back-side
 * sphere shaded from a pale horizon to a warm-blue zenith — the cel-shaded,
 * open-air backdrop. Uses a tiny ShaderMaterial (no scene fog) so the gradient
 * stays crisp behind the fogged ground.
 */
import { useEffect, useMemo } from 'react';
import * as THREE from 'three';

export interface GradientSkyProps {
  top?: string;
  bottom?: string;
  radius?: number;
}

export function GradientSky({ top = '#8fc4f0', bottom = '#eaf6ef', radius = 420 }: GradientSkyProps) {
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        uniforms: {
          uTop: { value: new THREE.Color(top) },
          uBottom: { value: new THREE.Color(bottom) },
        },
        vertexShader: /* glsl */ `
          varying vec3 vPos;
          void main() {
            vPos = position;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: /* glsl */ `
          varying vec3 vPos;
          uniform vec3 uTop;
          uniform vec3 uBottom;
          void main() {
            float h = clamp(normalize(vPos).y * 0.5 + 0.5, 0.0, 1.0);
            vec3 c = mix(uBottom, uTop, smoothstep(0.0, 0.9, h));
            gl_FragColor = vec4(c, 1.0);
          }
        `,
      }),
    [top, bottom],
  );

  useEffect(() => () => material.dispose(), [material]);

  return (
    <mesh scale={radius} frustumCulled={false}>
      <sphereGeometry args={[1, 32, 16]} />
      <primitive object={material} attach="material" />
    </mesh>
  );
}

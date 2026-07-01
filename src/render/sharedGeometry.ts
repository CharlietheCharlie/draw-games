/**
 * Module-singleton GPU resources shared by every avatar/scene cube.
 *
 * A cel-shading (toon) look: one small gradient ramp gives banded, painterly
 * shading; materials are cached per colour as MeshToonMaterial. Two shared unit
 * geometries — a soft RoundedBox for bodies and a sharp Box for tiny face
 * details — are scaled per part. Because these are shared and live for the app's
 * lifetime, meshes using them MUST set `dispose={null}` so React Three Fiber
 * doesn't dispose a resource other meshes still need on unmount.
 */
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three-stdlib';

/** Sharp unit cube — for tiny, crisp face details (eyes, mouth). */
export const UNIT_BOX = new THREE.BoxGeometry(1, 1, 1);

/** Soft unit cube — the friendly, rounded body parts. */
export const UNIT_ROUNDED = new RoundedBoxGeometry(1, 1, 1, 4, 0.16);

/** A stepped gradient ramp → hard cel-shading bands. */
const toonGradient = (() => {
  const steps = 4;
  const data = new Uint8Array(steps);
  for (let i = 0; i < steps; i++) data[i] = Math.round((i / (steps - 1)) * 255);
  const tex = new THREE.DataTexture(data, steps, 1, THREE.RedFormat);
  tex.minFilter = THREE.NearestFilter;
  tex.magFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  tex.needsUpdate = true;
  return tex;
})();

const toonCache = new Map<string, THREE.MeshToonMaterial>();

/** A shared, cached cel-shaded material for a hex colour. */
export function getToonMaterial(color: string): THREE.MeshToonMaterial {
  let mat = toonCache.get(color);
  if (!mat) {
    mat = new THREE.MeshToonMaterial({ color, gradientMap: toonGradient });
    toonCache.set(color, mat);
  }
  return mat;
}

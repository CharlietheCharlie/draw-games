/**
 * Module-singleton GPU resources shared by every avatar cube.
 *
 * One unit BoxGeometry (scaled per-part via mesh.scale) and one cached
 * MeshStandardMaterial per colour means all 12 characters reuse a tiny, fixed
 * set of GPU resources. Because these are shared and live for the app's
 * lifetime, meshes that use them MUST set `dispose={null}` so React Three Fiber
 * doesn't dispose a resource other meshes still need on unmount.
 */
import * as THREE from 'three';

/** Unit cube centred at the origin; scale it to size the part. */
export const UNIT_BOX = new THREE.BoxGeometry(1, 1, 1);

const materialCache = new Map<string, THREE.MeshStandardMaterial>();

/** A shared, cached standard material for a hex colour. Flat-shaded for a voxel look. */
export function getStandardMaterial(color: string): THREE.MeshStandardMaterial {
  let mat = materialCache.get(color);
  if (!mat) {
    mat = new THREE.MeshStandardMaterial({
      color,
      roughness: 0.75,
      metalness: 0.02,
      flatShading: true,
    });
    materialCache.set(color, mat);
  }
  return mat;
}

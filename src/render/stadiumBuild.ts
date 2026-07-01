/**
 * Geometry helpers for the stadium environment (grandstand rake + roof canopy).
 * Builds a "bowl" — a triangle-strip ring following the stadium outline that
 * slopes from an inner/lower edge to an outer/higher edge.
 */
import * as THREE from 'three';
import { pathPoint } from '@/core/geometry/stadium';

/**
 * A sloped ring surface between two stadium outlines.
 * @param straight  stadium straight length
 * @param r0,y0     inner edge radius/height
 * @param r1,y1     outer edge radius/height
 * @param uStart,uEnd  parameter range along the lap (wraps); full ring = 0..1
 */
export function makeBowlGeometry(
  straight: number,
  r0: number,
  y0: number,
  r1: number,
  y1: number,
  uStart: number,
  uEnd: number,
  segments = 160,
): THREE.BufferGeometry {
  const positions: number[] = [];
  const indices: number[] = [];

  for (let i = 0; i <= segments; i++) {
    const u = uStart + (uEnd - uStart) * (i / segments);
    const a = pathPoint(straight, r0, u);
    const b = pathPoint(straight, r1, u);
    positions.push(a.x, y0, a.z);
    positions.push(b.x, y1, b.z);
  }
  for (let i = 0; i < segments; i++) {
    const bl = i * 2;
    const tl = i * 2 + 1;
    const br = (i + 1) * 2;
    const tr = (i + 1) * 2 + 1;
    indices.push(bl, tl, tr, bl, tr, br);
  }

  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  g.setIndex(indices);
  g.computeVertexNormals();
  return g;
}

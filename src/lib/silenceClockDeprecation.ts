/**
 * react-three-fiber 9.x still instantiates the deprecated `THREE.Clock`
 * internally (its store hardcodes `clock: new THREE.Clock()`), so three r183+
 * logs
 *   "THREE.Clock: This module has been deprecated. Please use THREE.Timer instead."
 * on every <Canvas> mount. We neither create nor control that Clock, so instead
 * of monkey-patching the global `console`, we use three's own official console
 * hook (`setConsoleFunction`, added in r185) to drop *only* that one line and
 * forward every other three log/warn/error untouched.
 *
 * TODO: remove once @react-three/fiber ships a stable release built on
 * THREE.Timer (currently only in the 10.0.0-alpha line).
 */
import { setConsoleFunction, getConsoleFunction } from 'three';

let installed = false;

export function silenceClockDeprecation(): void {
  if (installed) return;
  installed = true;

  // Chain onto any previously-installed handler so we don't clobber it.
  const prev = getConsoleFunction();

  setConsoleFunction((type, message, ...params) => {
    if (type === 'warn' && message.includes('Clock: This module has been deprecated')) {
      return; // swallow the R3F-triggered Clock deprecation noise only
    }
    if (prev) {
      prev(type, message, ...params);
      return;
    }
    // No prior handler: mirror three's default routing so nothing else is lost.
    const sink = type === 'warn' ? console.warn : type === 'error' ? console.error : console.log;
    sink(message, ...params);
  });
}

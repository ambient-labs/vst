import invariant from 'invariant';
import { el } from '@elemaudio/core';

// Our main stereo reverb.
//
// Upmixes the stereo input into an 8-channel diffusion network and
// feedback delay network. Must supply a `key` prop to uniquely identify the
// feedback taps in here.
//
// @param {object} props
// @param {number} props.size in [0, 1]
// @param {number} props.decay in [0, 1]
// @param {number} props.mod in [0, 1]
// @param {number} props.mix in [0, 1]
// @param {core.Node} xl input
// @param {core.Node} xr input
export default function srvb(props, xl, xr) {
  invariant(typeof props === 'object', 'Unexpected props object');

  // Get decay parameter and smooth it
  const decay = el.sm(props.decay);

  // Clamp decay to [0, 1] range using Elementary functions
  // el.max(0.0, ...) ensures volume is at least 0.0
  // el.min(1.0, ...) ensures volume is at most 1.0
  const volume = el.max(0.0, el.min(1.0, decay));

  // Apply volume control
  return [
    el.mul(volume, xl),
    el.mul(volume, xr),
  ];
}

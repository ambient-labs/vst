import invariant from 'invariant';
import { el } from '@elemaudio/core';

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

import invariant from 'invariant';
import { el } from '@elemaudio/core';

export default function srvb(props, xl, xr) {
  invariant(typeof props === 'object', 'Unexpected props object');

  const volume = el.max(0.0, el.min(1.0, el.sm(props.decay)));

  // Apply volume control
  return [
    el.mul(volume, xl),
    el.mul(volume, xr),
  ];
}

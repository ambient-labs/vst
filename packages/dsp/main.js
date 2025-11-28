import { Renderer, el } from '@elemaudio/core';
import { RefMap } from './RefMap.js';
import srvb from './srvb.js';

// This project demonstrates writing a small FDN reverb effect in Elementary.
//
// First, we initialize a custom Renderer instance that marshals our instruction
// batches through the __postNativeMessage__ function to direct the underlying native
// engine.
const core = new Renderer((batch) => {
  console.log('Renderer: sending batch, length:', batch.length);
  __postNativeMessage__(JSON.stringify(batch));
});

// Next, a RefMap for coordinating our refs
const refs = new RefMap(core);

// Holding onto the previous state allows us a quick way to differentiate
// when we need to fully re-render versus when we can just update refs
let prevState = null;

function shouldRender(prev, nextState) {
  return (prev === null) || (prev.sampleRate !== nextState.sampleRate);
}

// The important piece: here we register a state change callback with the native
// side. This callback will be hit with the current processor state any time that
// state changes.
//
// Given the new state, we simply update our refs or perform a full render depending
// on the result of our `shouldRender` check.
globalThis.__receiveStateChange__ = (serializedState) => {
  const state = JSON.parse(serializedState);
  console.log('State change received, sampleRate:', state.sampleRate);

  if (shouldRender(prevState, state)) {
    const stats = core.render(...srvb({
      key: 'srvb',
      sampleRate: state.sampleRate,
      decay: refs.getOrCreate('decay', 'const', { value: state.decay }, []),
    }, el.in({ channel: 0 }), el.in({ channel: 1 })));
    console.log('Render stats:', stats);
  } else {
    refs.update('decay', { value: state.decay });
  }

  prevState = state;
};

// NOTE: This is highly experimental and should not yet be relied on
// as a consistent feature.
//
// This hook allows the native side to inject serialized graph state from
// the running elem::Runtime instance so that we can throw away and reinitialize
// the JavaScript engine and then inject necessary state for coordinating with
// the underlying engine.
globalThis.__receiveHydrationData__ = (data) => {
  const payload = JSON.parse(data);
  console.log('Hydrating', Object.keys(payload).length, 'nodes');
  const nodeMap = core._delegate.nodeMap;

  for (const [k, v] of Object.entries(payload)) {
    nodeMap.set(parseInt(k, 16), {
      symbol: '__ELEM_NODE__',
      kind: '__HYDRATED__',
      hash: parseInt(k, 16),
      props: v,
      generation: {
        current: 0,
      },
    });
  }
  console.log('Hydrated nodeMap size:', nodeMap.size);
};

// Finally, an error callback which just logs back to native
globalThis.__receiveError__ = (err) => {
  console.log(`[Error: ${err.name}] ${err.message}`);
};

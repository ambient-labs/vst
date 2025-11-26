import { describe, it, expect } from 'vitest';
import OfflineRenderer from '@elemaudio/offline-renderer';
import { el } from '@elemaudio/core';
import srvb from '../packages/dsp/srvb.js';

const SAMPLE_RATE = 44100;
const BLOCK_SIZE = 512;

describe('Audio Processing', () => {
  it('should process stereo audio without errors', async () => {
    const core = new OfflineRenderer();

    await core.initialize({
      numInputChannels: 2,
      numOutputChannels: 2,
      sampleRate: SAMPLE_RATE,
    });

    // Create test input signals with const nodes
    const leftInput = el.in({ channel: 0 });
    const rightInput = el.in({ channel: 1 });

    // Process through srvb with full volume and render
    await core.render(
      ...srvb({ key: 'test', decay: el.const({ key: 'decay', value: 1.0 }), sampleRate: SAMPLE_RATE }, leftInput, rightInput)
    );

    // Create input buffers with test signal
    const inputLeft = new Float32Array(BLOCK_SIZE).fill(0.5);
    const inputRight = new Float32Array(BLOCK_SIZE).fill(0.5);

    // Create output buffers
    const outputLeft = new Float32Array(BLOCK_SIZE);
    const outputRight = new Float32Array(BLOCK_SIZE);

    // Process audio
    core.process(
      [inputLeft, inputRight],
      [outputLeft, outputRight]
    );

    // Verify output is defined and has data
    expect(outputLeft).toBeDefined();
    expect(outputRight).toBeDefined();
    expect(outputLeft.length).toBe(BLOCK_SIZE);
    expect(outputRight.length).toBe(BLOCK_SIZE);
  });

  it('should handle left and right channels independently', async () => {
    const core = new OfflineRenderer();

    await core.initialize({
      numInputChannels: 2,
      numOutputChannels: 2,
      sampleRate: SAMPLE_RATE,
    });

    // Create test input signals
    const leftInput = el.in({ channel: 0 });
    const rightInput = el.in({ channel: 1 });

    // Process through srvb and render
    await core.render(
      ...srvb({ key: 'test2', decay: el.const({ key: 'decay2', value: 1.0 }), sampleRate: SAMPLE_RATE }, leftInput, rightInput)
    );

    // Create different input signals for left and right
    const inputLeft = new Float32Array(BLOCK_SIZE).fill(0.8);
    const inputRight = new Float32Array(BLOCK_SIZE).fill(0.4);

    const outputLeft = new Float32Array(BLOCK_SIZE);
    const outputRight = new Float32Array(BLOCK_SIZE);

    core.process(
      [inputLeft, inputRight],
      [outputLeft, outputRight]
    );

    // Verify channels are processed independently (not swapped or mixed)
    // Note: el.sm() smoothing means volume ramps up over time, so we may not reach
    // full target volume in a single 512-sample block
    const avgLeft = outputLeft.reduce((sum, val) => sum + Math.abs(val), 0) / BLOCK_SIZE;
    const avgRight = outputRight.reduce((sum, val) => sum + Math.abs(val), 0) / BLOCK_SIZE;

    // Main test: verify channels maintain their relative levels (not swapped/mixed)
    // Left input (0.8) should produce higher output than right input (0.4)
    expect(avgLeft).toBeGreaterThan(avgRight);

    // Verify both channels produce some output (not silent or zero)
    expect(avgLeft).toBeGreaterThan(0);
    expect(avgRight).toBeGreaterThan(0);

    // Verify left output is roughly 2x right output (0.8 vs 0.4 input ratio)
    const ratio = avgLeft / avgRight;
    expect(ratio).toBeGreaterThan(1.5);
    expect(ratio).toBeLessThan(2.5);
  });

  it('should process silence to silence', async () => {
    const core = new OfflineRenderer();

    await core.initialize({
      numInputChannels: 2,
      numOutputChannels: 2,
      sampleRate: SAMPLE_RATE,
    });

    const leftInput = el.in({ channel: 0 });
    const rightInput = el.in({ channel: 1 });

    await core.render(
      ...srvb({ key: 'test3', decay: el.const({ key: 'decay3', value: 1.0 }), sampleRate: SAMPLE_RATE }, leftInput, rightInput)
    );

    // Silent input
    const inputLeft = new Float32Array(BLOCK_SIZE).fill(0.0);
    const inputRight = new Float32Array(BLOCK_SIZE).fill(0.0);

    const outputLeft = new Float32Array(BLOCK_SIZE);
    const outputRight = new Float32Array(BLOCK_SIZE);

    core.process(
      [inputLeft, inputRight],
      [outputLeft, outputRight]
    );

    // Verify output is also silent
    const maxLeft = Math.max(...outputLeft.map(Math.abs));
    const maxRight = Math.max(...outputRight.map(Math.abs));

    expect(maxLeft).toBe(0);
    expect(maxRight).toBe(0);
  });
});

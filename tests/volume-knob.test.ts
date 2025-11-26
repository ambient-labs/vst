import { describe, it, expect } from 'vitest';
import OfflineRenderer from '@elemaudio/offline-renderer';
import { el } from '@elemaudio/core';
import srvb from '../dsp/srvb.js';

const SAMPLE_RATE = 44100;
const BLOCK_SIZE = 512;

describe('Volume Knob Behavior', () => {
  it('should produce complete silence at 0% volume (decay=0.0)', async () => {
    const core = new OfflineRenderer();

    await core.initialize({
      numInputChannels: 2,
      numOutputChannels: 2,
      sampleRate: SAMPLE_RATE,
    });

    const leftInput = el.in({ channel: 0 });
    const rightInput = el.in({ channel: 1 });

    // Render with 0% volume
    await core.render(
      ...srvb({ key: 'volume0', decay: el.const({ key: 'decay0', value: 0.0 }), sampleRate: SAMPLE_RATE }, leftInput, rightInput)
    );

    // Create test input signal
    const inputLeft = new Float32Array(BLOCK_SIZE).fill(0.5);
    const inputRight = new Float32Array(BLOCK_SIZE).fill(0.5);

    const outputLeft = new Float32Array(BLOCK_SIZE);
    const outputRight = new Float32Array(BLOCK_SIZE);

    core.process(
      [inputLeft, inputRight],
      [outputLeft, outputRight]
    );

    // Verify output is completely silent
    const maxLeft = Math.max(...outputLeft.map(Math.abs));
    const maxRight = Math.max(...outputRight.map(Math.abs));

    expect(maxLeft).toBe(0);
    expect(maxRight).toBe(0);
  });

  it('should produce 0.5x amplitude at 50% volume (decay=0.5)', async () => {
    const core = new OfflineRenderer();

    await core.initialize({
      numInputChannels: 2,
      numOutputChannels: 2,
      sampleRate: SAMPLE_RATE,
    });

    const leftInput = el.in({ channel: 0 });
    const rightInput = el.in({ channel: 1 });

    // Render with 50% volume
    await core.render(
      ...srvb({ key: 'volume50', decay: el.const({ key: 'decay50', value: 0.5 }), sampleRate: SAMPLE_RATE }, leftInput, rightInput)
    );

    // Create test input signal with known amplitude
    const inputAmplitude = 0.8;
    const inputLeft = new Float32Array(BLOCK_SIZE).fill(inputAmplitude);
    const inputRight = new Float32Array(BLOCK_SIZE).fill(inputAmplitude);

    const outputLeft = new Float32Array(BLOCK_SIZE);
    const outputRight = new Float32Array(BLOCK_SIZE);

    // Process multiple blocks to let smoothing settle
    for (let i = 0; i < 10; i++) {
      core.process(
        [inputLeft, inputRight],
        [outputLeft, outputRight]
      );
    }

    // Calculate average amplitude (should be close to 0.5x input)
    const avgLeft = outputLeft.reduce((sum, val) => sum + Math.abs(val), 0) / BLOCK_SIZE;
    const avgRight = outputRight.reduce((sum, val) => sum + Math.abs(val), 0) / BLOCK_SIZE;

    const expectedAmplitude = inputAmplitude * 0.5;

    // Verify linear scaling with tolerance for smoothing
    expect(avgLeft).toBeCloseTo(expectedAmplitude, 1);
    expect(avgRight).toBeCloseTo(expectedAmplitude, 1);
  });

  it('should produce unity gain at 100% volume (decay=1.0)', async () => {
    const core = new OfflineRenderer();

    await core.initialize({
      numInputChannels: 2,
      numOutputChannels: 2,
      sampleRate: SAMPLE_RATE,
    });

    const leftInput = el.in({ channel: 0 });
    const rightInput = el.in({ channel: 1 });

    // Render with 100% volume
    await core.render(
      ...srvb({ key: 'volume100', decay: el.const({ key: 'decay100', value: 1.0 }), sampleRate: SAMPLE_RATE }, leftInput, rightInput)
    );

    // Create test input signal with known amplitude
    const inputAmplitude = 0.7;
    const inputLeft = new Float32Array(BLOCK_SIZE).fill(inputAmplitude);
    const inputRight = new Float32Array(BLOCK_SIZE).fill(inputAmplitude);

    const outputLeft = new Float32Array(BLOCK_SIZE);
    const outputRight = new Float32Array(BLOCK_SIZE);

    // Process multiple blocks to let smoothing settle
    for (let i = 0; i < 10; i++) {
      core.process(
        [inputLeft, inputRight],
        [outputLeft, outputRight]
      );
    }

    // Calculate average amplitude (should equal input at unity gain)
    const avgLeft = outputLeft.reduce((sum, val) => sum + Math.abs(val), 0) / BLOCK_SIZE;
    const avgRight = outputRight.reduce((sum, val) => sum + Math.abs(val), 0) / BLOCK_SIZE;

    // Verify unity gain with tolerance for smoothing
    expect(avgLeft).toBeCloseTo(inputAmplitude, 1);
    expect(avgRight).toBeCloseTo(inputAmplitude, 1);
  });

  it('should verify linear volume scaling across different levels', async () => {
    const core = new OfflineRenderer();

    await core.initialize({
      numInputChannels: 2,
      numOutputChannels: 2,
      sampleRate: SAMPLE_RATE,
    });

    const leftInput = el.in({ channel: 0 });
    const rightInput = el.in({ channel: 1 });

    const inputAmplitude = 1.0;
    const inputLeft = new Float32Array(BLOCK_SIZE).fill(inputAmplitude);
    const inputRight = new Float32Array(BLOCK_SIZE).fill(inputAmplitude);

    const volumeLevels = [0.0, 0.25, 0.5, 0.75, 1.0];
    const results = [];

    for (const volume of volumeLevels) {
      // Render with specific volume level
      await core.render(
        ...srvb({ key: `linear${volume}`, decay: el.const({ key: `decay${volume}`, value: volume }), sampleRate: SAMPLE_RATE }, leftInput, rightInput)
      );

      const outputLeft = new Float32Array(BLOCK_SIZE);
      const outputRight = new Float32Array(BLOCK_SIZE);

      // Process multiple blocks to let smoothing settle
      for (let i = 0; i < 10; i++) {
        core.process(
          [inputLeft, inputRight],
          [outputLeft, outputRight]
        );
      }

      const avgLeft = outputLeft.reduce((sum, val) => sum + Math.abs(val), 0) / BLOCK_SIZE;
      results.push({ volume, output: avgLeft });
    }

    // Verify linear relationship between volume and output
    for (let i = 0; i < results.length; i++) {
      const expected = results[i].volume * inputAmplitude;
      expect(results[i].output).toBeCloseTo(expected, 1);
    }
  });

  it('should apply smoothing to prevent audio clicks/pops', async () => {
    const core = new OfflineRenderer();

    await core.initialize({
      numInputChannels: 2,
      numOutputChannels: 2,
      sampleRate: SAMPLE_RATE,
    });

    const leftInput = el.in({ channel: 0 });
    const rightInput = el.in({ channel: 1 });

    // Start with 0% volume
    await core.render(
      ...srvb({ key: 'smooth', decay: el.const({ key: 'decaySmooth', value: 0.0 }), sampleRate: SAMPLE_RATE }, leftInput, rightInput)
    );

    const inputLeft = new Float32Array(BLOCK_SIZE).fill(1.0);
    const inputRight = new Float32Array(BLOCK_SIZE).fill(1.0);

    const outputLeft = new Float32Array(BLOCK_SIZE);
    const outputRight = new Float32Array(BLOCK_SIZE);

    // Process first block
    core.process(
      [inputLeft, inputRight],
      [outputLeft, outputRight]
    );

    // Change volume to 100% (this would cause a click without smoothing)
    await core.render(
      ...srvb({ key: 'smooth', decay: el.const({ key: 'decaySmooth', value: 1.0 }), sampleRate: SAMPLE_RATE }, leftInput, rightInput)
    );

    // Process second block
    const outputLeft2 = new Float32Array(BLOCK_SIZE);
    const outputRight2 = new Float32Array(BLOCK_SIZE);

    core.process(
      [inputLeft, inputRight],
      [outputLeft2, outputRight2]
    );

    // Verify smoothing: output should gradually ramp up, not jump instantly
    // The first sample of the second block should be less than full volume
    expect(Math.abs(outputLeft2[0])).toBeLessThan(1.0);

    // Later samples should approach full volume
    const lastSample = Math.abs(outputLeft2[BLOCK_SIZE - 1]);
    expect(lastSample).toBeGreaterThan(Math.abs(outputLeft2[0]));
  });
});

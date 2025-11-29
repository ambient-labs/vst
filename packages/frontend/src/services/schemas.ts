import { z } from 'zod';

/**
 * Schema for a DSP parameter that can be controlled in the UI
 */
export const parameterSchema = z.object({
  name: z.string().describe('Parameter name in camelCase'),
  min: z.number().describe('Minimum value'),
  max: z.number().describe('Maximum value'),
  default: z.number().describe('Default value'),
  unit: z.string().optional().describe('Unit of measurement (e.g., "Hz", "dB", "ms")'),
});

/**
 * Schema for generated DSP code response
 */
export const dspCodeSchema = z.object({
  code: z.string().describe('Complete ElementaryJS DSP code'),
  explanation: z.string().describe('What the code does'),
  parameters: z.array(parameterSchema).describe('Controllable parameters'),
});

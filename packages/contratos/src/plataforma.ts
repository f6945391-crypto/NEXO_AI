import { z } from 'zod';

// GET /salud — T-001
export const SaludRespuesta = z.strictObject({
  estado: z.literal('ok'),
});

export type SaludRespuesta = z.infer<typeof SaludRespuesta>;

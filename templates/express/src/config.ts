import process from 'node:process';

import { z } from 'zod';

const EnvSchema = z.object({
  PORT: z.coerce.number().int()
    .positive()
    .default(3000),
  LOG_LEVEL: z
    .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace'])
    .default('info'),
});

export type Config = z.infer<typeof EnvSchema>;

export const config: Config = EnvSchema.parse(process.env);

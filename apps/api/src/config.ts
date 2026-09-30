import { z } from 'zod';

const ConfigSchema = z.object({
  ANTHROPIC_API_KEY: z.string().min(1, 'ANTHROPIC_API_KEY is required'),
  PORT: z.coerce.number().int().positive().default(8787),
  RATE_LIMIT_PER_HOUR: z.coerce.number().int().positive().default(20),
});

export type Config = z.infer<typeof ConfigSchema>;

/** Fails fast at startup when required settings are missing. */
export function loadConfig(env: NodeJS.ProcessEnv): Config {
  const result = ConfigSchema.safeParse(env);
  if (!result.success) {
    const issues = result.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`);
    throw new Error(`Invalid configuration:\n${issues.join('\n')}`);
  }
  return result.data;
}

export interface Logger {
  info(message: string, meta?: Record<string, unknown>): void;
  error(message: string, meta?: Record<string, unknown>): void;
}

function serializeError(error: unknown): unknown {
  if (!(error instanceof Error)) return error;
  return { name: error.name, message: error.message, cause: serializeError(error.cause) };
}

/** Structured JSON logs on stdout/stderr. Replace with pino if volume grows. */
export const jsonLogger: Logger = {
  info: (message, meta) => {
    process.stdout.write(`${JSON.stringify({ level: 'info', message, ...meta })}\n`);
  },
  error: (message, meta) => {
    const entry = { level: 'error', message, ...meta, error: serializeError(meta?.error) };
    process.stderr.write(`${JSON.stringify(entry)}\n`);
  },
};

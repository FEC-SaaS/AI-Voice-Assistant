type LogLevel = "debug" | "info" | "warn" | "error";

const isDev = process.env.NODE_ENV === "development";

function formatMessage(module: string, level: LogLevel, args: unknown[]): [string, ...unknown[]] {
  const prefix = `[${module}]`;
  const first = args[0];
  if (typeof first === "string") {
    return [`${prefix} ${first}`, ...args.slice(1)];
  }
  return [prefix, ...args];
}

function createLogger(module: string) {
  return {
    debug(...args: unknown[]) {
      if (isDev) {
        const [msg, ...rest] = formatMessage(module, "debug", args);
        console.debug(msg, ...rest);
      }
    },
    info(...args: unknown[]) {
      if (isDev) {
        const [msg, ...rest] = formatMessage(module, "info", args);
        console.info(msg, ...rest);
      }
    },
    warn(...args: unknown[]) {
      const [msg, ...rest] = formatMessage(module, "warn", args);
      console.warn(msg, ...rest);
    },
    error(...args: unknown[]) {
      const [msg, ...rest] = formatMessage(module, "error", args);
      console.error(msg, ...rest);
    },
  };
}

export { createLogger };
export type Logger = ReturnType<typeof createLogger>;

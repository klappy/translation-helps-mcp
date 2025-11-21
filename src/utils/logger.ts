interface LogContext {
  [key: string]: any;
}

class Logger {
  info(message: string, context?: LogContext): void {
    // MCP STDIO servers must write to stderr, not stdout
    // Writing to stdout corrupts JSON-RPC messages
    console.error(`[INFO] ${message}`, context ? JSON.stringify(context) : "");
  }

  error(message: string, context?: LogContext): void {
    console.error(`[ERROR] ${message}`, context ? JSON.stringify(context) : "");
  }

  warn(message: string, context?: LogContext): void {
    console.warn(`[WARN] ${message}`, context ? JSON.stringify(context) : "");
  }

  debug(message: string, context?: LogContext): void {
    console.debug(`[DEBUG] ${message}`, context ? JSON.stringify(context) : "");
  }
}

export const logger = new Logger();

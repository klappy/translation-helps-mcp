class Logger {
  info(message, context) {
    // MCP STDIO servers must write to stderr, not stdout
    // Writing to stdout corrupts JSON-RPC messages
    console.error(`[INFO] ${message}`, context ? JSON.stringify(context) : "");
  }
  error(message, context) {
    console.error(`[ERROR] ${message}`, context ? JSON.stringify(context) : "");
  }
  warn(message, context) {
    console.warn(`[WARN] ${message}`, context ? JSON.stringify(context) : "");
  }
  debug(message, context) {
    console.debug(`[DEBUG] ${message}`, context ? JSON.stringify(context) : "");
  }
}
export const logger = new Logger();
//# sourceMappingURL=logger.js.map

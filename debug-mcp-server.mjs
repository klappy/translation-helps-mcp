#!/usr/bin/env node

/**
 * Debug MCP Server for Cursor
 * This wraps the MCP server and logs all communication for debugging
 */

import { spawn } from "child_process";
import { resolve } from "path";
import { writeFileSync, appendFileSync } from "fs";

const logFile = "./mcp-debug.log";
writeFileSync(
  logFile,
  `=== MCP Debug Session Started at ${new Date().toISOString()} ===\n\n`,
);

function log(message) {
  const entry = `[${new Date().toISOString()}] ${message}\n`;
  console.error(entry.trim());
  appendFileSync(logFile, entry);
}

log("🚀 Starting MCP server with debugging...");

const serverPath = resolve("./src/index.ts");
const server = spawn("npx", ["tsx", serverPath], {
  stdio: ["pipe", "pipe", "pipe"],
  shell: true,
  cwd: process.cwd(),
});

log(`Server spawned with PID: ${server.pid}`);
log(`Working directory: ${process.cwd()}`);
log(`Server path: ${serverPath}`);

// Forward stdin from parent to server
process.stdin.pipe(server.stdin);

// Forward server stdout to parent stdout, but also log it
server.stdout.on("data", (data) => {
  const str = data.toString();
  log(`📤 SERVER OUTPUT: ${str}`);
  process.stdout.write(data);
});

// Log server stderr
server.stderr.on("data", (data) => {
  const str = data.toString();
  log(`📛 SERVER ERROR: ${str}`);
});

// Log stdin from Cursor
process.stdin.on("data", (data) => {
  const str = data.toString();
  log(`📥 RECEIVED FROM CURSOR: ${str}`);
});

server.on("error", (error) => {
  log(`❌ Server process error: ${error.message}`);
  process.exit(1);
});

server.on("exit", (code, signal) => {
  log(`🛑 Server exited with code ${code}, signal ${signal}`);
  process.exit(code || 0);
});

process.on("SIGINT", () => {
  log("⚠️ Received SIGINT, shutting down...");
  server.kill();
  process.exit(0);
});

process.on("SIGTERM", () => {
  log("⚠️ Received SIGTERM, shutting down...");
  server.kill();
  process.exit(0);
});

log("✅ Debug wrapper ready, waiting for requests...");

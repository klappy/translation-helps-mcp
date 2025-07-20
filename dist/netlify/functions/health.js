/**
 * Health Check Endpoint
 * GET /api/health
 */
import { readFileSync } from "fs";
import { join } from "path";
import { cache } from "./_shared/cache";
// Read version from package.json
function getAppVersion() {
    try {
        const packageJsonPath = join(process.cwd(), "package.json");
        const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8"));
        return packageJson.version;
    }
    catch (error) {
        console.warn("Failed to read version from package.json, using fallback");
        return "3.5.0"; // Fallback version
    }
}
const VERSION = getAppVersion(); // Get version from package.json
export const handler = async (event, context) => {
    console.log("Health check requested");
    const headers = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Content-Type": "application/json",
    };
    // Handle CORS preflight
    if (event.httpMethod === "OPTIONS") {
        return {
            statusCode: 200,
            headers,
            body: "",
        };
    }
    if (event.httpMethod !== "GET") {
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({
                error: "Method not allowed",
                message: "This endpoint only accepts GET requests",
            }),
        };
    }
    try {
        const response = {
            status: "healthy",
            timestamp: new Date().toISOString(),
            version: VERSION,
            environment: process.env.NODE_ENV || "production",
            endpoints: [
                "/api/health",
                "/api/fetch-resources",
                "/api/search-resources",
                "/api/get-context",
                "/api/get-languages",
                "/api/extract-references",
            ],
            uptime: process.uptime(),
            memoryUsage: process.memoryUsage(),
            cache: cache.getStats(),
        };
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify(response, null, 2),
        };
    }
    catch (error) {
        console.error("Health check error:", error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                status: "unhealthy",
                error: "Internal server error",
                timestamp: new Date().toISOString(),
            }),
        };
    }
};

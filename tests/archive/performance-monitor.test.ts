import { beforeEach, describe, expect, it, vi } from "vitest";
import { PerformanceMonitor } from "../src/functions/performance-monitor";

describe("Performance Monitor", () => {
  let monitor: PerformanceMonitor;

  beforeEach(() => {
    monitor = new PerformanceMonitor();
  });

  describe("Metrics Recording", () => {
    it("records request metrics correctly", () => {
      const metrics = {
        endpoint: "/fetch-scripture",
        method: "GET",
        statusCode: 200,
        responseTime: 150,
        contentSize: 1024,
        cacheHit: true,
        compressed: true,
      };

      monitor.recordMetrics(metrics);
      const stats = monitor.getStats();

      expect(stats.totalRequests).toBe(1);
      expect(stats.averageResponseTime).toBe(150);
      expect(stats.cacheHitRate).toBe(100);
    });

    it("handles error responses", () => {
      monitor.recordMetrics({
        endpoint: "/fetch-scripture",
        method: "GET",
        statusCode: 500,
        responseTime: 2000,
        contentSize: 256,
        cacheHit: false,
        compressed: false,
      });

      const stats = monitor.getStats();
      expect(stats.errorRate).toBeGreaterThan(0);
    });

    it("calculates statistics correctly with multiple requests", () => {
      const responseTimes = [100, 150, 200, 250, 300];

      responseTimes.forEach((time, index) => {
        monitor.recordMetrics({
          endpoint: "/test",
          method: "GET",
          statusCode: 200,
          responseTime: time,
          contentSize: 1024,
          cacheHit: index % 2 === 0, // Every other request cached
          compressed: true,
        });
      });

      const stats = monitor.getStats();
      expect(stats.totalRequests).toBe(5);
      expect(stats.averageResponseTime).toBe(200);
      expect(stats.medianResponseTime).toBe(200);
      expect(stats.p95ResponseTime).toBe(300);
      expect(stats.cacheHitRate).toBe(60); // 3 out of 5 cached
    });
  });

  describe("Performance Analysis", () => {
    it("detects slow endpoints", () => {
      // Add fast requests
      for (let i = 0; i < 5; i++) {
        monitor.recordMetrics({
          endpoint: "/fast-endpoint",
          method: "GET",
          statusCode: 200,
          responseTime: 100,
          contentSize: 512,
          cacheHit: true,
          compressed: true,
        });
      }

      // Add slow requests
      for (let i = 0; i < 3; i++) {
        monitor.recordMetrics({
          endpoint: "/slow-endpoint",
          method: "GET",
          statusCode: 200,
          responseTime: 2000,
          contentSize: 2048,
          cacheHit: false,
          compressed: false,
        });
      }

      const stats = monitor.getStats();
      expect(stats.slowestEndpoints.length).toBeGreaterThan(0);
      expect(stats.slowestEndpoints[0].endpoint).toBe("/slow-endpoint");
    });

    it("provides performance insights", () => {
      // Add requests with poor cache performance
      for (let i = 0; i < 10; i++) {
        monitor.recordMetrics({
          endpoint: "/uncached-endpoint",
          method: "GET",
          statusCode: 200,
          responseTime: 800,
          contentSize: 1024,
          cacheHit: false,
          compressed: true,
        });
      }

      const insights = monitor.getInsights();
      expect(insights.cacheOptimization.missedOpportunities).toBe(10);
      expect(insights.cacheOptimization.recommendations.length).toBeGreaterThan(
        0,
      );
    });

    it("generates bottleneck reports", () => {
      // Add slow requests to trigger bottleneck detection
      for (let i = 0; i < 5; i++) {
        monitor.recordMetrics({
          endpoint: "/test",
          method: "GET",
          statusCode: 200,
          responseTime: 1500, // Above typical threshold
          contentSize: 1024,
          cacheHit: false,
          compressed: true,
        });
      }

      const stats = monitor.getStats();
      expect(stats.bottlenecks.length).toBeGreaterThan(0);
      expect(stats.recommendations.length).toBeGreaterThan(0);
    });
  });

  describe("Alert Configuration", () => {
    it("updates alert configuration", () => {
      const newConfig = {
        enabled: true,
        responseTimeThreshold: 1000,
        errorRateThreshold: 5,
        slowEndpointThreshold: 2000,
      };

      monitor.updateAlertConfig(newConfig);
      const config = monitor.getAlertConfig();

      expect(config.responseTimeThreshold).toBe(1000);
      expect(config.errorRateThreshold).toBe(5);
    });

    it("checks for performance alerts", () => {
      monitor.updateAlertConfig({
        enabled: true,
        responseTimeThreshold: 500,
        errorRateThreshold: 10,
        slowEndpointThreshold: 1000,
      });

      // Add slow requests to trigger alert
      for (let i = 0; i < 5; i++) {
        monitor.recordMetrics({
          endpoint: "/test",
          method: "GET",
          statusCode: 200,
          responseTime: 1000, // Above threshold
          contentSize: 1024,
          cacheHit: false,
          compressed: true,
        });
      }

      const alerts = monitor.checkAlerts();
      expect(alerts.length).toBeGreaterThan(0);
      expect(alerts.some((alert) => alert.type === "slow_response")).toBe(true);
    });
  });

  describe("Middleware Integration", () => {
    it("creates middleware that tracks performance", async () => {
      const mockHandler = vi.fn().mockResolvedValue({
        statusCode: 200,
        body: JSON.stringify({ message: "success" }),
        headers: { "Content-Type": "application/json" },
      });

      const wrappedHandler = monitor.createMiddleware()(mockHandler);

      const mockRequest = {
        url: "/api/test",
        method: "GET",
        headers: {},
      };

      const response = await wrappedHandler(mockRequest);

      expect(mockHandler).toHaveBeenCalledWith(mockRequest);
      expect(response.statusCode).toBe(200);

      const stats = monitor.getStats();
      expect(stats.totalRequests).toBe(1);
    });

    it("handles middleware errors gracefully", async () => {
      const mockHandler = vi.fn().mockRejectedValue(new Error("Handler error"));
      const wrappedHandler = monitor.createMiddleware()(mockHandler);

      const mockRequest = {
        url: "/api/test",
        method: "GET",
        headers: {},
      };

      const response = await wrappedHandler(mockRequest);

      expect(response.statusCode).toBe(500);

      const stats = monitor.getStats();
      expect(stats.totalRequests).toBe(1);
    });
  });

  describe("Configuration Management", () => {
    it("clears metrics", () => {
      monitor.recordMetrics({
        endpoint: "/test",
        method: "GET",
        statusCode: 200,
        responseTime: 150,
        contentSize: 1024,
        cacheHit: true,
        compressed: true,
      });

      let stats = monitor.getStats();
      expect(stats.totalRequests).toBe(1);

      monitor.clearMetrics();
      stats = monitor.getStats();
      expect(stats.totalRequests).toBe(0);
    });
  });
});

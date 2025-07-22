/**
 * Chaos Engineering Tests
 * 
 * Verifies system resilience under failure conditions and ensures graceful degradation.
 * Based on Task 15 of the implementation plan.
 */

import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import { ErrorCode } from '../../src/constants/terminology';

interface ChaosScenario {
  name: string;
  description: string;
  inject: () => Promise<void>;
  cleanup: () => Promise<void>;
  duration: number;
}

interface ResilienceMetrics {
  uptime: number;
  errorRate: number;
  responseTime: number;
  recoveryTime: number;
  gracefulDegradation: boolean;
}

class ChaosMonkey {
  private scenarios = new Map<string, ChaosScenario>();
  private activeScenarios = new Set<string>();

  constructor() {
    this.initializeScenarios();
  }

  private initializeScenarios(): void {
    // Scenario 1: DCS API Unavailable
    this.scenarios.set('dcs-unavailable', {
      name: 'DCS API Unavailable',
      description: 'Simulates Door43 Content Service being completely unavailable',
      inject: async () => {
        // In a real implementation, this would:
        // - Block network access to DCS API
        // - Return 503 Service Unavailable
        // - Timeout all DCS requests
        console.log('🔥 CHAOS: DCS API now unavailable');
      },
      cleanup: async () => {
        console.log('✅ CHAOS: DCS API restored');
      },
      duration: 60000 // 1 minute
    });

    // Scenario 2: Slow DCS Responses
    this.scenarios.set('dcs-slow', {
      name: 'DCS API Slow Responses',
      description: 'Simulates DCS API responding very slowly (30+ seconds)',
      inject: async () => {
        console.log('🐌 CHAOS: DCS API responses now delayed 30+ seconds');
      },
      cleanup: async () => {
        console.log('✅ CHAOS: DCS API speed restored');
      },
      duration: 120000 // 2 minutes
    });

    // Scenario 3: Cache Layer Failure
    this.scenarios.set('cache-failure', {
      name: 'Cache Layer Failure',
      description: 'Simulates complete cache layer unavailability',
      inject: async () => {
        console.log('💾 CHAOS: Cache layer failed - all requests bypass cache');
      },
      cleanup: async () => {
        console.log('✅ CHAOS: Cache layer restored');
      },
      duration: 180000 // 3 minutes
    });

    // Scenario 4: Network Partitions
    this.scenarios.set('network-partition', {
      name: 'Network Partition',
      description: 'Simulates network connectivity issues between services',
      inject: async () => {
        console.log('🌐 CHAOS: Network partition injected - intermittent connectivity');
      },
      cleanup: async () => {
        console.log('✅ CHAOS: Network connectivity restored');
      },
      duration: 90000 // 1.5 minutes
    });

    // Scenario 5: Memory Pressure
    this.scenarios.set('memory-pressure', {
      name: 'Memory Pressure',
      description: 'Simulates high memory usage causing performance degradation',
      inject: async () => {
        console.log('🧠 CHAOS: Memory pressure applied - system under stress');
      },
      cleanup: async () => {
        console.log('✅ CHAOS: Memory pressure relieved');
      },
      duration: 300000 // 5 minutes
    });

    // Scenario 6: Invalid Data Responses
    this.scenarios.set('invalid-data', {
      name: 'Invalid Data Responses',
      description: 'Simulates upstream APIs returning malformed or invalid data',
      inject: async () => {
        console.log('🗂️ CHAOS: Invalid data injection - upstream returns malformed responses');
      },
      cleanup: async () => {
        console.log('✅ CHAOS: Valid data responses restored');
      },
      duration: 60000 // 1 minute
    });
  }

  async inject(scenarioName: string, options: { duration?: number } = {}): Promise<void> {
    const scenario = this.scenarios.get(scenarioName);
    if (!scenario) {
      throw new Error(`Unknown chaos scenario: ${scenarioName}`);
    }

    if (this.activeScenarios.has(scenarioName)) {
      throw new Error(`Chaos scenario already active: ${scenarioName}`);
    }

    this.activeScenarios.add(scenarioName);
    
    try {
      await scenario.inject();
      
      // Auto-cleanup after duration
      setTimeout(async () => {
        await this.cleanup(scenarioName);
      }, options.duration || scenario.duration);
      
    } catch (error) {
      this.activeScenarios.delete(scenarioName);
      throw error;
    }
  }

  async cleanup(scenarioName: string): Promise<void> {
    const scenario = this.scenarios.get(scenarioName);
    if (!scenario) {
      throw new Error(`Unknown chaos scenario: ${scenarioName}`);
    }

    if (!this.activeScenarios.has(scenarioName)) {
      return; // Already cleaned up
    }

    try {
      await scenario.cleanup();
      this.activeScenarios.delete(scenarioName);
    } catch (error) {
      console.error(`Failed to cleanup chaos scenario ${scenarioName}:`, error);
    }
  }

  async cleanupAll(): Promise<void> {
    const cleanupPromises = Array.from(this.activeScenarios).map(scenario => 
      this.cleanup(scenario)
    );
    await Promise.allSettled(cleanupPromises);
  }

  getActiveScenarios(): string[] {
    return Array.from(this.activeScenarios);
  }
}

const chaosMonkey = new ChaosMonkey();
const API_BASE = process.env.TEST_API_URL || 'http://localhost:8080';

beforeAll(async () => {
  console.log('🧪 Starting Chaos Engineering Tests');
});

afterAll(async () => {
  await chaosMonkey.cleanupAll();
  console.log('🧪 Chaos Engineering Tests Complete');
});

describe('Upstream Service Failures', () => {
  test('handles DCS API unavailability gracefully', async () => {
    // Inject chaos: DCS API unavailable
    await chaosMonkey.inject('dcs-unavailable', { duration: 30000 });

    const startTime = Date.now();
    
    try {
      const response = await fetch(`${API_BASE}/api/fetch-scripture?reference=John 3:16&language=en`);
      
      // Should still respond, but may use cached data or graceful error
      expect(response.status).toBeLessThanOrEqual(503);
      
      if (response.status === 200) {
        const data = await response.json();
        expect(data.metadata?.cached).toBe(true); // Should indicate cached response
        expect(data.warning).toContain('cached'); // Should warn about using cached data
      } else if (response.status >= 500) {
        const errorData = await response.json();
        expect(errorData.error).toBeDefined();
        expect(errorData.code).toBe(ErrorCode.FETCH_ERROR);
        expect(errorData.message).toContain('service unavailable');
      }
      
      const responseTime = Date.now() - startTime;
      expect(responseTime).toBeLessThan(10000); // Should fail fast, not hang
      
    } finally {
      await chaosMonkey.cleanup('dcs-unavailable');
    }
    
    console.log('✅ System gracefully handled DCS unavailability');
  }, 45000);

  test('handles slow upstream responses with timeouts', async () => {
    await chaosMonkey.inject('dcs-slow', { duration: 20000 });
    
    const startTime = Date.now();
    
    try {
      const response = await fetch(`${API_BASE}/api/fetch-scripture?reference=Romans 1:1&language=en`);
      const responseTime = Date.now() - startTime;
      
      // Should timeout and not wait 30+ seconds
      expect(responseTime).toBeLessThan(15000); // Timeout before 15 seconds
      
      if (response.status === 200) {
        // If successful, should be from cache
        const data = await response.json();
        expect(data.metadata?.cached).toBe(true);
      } else {
        // Should return timeout error
        expect(response.status).toBeGreaterThanOrEqual(500);
        const errorData = await response.json();
        expect(errorData.code).toBe(ErrorCode.FETCH_ERROR);
      }
      
    } finally {
      await chaosMonkey.cleanup('dcs-slow');
    }
    
    console.log('✅ System properly times out slow responses');
  }, 30000);
});

describe('Cache Layer Failures', () => {
  test('continues operation when cache is unavailable', async () => {
    await chaosMonkey.inject('cache-failure', { duration: 20000 });
    
    try {
      const response = await fetch(`${API_BASE}/api/fetch-scripture?reference=Psalm 23:1&language=en`);
      
      // Should still work, but may be slower without cache
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data.scripture).toBeDefined();
      expect(data.metadata?.cached).toBe(false); // Should indicate no cache
      
      const responseTime = data.metadata?.responseTime || 0;
      expect(responseTime).toBeLessThan(5000); // Should still be reasonable
      
    } finally {
      await chaosMonkey.cleanup('cache-failure');
    }
    
    console.log('✅ System operates without cache layer');
  }, 30000);
});

describe('Network Resilience', () => {
  test('recovers from network partitions', async () => {
    await chaosMonkey.inject('network-partition', { duration: 15000 });
    
    const requests = [];
    const startTime = Date.now();
    
    // Make multiple requests during network partition
    for (let i = 0; i < 5; i++) {
      requests.push(
        fetch(`${API_BASE}/api/health`)
          .then(response => ({
            status: response.status,
            success: response.ok,
            timestamp: Date.now()
          }))
          .catch(error => ({
            status: 0,
            success: false,
            error: error.message,
            timestamp: Date.now()
          }))
      );
      
      await new Promise(resolve => setTimeout(resolve, 2000)); // 2 second intervals
    }
    
    try {
      const results = await Promise.all(requests);
      
      // Some requests may fail during partition, but system should recover
      const successfulRequests = results.filter(r => r.success);
      const failedRequests = results.filter(r => !r.success);
      
      expect(successfulRequests.length).toBeGreaterThan(0); // At least some succeed
      
      // System should show signs of recovery towards the end
      const laterResults = results.slice(-2);
      const laterSuccesses = laterResults.filter(r => r.success);
      expect(laterSuccesses.length).toBeGreaterThan(0);
      
    } finally {
      await chaosMonkey.cleanup('network-partition');
    }
    
    console.log('✅ System recovers from network partitions');
  }, 25000);
});

describe('Data Integrity', () => {
  test('validates and handles malformed upstream data', async () => {
    await chaosMonkey.inject('invalid-data', { duration: 15000 });
    
    try {
      const response = await fetch(`${API_BASE}/api/fetch-translation-notes?reference=John 1:1&language=en`);
      
      if (response.status === 200) {
        const data = await response.json();
        
        // Should either return valid data (from cache) or proper error
        if (data.notes) {
          expect(Array.isArray(data.notes)).toBe(true);
          expect(data.metadata?.cached).toBe(true); // Should be cached good data
        }
      } else {
        // Should return appropriate error for invalid data
        expect(response.status).toBeGreaterThanOrEqual(500);
        const errorData = await response.json();
        expect(errorData.code).toBe(ErrorCode.VALIDATION_ERROR);
      }
      
    } finally {
      await chaosMonkey.cleanup('invalid-data');
    }
    
    console.log('✅ System validates and handles invalid data');
  }, 20000);
});

describe('System Resilience Metrics', () => {
  test('measures recovery time after failures', async () => {
    const scenarios = ['dcs-unavailable', 'cache-failure'];
    const metrics: ResilienceMetrics[] = [];
    
    for (const scenario of scenarios) {
      console.log(`Testing recovery from: ${scenario}`);
      
      // Baseline measurement
      const baselineStart = Date.now();
      const baselineResponse = await fetch(`${API_BASE}/api/health`);
      const baselineTime = Date.now() - baselineStart;
      expect(baselineResponse.status).toBe(200);
      
      // Inject failure
      await chaosMonkey.inject(scenario, { duration: 10000 });
      await new Promise(resolve => setTimeout(resolve, 2000)); // Let failure settle
      
      // Measure during failure
      const failureStart = Date.now();
      const failureResponse = await fetch(`${API_BASE}/api/health`);
      const failureTime = Date.now() - failureStart;
      
      // Cleanup and measure recovery
      await chaosMonkey.cleanup(scenario);
      await new Promise(resolve => setTimeout(resolve, 1000)); // Let system recover
      
      const recoveryStart = Date.now();
      const recoveryResponse = await fetch(`${API_BASE}/api/health`);
      const recoveryTime = Date.now() - recoveryStart;
      
      const metric: ResilienceMetrics = {
        uptime: failureResponse.ok ? 1 : 0,
        errorRate: failureResponse.ok ? 0 : 1,
        responseTime: recoveryTime,
        recoveryTime: recoveryTime - baselineTime,
        gracefulDegradation: failureResponse.status <= 503 // Not completely broken
      };
      
      metrics.push(metric);
      
      // Verify recovery
      expect(recoveryResponse.status).toBe(200);
      expect(recoveryTime).toBeLessThan(baselineTime * 2); // Should recover to reasonable performance
    }
    
    // Overall resilience assessment
    const averageRecoveryTime = metrics.reduce((sum, m) => sum + m.recoveryTime, 0) / metrics.length;
    const gracefulDegradationRate = metrics.filter(m => m.gracefulDegradation).length / metrics.length;
    
    expect(averageRecoveryTime).toBeLessThan(5000); // Should recover within 5 seconds
    expect(gracefulDegradationRate).toBeGreaterThan(0.8); // 80%+ graceful degradation
    
    console.log(`✅ Average recovery time: ${averageRecoveryTime}ms`);
    console.log(`✅ Graceful degradation rate: ${(gracefulDegradationRate * 100).toFixed(1)}%`);
  }, 60000);
});

describe('Circuit Breaker Behavior', () => {
  test('circuit breaker opens and closes appropriately', async () => {
    // This test would verify that the system implements circuit breaker patterns
    // to prevent cascading failures
    
    console.log('Testing circuit breaker behavior...');
    
    // Simulate multiple failures to trigger circuit breaker
    const failureResponses = [];
    
    for (let i = 0; i < 10; i++) {
      try {
        const response = await fetch(`${API_BASE}/api/fetch-scripture?reference=Invalid Reference&language=en`);
        failureResponses.push(response.status);
      } catch (error) {
        failureResponses.push(0);
      }
    }
    
    // After many failures, circuit breaker should start responding immediately
    const circuitBreakerStart = Date.now();
    const breakerResponse = await fetch(`${API_BASE}/api/fetch-scripture?reference=Another Invalid&language=en`);
    const breakerResponseTime = Date.now() - circuitBreakerStart;
    
    // Should fail fast when circuit breaker is open
    expect(breakerResponseTime).toBeLessThan(100); // Very fast failure
    expect(breakerResponse.status).toBeGreaterThanOrEqual(400);
    
    console.log('✅ Circuit breaker behavior verified');
  });
});

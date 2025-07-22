# 🐒 Chaos Engineering Test Suite

Comprehensive chaos engineering infrastructure for the Translation Helps Platform. Tests system resilience under failure conditions to ensure graceful degradation and automatic recovery.

**Implements Task 15 from Phase 5: Testing & Quality Assurance**

## 🎯 Overview

Our chaos engineering suite validates system resilience through controlled failure injection:

- **Upstream Failures**: DCS API timeouts, outages, slow responses
- **Cache Layer Failures**: Cache outages, corruption, performance degradation
- **Network Partitions**: Connectivity issues, offline modes, recovery patterns
- **Data Corruption**: Invalid responses, data integrity validation

## 🧪 Test Suites

### 1. 🌐 Upstream Failures (`upstream-failures.test.ts`)

- **Risk Level**: Medium
- **Duration**: 8-12 minutes
- **Scenarios**:
  - DCS API timeout handling with cache fallback
  - Complete DCS outage graceful degradation
  - Partial outage resilience (50% failure rate)
  - Performance degradation handling
  - Automatic recovery validation
  - Data integrity during failures

### 2. 💾 Cache Layer Failures (`cache-failures.test.ts`)

- **Risk Level**: High
- **Duration**: 10-15 minutes
- **Scenarios**:
  - Complete cache failure upstream fallback
  - Cache corruption detection and handling
  - Intermittent cache failures (50% rate)
  - Slow cache response timeouts
  - Circuit breaker pattern validation
  - Cache recovery and consistency

### 3. 🔌 Network Partitions (`network-partitions.test.ts`)

- **Risk Level**: Medium
- **Duration**: 12-20 minutes
- **Scenarios**:
  - Complete network outage offline mode
  - Flaky connection handling (50% packet loss)
  - Intelligent retry logic with exponential backoff
  - Service priority degradation
  - Multiple partition cycle recovery
  - Connection quality adaptation

### 4. 🗃️ Data Corruption (`data-corruption.test.ts`)

- **Risk Level**: Low
- **Duration**: 8-12 minutes
- **Scenarios**:
  - Malformed JSON response handling
  - Schema validation enforcement
  - Content corruption detection
  - Cross-reference integrity validation
  - Circular reference prevention
  - Data type consistency checks

## 🛠️ Setup & Installation

### Prerequisites

1. Node.js 18+
2. Vitest testing framework
3. Access to staging/test environment (NEVER production!)

### Quick Start

```bash
# Install dependencies (already included in main package.json)
npm install

# Run individual chaos test suites
npm run chaos:upstream    # DCS API failures
npm run chaos:cache      # Cache layer failures
npm run chaos:network    # Network partitions
npm run chaos:data       # Data corruption

# Run orchestrated chaos testing
npm run chaos:safe       # Safe mode (low/medium risk only)
npm run chaos:all        # All tests including high risk
```

## 🎮 Test Runner

Use our comprehensive chaos test runner for orchestrated failure injection:

```bash
# Safe mode - excludes high-risk tests
CHAOS_MODE=safe node run-all-chaos-tests.ts

# Aggressive mode - includes all tests
CHAOS_MODE=aggressive node run-all-chaos-tests.ts

# Target specific environment
BASE_URL=https://staging-api.com CHAOS_MODE=safe node run-all-chaos-tests.ts
```

### Environment Variables

- `CHAOS_ENV`: Environment designation (staging, test, production-approved)
- `BASE_URL`: Target API URL (default: staging)
- `CHAOS_MODE`: Test mode (safe, aggressive, upstream-only, cache-only, etc.)
- `MAX_CHAOS_DURATION`: Maximum test duration in seconds (default: 3600)
- `CHAOS_SAFETY`: Enable safety checks (default: true)
- `CHAOS_RESULTS_DIR`: Output directory for results (default: ./chaos-results)
- `SLACK_WEBHOOK`: Slack notifications endpoint
- `PRODUCTION_CHAOS_CONFIRMED`: Required for production testing (DANGEROUS!)

## 🔒 Safety Features

### Production Protection

- **Automatic URL Detection**: Blocks production URLs without explicit approval
- **Environment Validation**: Requires `CHAOS_ENV=production-approved` for production
- **Confirmation Required**: Must set `PRODUCTION_CHAOS_CONFIRMED=true` for production
- **Safety Pause**: 10-second pause before starting production chaos tests

### Safety Checks

- **Pre-Chaos Validation**: System health and performance baseline checks
- **Duration Limits**: Maximum test duration enforcement (1 hour default)
- **Critical Failure Handling**: Stops on complete high-risk test failures
- **Post-Chaos Validation**: Verifies system health after chaos testing

### Risk Management

```typescript
interface ChaosTestSuite {
  riskLevel: "low" | "medium" | "high";
  prerequisites: string[];
  enabled: boolean;
}
```

## 📊 Results & Reports

Each chaos test run generates comprehensive reports:

### Automatic Outputs

- `chaos-engineering-report.json`: Complete results and metrics
- `chaos-engineering-report.md`: Executive summary and recommendations
- Individual test suite logs and metrics

### Sample Report Structure

```json
{
  "chaos_suite": "Translation Helps Platform Chaos Engineering",
  "environment": "staging",
  "summary": {
    "total_suites": 4,
    "successful_suites": 4,
    "overall_success_rate": 95.2,
    "system_resilience_score": 88.7
  },
  "recommendations": ["✅ System demonstrates excellent resilience across all chaos scenarios"]
}
```

### Key Metrics

- **System Availability**: Percentage uptime during chaos
- **Recovery Time**: How quickly system recovers from failures
- **Data Integrity**: Consistency of data through chaos events
- **Error Rate**: Frequency of unhandled errors
- **Resilience Score**: Overall system resilience rating (0-100)

## 🎯 Production Readiness Assessment

| Resilience Score | Status            | Recommendation                                         |
| ---------------- | ----------------- | ------------------------------------------------------ |
| **90-100**       | ✅ **EXCELLENT**  | Production ready - system demonstrates high resilience |
| **75-89**        | ⚠️ **GOOD**       | Mostly ready - some improvements recommended           |
| **60-74**        | 🔧 **NEEDS WORK** | Significant improvements required                      |
| **<60**          | ❌ **NOT READY**  | Major resilience issues must be addressed              |

## 🔧 Chaos Monkey Framework

Our chaos framework provides controlled failure injection:

```typescript
import { chaosMonkey, ChaosType } from "./framework/chaos-monkey";

// Inject DCS timeout
const experimentId = await chaosMonkey.inject(ChaosType.DCS_TIMEOUT, {
  duration: 5000, // 5 seconds
  intensity: 1.0, // 100% failure rate
  target: "dcs-api",
});

// System automatically cleans up after duration
// or manually: await chaosMonkey.cleanup(experimentId);
```

### Supported Chaos Types

- `DCS_TIMEOUT`: Simulate DCS API timeouts
- `DCS_UNAVAILABLE`: DCS returns 503 Service Unavailable
- `CACHE_FAILURE`: Cache layer becomes unavailable
- `NETWORK_PARTITION`: Network connectivity issues
- `SLOW_RESPONSE`: Artificial delays in responses
- `INVALID_DATA`: Corrupted or malformed response data

## 🚀 CI/CD Integration

### GitHub Actions Example

```yaml
name: Chaos Engineering Tests
on:
  schedule:
    - cron: "0 3 * * *" # Daily at 3 AM
  workflow_dispatch:

jobs:
  chaos-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: "18"

      - name: Install dependencies
        run: npm ci

      - name: Run Chaos Tests
        run: |
          cd tests/chaos
          CHAOS_ENV=staging CHAOS_MODE=safe node run-all-chaos-tests.ts
        env:
          BASE_URL: ${{ secrets.STAGING_API_URL }}
          SLACK_WEBHOOK: ${{ secrets.SLACK_WEBHOOK }}

      - name: Upload Chaos Results
        uses: actions/upload-artifact@v3
        if: always()
        with:
          name: chaos-test-results
          path: tests/chaos/chaos-results/
```

### Jenkins Pipeline

```groovy
pipeline {
    agent any

    triggers {
        cron('H 3 * * *') // Daily chaos testing
    }

    environment {
        CHAOS_ENV = 'staging'
        BASE_URL = credentials('staging-api-url')
        SLACK_WEBHOOK = credentials('slack-webhook')
    }

    stages {
        stage('Chaos Engineering Tests') {
            steps {
                dir('tests/chaos') {
                    sh 'CHAOS_MODE=safe node run-all-chaos-tests.ts'
                }
            }
        }

        stage('Publish Results') {
            steps {
                publishHTML([
                    allowMissing: false,
                    alwaysLinkToLastBuild: true,
                    keepAll: true,
                    reportDir: 'tests/chaos/chaos-results',
                    reportFiles: 'chaos-engineering-report.md',
                    reportName: 'Chaos Engineering Report'
                ])
            }
        }
    }

    post {
        always {
            archiveArtifacts artifacts: 'tests/chaos/chaos-results/**', fingerprint: true
        }
        failure {
            slackSend(
                channel: '#alerts-chaos',
                color: 'danger',
                message: "🚨 Chaos Engineering Tests Failed - System Resilience Issues Detected"
            )
        }
    }
}
```

## 📱 Monitoring & Alerts

### Slack Integration

```bash
export SLACK_WEBHOOK="https://hooks.slack.com/services/..."
npm run chaos:safe
```

### Custom Notifications

```typescript
// Extend ChaosTestRunner for custom notifications
class CustomChaosRunner extends ChaosTestRunner {
  async sendNotifications() {
    // Custom notification logic
    await this.sendSlackAlert();
    await this.sendEmailReport();
    await this.updateDashboard();
  }
}
```

## 🧪 Test Development

### Adding New Chaos Tests

1. Create test file in `tests/chaos/`
2. Import chaos monkey framework
3. Follow existing patterns for test structure
4. Add to `CHAOS_TESTS` configuration in runner
5. Update documentation

### Custom Chaos Types

```typescript
// Extend chaos monkey with new failure types
export enum ChaosType {
  // ... existing types
  CUSTOM_FAILURE = 'custom-failure'
}

// Implement injection logic
private async injectCustomFailure(config: ChaosConfig): Promise<void> {
  // Custom failure injection logic
}
```

### Test Pattern Example

```typescript
describe("Custom Chaos Scenario", () => {
  afterEach(async () => {
    await chaosMonkey.cleanupAll();
  });

  test("handles custom failure gracefully", async () => {
    // Inject controlled failure
    await chaosMonkey.inject(ChaosType.CUSTOM_FAILURE, {
      duration: 3000,
      intensity: 0.8,
      target: "custom-system",
    });

    // Test system behavior during failure
    const response = await api.customEndpoint();

    // Validate graceful degradation
    expect(response.fallbackUsed).toBe(true);
    expect(response.data).toBeDefined();
  });
});
```

## 🔍 Troubleshooting

### Common Issues

**Tests fail immediately**

- Check environment configuration
- Verify API endpoint accessibility
- Ensure prerequisites are met

**Production protection blocking tests**

```bash
# For staging/test environments
export CHAOS_ENV=staging
export BASE_URL=https://staging-api.com

# For production (DANGEROUS - only with approval)
export CHAOS_ENV=production-approved
export PRODUCTION_CHAOS_CONFIRMED=true
```

**Chaos cleanup not working**

- Chaos monkey automatically cleans up after duration
- Manual cleanup: `await chaosMonkey.cleanupAll()`
- Check for hanging processes

### Debug Mode

```bash
# Verbose logging
DEBUG=chaos:* npm run chaos:safe

# Individual test debugging
vitest run tests/chaos/upstream-failures.test.ts --reporter=verbose
```

## 📚 Resources

- [Chaos Engineering Principles](https://principlesofchaos.org/)
- [Netflix Chaos Monkey](https://netflix.github.io/chaosmonkey/)
- [Vitest Testing Framework](https://vitest.dev/)
- [Translation Helps API Documentation](https://api.translation.tools/docs)

## 🤝 Contributing

1. Follow existing chaos test patterns
2. Include comprehensive failure scenarios
3. Add appropriate safety measures
4. Update documentation
5. Test in staging before production

---

**⚠️ IMPORTANT SAFETY NOTICE**  
Chaos engineering tests intentionally inject failures into systems. Always:

- Test in staging/development environments first
- Use production protection features
- Monitor system health during tests
- Have rollback procedures ready
- Follow the principle of "minimum blast radius"

**Built for Task 15 - Chaos Engineering Tests**  
_Validates system resilience through controlled failure injection_

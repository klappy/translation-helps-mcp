# K6 Load Testing Infrastructure

Comprehensive load testing suite for the Translation Helps Platform using k6. Validates performance requirements from the PRD including 1000+ RPS and 10k concurrent users.

## 📊 Test Scenarios

Our load testing suite includes 5 comprehensive scenarios:

### 1. 🎯 Baseline Load Test (`baseline.js`)

- **Target**: 100 RPS
- **Duration**: 9 minutes
- **Purpose**: Establish performance baseline
- **Thresholds**:
  - P95 < 500ms
  - Error rate < 0.1%
- **Usage**: `k6 run baseline.js`

### 2. 🚀 Peak Load Test (`peak.js`)

- **Target**: 1000 RPS (Production requirement!)
- **Duration**: 33 minutes
- **Purpose**: Validate production performance targets
- **Thresholds**:
  - P95 < 1000ms
  - Error rate < 0.5%
  - Cache hit rate > 70%
- **Usage**: `k6 run peak.js`

### 3. 💥 Stress Test (`stress.js`)

- **Target**: 2000 RPS (Breaking point)
- **Duration**: 35 minutes
- **Purpose**: Find system limits and validate graceful degradation
- **Thresholds**:
  - P95 < 2000ms
  - Error rate < 10%
  - Timeout rate < 5%
- **Usage**: `k6 run stress.js`

### 4. ⚡ Spike Test (`spike.js`)

- **Target**: 0 → 1000 RPS in 30 seconds
- **Duration**: 14.5 minutes
- **Purpose**: Test traffic surge handling (viral content)
- **Thresholds**:
  - P95 < 3000ms
  - Error rate < 5%
  - Rate limiting < 30%
- **Usage**: `k6 run spike.js`

### 5. 🏃‍♂️ Soak Test (`soak.js`)

- **Target**: 500 RPS for 24 hours
- **Duration**: 24+ hours
- **Purpose**: Validate long-term stability and memory leak detection
- **Thresholds**:
  - P95 < 1000ms
  - Error rate < 1%
  - Stability > 99%
- **Usage**: `k6 run soak.js`

## 🛠️ Setup & Installation

### Prerequisites

1. Install k6: https://k6.io/docs/getting-started/installation/
2. Node.js 18+ (for test runner)
3. API endpoint access

### Quick Start

```bash
# Install k6 (macOS)
brew install k6

# Install k6 (Ubuntu/Debian)
sudo apt-key adv --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6

# Install k6 (Windows)
winget install k6

# Run single test
k6 run baseline.js

# Run with custom target
k6 run --env BASE_URL=https://your-api.com baseline.js
```

## 🎮 Test Runner

Use our comprehensive test runner for orchestrated testing:

```bash
# Run critical tests (baseline, peak, spike)
node run-all-tests.js

# Run all tests including stress
RUN_MODE=all node run-all-tests.js

# Run specific test
RUN_MODE=baseline node run-all-tests.js

# CI mode with custom target
CI=true BASE_URL=https://staging-api.com node run-all-tests.js
```

### Environment Variables

- `BASE_URL`: Target API URL (default: https://api.translation.tools)
- `RUN_MODE`: critical|all|baseline|performance|stress|custom
- `CI`: Set to 'true' for CI mode (stops on critical test failure)
- `RESULTS_DIR`: Output directory for results (default: ./results)
- `SLACK_WEBHOOK`: Slack webhook URL for notifications
- `K6_PATH`: Custom k6 binary path

## 📈 Performance Targets

Based on PRD requirements:

| Metric               | Baseline | Peak    | Stress  | Target  |
| -------------------- | -------- | ------- | ------- | ------- |
| **RPS**              | 100      | 1000    | 2000    | 1000+   |
| **P95 Response**     | <500ms   | <1000ms | <2000ms | <1000ms |
| **Error Rate**       | <0.1%    | <0.5%   | <10%    | <0.5%   |
| **Concurrent Users** | ~200     | ~2000   | ~4000   | 10k+    |
| **Success Rate**     | >99.9%   | >99.5%  | >90%    | >99.5%  |

## 🎯 Test Endpoints

Our tests cover realistic usage patterns:

- **Health Check** (10-20%): System monitoring
- **Fetch Scripture** (30-40%): Primary use case
- **Translation Notes** (15-25%): Translation help
- **Translation Words** (10-15%): Word definitions
- **Get Languages** (5-15%): Resource discovery
- **Browse Words** (5-10%): Content exploration

## 📊 Results & Reports

Each test generates multiple output formats:

### Automatic Outputs

- `{test}-results.json`: Raw k6 metrics data
- `{test}-summary.txt`: Human-readable summary
- `{test}-detailed.html`: Rich HTML report

### Suite Report (from test runner)

- `load-test-suite-report.json`: Complete suite results
- `load-test-suite-report.html`: Executive dashboard
- `load-test-suite-summary.txt`: CI-friendly summary

### Sample Report Structure

```json
{
  "suite": "K6 Load Testing Suite",
  "timestamp": "2024-01-15T10:30:00Z",
  "results": {
    "baseline": { "success": true, "duration": 540000 },
    "peak": { "success": true, "duration": 1980000 },
    "spike": { "success": true, "duration": 870000 }
  },
  "summary": {
    "totalTests": 3,
    "successfulTests": 3,
    "successRate": "100.0",
    "overallStatus": "PASS"
  }
}
```

## 🔄 CI/CD Integration

### GitHub Actions Example

```yaml
name: Load Tests
on:
  schedule:
    - cron: "0 2 * * *" # Daily at 2 AM
  workflow_dispatch:

jobs:
  load-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Install k6
        run: |
          sudo apt-key adv --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
          echo "deb https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
          sudo apt-get update
          sudo apt-get install k6

      - name: Run Load Tests
        run: |
          cd tests/load/k6
          CI=true RUN_MODE=critical node run-all-tests.js
        env:
          BASE_URL: ${{ secrets.API_BASE_URL }}
          SLACK_WEBHOOK: ${{ secrets.SLACK_WEBHOOK }}

      - name: Upload Results
        uses: actions/upload-artifact@v3
        if: always()
        with:
          name: load-test-results
          path: tests/load/k6/results/
```

### Jenkins Pipeline

```groovy
pipeline {
    agent any

    environment {
        BASE_URL = "${params.API_URL ?: 'https://api.translation.tools'}"
        RUN_MODE = "${params.TEST_MODE ?: 'critical'}"
    }

    stages {
        stage('Install k6') {
            steps {
                sh 'sudo apt-get update && sudo apt-get install -y k6'
            }
        }

        stage('Run Load Tests') {
            steps {
                dir('tests/load/k6') {
                    sh 'CI=true node run-all-tests.js'
                }
            }
        }

        stage('Publish Results') {
            steps {
                publishHTML([
                    allowMissing: false,
                    alwaysLinkToLastBuild: true,
                    keepAll: true,
                    reportDir: 'tests/load/k6/results',
                    reportFiles: 'load-test-suite-report.html',
                    reportName: 'Load Test Report'
                ])
            }
        }
    }

    post {
        always {
            archiveArtifacts artifacts: 'tests/load/k6/results/**', fingerprint: true
        }
    }
}
```

## 📱 Monitoring & Alerts

### Slack Integration

Configure Slack webhook for real-time notifications:

```bash
export SLACK_WEBHOOK="https://hooks.slack.com/services/..."
node run-all-tests.js
```

### Grafana Dashboard

Import our k6 metrics to Grafana:

1. Configure InfluxDB output: `k6 run --out influxdb=http://localhost:8086/k6 baseline.js`
2. Import dashboard from `grafana-dashboard.json`
3. Set up alerts for critical thresholds

### Prometheus Integration

Export metrics to Prometheus:

```bash
k6 run --out experimental-prometheus-rw baseline.js
```

## 🧪 Test Development

### Adding New Tests

1. Create new test file: `my-test.js`
2. Follow existing pattern with options, endpoints, and validation
3. Add to `TESTS` object in `run-all-tests.js`
4. Update documentation

### Custom Metrics

```javascript
import { Trend, Rate, Counter } from "k6/metrics";

const customMetric = new Trend("custom_response_time");
const errorRate = new Rate("custom_errors");

export default function () {
  // Your test logic
  customMetric.add(responseTime);
  errorRate.add(isError);
}
```

### Environment-Specific Configuration

```javascript
const BASE_URL = __ENV.BASE_URL || "https://api.translation.tools";
const API_KEY = __ENV.API_KEY;
const TEST_MODE = __ENV.TEST_MODE || "normal";
```

## 🔍 Troubleshooting

### Common Issues

**k6 not found**

```bash
# Verify installation
k6 version

# Reinstall if needed (macOS)
brew uninstall k6 && brew install k6
```

**Connection refused**

- Check API endpoint accessibility
- Verify firewall settings
- Test with curl first

**High error rates**

- Check API capacity
- Review rate limiting
- Validate test data

**Memory issues**

- Reduce VUs for large tests
- Use `--compatibility-mode=base` for older systems
- Monitor system resources

### Debug Mode

```bash
# Verbose output
k6 run --verbose baseline.js

# HTTP debug
k6 run --http-debug baseline.js

# Custom log level
k6 run --log-level=debug baseline.js
```

## 📚 Resources

- [k6 Documentation](https://k6.io/docs/)
- [Performance Testing Guides](https://k6.io/docs/testing-guides/)
- [k6 Best Practices](https://k6.io/docs/misc/fine-tuning-os/)
- [Translation Helps API Docs](https://api.translation.tools/docs)

## 🤝 Contributing

1. Follow existing test patterns
2. Include comprehensive validation
3. Add appropriate thresholds
4. Update documentation
5. Test in multiple environments

---

**Built for Task 14 - Load Testing Infrastructure**  
_Validates PRD performance requirements: 1000+ RPS, 10k concurrent users_

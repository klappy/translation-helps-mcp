# Load Testing Infrastructure

This directory contains load testing scripts to validate performance requirements from the PRD.

## Requirements Validation

- **1000+ RPS**: Sustained request rate testing
- **10k concurrent users**: Scalability validation  
- **Response times**: Scripture < 500ms, Helps < 800ms
- **Error rate**: < 0.1%
- **Cache hit ratio**: > 90%

## Running Tests

### Prerequisites
```bash
npm install -g k6
```

### Basic Load Test
```bash
k6 run tests/load/performance-test.js
```

### Spike Test (0 to 1000 RPS in 30 seconds)
```bash
k6 run tests/load/spike-test.js
```

### Soak Test (24 hours at moderate load)
```bash
k6 run tests/load/soak-test.js
```

## Test Scenarios

1. **Scripture Lookup** (40% of traffic)
2. **Translation Notes** (25% of traffic)  
3. **Translation Words** (20% of traffic)
4. **Resource Discovery** (15% of traffic)

## Metrics Dashboard

The tests produce metrics that can be visualized with:
- K6 Cloud (k6.io)
- Grafana + InfluxDB
- DataDog APM

## Performance Targets

Based on PRD specifications:
- P95 response time: Scripture < 500ms, Helps < 800ms
- Error rate: < 0.1%
- Concurrent users: 10,000+
- Request rate: 1,000+ RPS

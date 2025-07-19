# Translation Helps MCP Test Suite

This comprehensive test suite ensures the stability and reliability of the Translation Helps MCP system, preventing regressions and validating API/MCP parity.

## 🧪 Test Structure

### Test Files

1. **`smoke.test.ts`** - Quick health checks and basic functionality validation
2. **`endpoint-parity.test.ts`** - Comprehensive tests ensuring API and MCP endpoints return identical responses
3. **`regression.test.ts`** - Tests for specific bugs that have been fixed to prevent regressions
4. **`DCSApiClient.test.ts`** - Unit tests for the DCS API client

### Test Categories

- **🏥 Health Checks** - Verify basic server functionality
- **🔄 API/MCP Parity** - Ensure identical responses between API and MCP endpoints
- **🐛 Regression Prevention** - Catch previously fixed bugs
- **⚡ Performance** - Validate response times
- **🛡️ Error Handling** - Test edge cases and error conditions
- **📊 Data Validation** - Verify response structure and content

## 🚀 Running Tests

### Quick Start

```bash
# Run all tests with comprehensive reporting
npm test

# Quick smoke test (fastest)
npm run test:smoke

# Full parity validation
npm run test:parity

# Regression testing
npm run test:regression

# Unit tests
npm run test:unit
```

### Advanced Testing

```bash
# Watch mode for development
npm run test:watch

# Generate coverage report
npm run test:coverage

# Run specific test file
npx vitest run tests/smoke.test.ts

# Run with verbose output
npx vitest run --reporter=verbose
```

## 📋 Prerequisites

1. **Server Running**: The test suite requires the dev server to be running:

   ```bash
   netlify dev
   ```

2. **Environment**: Tests run against `http://localhost:8888` by default. Set `TEST_BASE_URL` to override.

## 🧩 Test Categories Explained

### Smoke Tests (`smoke.test.ts`)

- **Purpose**: Quick validation that basic functionality works
- **Runtime**: ~30 seconds
- **Focus**: Core endpoints return data
- **Use Case**: Pre-deployment validation, quick health check

### Parity Tests (`endpoint-parity.test.ts`)

- **Purpose**: Ensure API and MCP endpoints return identical responses
- **Runtime**: ~5-10 minutes
- **Focus**: Data consistency across all endpoints
- **Use Case**: Architectural validation, ensuring no duplicate implementations

### Regression Tests (`regression.test.ts`)

- **Purpose**: Prevent specific bugs from returning
- **Runtime**: ~2-3 minutes
- **Focus**: Previously fixed issues
- **Bugs Covered**:
  - Double JSON wrapping
  - Missing scripture data
  - Hardcoded file paths
  - Fake citations
  - Empty resource responses
  - Book code mapping errors
  - Response structure mismatches

### Unit Tests (`DCSApiClient.test.ts`)

- **Purpose**: Test individual components in isolation
- **Runtime**: ~1 minute
- **Focus**: Core business logic
- **Use Case**: Development, refactoring validation

## 📊 Test Data

### Scripture References

- John 3:16 (New Testament)
- Titus 1:1 (Paul's letters)
- Genesis 1:1 (Old Testament)
- Revelation 22:21 (Apocalyptic literature)

### Translation Words

- love, grace, faith (common theological terms)

### Organizations

- unfoldingWord (primary test organization)

### Languages

- English (`en`) - primary test language

## 🔧 Test Configuration

### Environment Variables

```bash
TEST_BASE_URL=http://localhost:8888  # Override test server URL
```

### Timeouts

- Smoke tests: 15 seconds per test
- Integration tests: 30 seconds per test
- Complex operations: Extended as needed

## 📈 Test Reporting

The test runner provides:

- **Real-time progress** with color-coded output
- **Detailed summaries** showing passed/failed/skipped counts
- **Error details** for failed tests
- **Recommendations** for fixing issues
- **Performance metrics** for response times

### Example Output

```
🧪 Translation Helps MCP Test Suite
=====================================

✅ Smoke Tests: 6 tests passed
✅ API/MCP Parity Tests: 45 tests passed
✅ Regression Tests: 12 tests passed
✅ DCS API Client Tests: 8 tests passed

🎉 All tests passed! (71 total)

✅ All systems are working correctly!
✅ API/MCP parity is maintained
✅ No regressions detected
```

## 🚨 Common Issues & Solutions

### Server Not Running

```
❌ Server is not running. Please start with: netlify dev
```

**Solution**: Start the development server in another terminal

### Timeout Errors

**Symptoms**: Tests failing with timeout errors
**Solutions**:

- Check server performance
- Verify network connectivity
- Increase timeout values if needed

### Data Mismatch Errors

**Symptoms**: API/MCP parity tests failing
**Solutions**:

- Check that MCP endpoints are simple wrappers
- Verify no duplicate implementations exist
- Review timestamp normalization logic

### Missing Test Data

**Symptoms**: Empty responses in tests
**Solutions**:

- Verify DCS API connectivity
- Check ingredient file paths
- Validate book code mapping

## 🔄 Continuous Integration

This test suite is designed for CI/CD integration:

```yaml
# Example GitHub Actions step
- name: Run tests
  run: |
    npm install
    netlify dev &
    sleep 30  # Wait for server to start
    npm test
```

## 📝 Adding New Tests

### 1. Identify Test Category

- **Smoke**: Basic functionality
- **Parity**: API/MCP consistency
- **Regression**: Bug prevention
- **Unit**: Component isolation

### 2. Create Test Case

```typescript
it(
  "should test specific functionality",
  async () => {
    const response = await makeRequest("endpoint", params);
    expect(response).toBeDefined();
    // Add specific assertions
  },
  TIMEOUT
);
```

### 3. Update Test Runner

Add new test files to the `testSuites` array in `test-runner.js`

### 4. Document Expected Behavior

Update this README with new test coverage

## 🎯 Test Philosophy

1. **Prevent Regressions**: Every fixed bug gets a test
2. **Ensure Parity**: API and MCP must be identical
3. **Fast Feedback**: Smoke tests run quickly
4. **Comprehensive Coverage**: All endpoints tested
5. **Clear Reporting**: Failures are easy to understand
6. **CI/CD Ready**: Tests work in automated environments

## 🤝 Contributing

When adding new functionality:

1. Add corresponding tests
2. Update this documentation
3. Ensure all tests pass
4. Consider performance impact

Remember: **Good tests prevent bad deployments!** 🛡️

/**
 * Load Testing Infrastructure
 * 
 * Validates performance requirements from PRD (1000+ RPS, 10k concurrent users).
 * Based on Task 14 of the implementation plan.
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const responseTrend = new Trend('response_time');

// Test configuration based on PRD requirements
export const options = {
  stages: [
    { duration: '2m', target: 100 },   // Ramp up to 100 users
    { duration: '5m', target: 100 },   // Stay at 100 users
    { duration: '3m', target: 500 },   // Scale to 500 users
    { duration: '5m', target: 500 },   // Stay at 500 users
    { duration: '3m', target: 1000 },  // Scale to 1000 users (PRD target)
    { duration: '10m', target: 1000 }, // Sustained load test
    { duration: '2m', target: 0 },     // Ramp down
  ],
  
  thresholds: {
    // PRD requirements validation
    http_req_duration: ['p(95)<500'],    // Scripture lookup: < 500ms (95th percentile)
    http_req_failed: ['rate<0.001'],     // Error rate under 0.1%
    errors: ['rate<0.001'],              // Custom error tracking
    response_time: ['p(95)<800'],        // Translation helps: < 800ms
    http_reqs: ['rate>1000'],            // 1000+ RPS requirement
  },
};

const BASE_URL = __ENV.API_URL || 'https://api.translation.tools';

// Test scenarios based on real usage patterns
const scenarios = {
  scripture_lookup: {
    references: [
      'John 3:16', 'Romans 8:28', 'Psalm 23', 'Matthew 5:3-12',
      'Genesis 1:1', 'Jeremiah 29:11', 'Philippians 4:13',
      '1 Corinthians 13', 'Ephesians 2:8-9', 'Romans 3:23'
    ],
    weight: 40 // 40% of traffic
  },
  translation_notes: {
    references: [
      'Romans 1:1', 'John 14:6', 'Matthew 28:19', 'Acts 2:38',
      'Galatians 2:20', 'Colossians 3:17', '1 Peter 3:15'
    ],
    weight: 25 // 25% of traffic
  },
  translation_words: {
    words: [
      'salvation', 'grace', 'faith', 'righteousness', 'covenant',
      'redemption', 'sanctification', 'justification', 'gospel'
    ],
    weight: 20 // 20% of traffic
  },
  resource_discovery: {
    queries: ['', 'language=es', 'language=fr', 'organization=unfoldingWord'],
    weight: 15 // 15% of traffic
  }
};

export default function() {
  const scenario = selectScenario();
  
  switch (scenario) {
    case 'scripture_lookup':
      testScriptureLookup();
      break;
    case 'translation_notes':
      testTranslationNotes();
      break;
    case 'translation_words':
      testTranslationWords();
      break;
    case 'resource_discovery':
      testResourceDiscovery();
      break;
  }
  
  // Realistic user behavior - pause between requests
  sleep(Math.random() * 2 + 1); // 1-3 second pause
}

function selectScenario() {
  const random = Math.random() * 100;
  let cumulative = 0;
  
  for (const [scenario, config] of Object.entries(scenarios)) {
    cumulative += config.weight;
    if (random <= cumulative) {
      return scenario;
    }
  }
  
  return 'scripture_lookup'; // fallback
}

function testScriptureLookup() {
  const references = scenarios.scripture_lookup.references;
  const reference = references[Math.floor(Math.random() * references.length)];
  const language = Math.random() > 0.9 ? 'es' : 'en'; // 10% Spanish requests
  
  const response = http.get(`${BASE_URL}/api/fetch-scripture`, {
    params: { reference, language },
    tags: { endpoint: 'fetch-scripture' }
  });
  
  const success = check(response, {
    'status is 200': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500,
    'has scripture data': (r) => {
      try {
        const data = JSON.parse(r.body);
        return data.scripture !== undefined;
      } catch {
        return false;
      }
    },
    'no outdated terminology': (r) => {
      return !r.body.includes('Gateway Language');
    }
  });
  
  errorRate.add(!success);
  responseTrend.add(response.timings.duration);
}

function testTranslationNotes() {
  const references = scenarios.translation_notes.references;
  const reference = references[Math.floor(Math.random() * references.length)];
  
  const response = http.get(`${BASE_URL}/api/fetch-translation-notes`, {
    params: { reference, language: 'en' },
    tags: { endpoint: 'fetch-translation-notes' }
  });
  
  const success = check(response, {
    'status is 200': (r) => r.status === 200,
    'response time < 800ms': (r) => r.timings.duration < 800,
    'has notes data': (r) => {
      try {
        const data = JSON.parse(r.body);
        return Array.isArray(data.notes);
      } catch {
        return false;
      }
    }
  });
  
  errorRate.add(!success);
  responseTrend.add(response.timings.duration);
}

function testTranslationWords() {
  const words = scenarios.translation_words.words;
  const word = words[Math.floor(Math.random() * words.length)];
  
  const response = http.get(`${BASE_URL}/api/get-translation-word`, {
    params: { word, language: 'en' },
    tags: { endpoint: 'get-translation-word' }
  });
  
  const success = check(response, {
    'status is 200': (r) => r.status === 200,
    'response time < 800ms': (r) => r.timings.duration < 800,
    'has word data': (r) => {
      try {
        const data = JSON.parse(r.body);
        return data.word !== undefined;
      } catch {
        return false;
      }
    }
  });
  
  errorRate.add(!success);
  responseTrend.add(response.timings.duration);
}

function testResourceDiscovery() {
  const queries = scenarios.resource_discovery.queries;
  const query = queries[Math.floor(Math.random() * queries.length)];
  
  const response = http.get(`${BASE_URL}/api/list-available-resources`, {
    params: query ? { [query.split('=')[0]]: query.split('=')[1] } : {},
    tags: { endpoint: 'list-available-resources' }
  });
  
  const success = check(response, {
    'status is 200': (r) => r.status === 200,
    'response time < 1000ms': (r) => r.timings.duration < 1000,
    'has resources data': (r) => {
      try {
        const data = JSON.parse(r.body);
        return Array.isArray(data.resources);
      } catch {
        return false;
      }
    },
    'uses UW terminology': (r) => {
      return r.body.includes('ULT/GLT') && r.body.includes('UST/GST');
    }
  });
  
  errorRate.add(!success);
  responseTrend.add(response.timings.duration);
}

// Spike test scenario
export function spikeTest() {
  const response = http.get(`${BASE_URL}/api/health`);
  
  check(response, {
    'health check during spike': (r) => r.status === 200,
    'system stable under load': (r) => r.timings.duration < 1000
  });
}

// Soak test scenario (24 hour endurance)
export function soakTest() {
  // Reduced load for long-duration testing
  const scenarios = ['scripture_lookup', 'translation_notes'];
  const scenario = scenarios[Math.floor(Math.random() * scenarios.length)];
  
  if (scenario === 'scripture_lookup') {
    testScriptureLookup();
  } else {
    testTranslationNotes();
  }
  
  sleep(5); // Longer pause for soak testing
}

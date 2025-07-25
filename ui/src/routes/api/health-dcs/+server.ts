import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';

interface ValidationCheck {
  name: string;
  endpoint: string;
  reference: string;
  expectedContent: string;
  passed: boolean;
  actualContent?: string;
  error?: string;
}

export const GET: RequestHandler = async ({ url, fetch }) => {
  const checks: ValidationCheck[] = [
    {
      name: 'Scripture - Titus 1:1',
      endpoint: '/api/fetch-scripture',
      reference: 'Titus 1:1',
      expectedContent: 'Paul, a servant of God',
      passed: false
    },
    {
      name: 'Translation Notes - Titus 1:1',
      endpoint: '/api/fetch-translation-notes',
      reference: 'Titus 1:1',
      expectedContent: 'abstract nouns',
      passed: false
    },
    {
      name: 'Translation Questions - Titus 1:1',
      endpoint: '/api/fetch-translation-questions',
      reference: 'Titus 1:1',
      expectedContent: "What was Paul's purpose",
      passed: false
    }
  ];

  // Run all checks
  for (const check of checks) {
    try {
      const response = await fetch(`${url.origin}${check.endpoint}?reference=${encodeURIComponent(check.reference)}`);
      const data = await response.json();
      
      // Extract content based on endpoint
      let content = '';
      if (check.endpoint.includes('scripture')) {
        const ult = data.scriptures?.find((s: any) => s.translation?.includes('Literal Text'));
        content = ult?.text || data.text || '';
      } else if (check.endpoint.includes('notes')) {
        content = JSON.stringify(data.verseNotes || data.notes || []);
      } else if (check.endpoint.includes('questions')) {
        const questions = data.translationQuestions || data.questions || [];
        content = questions.map((q: any) => q.question).join(' ');
      }
      
      check.actualContent = content.substring(0, 100);
      check.passed = content.toLowerCase().includes(check.expectedContent.toLowerCase());
      
    } catch (error) {
      check.error = error instanceof Error ? error.message : 'Unknown error';
      check.passed = false;
    }
  }

  // Fetch DCS status
  let dcsStatus = 'unknown';
  try {
    const dcsResponse = await fetch('https://git.door43.org/api/v1/version');
    dcsStatus = dcsResponse.ok ? 'healthy' : 'unhealthy';
  } catch {
    dcsStatus = 'unreachable';
  }

  const allPassed = checks.every(c => c.passed);
  
  return json({
    status: allPassed ? 'healthy' : 'unhealthy',
    dcsStatus,
    timestamp: new Date().toISOString(),
    checks,
    summary: {
      total: checks.length,
      passed: checks.filter(c => c.passed).length,
      failed: checks.filter(c => !c.passed).length
    }
  });
};
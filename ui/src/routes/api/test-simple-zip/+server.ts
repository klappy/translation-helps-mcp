export const config = {
	runtime: 'edge'
};

/**
 * Super simple test for ZIP functionality in edge runtime
 */

export async function GET(): Promise<Response> {
	try {
		console.log('🎯 Simple ZIP test starting...');

		// Test 1: Can we fetch?
		const catalogUrl =
			'https://git.door43.org/api/v1/catalog/search?lang=en&owner=unfoldingWord&type=text&subject=Bible,Aligned%20Bible';
		console.log('📡 Fetching catalog...');

		const response = await fetch(catalogUrl);
		if (!response.ok) {
			return new Response(
				JSON.stringify({ error: 'Catalog fetch failed', status: response.status }),
				{ status: 500, headers: { 'Content-Type': 'application/json' } }
			);
		}

		const data = await response.json();
		console.log(`✅ Got ${data.data?.length || 0} resources`);

		// Test 2: Can we import fflate?
		console.log('📦 Testing fflate import...');
		try {
			const { unzipSync } = await import('fflate');
			console.log('✅ fflate imported successfully');

			// Test 3: Can we unzip something small?
			const testZip = new Uint8Array([80, 75, 3, 4]); // Minimal ZIP header
			try {
				unzipSync(testZip);
			} catch (e) {
				console.log('⚠️ Expected unzip error for test data:', e.message);
			}

			return new Response(
				JSON.stringify({
					success: true,
					tests: {
						catalog: true,
						fflate: true,
						resources: data.data?.length || 0
					}
				}),
				{ status: 200, headers: { 'Content-Type': 'application/json' } }
			);
		} catch (importError) {
			console.error('❌ fflate import failed:', importError);
			return new Response(
				JSON.stringify({
					error: 'fflate import failed',
					message: importError instanceof Error ? importError.message : 'Unknown error'
				}),
				{ status: 500, headers: { 'Content-Type': 'application/json' } }
			);
		}
	} catch (error) {
		console.error('💥 Error in simple test:', error);
		return new Response(
			JSON.stringify({
				error: 'Test failed',
				message: error instanceof Error ? error.message : 'Unknown error'
			}),
			{ status: 500, headers: { 'Content-Type': 'application/json' } }
		);
	}
}

export const config = {
	runtime: 'edge'
};

// Inline everything to debug
export async function GET(): Promise<Response> {
	const results = [];

	try {
		console.log('🚀 Starting inline test...');

		// 1. Catalog
		const catalogResponse = await fetch(
			'https://git.door43.org/api/v1/catalog/search?lang=en&owner=unfoldingWord&type=text&subject=Bible,Aligned%20Bible'
		);
		const catalog = await catalogResponse.json();

		console.log(`📚 Found ${catalog.data?.length} resources`);

		// 2. Process ULT
		const ult = catalog.data?.find((r: { name: string }) => r.name === 'en_ult');
		if (!ult) throw new Error('No ULT');

		// 3. Find John
		const john = ult.ingredients?.find((i: { identifier: string }) => i.identifier === 'jhn');
		if (!john) throw new Error('No John');

		console.log(`📖 John path: ${john.path}`);

		// 4. Get ZIP
		const zipUrl = `https://git.door43.org/${ult.owner}/${ult.name}/archive/master.zip`;
		console.log(`📦 Downloading: ${zipUrl}`);

		const zipResponse = await fetch(zipUrl);
		const zipBuffer = await zipResponse.arrayBuffer();

		console.log(`✅ Downloaded ${(zipBuffer.byteLength / 1024 / 1024).toFixed(2)} MB`);

		// 5. Extract
		const { unzipSync } = await import('fflate');
		const unzipped = unzipSync(new Uint8Array(zipBuffer));

		// 6. Find file
		const paths = [
			john.path.replace('./', ''),
			`en_ult/${john.path.replace('./', '')}`,
			`${ult.name}/${john.path.replace('./', '')}`
		];

		let content = null;
		for (const p of paths) {
			if (unzipped[p]) {
				content = new TextDecoder().decode(unzipped[p]);
				console.log(`✅ Found at: ${p}`);
				break;
			}
		}

		if (!content) throw new Error('File not found');

		// 7. Extract verse (simplified)
		const parts = content.split('\\v 16 ');
		if (parts.length > 1) {
			const versePart = parts[1].split('\\v ')[0];
			// Just return raw for now
			results.push({
				text: versePart.substring(0, 100) + '...',
				translation: 'ULT'
			});
		}

		return new Response(JSON.stringify({ success: true, results, logs: 'Check console' }), {
			status: 200,
			headers: { 'Content-Type': 'application/json' }
		});
	} catch (error) {
		console.error('💥 Error:', error);
		return new Response(
			JSON.stringify({
				error: error instanceof Error ? error.message : 'Unknown',
				results
			}),
			{ status: 500, headers: { 'Content-Type': 'application/json' } }
		);
	}
}

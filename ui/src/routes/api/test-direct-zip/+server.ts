export const config = {
	runtime: 'edge'
};

/**
 * Direct ZIP test - bypassing all the fancy stuff
 */

export async function GET(): Promise<Response> {
	try {
		// 1. Fetch catalog
		const catalogResponse = await fetch(
			'https://git.door43.org/api/v1/catalog/search?lang=en&owner=unfoldingWord&type=text&subject=Bible,Aligned%20Bible'
		);

		if (!catalogResponse.ok) {
			throw new Error(`Catalog failed: ${catalogResponse.status}`);
		}

		const catalog = await catalogResponse.json();
		const ult = catalog.data?.find((r: { name: string }) => r.name === 'en_ult');

		if (!ult) {
			throw new Error('ULT not found');
		}

		// 2. Find John ingredient
		const johnIngredient = ult.ingredients?.find(
			(i: { identifier: string }) => i.identifier === 'jhn'
		);

		if (!johnIngredient) {
			throw new Error('John ingredient not found');
		}

		// 3. Download ZIP
		const zipUrl = `https://git.door43.org/${ult.owner}/${ult.name}/archive/master.zip`;
		const zipResponse = await fetch(zipUrl);

		if (!zipResponse.ok) {
			throw new Error(`ZIP download failed: ${zipResponse.status}`);
		}

		const zipBuffer = await zipResponse.arrayBuffer();

		// 4. Extract with fflate
		const { unzipSync } = await import('fflate');
		const unzipped = unzipSync(new Uint8Array(zipBuffer));

		// 5. Find John file
		const possiblePaths = [
			johnIngredient.path,
			johnIngredient.path.replace('./', ''),
			`en_ult/${johnIngredient.path.replace('./', '')}`,
			`${ult.name}/${johnIngredient.path.replace('./', '')}`
		];

		let johnContent = null;
		let foundPath = null;

		for (const path of possiblePaths) {
			if (unzipped[path]) {
				const decoder = new TextDecoder('utf-8');
				johnContent = decoder.decode(unzipped[path]);
				foundPath = path;
				break;
			}
		}

		if (!johnContent) {
			return new Response(
				JSON.stringify({
					error: 'John file not found',
					tried: possiblePaths,
					available: Object.keys(unzipped).slice(0, 10)
				}),
				{ status: 404, headers: { 'Content-Type': 'application/json' } }
			);
		}

		// 6. Extract John 3:16
		const chapterMatch = johnContent.match(/\\c\s+3\b/);
		if (!chapterMatch || !chapterMatch.index) {
			throw new Error('Chapter 3 not found');
		}

		const chapterStart = chapterMatch.index + chapterMatch[0].length;
		const nextChapter = johnContent.substring(chapterStart).match(/\\c\s+\d+/);
		const chapterEnd = nextChapter ? chapterStart + nextChapter.index : johnContent.length;
		const chapter3 = johnContent.substring(chapterStart, chapterEnd);

		const verseMatch = chapter3.match(/\\v\s+16\b/);
		if (!verseMatch || !verseMatch.index) {
			throw new Error('Verse 16 not found');
		}

		const verseStart = verseMatch.index + verseMatch[0].length;
		const nextVerse = chapter3.substring(verseStart).match(/\\v\s+\d+/);
		const verseEnd = nextVerse ? verseStart + nextVerse.index : chapter3.length;

		let verse16 = chapter3.substring(verseStart, verseEnd);

		// Clean USFM
		verse16 = verse16
			.replace(/\\w\s+([^|]+)\|[^\\]+\\w\*/g, '$1')
			.replace(/\\zaln-[se]\|[^\\]+\\*/g, '')
			.replace(/\\[a-z]+\s*/g, '')
			.replace(/\s+/g, ' ')
			.trim();

		return new Response(
			JSON.stringify({
				success: true,
				data: {
					resources: [
						{
							text: verse16,
							translation: 'ULT'
						}
					],
					total: 1,
					reference: 'John 3:16',
					debug: {
						foundPath,
						zipSize: (zipBuffer.byteLength / 1024 / 1024).toFixed(2) + ' MB',
						ingredientPath: johnIngredient.path
					}
				}
			}),
			{ status: 200, headers: { 'Content-Type': 'application/json' } }
		);
	} catch (error) {
		return new Response(
			JSON.stringify({
				error: 'Failed',
				message: error instanceof Error ? error.message : 'Unknown error',
				stack: error instanceof Error ? error.stack : undefined
			}),
			{ status: 500, headers: { 'Content-Type': 'application/json' } }
		);
	}
}

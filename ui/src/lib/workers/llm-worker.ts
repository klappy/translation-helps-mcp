import { pipeline } from '@xenova/transformers';

// Web Worker for AI generation
let generator: unknown = null;
let isInitialized = false;

// Initialize the model
async function initializeModel() {
	if (isInitialized) return;

	try {
		generator = await pipeline('text-generation', 'Xenova/TinyLlama-1.1B-Chat-v1.0', {
			quantized: true
		});
		isInitialized = true;
		postMessage({ type: 'initialized' });
	} catch (error) {
		postMessage({ type: 'error', error: (error as Error).message });
	}
}

// Generate response
async function generateResponse(
	prompt: string,
	maxLength: number = 256,
	temperature: number = 0.7
) {
	if (!isInitialized) {
		await initializeModel();
	}

	try {
		const formattedPrompt = `<|system|>
You are a helpful AI assistant specialized in Bible translation and scripture analysis. You have access to Bible resources and can help with scripture interpretation, translation questions, word studies, and cross-references. Keep your responses concise and helpful.
<|user|>
${prompt}
<|assistant|>`;

		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const result = await (generator as any)(formattedPrompt, {
			max_new_tokens: maxLength,
			temperature: temperature,
			do_sample: true,
			pad_token_id: 0,
			eos_token_id: 2
		});

		const fullText = result[0].generated_text;
		const response = fullText.substring(formattedPrompt.length).trim();

		postMessage({
			type: 'response',
			text: response || "I'm sorry, I couldn't generate a response. Please try again.",
			tokens: fullText.length
		});
	} catch (error) {
		postMessage({ type: 'error', error: (error as Error).message });
	}
}

// Handle messages from main thread
self.onmessage = async (event) => {
	const { type, prompt, maxLength, temperature } = event.data;

	switch (type) {
		case 'initialize':
			await initializeModel();
			break;
		case 'generate':
			await generateResponse(prompt, maxLength, temperature);
			break;
		default:
			postMessage({ type: 'error', error: 'Unknown message type' });
	}
};

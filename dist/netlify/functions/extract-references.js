/**
 * Extract References Endpoint
 * POST /api/extract-references
 */
import { extractReferences } from './_shared/reference-parser';
export const handler = async (event, context) => {
    console.log('Extract references requested');
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Content-Type': 'application/json',
    };
    // Handle CORS preflight
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers,
            body: '',
        };
    }
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({
                error: 'Method not allowed',
                message: 'This endpoint only accepts POST requests'
            }),
        };
    }
    try {
        if (!event.body) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({
                    error: 'Bad request',
                    message: 'Request body is required'
                }),
            };
        }
        const { text } = JSON.parse(event.body);
        if (!text || typeof text !== 'string') {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({
                    error: 'Bad request',
                    message: 'Text field is required and must be a string'
                }),
            };
        }
        const references = extractReferences(text);
        const response = {
            text,
            references,
            count: references.length,
            timestamp: new Date().toISOString()
        };
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify(response, null, 2),
        };
    }
    catch (error) {
        console.error('Extract references error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                error: 'Internal server error',
                message: 'Failed to extract references from text',
                timestamp: new Date().toISOString()
            }),
        };
    }
};

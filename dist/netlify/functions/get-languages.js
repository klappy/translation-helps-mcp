/**
 * Get Languages Endpoint
 * GET /api/get-languages
 */
export const handler = async (event, context) => {
    console.log('Get languages requested');
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
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
    if (event.httpMethod !== 'GET') {
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({
                error: 'Method not allowed',
                message: 'This endpoint only accepts GET requests'
            }),
        };
    }
    try {
        // For now, return a static list of common languages
        // In a full implementation, this would fetch from DCS API
        const languages = [
            {
                code: 'en',
                name: 'English',
                direction: 'ltr',
                organization: 'unfoldingWord',
                resources: ['scripture', 'notes', 'questions', 'words', 'links']
            },
            {
                code: 'es',
                name: 'Español',
                direction: 'ltr',
                organization: 'unfoldingWord',
                resources: ['scripture', 'notes', 'questions']
            },
            {
                code: 'fr',
                name: 'Français',
                direction: 'ltr',
                organization: 'unfoldingWord',
                resources: ['scripture', 'notes']
            },
            {
                code: 'pt',
                name: 'Português',
                direction: 'ltr',
                organization: 'unfoldingWord',
                resources: ['scripture', 'notes']
            },
            {
                code: 'sw',
                name: 'Kiswahili',
                direction: 'ltr',
                organization: 'unfoldingWord',
                resources: ['scripture']
            }
        ];
        const response = {
            languages,
            total: languages.length,
            timestamp: new Date().toISOString()
        };
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify(response, null, 2),
        };
    }
    catch (error) {
        console.error('Get languages error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                error: 'Internal server error',
                message: 'Failed to fetch available languages',
                timestamp: new Date().toISOString()
            }),
        };
    }
};

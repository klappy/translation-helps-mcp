"""
Test script to verify Python SDK tools accept and pass language/organization parameters
"""

import asyncio
from translation_helps import TranslationHelpsClient


async def test_sdk_parameters():
    print('🧪 Testing Python SDK Parameter Passing\n')

    client = TranslationHelpsClient({
        'serverUrl': 'https://translation-helps-mcp-945.pages.dev/api/mcp',
    })

    try:
        await client.connect()
        print('✅ Connected to MCP server\n')

        # Test 1: Default parameters (should use "en" and "unfoldingWord")
        print('Test 1: Using default parameters (should use "en" and "unfoldingWord")')
        try:
            result1 = await client.fetch_scripture({
                'reference': 'John 3:16',
                # No language or organization specified
            })
            print('✅ Default params test passed')
            print(f'   Response length: {len(result1)} chars\n')
        except Exception as e:
            print(f'❌ Default params test failed: {str(e)}\n')

        # Test 2: Custom language parameter
        print('Test 2: Using custom language parameter (language="es")')
        try:
            result2 = await client.fetch_scripture({
                'reference': 'John 3:16',
                'language': 'es',
                # No organization specified (should default to "unfoldingWord")
            })
            print('✅ Custom language test passed')
            print(f'   Response length: {len(result2)} chars\n')
        except Exception as e:
            print(f'❌ Custom language test failed: {str(e)}\n')

        # Test 3: Custom organization parameter
        print('Test 3: Using custom organization parameter (organization="testOrg")')
        try:
            result3 = await client.fetch_scripture({
                'reference': 'John 3:16',
                'organization': 'testOrg',
                # No language specified (should default to "en")
            })
            print('✅ Custom organization test passed')
            print(f'   Response length: {len(result3)} chars\n')
        except Exception as e:
            print(f'❌ Custom organization test failed: {str(e)}\n')

        # Test 4: Both custom parameters
        print('Test 4: Using both custom parameters (language="es", organization="testOrg")')
        try:
            result4 = await client.fetch_scripture({
                'reference': 'John 3:16',
                'language': 'es',
                'organization': 'testOrg',
            })
            print('✅ Both custom params test passed')
            print(f'   Response length: {len(result4)} chars\n')
        except Exception as e:
            print(f'❌ Both custom params test failed: {str(e)}\n')

        # Test 5: Test with fetch_translation_notes
        print('Test 5: Testing fetch_translation_notes with custom parameters')
        try:
            result5 = await client.fetch_translation_notes({
                'reference': 'John 3:16',
                'language': 'es',
                'organization': 'unfoldingWord',
            })
            print('✅ fetch_translation_notes test passed')
            print(f'   Response type: {type(result5)}\n')
        except Exception as e:
            print(f'❌ fetch_translation_notes test failed: {str(e)}\n')

        # Test 6: Test with fetch_translation_word
        print('Test 6: Testing fetch_translation_word with custom parameters')
        try:
            result6 = await client.fetch_translation_word({
                'term': 'love',
                'language': 'es',
                'organization': 'unfoldingWord',
            })
            print('✅ fetch_translation_word test passed')
            print(f'   Response type: {type(result6)}\n')
        except Exception as e:
            print(f'❌ fetch_translation_word test failed: {str(e)}\n')

        print('✅ All tests completed!')
    except Exception as e:
        print(f'❌ Test failed: {str(e)}')
        raise


if __name__ == '__main__':
    asyncio.run(test_sdk_parameters())


#!/usr/bin/env node

/**
 * Test MCP Server using proper MCP Protocol
 * Uses the MCP SDK to communicate via stdio
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { spawn } from 'child_process';

async function testMCPServer() {
  console.log('🧪 Testing MCP Server via Protocol\n');
  
  // Create transport to communicate with the MCP server
  const transport = new StdioClientTransport({
    command: 'npx',
    args: ['tsx', 'src/index.ts'],
  });
  
  // Create MCP client
  const client = new Client(
    {
      name: 'test-client',
      version: '1.0.0',
    },
    {
      capabilities: {},
    }
  );
  
  try {
    // Connect to the server
    console.log('🔌 Connecting to MCP server...');
    await client.connect(transport);
    console.log('✅ Connected!\n');
    
    // List available tools
    console.log('📋 Listing available tools...');
    const toolsList = await client.listTools();
    console.log(`✅ Found ${toolsList.tools.length} tools:\n`);
    
    toolsList.tools.forEach((tool, i) => {
      console.log(`   ${i + 1}. ${tool.name}`);
      console.log(`      ${tool.description}`);
    });
    
    console.log('\n' + '='.repeat(60) + '\n');
    
    // Call fetch_translation_word_links
    console.log('🔧 Calling fetch_translation_word_links...');
    console.log('   Reference: John 3:16');
    console.log('   Language: en\n');
    
    const result = await client.callTool({
      name: 'fetch_translation_word_links',
      arguments: {
        reference: 'John 3:16',
        language: 'en',
        organization: 'unfoldingWord'
      }
    });
    
    console.log('✅ Response received!\n');
    
    // Parse the response
    let responseData;
    if (result.content && result.content[0]) {
      if (result.content[0].type === 'text') {
        responseData = JSON.parse(result.content[0].text);
      } else {
        responseData = result.content[0];
      }
    } else {
      responseData = result;
    }
    
    console.log('📊 Full Response:');
    console.log(JSON.stringify(responseData, null, 2));
    
    console.log('\n' + '='.repeat(60) + '\n');
    
    // Check for extracted fields
    const links = responseData.translationWordLinks || [];
    
    if (links.length > 0) {
      console.log(`🔍 Analyzing ${links.length} word links:\n`);
      
      links.slice(0, 3).forEach((link, i) => {
        console.log(`Link ${i + 1}:`);
        console.log(`   category: ${link.category || '❌ MISSING'}`);
        console.log(`   wordId: ${link.wordId || '❌ MISSING'}`);
        console.log(`   path: ${link.path || '❌ MISSING'}`);
        console.log(`   rcLink: ${link.rcLink || '❌ MISSING'}`);
        console.log('');
      });
      
      if (links.length > 3) {
        console.log(`   ... and ${links.length - 3} more links\n`);
      }
      
      // Verify all links have the required fields
      const allHaveCategory = links.every(l => l.category);
      const allHaveWordId = links.every(l => l.wordId);
      const allHavePath = links.every(l => l.path);
      const allHaveRcLink = links.every(l => l.rcLink);
      const pathsHaveMd = links.every(l => l.path && l.path.endsWith('.md'));
      
      console.log('📋 Field Verification:');
      console.log(`   ${allHaveCategory ? '✅' : '❌'} All links have 'category'`);
      console.log(`   ${allHaveWordId ? '✅' : '❌'} All links have 'wordId'`);
      console.log(`   ${allHavePath ? '✅' : '❌'} All links have 'path'`);
      console.log(`   ${pathsHaveMd ? '✅' : '❌'} All paths end with .md`);
      console.log(`   ${allHaveRcLink ? '✅' : '❌'} All links have 'rcLink'`);
      
      if (allHaveCategory && allHaveWordId && allHavePath && allHaveRcLink && pathsHaveMd) {
        console.log('\n🎉 SUCCESS! All extracted fields present with correct format!');
      } else {
        console.log('\n❌ FAILURE! Missing or incorrectly formatted fields!');
      }
    } else {
      console.log('⚠️ No word links returned');
    }
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error);
  } finally {
    // Close the connection
    await client.close();
    console.log('\n🔌 Disconnected from MCP server');
    process.exit(0);
  }
}

// Run the test
testMCPServer().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});


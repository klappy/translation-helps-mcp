#!/usr/bin/env node

/**
 * Test MCP Server - Translation Word Links
 * Verifies the response includes category, word, and path fields
 */

import { spawn } from 'child_process';

const mcp = spawn('node_modules/.bin/tsx.cmd', ['src/index.ts'], {
  stdio: ['pipe', 'pipe', 'inherit'],
  shell: true
});

let buffer = '';

mcp.stdout.on('data', (data) => {
  buffer += data.toString();
  
  const lines = buffer.split('\n');
  buffer = lines.pop() || '';
  
  for (const line of lines) {
    if (!line.trim()) continue;
    
    try {
      const msg = JSON.parse(line);
      
      if (msg.id === 2 && msg.result) {
        console.log('\n✅ MCP Response Received!\n');
        
        // Extract the response data
        const response = msg.result.content?.[0]?.text 
          ? JSON.parse(msg.result.content[0].text)
          : msg.result;
        
        console.log('📊 Response Structure:');
        console.log(JSON.stringify(response, null, 2));
        
        // Check for extracted fields
        const links = response.translationWordLinks || [];
        
        if (links.length > 0) {
          console.log('\n🔍 Checking first link for extracted fields:');
          const first = links[0];
          
          console.log(`   category: ${first.category || '❌ MISSING'}`);
          console.log(`   word: ${first.word || '❌ MISSING'}`);
          console.log(`   path: ${first.path || '❌ MISSING'}`);
          console.log(`   rcLink: ${first.rcLink || '❌ MISSING'}`);
          
          if (first.category && first.word && first.path) {
            console.log('\n🎉 SUCCESS! All extracted fields present!');
          } else {
            console.log('\n❌ FAILURE! Missing extracted fields!');
          }
        }
        
        mcp.kill();
        process.exit(0);
      }
    } catch (err) {
      // Ignore parse errors
    }
  }
});

// Send list tools request first
setTimeout(() => {
  console.log('📤 Requesting tools list...\n');
  mcp.stdin.write(JSON.stringify({
    jsonrpc: '2.0',
    id: 1,
    method: 'tools/list'
  }) + '\n');
  
  // Then call the tool
  setTimeout(() => {
    console.log('📤 Calling fetch_translation_word_links...\n');
    mcp.stdin.write(JSON.stringify({
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/call',
      params: {
        name: 'fetch_translation_word_links',
        arguments: {
          reference: 'John 3:16',
          language: 'en',
          organization: 'unfoldingWord'
        }
      }
    }) + '\n');
  }, 1000);
}, 500);

setTimeout(() => {
  console.log('\n⏱️ Timeout - test took too long');
  mcp.kill();
  process.exit(1);
}, 30000);


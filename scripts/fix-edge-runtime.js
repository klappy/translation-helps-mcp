#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const apiDir = path.join(__dirname, '../ui/src/routes/api');

function fixEdgeRuntime(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Remove incorrect runtime export
    content = content.replace(/export const runtime = 'edge';\n\n/, '');
    
    // Check if already has config export
    if (content.includes('export const config')) {
        console.log(`✓ ${filePath} already has config export`);
        return;
    }
    
    // Add config export with runtime at the beginning
    const newContent = `export const config = {\n\truntime: 'edge'\n};\n\n${content}`;
    fs.writeFileSync(filePath, newContent);
    console.log(`✅ Fixed edge runtime in ${filePath}`);
}

function processDirectory(dir) {
    const files = fs.readdirSync(dir);
    
    for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
            processDirectory(fullPath);
        } else if (file === '+server.ts') {
            fixEdgeRuntime(fullPath);
        }
    }
}

console.log('Fixing edge runtime configuration for all API endpoints...\n');
processDirectory(apiDir);

// Also fix the chat page
const chatPagePath = path.join(__dirname, '../ui/src/routes/chat/+page.ts');
if (fs.existsSync(chatPagePath)) {
    let content = fs.readFileSync(chatPagePath, 'utf8');
    // Update the chat page config as well
    content = content.replace(
        /export const config = {\n\truntime: 'edge'\n};/,
        "// Page configuration for Cloudflare Pages\nexport const prerender = false;\nexport const ssr = true;"
    );
    fs.writeFileSync(chatPagePath, content);
    console.log(`✅ Fixed chat page configuration`);
}

console.log('\nDone!');
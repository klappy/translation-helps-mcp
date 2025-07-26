#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const apiDir = path.join(__dirname, '../ui/src/routes/api');

function addEdgeRuntime(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Check if already has runtime export
    if (content.includes('export const runtime')) {
        console.log(`✓ ${filePath} already has runtime export`);
        return;
    }
    
    // Add runtime export at the beginning
    const newContent = `export const runtime = 'edge';\n\n${content}`;
    fs.writeFileSync(filePath, newContent);
    console.log(`✅ Added edge runtime to ${filePath}`);
}

function processDirectory(dir) {
    const files = fs.readdirSync(dir);
    
    for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
            processDirectory(fullPath);
        } else if (file === '+server.ts') {
            addEdgeRuntime(fullPath);
        }
    }
}

console.log('Adding edge runtime to all API endpoints...\n');
processDirectory(apiDir);
console.log('\nDone!');
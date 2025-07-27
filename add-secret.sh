#!/bin/bash

echo "Adding OpenAI API key as a Cloudflare Pages secret..."
echo ""
echo "You'll be prompted to enter your API key."
echo "It will be hidden as you type and encrypted by Cloudflare."
echo ""

# Add the secret
npx wrangler pages secret put OPENAI_API_KEY

echo ""
echo "✅ Done! The secret has been added."
echo "Your next deployment will have access to the OpenAI API key."
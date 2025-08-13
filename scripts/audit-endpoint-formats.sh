#!/bin/bash

# Audit script for all endpoint formats
# Tests each endpoint with all format options

BASE_URL="http://localhost:8174/api"
REFERENCE="John+3:16"
LANGUAGE="en"
ORGANIZATION="unfoldingWord"

echo "==================================="
echo "ENDPOINT FORMAT AUDIT"
echo "==================================="
echo ""

# Function to test endpoint with all formats
test_endpoint() {
    local endpoint=$1
    local params=$2
    
    echo "-----------------------------------"
    echo "Testing: $endpoint"
    echo "-----------------------------------"
    
    # Test JSON format
    echo -e "\n📄 JSON Format:"
    response=$(curl -s "$BASE_URL/$endpoint?$params&format=json" -w "\nHTTP_STATUS:%{http_code}")
    http_status=$(echo "$response" | grep -o "HTTP_STATUS:[0-9]*" | cut -d: -f2)
    body=$(echo "$response" | sed '/HTTP_STATUS:/d')
    
    if [ "$http_status" = "200" ]; then
        echo "✅ Status: 200 OK"
        echo "$body" | jq '.' 2>/dev/null | head -10 || echo "❌ Invalid JSON"
    else
        echo "❌ Status: $http_status"
        echo "$body" | head -5
    fi
    
    # Test Markdown format
    echo -e "\n📝 Markdown Format:"
    response=$(curl -s "$BASE_URL/$endpoint?$params&format=md" -w "\nHTTP_STATUS:%{http_code}")
    http_status=$(echo "$response" | grep -o "HTTP_STATUS:[0-9]*" | cut -d: -f2)
    body=$(echo "$response" | sed '/HTTP_STATUS:/d')
    
    if [ "$http_status" = "200" ]; then
        echo "✅ Status: 200 OK"
        echo "$body" | head -15
    else
        echo "❌ Status: $http_status"
        echo "$body" | head -5
    fi
    
    # Test Text format
    echo -e "\n📋 Text Format:"
    response=$(curl -s "$BASE_URL/$endpoint?$params&format=text" -w "\nHTTP_STATUS:%{http_code}")
    http_status=$(echo "$response" | grep -o "HTTP_STATUS:[0-9]*" | cut -d: -f2)
    body=$(echo "$response" | sed '/HTTP_STATUS:/d')
    
    if [ "$http_status" = "200" ]; then
        echo "✅ Status: 200 OK"
        echo "$body" | head -15
    else
        echo "❌ Status: $http_status"
        echo "$body" | head -5
    fi
    
    echo ""
}

# Test scripture endpoint
test_endpoint "fetch-scripture" "reference=$REFERENCE&language=$LANGUAGE&organization=$ORGANIZATION"

# Test translation notes
test_endpoint "translation-notes" "reference=$REFERENCE&language=$LANGUAGE&organization=$ORGANIZATION"

# Test translation questions
test_endpoint "translation-questions" "reference=$REFERENCE&language=$LANGUAGE&organization=$ORGANIZATION"

# Test translation words
test_endpoint "fetch-translation-words" "reference=$REFERENCE&language=$LANGUAGE&organization=$ORGANIZATION"

# Test languages (no reference needed)
test_endpoint "get-languages" "organization=$ORGANIZATION"

# Test books
test_endpoint "get-available-books" "language=$LANGUAGE&organization=$ORGANIZATION"

echo "==================================="
echo "AUDIT COMPLETE"
echo "==================================="

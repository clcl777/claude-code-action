#!/bin/bash

# OAuth Debug Script
echo "🔍 Claude OAuth Token Debug Script"
echo "=================================="

# Claude credentials file path
CLAUDE_CREDS="$HOME/.claude/.credentials.json"

if [ -f "$CLAUDE_CREDS" ]; then
    echo "✅ Found Claude credentials file: $CLAUDE_CREDS"
    echo ""
    
    # Extract token information
    ACCESS_TOKEN=$(jq -r '.access_token // empty' "$CLAUDE_CREDS")
    REFRESH_TOKEN=$(jq -r '.refresh_token // empty' "$CLAUDE_CREDS")
    EXPIRES_AT=$(jq -r '.expires_at // empty' "$CLAUDE_CREDS")
    
    echo "📋 Token Information:"
    echo "Access Token: ${ACCESS_TOKEN:0:20}..." 
    echo "Refresh Token: ${REFRESH_TOKEN:0:20}..."
    echo "Expires At: $EXPIRES_AT"
    echo ""
    
    # Check token expiration
    if [ -n "$EXPIRES_AT" ]; then
        # Convert expires_at to seconds (assuming it's in milliseconds)
        if [[ $EXPIRES_AT =~ ^[0-9]+$ ]] && [ ${#EXPIRES_AT} -gt 10 ]; then
            # Milliseconds timestamp
            EXPIRES_SECONDS=$((EXPIRES_AT / 1000))
        else
            # Seconds timestamp or ISO format
            EXPIRES_SECONDS=$(date -d "$EXPIRES_AT" +%s 2>/dev/null || echo "$EXPIRES_AT")
        fi
        
        CURRENT_SECONDS=$(date +%s)
        BUFFER_SECONDS=$((5 * 60)) # 5 minutes buffer
        
        echo "⏰ Time Information:"
        echo "Current time: $(date -u)"
        echo "Token expires: $(date -u -d @$EXPIRES_SECONDS 2>/dev/null || echo 'Invalid date')"
        echo "Current timestamp: $CURRENT_SECONDS"
        echo "Expires timestamp: $EXPIRES_SECONDS"
        echo ""
        
        if [ $EXPIRES_SECONDS -lt $CURRENT_SECONDS ]; then
            echo "❌ Token is EXPIRED!"
            echo "   Expired $(( (CURRENT_SECONDS - EXPIRES_SECONDS) / 60 )) minutes ago"
        elif [ $EXPIRES_SECONDS -lt $((CURRENT_SECONDS + BUFFER_SECONDS)) ]; then
            echo "⚠️  Token will expire SOON (within 5 minutes)"
            echo "   Expires in $(( (EXPIRES_SECONDS - CURRENT_SECONDS) / 60 )) minutes"
        else
            echo "✅ Token is VALID"
            echo "   Expires in $(( (EXPIRES_SECONDS - CURRENT_SECONDS) / 60 )) minutes"
        fi
    else
        echo "❌ No expiration time found"
    fi
    echo ""
    
    # GitHub Secrets format
    echo "📝 GitHub Secrets Values:"
    echo "CLAUDE_ACCESS_TOKEN=$ACCESS_TOKEN"
    echo "CLAUDE_REFRESH_TOKEN=$REFRESH_TOKEN"
    echo "CLAUDE_EXPIRES_AT=$EXPIRES_AT"
    echo ""
    
    # Test token manually
    echo "🧪 Testing Token Manually:"
    if [ -n "$ACCESS_TOKEN" ]; then
        echo "Testing access token with Claude API..."
        RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" \
            -H "Content-Type: application/json" \
            -H "Authorization: Bearer $ACCESS_TOKEN" \
            -d '{"model":"claude-3-sonnet-20240229","max_tokens":10,"messages":[{"role":"user","content":"Say OK"}]}' \
            https://api.anthropic.com/v1/messages)
        
        HTTP_STATUS=$(echo "$RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)
        RESPONSE_BODY=$(echo "$RESPONSE" | sed '/HTTP_STATUS/d')
        
        echo "HTTP Status: $HTTP_STATUS"
        if [ "$HTTP_STATUS" = "200" ]; then
            echo "✅ Token works!"
        elif [ "$HTTP_STATUS" = "401" ]; then
            echo "❌ Token is invalid/expired (401 Unauthorized)"
            echo "Response: $RESPONSE_BODY"
        else
            echo "❓ Unexpected response: $HTTP_STATUS"
            echo "Response: $RESPONSE_BODY"
        fi
    fi
else
    echo "❌ Claude credentials file not found at $CLAUDE_CREDS"
    echo ""
    echo "To get OAuth credentials:"
    echo "1. Make sure you're logged in to Claude Max"
    echo "2. Run: claude (interactive mode)"
    echo "3. Check if $CLAUDE_CREDS is created"
fi

echo ""
echo "🚀 Next Steps:"
echo "1. Copy the CLAUDE_* values above to your GitHub repository secrets"
echo "2. Use the debug workflow to test in GitHub Actions"
echo "3. Check the action logs for detailed OAuth flow information" 
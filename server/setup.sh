#!/bin/bash

# ClipToTicket Server Setup Script

echo "🔧 Setting up ClipToTicket backend server..."
echo ""

# Check if .env.local exists in parent directory
if [ -f "../.env.local" ]; then
    echo "📋 Found existing .env.local file"
    
    # Extract GEMINI_API_KEY if it exists
    if grep -q "GEMINI_API_KEY" ../.env.local; then
        API_KEY=$(grep "GEMINI_API_KEY" ../.env.local | cut -d '=' -f2)
        echo "✅ Found GEMINI_API_KEY in .env.local"
    fi
fi

# Create .env file
echo "📝 Creating server/.env file..."
cat > .env << EOF
GEMINI_API_KEY=${API_KEY:-your_api_key_here}
PORT=3001
FRONTEND_URL=http://localhost:3000
NODE_ENV=development
EOF

if [ "$API_KEY" != "" ] && [ "$API_KEY" != "your_api_key_here" ]; then
    echo "✅ Server .env created with API key from .env.local"
else
    echo "⚠️  Server .env created with placeholder"
    echo "   Please edit server/.env and add your Gemini API key"
fi

echo ""
echo "🎉 Setup complete!"
echo ""
echo "Next steps:"
echo "1. Start the backend: npm run dev"
echo "2. In another terminal, start the frontend: cd .. && npm run dev"

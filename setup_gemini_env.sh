#!/bin/bash

# Setup script for Google Gemini 2.0 Flash integration
# Run: source setup_gemini_env.sh

echo "🔧 Setting up Google Gemini 2.0 Flash environment..."

# Check if .env file exists
if [ ! -f .env ]; then
    echo "📝 Creating .env file..."
    touch .env
fi

# Check if GOOGLE_AI_API_KEY is already set
if grep -q "GOOGLE_AI_API_KEY" .env; then
    echo "✅ GOOGLE_AI_API_KEY already configured in .env"
else
    echo "⚠️ GOOGLE_AI_API_KEY not found in .env"
    echo ""
    echo "To get your Google AI API key:"
    echo "1. Go to https://makersuite.google.com/app/apikey"
    echo "2. Create a new API key"
    echo "3. Add it to your .env file:"
    echo "   echo 'GOOGLE_AI_API_KEY=your-api-key-here' >> .env"
    echo ""
    echo "Or set it temporarily:"
    echo "   export GOOGLE_AI_API_KEY=your-api-key-here"
fi

echo ""
echo "🚀 Gemini 2.0 Flash Features:"
echo "• Fastest response times among all models"
echo "• Most cost-effective option (\$0.0075 per 1K tokens)"
echo "• Excellent at reasoning and pattern recognition"
echo "• Native JSON output support"
echo "• Multimodal capabilities (text, image, video)"
echo ""
echo "📊 Model Priority Order:"
echo "1. Gemini 2.0 Flash (fastest, cheapest)"
echo "2. Claude 3 Sonnet (best reasoning)"
echo "3. GPT-4 (balanced performance)"
echo "4. Rule-based fallback"
echo ""
echo "✅ Setup complete! Run 'python3 test_gemini_integration.py' to test."
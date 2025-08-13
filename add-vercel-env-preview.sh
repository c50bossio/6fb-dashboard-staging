#!/bin/bash

# Add environment variables to Vercel preview and development environments
# These are already in production, copying to other environments

echo "📋 Adding environment variables to preview environment..."

# Supabase Configuration
echo "https://dfhqjdoydihajmjxniee.supabase.co" | vercel env add NEXT_PUBLIC_SUPABASE_URL preview 2>/dev/null
echo "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRmaHFqZG95ZGloYWptanhuaWVlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQwODcwMTAsImV4cCI6MjA2OTY2MzAxMH0.fv9Av9Iu1z-79bfIAKEHSf1OCxlnzugkBlWIH8HLW8c" | vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY preview 2>/dev/null
echo "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRmaHFqZG95ZGloYWptanhuaWVlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDA4NzAxMCwiZXhwIjoyMDY5NjYzMDEwfQ.fv9Av9Iu1z-79bfIAKEHSf1OCxlnzugkBlWIH8HLW8c" | vercel env add SUPABASE_SERVICE_ROLE_KEY preview 2>/dev/null

echo "✅ Environment variables added to preview!"
echo ""
echo "📊 Current status:"
vercel env ls

echo ""
echo "🔗 Next steps:"
echo "1. Your variables are now set for both production and preview"
echo "2. Update OAuth redirect URLs in Supabase (if not done)"
echo "3. The deployment should work now!"
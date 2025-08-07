#!/bin/bash

echo "🚀 Supabase Setup Script for 6FB AI Agent System"
echo "=============================================="
echo ""

# Check if .env.local exists
if [ ! -f ".env.local" ]; then
    echo "📝 Creating .env.local from template..."
    cp .env.local.example .env.local
    echo "✅ Created .env.local"
    echo ""
fi

echo "📋 Supabase Setup Instructions:"
echo ""
echo "1. Go to https://supabase.com and create a free account"
echo "2. Click 'New Project' and create a project named '6fb-ai-agent'"
echo "3. Once created, go to Settings > API"
echo "4. Copy these values to your .env.local file:"
echo "   - Project URL → NEXT_PUBLIC_SUPABASE_URL"
echo "   - anon public key → NEXT_PUBLIC_SUPABASE_ANON_KEY"
echo "   - service_role key → SUPABASE_SERVICE_ROLE_KEY"
echo ""
echo "5. Go to SQL Editor in Supabase dashboard"
echo "6. Copy and run the migration script from: scripts/supabase-migration.sql"
echo ""
echo "7. Install Python dependencies for migration:"
echo "   pip install supabase python-dotenv"
echo ""
echo "8. Run the data migration:"
echo "   python scripts/migrate_sqlite_to_supabase.py"
echo ""

read -p "Have you added your Supabase credentials to .env.local? (y/n) " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo ""
    echo "🔍 Checking Supabase connection..."
    
    # Test the connection with a simple Node script
    node -e "
    require('dotenv').config({ path: '.env.local' });
    const { createClient } = require('@supabase/supabase-js');
    
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (!url || !key) {
        console.log('❌ Supabase credentials not found in .env.local');
        process.exit(1);
    }
    
    console.log('✅ Supabase credentials found');
    console.log('📍 Project URL:', url);
    
    const supabase = createClient(url, key);
    console.log('✅ Supabase client created successfully');
    "
    
    if [ $? -eq 0 ]; then
        echo ""
        echo "🎉 Supabase is configured correctly!"
        echo ""
        echo "Next steps:"
        echo "1. Run the SQL migration in Supabase dashboard"
        echo "2. Run: python scripts/migrate_sqlite_to_supabase.py"
        echo "3. Update your backend to use Supabase (already prepared)"
        echo "4. Test the application with: npm run dev"
    fi
else
    echo ""
    echo "⚠️  Please add your Supabase credentials to .env.local first"
    echo "Then run this script again."
fi
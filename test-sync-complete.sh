#!/bin/bash

ACCOUNT_ID="1fd319f3-0a8b-4314-bb82-603f47fe2069"
API_KEY="509db449-eafc-66bd-ac73-f02c7392426a"

# First ensure barbershop exists
echo "Creating test barbershop..."
npx supabase db execute --sql "
INSERT INTO barbershops (id, name, owner_id, created_at, updated_at) 
VALUES ('00000000-0000-0000-0000-000000000001', 'Test Barbershop', '00000000-0000-0000-0000-000000000000', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;
" 2>/dev/null

echo "Testing sync..."
curl -X POST http://localhost:9999/api/cin7/sync \
  -H "Content-Type: application/json" \
  -H "x-dev-bypass: true" \
  -d "{\"accountId\":\"$ACCOUNT_ID\",\"apiKey\":\"$API_KEY\"}" \
  2>/dev/null | python3 -m json.tool

echo ""
echo "Checking synced products..."
npx supabase db execute --sql "
SELECT COUNT(*) as product_count FROM products WHERE barbershop_id = '00000000-0000-0000-0000-000000000001';
" 2>/dev/null | grep -o '[0-9]\+' | head -1

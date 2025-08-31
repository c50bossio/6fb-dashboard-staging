'use client'

import { createBrowserClient } from '@supabase/ssr'
import { useState, useEffect } from 'react'

export default function DatabaseCheck() {
  const [tables, setTables] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    checkDatabase()
  }, [])

  const checkDatabase = async () => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    )

    const results = {}
    
    // List of tables that should exist based on your codebase
    const expectedTables = [
      'profiles',
      'barbershops',
      'barbershop_staff',
      'services',
      'appointments',
      'customers',
      'organizations',
      'organization_members',
      'financial_arrangements',
      'settings_hierarchy',
      'stripe_accounts',
      'staff_invitations'
    ]

    for (const table of expectedTables) {
      try {
        const { data, error, count } = await supabase
          .from(table)
          .select('*', { count: 'exact', head: true })
        
        if (error) {
          results[table] = {
            exists: false,
            error: error.message,
            code: error.code
          }
        } else {
          results[table] = {
            exists: true,
            count: count || 0
          }
        }
      } catch (err) {
        results[table] = {
          exists: false,
          error: err.message
        }
      }
    }

    // Special check for auth schema
    try {
      const { data: { user }, error } = await supabase.auth.getUser()
      results['auth.users'] = {
        accessible: !error,
        error: error?.message
      }
    } catch (err) {
      results['auth.users'] = {
        accessible: false,
        error: err.message
      }
    }

    setTables(results)
    setLoading(false)
  }

  const runSetupSQL = () => {
    const sql = `
-- This SQL should be run in your Supabase SQL Editor
-- Navigate to: https://supabase.com/dashboard/project/dfhqjdoydihajmjxniee/sql/new

-- 1. Create profiles table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE,
  full_name TEXT,
  avatar_url TEXT,
  role TEXT DEFAULT 'CLIENT',
  barbershop_id UUID,
  barbershop_id UUID,
  subscription_tier TEXT DEFAULT 'individual',
  subscription_status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 3. Create RLS policies for profiles
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Enable insert for authenticated users only" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- 4. Create function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', '')
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Create trigger for automatic profile creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 6. Grant permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON public.profiles TO anon, authenticated;

-- 7. If you have existing users without profiles, create them
INSERT INTO public.profiles (id, email)
SELECT id, email FROM auth.users
WHERE id NOT IN (SELECT id FROM public.profiles)
ON CONFLICT (id) DO NOTHING;
`;

    // Copy SQL to clipboard
    navigator.clipboard.writeText(sql)
    alert('SQL copied to clipboard! Paste it in your Supabase SQL editor.')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4">Checking database tables...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold mb-6">📊 Supabase Database Check</h1>
          
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded">
            <p className="text-sm mb-2">
              <strong>Project:</strong> dfhqjdoydihajmjxniee.supabase.co
            </p>
            <p className="text-sm">
              Checking which tables exist and are accessible...
            </p>
          </div>

          {/* Table Status Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
            {Object.entries(tables).map(([table, status]) => (
              <div
                key={table}
                className={`p-4 rounded border ${
                  status.exists || status.accessible
                    ? 'bg-green-50 border-green-300'
                    : 'bg-red-50 border-red-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">{table}</span>
                  <span className="text-2xl">
                    {status.exists || status.accessible ? '✅' : '❌'}
                  </span>
                </div>
                {status.exists && (
                  <p className="text-sm text-gray-600 mt-1">
                    Rows: {status.count}
                  </p>
                )}
                {status.error && (
                  <p className="text-xs text-red-600 mt-1">
                    {status.code || status.error}
                  </p>
                )}
              </div>
            ))}
          </div>

          {/* Action Buttons */}
          <div className="space-y-4">
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded">
              <h3 className="font-semibold text-yellow-800 mb-2">
                ⚠️ Missing Tables Detected
              </h3>
              <p className="text-sm mb-3">
                Your Supabase project is missing required tables. You need to run the setup SQL.
              </p>
              <button
                onClick={runSetupSQL}
                className="bg-yellow-600 text-white px-6 py-2 rounded hover:bg-yellow-700"
              >
                📋 Copy Setup SQL to Clipboard
              </button>
            </div>

            <div className="p-4 bg-gray-100 rounded">
              <h3 className="font-semibold mb-2">Next Steps:</h3>
              <ol className="list-decimal list-inside text-sm space-y-1">
                <li>Click "Copy Setup SQL to Clipboard" above</li>
                <li>Go to your <a href="https://supabase.com/dashboard/project/dfhqjdoydihajmjxniee/sql/new" target="_blank" className="text-blue-600 underline">Supabase SQL Editor</a></li>
                <li>Paste and run the SQL</li>
                <li>Come back here and click "Refresh" to verify</li>
              </ol>
            </div>

            <button
              onClick={() => window.location.reload()}
              className="w-full bg-blue-600 text-white px-6 py-3 rounded hover:bg-blue-700"
            >
              🔄 Refresh Table Check
            </button>
          </div>

          {/* Summary */}
          <div className="mt-6 p-4 bg-gray-50 rounded">
            <h3 className="font-semibold mb-2">Summary:</h3>
            <div className="text-sm space-y-1">
              <p>✅ Tables Found: {Object.values(tables).filter(t => t.exists || t.accessible).length}</p>
              <p>❌ Tables Missing: {Object.values(tables).filter(t => !t.exists && !t.accessible).length}</p>
              <p>📊 Total Expected: {Object.keys(tables).length}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
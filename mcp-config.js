#!/usr/bin/env node
/**
 * MCP Configuration for Supabase Database Access
 * This script configures and starts the Supabase MCP server for Claude Code
 */

import { McpServer } from '@supabase/mcp-server-supabase';
import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const config = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
  supabaseKey: process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  projectRef: process.env.NEXT_PUBLIC_SUPABASE_URL?.match(/https:\/\/([^.]+)/)?.[1]
};

if (!config.supabaseUrl || !config.supabaseKey) {
  console.error('❌ Missing required environment variables:');
  console.error('- NEXT_PUBLIC_SUPABASE_URL');
  console.error('- SUPABASE_SERVICE_ROLE_KEY (or NEXT_PUBLIC_SUPABASE_ANON_KEY)');
  process.exit(1);
}

async function startMcpServer() {
  try {
    
    const supabase = createClient(config.supabaseUrl, config.supabaseKey);
    
    const { data, error } = await supabase.from('profiles').select('count').limit(1);
    if (error) {
      console.warn('⚠️  Connection test warning:', error.message);
    } else {
      
    }

    const server = new McpServer({
      supabaseUrl: config.supabaseUrl,
      supabaseKey: config.supabaseKey,
      projectRef: config.projectRef
    });

    await server.start();

    process.on('SIGINT', async () => {
      
      await server.stop();
      process.exit(0);
    });

  } catch (error) {
    console.error('❌ Failed to start MCP server:', error.message);
    console.error('🔍 Full error:', error);
    process.exit(1);
  }
}

startMcpServer();
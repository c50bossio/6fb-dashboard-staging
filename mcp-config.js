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

console.log('🔧 Supabase MCP Server Configuration');
console.log('=====================================');
console.log('URL:', config.supabaseUrl);
console.log('Project Ref:', config.projectRef);
console.log('Has Service Key:', !!process.env.SUPABASE_SERVICE_ROLE_KEY);
console.log('=====================================\n');

if (!config.supabaseUrl || !config.supabaseKey) {
  console.error('❌ Missing required environment variables:');
  console.error('- NEXT_PUBLIC_SUPABASE_URL');
  console.error('- SUPABASE_SERVICE_ROLE_KEY (or NEXT_PUBLIC_SUPABASE_ANON_KEY)');
  process.exit(1);
}

async function startMcpServer() {
  try {
    // Test Supabase connection first
    console.log('🔍 Testing Supabase connection...');
    const supabase = createClient(config.supabaseUrl, config.supabaseKey);
    
    const { data, error } = await supabase.from('profiles').select('count').limit(1);
    if (error) {
      console.warn('⚠️  Connection test warning:', error.message);
    } else {
      console.log('✅ Supabase connection successful');
    }

    // Initialize MCP Server
    console.log('🚀 Starting Supabase MCP Server...');
    
    const server = new McpServer({
      supabaseUrl: config.supabaseUrl,
      supabaseKey: config.supabaseKey,
      projectRef: config.projectRef
    });

    // Start the server
    await server.start();
    
    console.log('✅ Supabase MCP Server is running!');
    console.log('📡 Claude Code can now access Supabase via MCP tools');
    console.log('🔗 Available tools: query tables, manage data, execute SQL');
    
    // Keep the process running
    process.on('SIGINT', async () => {
      console.log('\n🛑 Shutting down MCP server...');
      await server.stop();
      process.exit(0);
    });

  } catch (error) {
    console.error('❌ Failed to start MCP server:', error.message);
    console.error('🔍 Full error:', error);
    process.exit(1);
  }
}

// Start the server
startMcpServer();
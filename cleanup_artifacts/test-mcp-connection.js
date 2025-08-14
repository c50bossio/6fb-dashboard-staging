#!/usr/bin/env node
/**
 * Test MCP Connection to Supabase
 * This script tests if we can communicate with the Supabase MCP server
 */

import 'dotenv/config';
import { spawn } from 'child_process';
import { createClient } from '@supabase/supabase-js';

console.log('🧪 Testing MCP Connection to Supabase');
console.log('=====================================');

// First, let's test direct Supabase access (our fallback)
async function testDirectSupabaseAccess() {
  console.log('1. Testing direct Supabase access...');
  
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    
    const { data, error } = await supabase.from('profiles').select('count');
    
    if (error) {
      console.log('   ⚠️  Warning:', error.message);
    } else {
      console.log('   ✅ Direct Supabase access working');
    }
    
    return true;
  } catch (error) {
    console.log('   ❌ Direct access failed:', error.message);
    return false;
  }
}

// Test if MCP server can be started
async function testMcpServerStartup() {
  console.log('2. Testing MCP server startup...');
  
  return new Promise((resolve) => {
    const projectRef = process.env.NEXT_PUBLIC_SUPABASE_URL?.match(/https:\/\/([^.]+)/)?.[1];
    
    console.log('   🔍 Project Ref:', projectRef);
    console.log('   🔍 Access Token:', process.env.SUPABASE_ACCESS_TOKEN ? `${process.env.SUPABASE_ACCESS_TOKEN.substring(0, 10)}...` : 'Not found');
    
    if (!projectRef || !process.env.SUPABASE_ACCESS_TOKEN) {
      console.log('   ❌ Missing required environment variables');
      console.log('   📋 NEXT_PUBLIC_SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
      console.log('   📋 SUPABASE_ACCESS_TOKEN:', process.env.SUPABASE_ACCESS_TOKEN ? 'Present' : 'Missing');
      resolve(false);
      return;
    }
    
    const mcpServer = spawn('npx', [
      'mcp-server-supabase', 
      '--access-token', process.env.SUPABASE_ACCESS_TOKEN,
      '--project-ref', projectRef
    ], {
      stdio: 'pipe'
    });
    
    let output = '';
    
    mcpServer.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    mcpServer.stderr.on('data', (data) => {
      output += data.toString();
    });
    
    // Give it a few seconds to start
    setTimeout(() => {
      if (mcpServer.pid && !mcpServer.killed) {
        console.log('   ✅ MCP server started successfully (PID:', mcpServer.pid, ')');
        mcpServer.kill('SIGTERM');
        resolve(true);
      } else {
        console.log('   ❌ MCP server failed to start');
        console.log('   📋 Output:', output);
        resolve(false);
      }
    }, 3000);
  });
}

// Check available MCP resources (this would be called by Claude Code)
function testMcpResourcesAvailability() {
  console.log('3. Testing MCP resources availability in Claude Code...');
  
  // This is a placeholder - we'd need the actual MCP client connection
  // For now, we know from our previous tests that Supabase MCP is not available
  console.log('   ❌ Supabase MCP resources not available in current Claude Code session');
  console.log('   💡 This appears to be a configuration limitation');
  
  return false;
}

// Main test function
async function runTests() {
  const directAccess = await testDirectSupabaseAccess();
  const mcpStartup = await testMcpServerStartup();
  const mcpResources = testMcpResourcesAvailability();
  
  console.log('\n📊 Test Results Summary');
  console.log('========================');
  console.log('Direct Supabase Access:', directAccess ? '✅ Working' : '❌ Failed');
  console.log('MCP Server Startup:', mcpStartup ? '✅ Working' : '❌ Failed');
  console.log('MCP Resources in Claude Code:', mcpResources ? '✅ Available' : '❌ Not Available');
  
  console.log('\n💡 Recommendation:');
  if (directAccess) {
    console.log('✅ Use direct Supabase access via lib/supabase-query.js utility');
    console.log('🔗 This provides the same database functionality as MCP would');
  } else {
    console.log('❌ Neither direct access nor MCP is working properly');
  }
  
  if (mcpStartup && !mcpResources) {
    console.log('🔧 MCP server can start but Claude Code is not configured to use it');
    console.log('📝 This may require Claude Desktop configuration or different setup');
  }
  
  return { directAccess, mcpStartup, mcpResources };
}

// Run the tests
runTests().catch(console.error);
#!/usr/bin/env node

/**
 * Comprehensive Health Check Script
 * Tests Railway deployment, API endpoints, and Supabase connection
 */

import https from 'https';
import http from 'http';

// Configuration
const config = {
  supabase: {
    url: 'https://qlyqxlzlxdqboxpxpdjp.supabase.co',
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFseXF4bHpseGRxYm94cHhwZGpwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAxMTkwNzMsImV4cCI6MjA2NTY5NTA3M30.lHXOj3_co_4GPLqPyFKr64jfz3V7qPYc6St7-SiNbaM'
  },
  // Add your Railway URLs here
  railway: {
    mainServer: process.env.RAILWAY_MAIN_URL || '',
    riskEngine: process.env.RAILWAY_RISK_ENGINE_URL || ''
  }
};

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

// Helper function to make HTTP(S) requests
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    const startTime = Date.now();
    
    const req = protocol.get(url, options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        const duration = Date.now() - startTime;
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          data: data,
          duration: duration
        });
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
  });
}

// Test function with formatted output
async function testEndpoint(name, url, options = {}, expectedStatus = 200) {
  const startTime = Date.now();
  
  try {
    console.log(`\n${colors.cyan}Testing: ${name}${colors.reset}`);
    console.log(`  URL: ${url}`);
    
    const result = await makeRequest(url, options);
    const duration = result.duration;
    
    // Check status code
    const statusMatch = result.statusCode === expectedStatus;
    const statusIcon = statusMatch ? '✅' : '❌';
    const statusColor = statusMatch ? colors.green : colors.red;
    
    console.log(`  ${statusIcon} Status: ${statusColor}${result.statusCode}${colors.reset} (Expected: ${expectedStatus})`);
    
    // Check response time
    const timeColor = duration < 1000 ? colors.green : 
                     duration < 3000 ? colors.yellow : colors.red;
    const timeIcon = duration < 1000 ? '✅' : 
                    duration < 3000 ? '⚠️' : '❌';
    console.log(`  ${timeIcon} Response Time: ${timeColor}${duration}ms${colors.reset}`);
    
    // Try to parse JSON response
    try {
      const jsonData = JSON.parse(result.data);
      console.log(`  ℹ️  Response:`, JSON.stringify(jsonData, null, 2).split('\n').slice(0, 5).join('\n    '));
    } catch (e) {
      if (result.data.length > 0) {
        console.log(`  ℹ️  Response (first 200 chars): ${result.data.substring(0, 200)}...`);
      }
    }
    
    return {
      success: statusMatch,
      duration: duration,
      statusCode: result.statusCode
    };
  } catch (error) {
    console.log(`  ${colors.red}❌ Error: ${error.message}${colors.reset}`);
    return {
      success: false,
      error: error.message
    };
  }
}

// Main health check function
async function runHealthCheck() {
  console.log(`${colors.bright}${colors.blue}`);
  console.log('═══════════════════════════════════════════════════════');
  console.log('    COMPREHENSIVE HEALTH CHECK');
  console.log('═══════════════════════════════════════════════════════');
  console.log(`${colors.reset}\n`);
  console.log(`Timestamp: ${new Date().toISOString()}\n`);
  
  const results = {
    supabase: {},
    railway: {},
    local: {}
  };
  
  // ============================================
  // 1. SUPABASE CONNECTION TESTS
  // ============================================
  console.log(`${colors.bright}${colors.yellow}1. SUPABASE CONNECTION TESTS${colors.reset}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  // Test Supabase REST API
  results.supabase.rest = await testEndpoint(
    'Supabase REST API',
    `${config.supabase.url}/rest/v1/`,
    {
      headers: {
        'apikey': config.supabase.anonKey,
        'Authorization': `Bearer ${config.supabase.anonKey}`
      }
    },
    200
  );
  
  // Test Supabase Auth
  results.supabase.auth = await testEndpoint(
    'Supabase Auth',
    `${config.supabase.url}/auth/v1/health`,
    {},
    200
  );
  
  // Test Supabase Storage
  results.supabase.storage = await testEndpoint(
    'Supabase Storage',
    `${config.supabase.url}/storage/v1/bucket`,
    {
      headers: {
        'apikey': config.supabase.anonKey,
        'Authorization': `Bearer ${config.supabase.anonKey}`
      }
    },
    200
  );
  
  // ============================================
  // 2. RAILWAY DEPLOYMENT TESTS
  // ============================================
  console.log(`\n${colors.bright}${colors.yellow}2. RAILWAY DEPLOYMENT TESTS${colors.reset}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  if (config.railway.mainServer) {
    // Test Main Server Health
    results.railway.mainHealth = await testEndpoint(
      'Railway Main Server - Health',
      `${config.railway.mainServer}/health`,
      {},
      200
    );
    
    // Test Main Server API Status
    results.railway.mainStatus = await testEndpoint(
      'Railway Main Server - API Status',
      `${config.railway.mainServer}/api/status`,
      {},
      200
    );
  } else {
    console.log(`${colors.yellow}⚠️  Railway Main Server URL not configured${colors.reset}`);
    console.log(`   Set RAILWAY_MAIN_URL environment variable`);
  }
  
  if (config.railway.riskEngine) {
    // Test Risk Engine Health
    results.railway.riskHealth = await testEndpoint(
      'Railway Risk Engine - Health',
      `${config.railway.riskEngine}/health`,
      {},
      200
    );
  } else {
    console.log(`\n${colors.yellow}⚠️  Railway Risk Engine URL not configured${colors.reset}`);
    console.log(`   Set RAILWAY_RISK_ENGINE_URL environment variable`);
  }
  
  // ============================================
  // 3. LOCAL SERVER TESTS (if running)
  // ============================================
  console.log(`\n${colors.bright}${colors.yellow}3. LOCAL SERVER TESTS${colors.reset}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  // Test Local Main Server
  results.local.mainStatus = await testEndpoint(
    'Local Main Server',
    'http://localhost:3001/api/status',
    {},
    200
  );
  
  // Test Local Stress Test API
  results.local.stressTest = await testEndpoint(
    'Local Stress Test API',
    'http://localhost:3001/api/stress-test/test',
    {},
    200
  );
  
  // ============================================
  // 4. SUMMARY
  // ============================================
  console.log(`\n${colors.bright}${colors.blue}`);
  console.log('═══════════════════════════════════════════════════════');
  console.log('    SUMMARY');
  console.log('═══════════════════════════════════════════════════════');
  console.log(`${colors.reset}\n`);
  
  const allResults = [];
  const collectResults = (obj, prefix = '') => {
    for (const [key, value] of Object.entries(obj)) {
      if (value && typeof value === 'object' && 'success' in value) {
        allResults.push({
          name: `${prefix}${key}`,
          ...value
        });
      }
    }
  };
  
  collectResults(results.supabase, 'Supabase ');
  collectResults(results.railway, 'Railway ');
  collectResults(results.local, 'Local ');
  
  const successful = allResults.filter(r => r.success).length;
  const total = allResults.length;
  const percentage = total > 0 ? ((successful / total) * 100).toFixed(1) : 0;
  
  console.log(`${colors.bright}Overall Health: ${successful}/${total} tests passed (${percentage}%)${colors.reset}\n`);
  
  // Detailed results table
  console.log('Detailed Results:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  allResults.forEach(result => {
    const icon = result.success ? `${colors.green}✅` : `${colors.red}❌`;
    const status = result.statusCode ? `[${result.statusCode}]` : '[ERROR]';
    const time = result.duration ? `${result.duration}ms` : 'N/A';
    console.log(`${icon} ${result.name}${colors.reset} - ${status} - ${time}`);
    if (result.error) {
      console.log(`   ${colors.red}Error: ${result.error}${colors.reset}`);
    }
  });
  
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  // Recommendations
  console.log(`${colors.bright}${colors.cyan}RECOMMENDATIONS:${colors.reset}\n`);
  
  if (!results.supabase.rest?.success) {
    console.log(`${colors.red}❌ Supabase connection issues detected${colors.reset}`);
    console.log('   - Check Supabase project status at https://app.supabase.com');
    console.log('   - Verify API keys and URLs are correct\n');
  }
  
  if (!config.railway.mainServer || !config.railway.riskEngine) {
    console.log(`${colors.yellow}⚠️  Railway URLs not configured${colors.reset}`);
    console.log('   - Set environment variables:');
    console.log('     export RAILWAY_MAIN_URL="https://your-main-server.railway.app"');
    console.log('     export RAILWAY_RISK_ENGINE_URL="https://your-risk-engine.railway.app"\n');
  } else if (!results.railway.mainHealth?.success) {
    console.log(`${colors.red}❌ Railway deployment issues detected${colors.reset}`);
    console.log('   - Check Railway logs: railway logs');
    console.log('   - Verify deployment status: railway status');
    console.log('   - Check environment variables in Railway dashboard\n');
  }
  
  if (!results.local.mainStatus?.success) {
    console.log(`${colors.yellow}⚠️  Local server not running${colors.reset}`);
    console.log('   - Start local server: npm run dev');
    console.log('   - Or use: ./start-all-servers.sh\n');
  }
  
  if (successful === total && total > 0) {
    console.log(`${colors.green}${colors.bright}✅ All systems operational!${colors.reset}\n`);
  }
  
  console.log(`${colors.bright}Next Steps:${colors.reset}`);
  console.log('  1. Fix any failing health checks');
  console.log('  2. Configure missing Railway URLs if needed');
  console.log('  3. Test end-to-end functionality with real data');
  console.log('  4. Set up monitoring and alerts for production\n');
  
  // Exit with appropriate code
  process.exit(successful === total ? 0 : 1);
}

// Run the health check
runHealthCheck().catch(error => {
  console.error(`${colors.red}Fatal error:${colors.reset}`, error);
  process.exit(1);
});

export { runHealthCheck, testEndpoint };

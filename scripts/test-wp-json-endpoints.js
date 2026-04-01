#!/usr/bin/env node
/**
 * Test WP-JSON Endpoints for Good Day Bend v10
 * 
 * Checks which venues have working The Events Calendar API endpoints.
 * 
 * Usage: node scripts/test-wp-json-endpoints.js
 */

const https = require('https');
const http = require('http');

// WP-JSON endpoints to test (The Events Calendar plugin)
const endpoints = [
  { name: 'Visit Bend', url: 'https://visitbend.com/wp-json/tribe/events/v1/events' },
  { name: 'Old Mill District', url: 'https://www.oldmilldistrict.com/wp-json/tribe/events/v1/events' },
  { name: 'Bend Magazine', url: 'https://bendmagazine.com/wp-json/tribe/events/v1/events' },
  { name: 'Bend Chamber', url: 'https://www.bendchamber.org/wp-json/tribe/events/v1/events' },
  { name: 'McMenamins', url: 'https://www.mcmenamins.com/wp-json/tribe/events/v1/events' },
  { name: 'Tower Theatre', url: 'https://www.towertheatre.org/wp-json/tribe/events/v1/events' },
  { name: 'Midtown Ballroom', url: 'https://midtownballroom.com/wp-json/tribe/events/v1/events' },
  { name: "River's Place", url: 'https://riversplacebend.com/wp-json/tribe/events/v1/events' },
  { name: 'Mt. Bachelor', url: 'https://www.mtbachelor.com/wp-json/tribe/events/v1/events' },
  { name: 'Bend Parks & Rec', url: 'https://www.bendparksandrec.org/wp-json/tribe/events/v1/events' },
];

function testEndpoint(endpoint) {
  return new Promise((resolve) => {
    const url = new URL(endpoint.url);
    const lib = url.protocol === 'https:' ? https : http;
    
    const timeout = setTimeout(() => {
      resolve({ ...endpoint, status: 'timeout', events: 0 });
    }, 10000);
    
    lib.get(endpoint.url, { timeout: 10000 }, (res) => {
      clearTimeout(timeout);
      
      let data = '';
      
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          const eventCount = json.events ? json.events.length : 0;
          resolve({ ...endpoint, status: res.statusCode, events: eventCount });
        } catch (e) {
          resolve({ ...endpoint, status: res.statusCode, events: 0, error: 'Invalid JSON' });
        }
      });
    }).on('error', (err) => {
      clearTimeout(timeout);
      resolve({ ...endpoint, status: 'error', events: 0, error: err.message });
    });
  });
}

async function testAllEndpoints() {
  console.log('🔍 Testing WP-JSON Event Endpoints...\n');
  console.log('Endpoint                          | Status | Events\n' + '-'.repeat(60));
  
  const results = [];
  
  for (const endpoint of endpoints) {
    process.stdout.write(`${endpoint.name.padEnd(32)} | `);
    const result = await testEndpoint(endpoint);
    results.push(result);
    
    const statusStr = result.status === 200 ? '✅ 200' : `❌ ${result.status}`;
    console.log(`${statusStr.padEnd(6)} | ${result.events}`);
    
    if (result.error) {
      console.log(`   └─ Error: ${result.error}`);
    }
  }
  
  console.log('\n' + '='.repeat(60));
  
  const working = results.filter(r => r.status === 200 && r.events > 0);
  const empty = results.filter(r => r.status === 200 && r.events === 0);
  const failed = results.filter(r => r.status !== 200);
  
  console.log(`\n📊 Summary:`);
  console.log(`   ✅ Working (with events): ${working.length}`);
  console.log(`   ⚠️  Working (no events):  ${empty.length}`);
  console.log(`   ❌ Failed:                ${failed.length}`);
  
  if (working.length > 0) {
    console.log(`\n🎯 Active sources for v10:`);
    working.forEach(r => console.log(`   - ${r.name} (${r.events} events)`));
  }
  
  return results;
}

// Run
testAllEndpoints().catch(console.error);

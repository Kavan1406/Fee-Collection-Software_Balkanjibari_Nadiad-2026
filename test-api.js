#!/usr/bin/env node

/**
 * Test script to verify API endpoints and data formats
 * Run: node test-api.js
 */

const axios = require('axios');

const API_BASE = 'https://balkanji-backend-ai5a.onrender.com';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh5ZHN6Y3J5end5Zmlta2djd21sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU2MTQ4MTIsImV4cCI6MjA5MTE5MDgxMn0.Ywjl-Xb-68UyxjO67i04ULX4FxizQ8kosnrPmL_LspU';

const api = axios.create({
  baseURL: API_BASE,
  timeout: 10000,
  headers: {
    'apikey': ANON_KEY,
    'Authorization': `Bearer ${ANON_KEY}`,
    'Content-Type': 'application/json',
  }
});

async function testEndpoint(name, method, path, params = null) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`📋 Testing: ${name}`);
  console.log(`   ${method.toUpperCase()} ${API_BASE}${path}`);
  console.log('='.repeat(60));
  
  try {
    const config = method === 'get' 
      ? { params: params || {} }
      : {};
    
    const response = await api[method](path, config);
    
    console.log(`✅ Status: ${response.status} ${response.statusText}`);
    console.log(`📊 Response type: ${typeof response.data}`);
    
    if (Array.isArray(response.data)) {
      console.log(`📝 Array length: ${response.data.length}`);
      if (response.data.length > 0) {
        console.log(`📌 First item keys: ${Object.keys(response.data[0]).join(', ')}`);
        console.log(`📌 Sample item:`, JSON.stringify(response.data[0], null, 2).split('\n').slice(0, 10).join('\n'));
      }
    } else if (typeof response.data === 'object') {
      console.log(`📝 Response keys: ${Object.keys(response.data).join(', ')}`);
      
      // Handle paginated response
      if (response.data.results) {
        console.log(`📝 Results count: ${response.data.results.length}`);
        console.log(`📌 First result keys: ${response.data.results[0] ? Object.keys(response.data.results[0]).join(', ') : 'N/A'}`);
      }
      // Handle data wrapper
      if (response.data.data) {
        console.log(`📝 Data length: ${Array.isArray(response.data.data) ? response.data.data.length : 'not an array'}`);
      }
    }
  } catch (error) {
    console.error(`❌ Error:`, error.message);
    if (error.response) {
      console.error(`   Status: ${error.response.status}`);
      console.error(`   Data:`, error.response.data);
    }
  }
}

async function runTests() {
  console.log('\n🚀 API ENDPOINT TESTING\n');
  
  // Test subjects endpoint
  await testEndpoint(
    'Get All Subjects',
    'get',
    '/api/v1/subjects/'
  );
  
  // Test enrollments endpoint
  await testEndpoint(
    'Get All Enrollments',
    'get',
    '/api/v1/enrollments/',
    { limit: 10 }
  );
  
  // Test with pagination
  await testEndpoint(
    'Get Enrollments (Paginated)',
    'get',
    '/api/v1/enrollments/',
    { page_size: 10, page: 1 }
  );
  
  // Test students endpoint
  await testEndpoint(
    'Get All Students',
    'get',
    '/api/v1/students/',
    { page_size: 10 }
  );
  
  console.log('\n✨ Testing complete!\n');
}

runTests().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

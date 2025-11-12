import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Configuration
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://svfucusuhnwmwyojmxgr.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN2ZnVjdXN1aG53bXd5b2pteGdyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NTUyNDMxOCwiZXhwIjoyMDYxMTAwMzE4fQ.d9vxS_ZZnIrWlmxxY6niwe8Bb7Ku1dmpApQWF3XGstQ';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN2ZnVjdXN1aG53bXd5b2pteGdyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU1MjQzMTgsImV4cCI6MjA2MTEwMDMxOH0.bMMEyUdprytzsl6pmHVNA82Bv2YXJC9Nsusj7id2XwU';

// Test credentials - Using the user's provided credentials
const TEST_EMAIL = 'contato.cainandesign@gmail.com';
const TEST_PASSWORD = 'Horiy5252ho.';

console.log('========================================');
console.log('SUPABASE AUTHENTICATION DIAGNOSTICS');
console.log('========================================\n');

console.log('Configuration:');
console.log('SUPABASE_URL:', SUPABASE_URL);
console.log('SUPABASE_SERVICE_ROLE_KEY:', SUPABASE_SERVICE_ROLE_KEY.substring(0, 50) + '...');
console.log('SUPABASE_ANON_KEY:', SUPABASE_ANON_KEY.substring(0, 50) + '...\n');

// Create clients
const serviceClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

console.log('========================================');
console.log('TEST 1: Check Supabase Connection');
console.log('========================================\n');

async function testConnection() {
  try {
    const { data, error } = await serviceClient.from('auth.users').select('id').limit(1);

    if (error) {
      console.log('❌ Connection test failed (trying via from):', error.message);
      // Try alternative method
      try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/`, {
          headers: {
            'apikey': SUPABASE_SERVICE_ROLE_KEY,
            'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
          }
        });
        console.log('✅ REST API connection successful! Status:', response.status);
        return true;
      } catch (err) {
        console.log('❌ REST API connection failed:', err.message);
        return false;
      }
    } else {
      console.log('✅ Supabase connection successful!\n');
      return true;
    }
  } catch (err) {
    console.log('❌ Connection error:', err.message);
    return false;
  }
}

console.log('========================================');
console.log('TEST 2: List All Users (Service Role)');
console.log('========================================\n');

async function listAllUsers() {
  try {
    const { data: { users }, error } = await serviceClient.auth.admin.listUsers();

    if (error) {
      console.log('❌ Failed to list users:', error.message);
      console.log('Error details:', error);
      return [];
    }

    console.log(`✅ Found ${users.length} users in Supabase:\n`);

    users.forEach((user, index) => {
      console.log(`User ${index + 1}:`);
      console.log('  - ID:', user.id);
      console.log('  - Email:', user.email);
      console.log('  - Email confirmed:', user.email_confirmed_at ? 'Yes' : 'No');
      console.log('  - Created at:', user.created_at);
      console.log('  - Last sign in:', user.last_sign_in_at || 'Never');
      console.log('  - User metadata:', JSON.stringify(user.user_metadata, null, 2));
      console.log('');
    });

    return users;
  } catch (err) {
    console.log('❌ Error listing users:', err.message);
    console.log('Full error:', err);
    return [];
  }
}

console.log('========================================');
console.log('TEST 3: Try Authentication with Known Email');
console.log('========================================\n');

async function testAuthentication(email, password) {
  console.log(`\nTrying: ${email} / ${password}`);

  try {
    const { data, error } = await anonClient.auth.signInWithPassword({
      email: email,
      password: password,
    });

    if (error) {
      console.log(`  ❌ Failed:`, error.message);
      return null;
    }

    console.log(`  ✅ SUCCESS! Authenticated as ${email}`);
    console.log(`  - User ID: ${data.user.id}`);
    console.log(`  - Access Token: ${data.session.access_token.substring(0, 50)}...`);
    console.log(`  - User metadata:`, data.user.user_metadata);
    return data;
  } catch (err) {
    console.log(`  ❌ Exception:`, err.message);
    return null;
  }
}

console.log('========================================');
console.log('TEST 4: Create Test User (if needed)');
console.log('========================================\n');

async function createTestUser(email, password) {
  console.log(`\nAttempting to create user: ${email}`);

  try {
    const { data, error } = await serviceClient.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true,
      user_metadata: {
        name: 'Test Admin',
      }
    });

    if (error) {
      console.log(`  ❌ Failed to create user:`, error.message);
      return null;
    }

    console.log(`  ✅ User created successfully!`);
    console.log(`  - ID: ${data.user.id}`);
    console.log(`  - Email: ${data.user.email}`);
    return data.user;
  } catch (err) {
    console.log(`  ❌ Exception:`, err.message);
    return null;
  }
}

console.log('========================================');
console.log('TEST 5: Check Auth Schema');
console.log('========================================\n');

async function checkAuthSchema() {
  try {
    // Try to get users via admin API
    const { data, error } = await serviceClient.auth.admin.listUsers({
      page: 1,
      perPage: 1
    });

    if (error) {
      console.log('❌ Auth admin API not accessible:', error.message);
      return false;
    }

    console.log('✅ Auth admin API is accessible');
    return true;
  } catch (err) {
    console.log('❌ Exception checking auth schema:', err.message);
    return false;
  }
}

async function testBackendLogin(email, password, accessToken) {
  console.log('\n========================================');
  console.log('TEST 6: Backend API Login Endpoint');
  console.log('========================================\n');

  const backendUrl = process.env.BACKEND_URL || 'http://localhost:5051';

  console.log(`Testing POST ${backendUrl}/api/auth/login`);
  console.log(`Email: ${email}`);
  console.log(`Password: ${password.substring(0, 3)}...${password.substring(password.length - 1)}\n`);

  try {
    const response = await fetch(`${backendUrl}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: email,
        password: password,
      }),
    });

    console.log(`Response status: ${response.status} ${response.statusText}`);

    const data = await response.json();

    if (response.ok) {
      console.log('✅ Backend login successful!');
      console.log('\nResponse data:');
      console.log('  - User ID:', data.user?.id);
      console.log('  - Email:', data.user?.email);
      console.log('  - Name:', data.user?.user_metadata?.name);
      console.log('  - Access Token:', data.session?.access_token?.substring(0, 50) + '...');
      console.log('  - Refresh Token:', data.session?.refresh_token ? 'Present' : 'Missing');
      console.log('  - Expires At:', data.session?.expires_at);
      return true;
    } else {
      console.log('❌ Backend login failed!');
      console.log('Error:', data.error || data.message || JSON.stringify(data));
      return false;
    }
  } catch (err) {
    console.log('❌ Exception during backend login test:', err.message);
    console.log('Full error:', err);
    return false;
  }
}

// Run all tests
async function runAllTests() {
  console.log('\n🔍 Testing Supabase Authentication with User Credentials...\n');

  // Test 1: Connection
  console.log('========================================');
  console.log('TEST 1: Supabase Connection');
  console.log('========================================\n');
  const isConnected = await testConnection();
  console.log('\n');

  if (!isConnected) {
    console.log('❌ Cannot proceed - no connection to Supabase');
    return;
  }

  // Test 2: List users
  console.log('========================================');
  console.log('TEST 2: List All Users');
  console.log('========================================\n');
  const users = await listAllUsers();
  console.log('\n');

  // Test 3: Check if the test user exists
  const userExists = users.find(u => u.email === TEST_EMAIL);
  if (userExists) {
    console.log(`✅ User ${TEST_EMAIL} exists in Supabase\n`);
  } else {
    console.log(`⚠️  User ${TEST_EMAIL} not found in Supabase\n`);
  }

  // Test 4: Try authentication with provided credentials
  console.log('========================================');
  console.log('TEST 3: Authenticate with Provided Credentials');
  console.log('========================================\n');
  console.log(`Testing email: ${TEST_EMAIL}`);
  console.log(`Testing password: ${TEST_PASSWORD.substring(0, 3)}...${TEST_PASSWORD.substring(TEST_PASSWORD.length - 1)}\n`);

  const authResult = await testAuthentication(TEST_EMAIL, TEST_PASSWORD);

  if (authResult) {
    console.log('\n✅ AUTHENTICATION SUCCESSFUL!');
    console.log('\n========================================');
    console.log('AUTHENTICATION DETAILS');
    console.log('========================================\n');
    console.log('User ID:', authResult.user.id);
    console.log('Email:', authResult.user.email);
    console.log('Email Confirmed:', authResult.user.email_confirmed_at ? 'Yes' : 'No');
    console.log('Name:', authResult.user.user_metadata?.name);
    console.log('Phone:', authResult.user.phone || 'Not set');
    console.log('\nSession Information:');
    console.log('Access Token (first 80 chars):', authResult.session.access_token.substring(0, 80) + '...');
    console.log('Token Type:', authResult.session.token_type);
    console.log('Expires In:', authResult.session.expires_in, 'seconds');
    console.log('Expires At:', new Date(authResult.session.expires_at * 1000).toISOString());
    console.log('Refresh Token:', authResult.session.refresh_token ? 'Present' : 'Missing');

    console.log('\nUser Metadata:');
    console.log(JSON.stringify(authResult.user.user_metadata, null, 2));

    // Test 5: Try backend login endpoint
    await testBackendLogin(TEST_EMAIL, TEST_PASSWORD, authResult.session.access_token);
  } else {
    console.log('\n❌ AUTHENTICATION FAILED!');
    console.log('\nPossible reasons:');
    console.log('  1. Password is incorrect');
    console.log('  2. Email is not confirmed');
    console.log('  3. User does not exist');
    console.log('  4. Account is disabled');

    if (!userExists) {
      console.log('\n⚠️  The user does not exist. Would you like to create it?');
    }
  }

  console.log('\n========================================');
  console.log('DIAGNOSTICS COMPLETE');
  console.log('========================================\n');
}

// Execute
runAllTests().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});

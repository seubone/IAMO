import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Configuration
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://svfucusuhnwmwyojmxgr.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN2ZnVjdXN1aG53bXd5b2pteGdyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NTUyNDMxOCwiZXhwIjoyMDYxMTAwMzE4fQ.d9vxS_ZZnIrWlmxxY6niwe8Bb7Ku1dmpApQWF3XGstQ';

const serviceClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

console.log('========================================');
console.log('CREATE ADMIN USER FOR MONITOR.IA');
console.log('========================================\n');

async function createAdminUser() {
  const email = 'admin@monitor.ia';
  const password = 'Admin@123456';

  console.log(`Creating admin user: ${email}`);
  console.log(`Password: ${password}\n`);

  try {
    // First, check if user already exists
    const { data: existingUsers } = await serviceClient.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(u => u.email === email);

    if (existingUser) {
      console.log('⚠️  User already exists. Deleting old user first...');

      const { error: deleteError } = await serviceClient.auth.admin.deleteUser(existingUser.id);

      if (deleteError) {
        console.log('❌ Failed to delete existing user:', deleteError.message);
        return;
      }

      console.log('✅ Old user deleted successfully\n');
    }

    // Create new user
    const { data, error } = await serviceClient.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true,
      user_metadata: {
        name: 'Administrator',
        role: 'admin'
      }
    });

    if (error) {
      console.log('❌ Failed to create user:', error.message);
      console.log('Error details:', error);
      return;
    }

    console.log('✅ Admin user created successfully!\n');
    console.log('User details:');
    console.log('  - ID:', data.user.id);
    console.log('  - Email:', data.user.email);
    console.log('  - Email confirmed:', data.user.email_confirmed_at ? 'Yes' : 'No');
    console.log('  - Created at:', data.user.created_at);
    console.log('\n📝 SAVE THESE CREDENTIALS:');
    console.log('  Email: admin@monitor.ia');
    console.log('  Password: Admin@123456');

    // Test authentication
    console.log('\n🔐 Testing authentication...\n');

    const anonClient = createClient(SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

    const { data: authData, error: authError } = await anonClient.auth.signInWithPassword({
      email: email,
      password: password,
    });

    if (authError) {
      console.log('❌ Authentication test failed:', authError.message);
      return;
    }

    console.log('✅ Authentication test successful!');
    console.log('  - User ID:', authData.user.id);
    console.log('  - Access token (first 50 chars):', authData.session.access_token.substring(0, 50) + '...');
    console.log('\n========================================');
    console.log('SUCCESS! You can now login with:');
    console.log('  Email: admin@monitor.ia');
    console.log('  Password: Admin@123456');
    console.log('========================================\n');

  } catch (err) {
    console.log('❌ Unexpected error:', err.message);
    console.log('Full error:', err);
  }
}

// Execute
createAdminUser().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});

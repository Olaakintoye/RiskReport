// Script to fix missing profiles for existing users
const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

// Generate a valid UUID
function generateUUID() {
  return crypto.randomUUID();
}

// Use the same keys as in the app so this script can run with anonymous access
const supabaseUrl = 'https://qkrdpqkrywjaiahexnwk.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFrcmRwcWtyeXdqYWlhaGV4bndrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQyMjg1NDEsImV4cCI6MjA1OTgwNDU0MX0.6bt5ny6XxXuzqPoVlmsd8SFpU-gF_8Hmc8MOqeayKKg';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function createTestProfiles() {
  try {
    console.log('Starting profile creation process...');
    
    // Check if we can access the profiles table
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*');
      
    if (profilesError) {
      console.error('Error accessing profiles table:', profilesError);
      console.log('This might be due to RLS policies or permissions. You need admin access to create profiles directly.');
      return;
    }
    
    console.log(`Found ${profiles?.length || 0} existing profiles`);
    
    // Add test users if they don't exist
    const testUsers = [
      {
        id: generateUUID(),
        email: 'bk@example.com',
        full_name: 'BK User'
      },
      {
        id: generateUUID(),
        email: 'john@example.com',
        full_name: 'John Doe'
      },
      {
        id: generateUUID(),
        email: 'jane@example.com',
        full_name: 'Jane Smith'
      }
    ];
    
    // Check if the BK user already exists
    const bkExists = profiles?.some(p => 
      p.email?.toLowerCase() === 'bk@example.com' || 
      p.full_name?.toLowerCase() === 'bk' ||
      p.full_name?.toLowerCase() === 'bk user'
    );
    
    if (bkExists) {
      console.log('BK user already exists, skipping creation');
    } else {
      console.log('Creating test profiles for demo purposes');
      
      for (const user of testUsers) {
        console.log(`Attempting to create profile: ${user.full_name} (${user.email}) with ID: ${user.id}`);
        const { error: insertError } = await supabase
          .from('profiles')
          .insert(user);
          
        if (insertError) {
          console.error(`Error creating profile for ${user.email}:`, insertError);
        } else {
          console.log(`Successfully created profile for ${user.email}`);
        }
      }
    }
    
    // Verify the profiles were created
    const { data: updatedProfiles } = await supabase
      .from('profiles')
      .select('*');
      
    console.log(`Now have ${updatedProfiles?.length || 0} profiles in the database`);
    console.log('Profiles:', updatedProfiles?.map(p => `${p.full_name} (${p.email})`) || 'None');
    
    console.log('Profile creation process completed');
  } catch (error) {
    console.error('Unexpected error during profile creation:', error);
  }
}

createTestProfiles().catch(console.error); 
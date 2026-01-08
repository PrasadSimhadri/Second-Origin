const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://mhhkneljgagqyjjmjrfi.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oaGtuZWxqZ2FncXlqam1qcmZpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Nzg1NTUzMywiZXhwIjoyMDgzNDMxNTMzfQ.O1ol_Ad2OMmC9twAcq2CSzJG2J2BJI1fLnbSdWz05OM';

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

const users = [
    { email: 'admin@scankart.com', role: 'admin', name: 'Test Admin' },
    { email: 'customer@scankart.com', role: 'customer', name: 'Test Customer' },
    { email: 'guard@scankart.com', role: 'guard', name: 'Test Guard' }
];

async function fixUsers() {
    console.log('Fixing and Confirming Users...');

    for (const u of users) {
        console.log(`Processing ${u.email}...`);

        // 1. Check/Create via Admin API (bypasses email check if we confirm)
        let userId;

        const { data: list } = await supabase.auth.admin.listUsers();
        const existing = list.users.find(x => x.email === u.email);

        if (existing) {
            userId = existing.id;
            console.log(`  - Found existing user: ${userId}`);

            // Force confirm email if not confirmed
            if (!existing.email_confirmed_at) {
                const { error: updateError } = await supabase.auth.admin.updateUserById(userId, {
                    email_confirm: true
                });
                if (updateError) console.error(`  - ❌ Failed to confirm email: ${updateError.message}`);
                else console.log(`  - ✅ Email forced confirmed.`);
            } else {
                console.log(`  - Email already confirmed.`);
            }

        } else {
            const { data, error } = await supabase.auth.admin.createUser({
                email: u.email,
                password: 'password123',
                email_confirm: true,
                user_metadata: { full_name: u.name }
            });

            if (error) {
                console.error(`  - ❌ Create failed: ${error.message}`);
                continue;
            }
            userId = data.user.id;
            console.log(`  - ✅ Created new user: ${userId}`);
        }

        // 2. Ensure Public Profile
        if (userId) {
            const { error: profileError } = await supabase.from('users').upsert({
                id: userId,
                email: u.email,
                full_name: u.name,
                role: u.role,
                status: 'active'
            });

            if (profileError) console.error(`  - ❌ Profile update failed: ${profileError.message}`);
            else console.log(`  - ✅ Profile/Role synced.`);
        }
    }
    console.log('Done.');
}

fixUsers();

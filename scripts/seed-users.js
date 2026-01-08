const API_URL = 'http://localhost:3001/api/v1/auth/register';

const users = [
    {
        email: 'customer@scankart.com',
        password: 'password123',
        fullName: 'Test Customer',
        phone: '1111111111',
        role: 'customer'
    },
    {
        email: 'guard@scankart.com',
        password: 'password123',
        fullName: 'Test Guard',
        phone: '2222222222',
        role: 'guard'
    },
    {
        email: 'admin@scankart.com',
        password: 'password123',
        fullName: 'Test Admin',
        phone: '3333333333',
        role: 'admin'
    }
];

async function seedUsers() {
    console.log('Seeding users...');

    for (const user of users) {
        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(user)
            });

            const data = await response.json();

            if (response.ok) {
                console.log(`✅ Created ${user.role}: ${user.email}`);
            } else {
                if (data.message?.includes('User already registered') || data.message?.includes('already registered')) {
                    console.log(`ℹ️  ${user.role} already exists: ${user.email}`);
                } else {
                    console.error(`❌ Failed to create ${user.role} (${user.email}):`, data.message || data);
                }
            }
        } catch (error) {
            console.error(`❌ Error creating ${user.role}:`, error.message);
        }
    }
    console.log('Done.');
}

seedUsers();

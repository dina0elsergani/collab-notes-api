import mongoose from 'mongoose';
import User from '@/models/User';
import Note from '@/models/Note';
import { config } from '@/config/config';

const seedData = async () => {
  try {
    // Connect to database
    await mongoose.connect(config.mongoUri);
    console.log('Connected to MongoDB for seeding');

    // Clear existing data
    await User.deleteMany({});
    await Note.deleteMany({});
    console.log('Cleared existing data');

    // Create test users
    const users = [
      {
        username: 'dina',
        email: 'dina@example.com',
        password: 'password123',
      },
      {
        username: 'mike',
        email: 'mike@example.com',
        password: 'password123',
      },
    ];

    const createdUsers = await User.create(users);
    console.log(`Created ${createdUsers.length} users`);

    // Create test notes
    const notes = [
      {
        title: 'My First Note',
        content: `This is my first note in the collaborative notes app.

I can write whatever I want here and share it with others.`,
        owner: createdUsers[0]._id,
        collaborators: [
          {
            user: createdUsers[1]._id,
            role: 'write',
          },
        ],
      },
      {
        title: 'Shopping List',
        content: `Things to buy:
- Milk
- Bread
- Eggs
- Coffee`,
        owner: createdUsers[1]._id,
      },
    ];

    const createdNotes = await Note.create(notes);
    console.log(`Created ${createdNotes.length} notes`);

    console.log('✅ Seed data created successfully!');
    console.log('\nTest Users:');
    createdUsers.forEach((user, index) => {
      console.log(`${index + 1}. ${user.username} (${user.email}) - password: password123`);
    });

    console.log('\n🚀 You can now login and start using the app!');
  } catch (error) {
    console.error('Error seeding data:', error);
  } finally {
    await mongoose.connection.close();
    console.log('Database connection closed');
  }
};

// Run the seed script
seedData();
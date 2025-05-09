// MongoDB initialization script for Docker
db = db.getSiblingDB('collaborative-notes');

// Create initial user for testing
db.createUser({
  user: 'app',
  pwd: 'password',
  roles: [
    {
      role: 'readWrite',
      db: 'collaborative-notes'
    }
  ]
});

// Create indexes for better performance
db.users.createIndex({ email: 1 }, { unique: true });
db.users.createIndex({ username: 1 }, { unique: true });

db.notes.createIndex({ owner: 1 });
db.notes.createIndex({ 'collaborators.user': 1 });
db.notes.createIndex({ title: 'text', content: 'text' });
db.notes.createIndex({ updatedAt: -1 });

print('Database initialized successfully');
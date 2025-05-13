# Collaborative Notes Backend

A real-time collaborative notes application built with Node.js, TypeScript, Express.js, Socket.io, and MongoDB.

## Features

- User authentication with JWT
- Real-time collaboration with Socket.io
- Role-based permissions (read/write)
- Version history tracking
- RESTful API for notes and users
- Live cursor tracking
- User search functionality

## Tech Stack

- Node.js 18+
- TypeScript
- Express.js
- Socket.io
- MongoDB with Mongoose
- JWT + bcrypt
- Jest for testing

## Quick Start

### Using Docker

```bash
git clone https://github.com/dina0elsergani/collab-notes-api.git
cd collab-notes-api
npm run docker:dev
```

### Local Development

```bash
npm install
cp .env.example .env
# Edit .env with your MongoDB URI and JWT secret
npm run dev
```

## API Endpoints

- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/notes` - Get user's notes
- `POST /api/notes` - Create new note
- `PUT /api/notes/:id` - Update note
- `DELETE /api/notes/:id` - Delete note

## WebSocket Events

- `join-note` - Join a note room
- `note-update` - Send content updates
- `cursor-update` - Send cursor position

## Testing

```bash
npm test
npm run test:coverage
```

## Environment Variables

- `MONGODB_URI` - MongoDB connection string
- `JWT_SECRET` - JWT signing secret
- `PORT` - Server port (default: 3000)

## License

MIT
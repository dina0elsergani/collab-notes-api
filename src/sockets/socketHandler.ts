import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import Note from '@/models/Note';
import { config } from '@/config/config';
import { AuthPayload, SocketUser, NoteRoom } from '@/types';

interface AuthenticatedSocket extends Socket {
  user?: AuthPayload;
}

// Store active rooms and users
const noteRooms = new Map<string, NoteRoom>();
const userSockets = new Map<string, string>(); // userId -> socketId

export const setupSocketHandlers = (io: Server) => {
  // Authentication middleware for socket connections
  io.use(async (socket: AuthenticatedSocket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) {
        return next(new Error('Authentication error: Token required'));
      }

      const decoded = jwt.verify(token, config.jwt.secret) as AuthPayload;
      socket.user = decoded;
      userSockets.set(decoded.userId, socket.id);
      next();
    } catch (error) {
      next(new Error('Authentication error: Invalid token'));
    }
  });

  io.on('connection', (socket: AuthenticatedSocket) => {
    console.log(`👤 User ${socket.user?.username} connected (${socket.id})`);

    // Handle joining a note room
    socket.on('join-note', async (noteId: string) => {
      try {
        // Verify user has access to this note
        const note = await Note.findById(noteId);
        if (!note || !note.isUserAuthorized(socket.user!.userId, 'read')) {
          socket.emit('error', { message: 'Access denied to this note' });
          return;
        }

        // Leave any existing note rooms
        const currentRooms = Array.from(socket.rooms).filter(room => room !== socket.id);
        currentRooms.forEach(room => {
          if (room.startsWith('note:')) {
            socket.leave(room);
            handleUserLeaveRoom(room.replace('note:', ''), socket.user!.userId, io);
          }
        });

        // Join the new note room
        const roomName = `note:${noteId}`;
        socket.join(roomName);

        // Update or create room info
        if (!noteRooms.has(noteId)) {
          noteRooms.set(noteId, {
            noteId,
            users: [],
          });
        }

        const room = noteRooms.get(noteId)!;
        const existingUserIndex = room.users.findIndex(u => u.userId === socket.user!.userId);
        
        if (existingUserIndex >= 0) {
          // Update existing user's socket ID
          room.users[existingUserIndex].socketId = socket.id;
        } else {
          // Add new user to room
          room.users.push({
            userId: socket.user!.userId,
            username: socket.user!.username,
            socketId: socket.id,
          });
        }

        // Notify other users in the room
        socket.to(roomName).emit('user-joined', {
          user: {
            userId: socket.user!.userId,
            username: socket.user!.username,
          },
          activeUsers: room.users.map(u => ({ userId: u.userId, username: u.username })),
        });

        // Send current active users to the joining user
        socket.emit('joined-note', {
          noteId,
          activeUsers: room.users.map(u => ({ userId: u.userId, username: u.username })),
        });

        console.log(`📝 User ${socket.user?.username} joined note ${noteId}`);
      } catch (error) {
        console.error('Error joining note:', error);
        socket.emit('error', { message: 'Failed to join note' });
      }
    });

    // Handle leaving a note room
    socket.on('leave-note', (noteId: string) => {
      const roomName = `note:${noteId}`;
      socket.leave(roomName);
      handleUserLeaveRoom(noteId, socket.user!.userId, io);
      console.log(`📝 User ${socket.user?.username} left note ${noteId}`);
    });

    // Handle real-time note content updates
    socket.on('note-update', async (data: { noteId: string; content: string; title?: string }) => {
      try {
        const { noteId, content, title } = data;
        
        // Verify user has write access
        const note = await Note.findById(noteId);
        if (!note || !note.isUserAuthorized(socket.user!.userId, 'write')) {
          socket.emit('error', { message: 'Write access denied' });
          return;
        }

        // Broadcast the update to other users in the room (excluding sender)
        const roomName = `note:${noteId}`;
        socket.to(roomName).emit('note-updated', {
          noteId,
          content,
          title,
          modifiedBy: {
            userId: socket.user!.userId,
            username: socket.user!.username,
          },
          timestamp: new Date(),
        });

        console.log(`📝 Note ${noteId} updated by ${socket.user?.username}`);
      } catch (error) {
        console.error('Error updating note:', error);
        socket.emit('error', { message: 'Failed to update note' });
      }
    });

    // Handle cursor position updates for collaborative editing
    socket.on('cursor-update', (data: { noteId: string; position: number; selection?: { start: number; end: number } }) => {
      const { noteId, position, selection } = data;
      const roomName = `note:${noteId}`;
      
      socket.to(roomName).emit('cursor-updated', {
        user: {
          userId: socket.user!.userId,
          username: socket.user!.username,
        },
        position,
        selection,
      });
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      console.log(`👤 User ${socket.user?.username} disconnected (${socket.id})`);
      
      // Remove user from all note rooms
      const currentRooms = Array.from(socket.rooms).filter(room => room !== socket.id);
      currentRooms.forEach(room => {
        if (room.startsWith('note:')) {
          handleUserLeaveRoom(room.replace('note:', ''), socket.user!.userId, io);
        }
      });

      // Remove from user sockets map
      if (socket.user) {
        userSockets.delete(socket.user.userId);
      }
    });
  });
};

// Helper function to handle user leaving a room
const handleUserLeaveRoom = (noteId: string, userId: string, io: Server) => {
  const room = noteRooms.get(noteId);
  if (!room) return;

  // Remove user from room
  room.users = room.users.filter(u => u.userId !== userId);

  // If room is empty, delete it
  if (room.users.length === 0) {
    noteRooms.delete(noteId);
  } else {
    // Notify remaining users
    const roomName = `note:${noteId}`;
    io.to(roomName).emit('user-left', {
      userId,
      activeUsers: room.users.map(u => ({ userId: u.userId, username: u.username })),
    });
  }
};

// Export function to get active users in a note (for API endpoints)
export const getActiveUsersInNote = (noteId: string): SocketUser[] => {
  const room = noteRooms.get(noteId);
  return room ? room.users : [];
};
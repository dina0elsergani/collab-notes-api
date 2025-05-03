export interface User {
  _id: string;
  username: string;
  email: string;
  password: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Note {
  _id: string;
  title: string;
  content: string;
  owner: string;
  collaborators: Collaborator[];
  versions: NoteVersion[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Collaborator {
  user: string;
  role: 'read' | 'write';
  addedAt: Date;
}

export interface NoteVersion {
  content: string;
  modifiedBy: string;
  modifiedAt: Date;
}

export interface AuthPayload {
  userId: string;
  username: string;
  email: string;
}

export interface SocketUser {
  userId: string;
  username: string;
  socketId: string;
}

export interface NoteRoom {
  noteId: string;
  users: SocketUser[];
}

export interface NoteUpdateEvent {
  noteId: string;
  content: string;
  modifiedBy: string;
  timestamp: Date;
}

export interface CollaboratorJoinEvent {
  noteId: string;
  user: SocketUser;
}

export interface CollaboratorLeaveEvent {
  noteId: string;
  userId: string;
}
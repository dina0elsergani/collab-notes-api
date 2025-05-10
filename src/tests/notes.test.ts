import request from 'supertest';
import { app } from '../index';
import User from '../models/User';
import Note from '../models/Note';

describe('Notes', () => {
  let userToken: string;
  let userId: string;
  let otherUserToken: string;
  let otherUserId: string;

  beforeEach(async () => {
    // Create test users
    const user1 = new User({
      username: 'testuser1',
      email: 'test1@example.com',
      password: 'password123',
    });
    await user1.save();

    const user2 = new User({
      username: 'testuser2',
      email: 'test2@example.com',
      password: 'password123',
    });
    await user2.save();

    // Login users to get tokens
    const login1 = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test1@example.com', password: 'password123' });
    
    const login2 = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test2@example.com', password: 'password123' });

    userToken = login1.body.data.token;
    userId = login1.body.data.user.id;
    otherUserToken = login2.body.data.token;
    otherUserId = login2.body.data.user.id;
  });

  describe('POST /api/notes', () => {
    it('should create a new note', async () => {
      const noteData = {
        title: 'Test Note',
        content: 'This is a test note content',
      };

      const response = await request(app)
        .post('/api/notes')
        .set('Authorization', `Bearer ${userToken}`)
        .send(noteData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.note.title).toBe(noteData.title);
      expect(response.body.data.note.content).toBe(noteData.content);
      expect(response.body.data.note.owner._id).toBe(userId);
    });

    it('should require authentication', async () => {
      const noteData = {
        title: 'Test Note',
        content: 'This is a test note content',
      };

      await request(app)
        .post('/api/notes')
        .send(noteData)
        .expect(401);
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/notes')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ content: 'Missing title' })
        .expect(400);

      expect(response.body.message).toContain('Validation Error');
    });
  });

  describe('GET /api/notes', () => {
    beforeEach(async () => {
      // Create test notes
      await Note.create([
        {
          title: 'User 1 Note 1',
          content: 'Content 1',
          owner: userId,
        },
        {
          title: 'User 1 Note 2',
          content: 'Content 2',
          owner: userId,
        },
        {
          title: 'User 2 Note',
          content: 'Content 3',
          owner: otherUserId,
        },
        {
          title: 'Shared Note',
          content: 'Shared content',
          owner: otherUserId,
          collaborators: [{ user: userId, role: 'read' }],
        },
      ]);
    });

    it('should get user notes (owned and collaborated)', async () => {
      const response = await request(app)
        .get('/api/notes')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.notes).toHaveLength(3); // 2 owned + 1 shared
      expect(response.body.data.pagination.total).toBe(3);
    });

    it('should support pagination', async () => {
      const response = await request(app)
        .get('/api/notes?page=1&limit=2')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.data.notes).toHaveLength(2);
      expect(response.body.data.pagination.page).toBe(1);
      expect(response.body.data.pagination.limit).toBe(2);
    });
  });

  describe('GET /api/notes/:id', () => {
    let noteId: string;
    let privateNoteId: string;

    beforeEach(async () => {
      const note = await Note.create({
        title: 'Test Note',
        content: 'Test content',
        owner: userId,
        collaborators: [{ user: otherUserId, role: 'read' }],
      });
      noteId = note._id.toString();

      const privateNote = await Note.create({
        title: 'Private Note',
        content: 'Private content',
        owner: otherUserId,
      });
      privateNoteId = privateNote._id.toString();
    });

    it('should get note for owner', async () => {
      const response = await request(app)
        .get(`/api/notes/${noteId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.note.title).toBe('Test Note');
    });

    it('should get note for collaborator', async () => {
      const response = await request(app)
        .get(`/api/notes/${noteId}`)
        .set('Authorization', `Bearer ${otherUserToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.note.title).toBe('Test Note');
    });

    it('should deny access to unauthorized user', async () => {
      const response = await request(app)
        .get(`/api/notes/${privateNoteId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);

      expect(response.body.message).toContain('Access denied');
    });
  });

  describe('PUT /api/notes/:id', () => {
    let noteId: string;

    beforeEach(async () => {
      const note = await Note.create({
        title: 'Original Title',
        content: 'Original content',
        owner: userId,
        collaborators: [{ user: otherUserId, role: 'write' }],
      });
      noteId = note._id.toString();
    });

    it('should update note for owner', async () => {
      const updateData = {
        title: 'Updated Title',
        content: 'Updated content',
      };

      const response = await request(app)
        .put(`/api/notes/${noteId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.note.title).toBe('Updated Title');
      expect(response.body.data.note.content).toBe('Updated content');
    });

    it('should update note for write collaborator', async () => {
      const updateData = {
        title: 'Collaborator Update',
      };

      const response = await request(app)
        .put(`/api/notes/${noteId}`)
        .set('Authorization', `Bearer ${otherUserToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.data.note.title).toBe('Collaborator Update');
    });

    it('should create version history on content change', async () => {
      const updateData = {
        content: 'New content version',
      };

      await request(app)
        .put(`/api/notes/${noteId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send(updateData);

      const note = await Note.findById(noteId);
      expect(note?.versions).toHaveLength(1);
      expect(note?.versions[0].content).toBe('Original content');
    });
  });

  describe('DELETE /api/notes/:id', () => {
    let noteId: string;

    beforeEach(async () => {
      const note = await Note.create({
        title: 'Test Note',
        content: 'Test content',
        owner: userId,
        collaborators: [{ user: otherUserId, role: 'write' }],
      });
      noteId = note._id.toString();
    });

    it('should delete note for owner', async () => {
      const response = await request(app)
        .delete(`/api/notes/${noteId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('deleted successfully');

      const deletedNote = await Note.findById(noteId);
      expect(deletedNote).toBeNull();
    });

    it('should not allow collaborator to delete note', async () => {
      const response = await request(app)
        .delete(`/api/notes/${noteId}`)
        .set('Authorization', `Bearer ${otherUserToken}`)
        .expect(403);

      expect(response.body.message).toContain('Only the owner can delete');
    });
  });

  describe('POST /api/notes/:id/collaborators', () => {
    let noteId: string;

    beforeEach(async () => {
      const note = await Note.create({
        title: 'Test Note',
        content: 'Test content',
        owner: userId,
      });
      noteId = note._id.toString();
    });

    it('should add collaborator for owner', async () => {
      const collaboratorData = {
        email: 'test2@example.com',
        role: 'write',
      };

      const response = await request(app)
        .post(`/api/notes/${noteId}/collaborators`)
        .set('Authorization', `Bearer ${userToken}`)
        .send(collaboratorData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.note.collaborators).toHaveLength(1);
      expect(response.body.data.note.collaborators[0].role).toBe('write');
    });

    it('should not allow non-owner to add collaborators', async () => {
      const collaboratorData = {
        email: 'test2@example.com',
        role: 'read',
      };

      const response = await request(app)
        .post(`/api/notes/${noteId}/collaborators`)
        .set('Authorization', `Bearer ${otherUserToken}`)
        .send(collaboratorData)
        .expect(403);

      expect(response.body.message).toContain('Only the owner can manage collaborators');
    });
  });
});
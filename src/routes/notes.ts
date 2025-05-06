import { Router } from 'express';
import {
  createNote,
  getNotes,
  getNote,
  updateNote,
  deleteNote,
  addCollaborator,
  removeCollaborator,
  getNoteVersions,
} from '@/controllers/noteController';
import { authenticateToken } from '@/middleware/auth';
import {
  validate,
  createNoteSchema,
  updateNoteSchema,
  addCollaboratorSchema,
} from '@/middleware/validation';

const router = Router();

// All note routes require authentication
router.use(authenticateToken);

/**
 * @swagger
 * /notes:
 *   post:
 *     summary: Create a new note
 *     tags: [Notes]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *             properties:
 *               title:
 *                 type: string
 *                 maxLength: 200
 *               content:
 *                 type: string
 *     responses:
 *       201:
 *         description: Note created successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.post('/', validate(createNoteSchema), createNote);

/**
 * @swagger
 * /notes:
 *   get:
 *     summary: Get user's notes (owned and collaborated)
 *     tags: [Notes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Notes retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get('/', getNotes);

/**
 * @swagger
 * /notes/{id}:
 *   get:
 *     summary: Get a specific note
 *     tags: [Notes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Note retrieved successfully
 *       403:
 *         description: Access denied
 *       404:
 *         description: Note not found
 */
router.get('/:id', getNote);

/**
 * @swagger
 * /notes/{id}:
 *   put:
 *     summary: Update a note
 *     tags: [Notes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *                 maxLength: 200
 *               content:
 *                 type: string
 *     responses:
 *       200:
 *         description: Note updated successfully
 *       403:
 *         description: Write access denied
 *       404:
 *         description: Note not found
 */
router.put('/:id', validate(updateNoteSchema), updateNote);

/**
 * @swagger
 * /notes/{id}:
 *   delete:
 *     summary: Delete a note (owner only)
 *     tags: [Notes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Note deleted successfully
 *       403:
 *         description: Only owner can delete
 *       404:
 *         description: Note not found
 */
router.delete('/:id', deleteNote);

/**
 * @swagger
 * /notes/{id}/collaborators:
 *   post:
 *     summary: Add a collaborator to a note
 *     tags: [Notes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               role:
 *                 type: string
 *                 enum: [read, write]
 *                 default: read
 *     responses:
 *       200:
 *         description: Collaborator added successfully
 *       403:
 *         description: Only owner can manage collaborators
 *       404:
 *         description: Note or user not found
 */
router.post('/:id/collaborators', validate(addCollaboratorSchema), addCollaborator);

/**
 * @swagger
 * /notes/{id}/collaborators/{collaboratorId}:
 *   delete:
 *     summary: Remove a collaborator from a note
 *     tags: [Notes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: collaboratorId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Collaborator removed successfully
 *       403:
 *         description: Only owner can manage collaborators
 *       404:
 *         description: Note not found
 */
router.delete('/:id/collaborators/:collaboratorId', removeCollaborator);

/**
 * @swagger
 * /notes/{id}/versions:
 *   get:
 *     summary: Get note version history
 *     tags: [Notes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Version history retrieved successfully
 *       403:
 *         description: Access denied
 *       404:
 *         description: Note not found
 */
router.get('/:id/versions', getNoteVersions);

export default router;
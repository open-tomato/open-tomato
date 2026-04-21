/**
 * @packageDocumentation
 * Express router for requirements CRUD operations.
 */

import type { Db } from '../db/index.js';
import type { Request, Response } from 'express';

import { Router } from 'express';
import { z } from 'zod';

import {
  deleteRequirement,
  getRequirement,
  listRequirements,
  updateRequirement,
} from '../store/requirements.js';
import { validateRequirement } from '../validation/requirement-validator.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface RequirementsRouterDeps {
  db: Db;
}

// ---------------------------------------------------------------------------
// Validation schemas
// ---------------------------------------------------------------------------

const uuidSchema = z.string().uuid();

const updateRequirementSchema = z.object({
  name: z.string().min(1).optional(),
  repository: z.string().min(1).optional(),
}).refine(data => Object.keys(data).length > 0, 'At least one field must be provided');

// ---------------------------------------------------------------------------
// Router factory
// ---------------------------------------------------------------------------

export function requirementsRouter({ db }: RequirementsRouterDeps): Router {
  const router = Router();

  // GET / — list validated requirements
  router.get('/', async (_req: Request, res: Response) => {
    try {
      const requirements = await listRequirements(db, { hasValidationIssues: false });
      res.json({ success: true, data: requirements });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({ success: false, error: message });
    }
  });

  // GET /:id — get requirement details
  router.get('/:id', async (req: Request, res: Response) => {
    try {
      const parsed = uuidSchema.safeParse(req.params['id']);
      if (!parsed.success) {
        res.status(400).json({ success: false, error: 'Invalid requirement ID format' });
        return;
      }

      const requirement = await getRequirement(db, parsed.data);
      if (!requirement) {
        res.status(404).json({ success: false, error: 'Requirement not found' });
        return;
      }

      res.json({ success: true, data: requirement });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({ success: false, error: message });
    }
  });

  // PUT /:id — update requirement (fix validation issues)
  router.put('/:id', async (req: Request, res: Response) => {
    try {
      const idParsed = uuidSchema.safeParse(req.params['id']);
      if (!idParsed.success) {
        res.status(400).json({ success: false, error: 'Invalid requirement ID format' });
        return;
      }

      const bodyParsed = updateRequirementSchema.safeParse(req.body);
      if (!bodyParsed.success) {
        res.status(400).json({ success: false, error: bodyParsed.error.message });
        return;
      }

      const existing = await getRequirement(db, idParsed.data);
      if (!existing) {
        res.status(404).json({ success: false, error: 'Requirement not found' });
        return;
      }

      const patch: Record<string, string> = {};
      if (bodyParsed.data.name !== undefined) {
        patch['name'] = bodyParsed.data.name;
      }
      if (bodyParsed.data.repository !== undefined) {
        patch['repository'] = bodyParsed.data.repository;
      }

      const patched = await updateRequirement(db, idParsed.data, patch);
      if (!patched) {
        res.status(500).json({ success: false, error: 'Failed to update requirement' });
        return;
      }

      const validation = await validateRequirement(db, patched);
      const updated = await updateRequirement(db, idParsed.data, {
        validation_issues: validation.issues,
        status: validation.status,
      });

      res.json({ success: true, data: updated ?? patched });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({ success: false, error: message });
    }
  });

  // DELETE /:id — soft-delete requirement
  router.delete('/:id', async (req: Request, res: Response) => {
    try {
      const parsed = uuidSchema.safeParse(req.params['id']);
      if (!parsed.success) {
        res.status(400).json({ success: false, error: 'Invalid requirement ID format' });
        return;
      }

      const deleted = await deleteRequirement(db, parsed.data);
      if (!deleted) {
        res.status(409).json({
          success: false,
          error: 'Cannot delete requirement with associated plans',
        });
        return;
      }

      res.json({ success: true, data: { id: parsed.data, status: 'deleted' } });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({ success: false, error: message });
    }
  });

  return router;
}

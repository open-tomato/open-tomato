/**
 * @packageDocumentation
 * Express router for importing requirements from external sources.
 */

import type { Db } from '../db/index.js';
import type { Request, Response } from 'express';

import { Router } from 'express';
import { z } from 'zod';

import { hasTasks, parseMdPlanFull } from '../parser/md-parser.js';
import {
  createRequirement,
  findByEntityTypeAndId,
  listRequirements,
  updateRequirement,
} from '../store/requirements.js';
import { validateRequirement } from '../validation/requirement-validator.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ImportRouterDeps {
  db: Db;
}

// ---------------------------------------------------------------------------
// Validation schemas
// ---------------------------------------------------------------------------

const linearImportSchema = z.object({
  issues: z.array(z.object({
    identifier: z.string().min(1),
    issueId: z.string().min(1),
    title: z.string().min(1),
    description: z.string().optional(),
    repository: z.string().optional(),
    blockedByIdentifiers: z.array(z.string()).optional(),
    blockingIdentifiers: z.array(z.string()).optional(),
  })).min(1),
});

const fileImportSchema = z.object({
  files: z.array(z.object({
    filename: z.string().min(1),
    content: z.string().min(1),
  })).min(1),
});

// ---------------------------------------------------------------------------
// Router factory
// ---------------------------------------------------------------------------

export function importRouter({ db }: ImportRouterDeps): Router {
  const router = Router();

  // GET / — list requirements with pending validation issues
  router.get('/', async (_req: Request, res: Response) => {
    try {
      const requirements = await listRequirements(db, { hasValidationIssues: true });
      res.json({ success: true, data: requirements });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({ success: false, error: message });
    }
  });

  // POST /linear — import Linear issues as requirements
  router.post('/linear', async (req: Request, res: Response) => {
    try {
      const auth = req.headers['authorization'];
      if (!auth?.startsWith('Bearer ')) {
        res.status(401).json({ success: false, error: 'Linear access token required' });
        return;
      }

      const parsed = linearImportSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ success: false, error: parsed.error.message });
        return;
      }

      const imported = [];
      const skipped: string[] = [];

      for (const issue of parsed.data.issues) {
        const existing = await findByEntityTypeAndId(db, 'linear', issue.identifier);
        if (existing) {
          skipped.push(issue.identifier);
          continue;
        }

        const requirement = await createRequirement(db, {
          entity_type: 'linear',
          entity_id: issue.identifier,
          entity_metadata: {
            issueId: issue.issueId,
            blockedByIdentifiers: issue.blockedByIdentifiers,
            blockingIdentifiers: issue.blockingIdentifiers,
          },
          name: issue.title,
          description: issue.description ?? null,
          repository: issue.repository ?? null,
          identifier: issue.identifier,
        });

        const validation = await validateRequirement(db, requirement);
        const updated = await updateRequirement(db, requirement.id, {
          validation_issues: validation.issues,
          status: validation.status,
        });

        imported.push(updated ?? requirement);
      }

      res.json({ success: true, data: { imported, skipped } });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({ success: false, error: message });
    }
  });

  // POST /file — upload MD files as requirements
  router.post('/file', async (req: Request, res: Response) => {
    try {
      const parsed = fileImportSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ success: false, error: parsed.error.message });
        return;
      }

      const imported = [];
      const skipped: string[] = [];

      for (const file of parsed.data.files) {
        const existing = await findByEntityTypeAndId(db, 'md', file.filename);
        if (existing) {
          skipped.push(file.filename);
          continue;
        }

        const plan = parseMdPlanFull(file.content, file.filename);
        const fileHasTasks = hasTasks(file.content);

        const entityMetadata = fileHasTasks
          ? { hasTasks: true, taskCount: plan.tasks.length }
          : undefined;

        const requirement = await createRequirement(db, {
          entity_type: 'md',
          entity_id: file.filename,
          name: plan.name,
          description: file.content,
          repository: null,
          identifier: null,
          entity_metadata: entityMetadata,
        });

        const validation = await validateRequirement(db, requirement);
        const updated = await updateRequirement(db, requirement.id, {
          validation_issues: validation.issues,
          status: validation.status,
        });

        imported.push(updated ?? requirement);
      }

      res.json({ success: true, data: { imported, skipped } });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({ success: false, error: message });
    }
  });

  return router;
}

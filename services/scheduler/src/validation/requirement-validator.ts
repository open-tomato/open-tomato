import type { Db } from '../db/index.js';
import type { ValidationIssue } from '../db/schema.js';

import { and, eq, ne } from 'drizzle-orm';

import { requirementsTable } from '../db/schema.js';

export interface ValidationResult {
  issues: ValidationIssue[];
  status: 'pending_validation' | 'validated';
}

export async function validateRequirement(
  db: Db,
  requirement: {
    id: string;
    name: string;
    repository: string | null;
    identifier: string | null;
    entity_type: string;
    entity_id: string;
  },
): Promise<ValidationResult> {
  const issues: ValidationIssue[] = [];

  // Check 1: duplicate_name
  const duplicate = await db.query.requirementsTable.findFirst({
    where: and(
      eq(requirementsTable.name, requirement.name),
      ne(requirementsTable.id, requirement.id),
      ne(requirementsTable.status, 'deleted'),
    ),
  });

  if (duplicate) {
    issues.push({
      type: 'duplicate_name',
      message: 'A requirement with this name already exists',
      resolved: false,
    });
  }

  // Check 2: missing_repository
  if (requirement.repository === null) {
    issues.push({
      type: 'missing_repository',
      message: 'No repository linked to this requirement',
      resolved: false,
    });
  }

  // Check 3: branch_conflict — Phase 2 (requires GitHub API)

  const hasUnresolved = issues.some((i) => !i.resolved);

  return {
    issues,
    status: hasUnresolved ? 'pending_validation' : 'validated',
  };
}

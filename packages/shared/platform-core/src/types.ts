export interface ProvisionRequest {
  service: string;
  env: string;
  region: string;
  capabilities: string[];
  metadata: Record<string, unknown>;
}

export interface ProvisionAllowance {
  allowed: boolean;
  reasons: readonly string[];
  caps: Record<string, string>;
}

export interface ResolvedConfig {
  service: string;
  env: string;
  infrastructure: Record<string, unknown>;
  vault: Record<string, unknown>;
  extras: Record<string, unknown>;
}

export interface MatchResult {
  matches: boolean;
  score: number;
  missing: string[];
}

export interface ValidationIssue {
  path: string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
}

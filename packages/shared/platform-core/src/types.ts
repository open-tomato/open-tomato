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

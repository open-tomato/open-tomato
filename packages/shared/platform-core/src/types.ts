export interface ProvisionRequest {
  service: string;
  env: string;
  region: string;
  capabilities: string[];
  metadata: Record<string, unknown>;
}

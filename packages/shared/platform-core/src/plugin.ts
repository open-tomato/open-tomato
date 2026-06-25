import type {
  EmitResult,
  MatchResult,
  ProvisionAllowance,
  ProvisionRequest,
  ResolvedConfig,
  ValidationResult,
} from './types';

export interface PlatformPlugin {
  readonly name: string;
  readonly version: string;

  matchCapabilities(request: ProvisionRequest): Promise<MatchResult>;
  resolvePlatformRefs(template: string, ctx: ResolvedConfig): Promise<string>;
  validateProvision(
    request: ProvisionRequest,
    allowance: ProvisionAllowance,
  ): Promise<ValidationResult>;
  emit(config: ResolvedConfig): Promise<EmitResult>;
}

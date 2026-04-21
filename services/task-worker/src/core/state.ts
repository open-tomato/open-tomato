/**
 * In-memory worker state tracking.
 *
 * The task-worker handles one job at a time. This module tracks whether
 * the worker is idle or busy and exposes the current model being used.
 */

export interface WorkerState {
  readonly busy: boolean;
  readonly currentModel: string | null;
  readonly currentWorkDir: string | null;
}

/**
 * Mutable state container for the worker. Designed as a singleton
 * injected into routes — not shared across worker instances.
 */
export class WorkerStateManager {
  private _busy = false;
  private _currentModel: string | null = null;
  private _currentWorkDir: string | null = null;

  get busy(): boolean {
    return this._busy;
  }

  get currentModel(): string | null {
    return this._currentModel;
  }

  get currentWorkDir(): string | null {
    return this._currentWorkDir;
  }

  markBusy(model: string): void {
    this._busy = true;
    this._currentModel = model;
  }

  markIdle(): void {
    this._busy = false;
    this._currentModel = null;
  }

  setWorkDir(dir: string | null): void {
    this._currentWorkDir = dir;
  }

  snapshot(): WorkerState {
    return {
      busy: this._busy,
      currentModel: this._currentModel,
      currentWorkDir: this._currentWorkDir,
    };
  }
}

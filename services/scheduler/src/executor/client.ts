/**
 * @packageDocumentation
 * HTTP client for the executor service.
 */

export interface DispatchPlan {
  name: string;
  description?: string;
  tasks: Array<{ index: number; text: string }>;
}

export interface DispatchResult {
  jobId: string;
  status: string;
}

export interface ExecutorClient {
  dispatch(
    planId: string,
    plan: DispatchPlan,
  ): Promise<DispatchResult>;
  cancel(jobId: string): Promise<DispatchResult>;
  getJob(jobId: string): Promise<Record<string, unknown>>;
  getJobTasks(jobId: string): Promise<Array<Record<string, unknown>>>;
}

export function createExecutorClient(baseUrl: string): ExecutorClient {
  async function request<T>(path: string, options?: RequestInit): Promise<T> {
    const res = await fetch(`${baseUrl}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Executor request failed: ${res.status} ${body}`);
    }

    return res.json() as Promise<T>;
  }

  return {
    async dispatch(planId, plan) {
      return request<DispatchResult>('/jobs', {
        method: 'POST',
        body: JSON.stringify({ planId, plan }),
      });
    },

    async cancel(jobId) {
      return request<DispatchResult>(`/jobs/${jobId}/cancel`, {
        method: 'POST',
      });
    },

    async getJob(jobId) {
      return request<Record<string, unknown>>(`/jobs/${jobId}`);
    },

    async getJobTasks(jobId) {
      return request<Array<Record<string, unknown>>>(`/jobs/${jobId}/tasks`);
    },
  };
}

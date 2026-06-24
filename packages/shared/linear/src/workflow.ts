export type WorkflowResponse = {
  success: boolean;
  status: string;
  issue_id?: string;
  message?: string;
  files?: Record<string, string>;
  branch?: string;
  plan_url?: string;
  prerequisites_url?: string;
  repository?: string;
};

export async function callWorkflowApi(
  issueId: string,
  repoPath: string,
): Promise<{ statusCode: number; body: WorkflowResponse }> {
  const response = await fetch('https://dev.bifemecanico.com/webhook/issue-planner', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ repo: repoPath, issueId }),
  });

  const raw = await response.text();
  try {
    const parsed: unknown = JSON.parse(raw);
    const body = (Array.isArray(parsed)
      ? parsed[0]
      : parsed) as WorkflowResponse;
    return { statusCode: response.status, body };
  } catch (error) {
    throw new Error(
      `Non-JSON response: ${error instanceof Error
        ? error.message
        : String(error)}`,
    );
  }
}

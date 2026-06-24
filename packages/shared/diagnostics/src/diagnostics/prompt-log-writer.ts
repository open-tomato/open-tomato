import { appendFile } from 'node:fs/promises';

/**
 * Append-only markdown writer for recording full prompt text per iteration.
 *
 * Each call to {@link PromptLogWriter.append} writes a markdown section header
 * containing the current timestamp, hat name, and iteration ID, followed by
 * the full prompt text. The output file grows monotonically and is never
 * truncated or overwritten.
 */
export class PromptLogWriter {
  private readonly filePath: string;

  /**
   * @param filePath - Absolute or relative path to the markdown file to write to.
   *   The file is created if it does not exist; existing content is preserved.
   */
  constructor(filePath: string) {
    this.filePath = filePath;
  }

  /**
   * Append a markdown section header and full prompt text to the log file.
   *
   * The header format is:
   * ```
   * ## [<ISO timestamp>] Hat: <hat> | Iteration: <iterationId>
   * ```
   * followed by the prompt text and a trailing newline.
   *
   * @param hat - The hat (agent role) that produced this prompt.
   * @param iterationId - Unique identifier for the current iteration.
   * @param prompt - The full prompt text to record.
   * @returns A promise that resolves once the data has been flushed to disk.
   */
  async append(hat: string, iterationId: string, prompt: string): Promise<void> {
    const header = `\n## [${new Date().toISOString()}] Hat: ${hat} | Iteration: ${iterationId}\n`;
    await appendFile(this.filePath, header + prompt + '\n', 'utf8');
  }
}

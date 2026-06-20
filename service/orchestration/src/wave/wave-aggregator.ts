import type { WaveWorkerResult } from '@open-tomato/types';

import { appendFile, readFile } from 'node:fs/promises';

/**
 * Merges worker output files into the main events file and forwards
 * to the aggregator hat.
 *
 * After all workers in a wave complete (or timeout), the aggregator
 * reads each worker's JSONL output file in index order, appends the
 * lines to the main events file, and triggers the next loop iteration
 * targeting the aggregator hat.
 */
export class WaveAggregator {
  /**
   * Merge worker JSONL output files into the main events file.
   *
   * Reads each successful worker's output file in index order and
   * appends non-empty lines to the main events file. Failed workers
   * are skipped with a warning logged via the optional logger.
   * Missing or empty output files are handled gracefully.
   *
   * @param wave_id - Identifier of the wave being merged.
   * @param worker_results - Results from each worker, as returned by
   *   the {@link WaveDispatcher}.
   * @param main_events_file - Path to the main events JSONL file to
   *   append merged output to.
   * @param logger - Optional logging function for warnings. Defaults
   *   to a no-op.
   */
  async mergeResults(
    wave_id: string,
    worker_results: readonly WaveWorkerResult[],
    main_events_file: string,
    logger: (message: string) => void = () => {},
  ): Promise<void> {
    const sorted = [...worker_results].sort(
      (a, b) => a.worker_index - b.worker_index,
    );

    for (const result of sorted) {
      if (!result.success) {
        logger(
          `wave ${wave_id}: skipping output for failed worker ${result.worker_index}`,
        );
        continue;
      }

      let content: string;
      try {
        content = await readFile(result.output_file, 'utf8');
      } catch {
        logger(
          `wave ${wave_id}: missing output file for worker ${result.worker_index} at ${result.output_file}`,
        );
        continue;
      }

      const lines = content
        .split('\n')
        .filter((line) => line.trim().length > 0);

      if (lines.length === 0) {
        continue;
      }

      try {
        await appendFile(main_events_file, lines.join('\n') + '\n', 'utf8');
      } catch {
        logger(
          `wave ${wave_id}: failed to append output for worker ${result.worker_index} to ${main_events_file}`,
        );
      }
    }
  }

  /**
   * Trigger the next loop iteration targeting the aggregator hat.
   *
   * Forwards the merged events file path to the specified aggregator
   * hat so it can process the combined wave output in the next
   * iteration.
   *
   * @param aggregator_hat - Name of the hat to forward results to.
   * @param main_events_file - Path to the merged events file.
   * @returns Resolves when the forwarding trigger has been issued.
   */
  async forwardToAggregator(
    aggregator_hat: string,
    main_events_file: string,
    logger: (message: string) => void = () => {},
  ): Promise<void> {
    const event = JSON.stringify({
      topic: 'wave:aggregated',
      payload: main_events_file,
      target_hat: aggregator_hat,
    });

    try {
      await appendFile(main_events_file, event + '\n', 'utf8');
    } catch {
      logger(
        `wave: failed to forward aggregated event to hat "${aggregator_hat}" via ${main_events_file}`,
      );
    }
  }
}

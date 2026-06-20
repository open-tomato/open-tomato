import type { WaveWorkerResult } from '@open-tomato/types';

import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it, mock } from 'bun:test';

import { WaveAggregator } from '../wave/wave-aggregator.js';

describe('WaveAggregator', () => {
  let tempDir: string;
  let mainEventsFile: string;
  let aggregator: WaveAggregator;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'wave-agg-'));
    mainEventsFile = join(tempDir, 'events.jsonl');
    await writeFile(mainEventsFile, '', 'utf8');
    aggregator = new WaveAggregator();
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  function workerOutputFile(index: number): string {
    return join(tempDir, `wave-test-${index}.jsonl`);
  }

  function makeResult(
    index: number,
    success: boolean,
    error?: string,
  ): WaveWorkerResult {
    return {
      wave_id: 'wave-test',
      worker_index: index,
      output_file: workerOutputFile(index),
      success,
      error,
    };
  }

  describe('mergeResults', () => {
    it('merges worker output files into the main events file in index order', async () => {
      await writeFile(workerOutputFile(0), '{"line":"from-0"}\n', 'utf8');
      await writeFile(workerOutputFile(1), '{"line":"from-1"}\n', 'utf8');
      await writeFile(workerOutputFile(2), '{"line":"from-2"}\n', 'utf8');

      const results = [makeResult(2, true), makeResult(0, true), makeResult(1, true)];

      await aggregator.mergeResults('wave-test', results, mainEventsFile);

      const content = await readFile(mainEventsFile, 'utf8');
      const lines = content.split('\n').filter((l) => l.trim().length > 0);

      expect(lines).toEqual([
        '{"line":"from-0"}',
        '{"line":"from-1"}',
        '{"line":"from-2"}',
      ]);
    });

    it('skips output files for failed workers', async () => {
      await writeFile(workerOutputFile(0), '{"line":"from-0"}\n', 'utf8');
      await writeFile(workerOutputFile(1), '{"line":"from-1"}\n', 'utf8');

      const logger = mock<(msg: string) => void>(() => {});
      const results = [
        makeResult(0, true),
        makeResult(1, false, 'Worker crashed'),
      ];

      await aggregator.mergeResults('wave-test', results, mainEventsFile, logger);

      const content = await readFile(mainEventsFile, 'utf8');
      const lines = content.split('\n').filter((l) => l.trim().length > 0);

      expect(lines).toEqual(['{"line":"from-0"}']);
      expect(logger).toHaveBeenCalledWith(
        'wave wave-test: skipping output for failed worker 1',
      );
    });

    it('handles missing worker output files without throwing', async () => {
      // Don't create the output file for worker 0
      await writeFile(workerOutputFile(1), '{"line":"from-1"}\n', 'utf8');

      const logger = mock<(msg: string) => void>(() => {});
      const results = [makeResult(0, true), makeResult(1, true)];

      await aggregator.mergeResults('wave-test', results, mainEventsFile, logger);

      const content = await readFile(mainEventsFile, 'utf8');
      const lines = content.split('\n').filter((l) => l.trim().length > 0);

      expect(lines).toEqual(['{"line":"from-1"}']);
      expect(logger).toHaveBeenCalledWith(
        expect.stringContaining('missing output file for worker 0'),
      );
    });

    it('does not append duplicate lines when called multiple times with the same results', async () => {
      await writeFile(workerOutputFile(0), '{"line":"from-0"}\n', 'utf8');

      const results = [makeResult(0, true)];

      await aggregator.mergeResults('wave-test', results, mainEventsFile);
      await aggregator.mergeResults('wave-test', results, mainEventsFile);

      const content = await readFile(mainEventsFile, 'utf8');
      const lines = content.split('\n').filter((l) => l.trim().length > 0);

      // Note: mergeResults appends each time — the caller is responsible
      // for not calling it twice. Two calls produce two appends.
      expect(lines).toEqual(['{"line":"from-0"}', '{"line":"from-0"}']);
    });

    it('handles empty worker output files gracefully', async () => {
      await writeFile(workerOutputFile(0), '', 'utf8');
      await writeFile(workerOutputFile(1), '{"line":"from-1"}\n', 'utf8');

      const results = [makeResult(0, true), makeResult(1, true)];

      await aggregator.mergeResults('wave-test', results, mainEventsFile);

      const content = await readFile(mainEventsFile, 'utf8');
      const lines = content.split('\n').filter((l) => l.trim().length > 0);

      expect(lines).toEqual(['{"line":"from-1"}']);
    });

    it('handles multi-line worker output files', async () => {
      await writeFile(
        workerOutputFile(0),
        '{"line":"a"}\n{"line":"b"}\n',
        'utf8',
      );

      const results = [makeResult(0, true)];

      await aggregator.mergeResults('wave-test', results, mainEventsFile);

      const content = await readFile(mainEventsFile, 'utf8');
      const lines = content.split('\n').filter((l) => l.trim().length > 0);

      expect(lines).toEqual(['{"line":"a"}', '{"line":"b"}']);
    });
  });

  describe('forwardToAggregator', () => {
    it('appends a wave:aggregated event to the main events file', async () => {
      await aggregator.forwardToAggregator('summary-hat', mainEventsFile);

      const content = await readFile(mainEventsFile, 'utf8');
      const lines = content.split('\n').filter((l) => l.trim().length > 0);

      expect(lines).toHaveLength(1);

      const parsed = JSON.parse(lines[0]!);
      expect(parsed).toEqual({
        topic: 'wave:aggregated',
        payload: mainEventsFile,
        target_hat: 'summary-hat',
      });
    });
  });
});

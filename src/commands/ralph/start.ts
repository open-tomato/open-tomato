#!/usr/bin/env bun

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import { runClaude, checkUsage } from './utils/claude.js';
import { getCurrentBranch, getRepoRoot } from './utils/git.js';
import { findNextTask, updateTrackerLine } from './utils/tracker.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const currentChild: ReturnType<typeof Bun.spawn> | null = null;
let interrupted = false;

async function preserveProgress(): Promise<void> {
  const branch = getCurrentBranch();

  const prompt = [
    '* Read `@progress.txt` in full.',
    '* If there\'s anything worth keeping, grab what\'s generally relevant from `@progress.txt` and include it in `@AGENTS.md`, `@README.md`, `@CONTRIBUTING.md` or a pertinent `@skills/`.',
    '* If it\'s present, extract the issue identifier from the `@PLAN.md` file(e.g. "OPT-100") to be used in the PR title.',
    `* If the identifier is not present on the plan check if the branch name (${branch}) has the identifier pattern.`,
    '* Use the plan.md title as the PR title, include the identifier if you found it, and format it like this: "[OPT-100] Implement user authentication" or "Implement user authentication" if no identifier is found.',
    '* Create a concise yet descriptive PR description that summarizes the overall work done based on the completed plan and progress notes.',
    '* Commit these changes, push and create a PR for review.',
    '* Do not include Claude attribution in the commit or PR message.',
  ].join('\n');

  const exitCode = await runClaude(prompt);
  if (exitCode !== 0) {
    console.error(`\n❌ Failed to preserve progress (exit ${exitCode}). Please try again.`);
  } else {
    console.log('\n✅ Progress preserved and PR created!');
  }
}

export default async function start(args: string[]): Promise<void> {
  const testMode = args.includes('--test');
  const repoRoot = getRepoRoot();

  const planPath = testMode
    ? path.join(__dirname, 'PLAN_TEST.md')
    : path.join(repoRoot, 'PLAN.md');

  const rootPromptPath = path.join(repoRoot, 'PROMPT.md');
  const promptPath = testMode
    ? path.join(__dirname, 'PROMPT_TEST.md')
    : fs.existsSync(rootPromptPath)
      ? rootPromptPath
      : path.join(__dirname, 'PROMPT.md');

  const trackerPath = path.join(repoRoot, 'PLAN_TRACKER.md');

  if (!fs.existsSync(planPath)) {
    console.error(`❌ Plan file not found: ${planPath}`);
    process.exit(1);
  }

  if (!fs.existsSync(promptPath)) {
    console.error(`❌ Prompt file not found: ${promptPath}`);
    process.exit(1);
  }

  const planContent = fs.readFileSync(planPath, 'utf8');
  const promptContent = fs.readFileSync(promptPath, 'utf8');

  // Initialize tracker only if it doesn't exist
  if (!fs.existsSync(trackerPath)) {
    console.log('📋 Creating new plan tracker from PLAN...');
    fs.copyFileSync(planPath, trackerPath);
  } else {
    console.log('📋 Resuming from existing plan tracker...');
  }

  // Register SIGINT handler — set flag and kill the active child, then
  // actual cleanup (mark blocked + exit) happens after the await returns.
  process.on('SIGINT', () => {
    interrupted = true;
    currentChild?.kill();
  });

  while (true) {
    if (interrupted) break;

    const trackerContent = fs.readFileSync(trackerPath, 'utf8');
    const taskInfo = findNextTask(trackerContent);

    if (!taskInfo) {
      console.log('\n✅ All tasks completed!');
      if (!testMode) {
        preserveProgress();
      }
      break;
    }

    if (taskInfo.status === 'blocked') {
      console.log(`\n⚠️  Resuming blocked task: ${taskInfo.task}`);
    } else {
      console.log(`\n🔄 Executing task: ${taskInfo.task}`);
    }

    const prompt = [
      `Your current scoped task is: ${taskInfo.task}`,
      'Consider previous tasks listed above this one in PLAN.md checklist as completed. Do not re-evaluate or re-do them. Focus only on the current scoped task.',
      '',
      promptContent,
      planContent,
    ].join('\n');

    const exitCode = await runClaude(prompt);

    if (interrupted) {
      updateTrackerLine(trackerPath, taskInfo.lineNum, 'blocked');
      console.log('\n⚠️  Interrupted. Task marked as blocked. Run again to resume.');
      process.exit(0);
    }

    if (exitCode !== 0) {
      updateTrackerLine(trackerPath, taskInfo.lineNum, 'blocked');
      console.error(`\n❌ Task failed (exit ${exitCode}). Marked as blocked. Run again to retry.`);
      return;
    }

    updateTrackerLine(trackerPath, taskInfo.lineNum, 'done');
    console.log(`✅ Task done: ${taskInfo.task}`);

    const shouldPause = await checkUsage('task');
    if (shouldPause) {
      console.log('\n⚠️  Pausing task loop due to high Claude usage. Run again when usage is lower.');
      break;
    }
  }
}

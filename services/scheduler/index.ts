import process from 'node:process';

import { createService } from '@open-tomato/express';

import { createDbDependency } from './src/db/index.js';
import { createExecutorClient } from './src/executor/client.js';
import { subscribeToPlanEvents } from './src/notifications/event-handler.js';
import { importRouter } from './src/routes/import.js';
import { linearProxyRouter } from './src/routes/linear-proxy.js';
import { plansRouter } from './src/routes/plans.js';
import { reposRouter } from './src/routes/repos.js';
import { requirementsRouter } from './src/routes/requirements.js';
import { roadmapsRouter } from './src/routes/roadmaps.js';
import { listPlans } from './src/store/plans.js';

// ---------------------------------------------------------------------------
// Environment
// ---------------------------------------------------------------------------

const PORT = Number(process.env['PORT'] ?? 4500);
const DATABASE_URL = process.env['DATABASE_URL'] ?? 'postgresql://schedulus:schedulus@localhost:5435/schedulus';
const EXECUTOR_URL = process.env['EXECUTOR_URL'] ?? 'http://localhost:4300';
const NOTIFICATION_URL = process.env['NOTIFICATION_URL'];
const GITHUB_TOKEN = process.env['GITHUB_TOKEN'] ?? '';
const GITHUB_ORG = process.env['GITHUB_ORG'] ?? 'bifemecanico';

// ---------------------------------------------------------------------------
// Dependencies
// ---------------------------------------------------------------------------

const dbDep = createDbDependency(DATABASE_URL);
const executor = createExecutorClient(EXECUTOR_URL);

// ---------------------------------------------------------------------------
// Bootstrap
// ---------------------------------------------------------------------------

await createService({
  serviceId: 'schedulus',
  port: PORT,
  dependencies: [dbDep],

  async register(app, ctx) {
    const db = ctx.deps.get(dbDep);

    // Mount routes
    app.use('/import', importRouter({ db }));
    app.use('/requirements', requirementsRouter({ db }));
    app.use('/linear', linearProxyRouter());
    app.use('/plans', plansRouter({ db, executor, notificationUrl: NOTIFICATION_URL }));
    app.use('/roadmaps', roadmapsRouter({ db, executor, notificationUrl: NOTIFICATION_URL }));

    if (GITHUB_TOKEN) {
      app.use('/repos', reposRouter({ githubToken: GITHUB_TOKEN, githubOrg: GITHUB_ORG }));
    } else {
      console.warn('[schedulus] GITHUB_TOKEN not set — /repos endpoint disabled');
    }

    console.log('[schedulus] routes mounted: /import, /requirements, /linear, /plans, /roadmaps, /repos');

    // Re-subscribe to notifications for in-progress plans
    const activePlans = await listPlans(db, { status: 'dispatched' });
    const runningPlans = await listPlans(db, { status: 'running' });
    const allActive = [...activePlans, ...runningPlans];

    for (const plan of allActive) {
      if (plan.executor_job_id) {
        subscribeToPlanEvents(db, plan.id, plan.executor_job_id, NOTIFICATION_URL);
      }
    }

    if (allActive.length > 0) {
      console.log(`[schedulus] re-subscribed to ${allActive.length} active plan(s)`);
    }
  },
});

import process from 'node:process';

import { createService } from '@open-tomato/express';
import swaggerUi from 'swagger-ui-express';

import { createDbDependency } from './src/db/index.js';
import { registerAnthropicEntityPlugin } from './src/entity/plugins/anthropic.js';
import { registerExecutorEntityPlugin } from './src/entity/plugins/executor.js';
import { registerStubEntityPlugins } from './src/entity/plugins/stubs.js';
import { registerWebhookEntityPlugin } from './src/entity/plugins/webhook.js';
import { entityRegistry } from './src/entity/registry.js';
import { generateOpenApiDocument } from './src/openapi.js';
import { approvalsRouter } from './src/routes/approvals.js';
import { eventsRouter } from './src/routes/events.js';

// ---------------------------------------------------------------------------
// Environment
// ---------------------------------------------------------------------------

const PORT = Number(process.env['PORT'] ?? 4400);
const DATABASE_URL =
  process.env['DATABASE_URL'] ??
  'postgresql://notifications:notifications@localhost:5433/notifications';

// ---------------------------------------------------------------------------
// Entity plugins — register before the server starts accepting requests
// ---------------------------------------------------------------------------

registerAnthropicEntityPlugin();
registerExecutorEntityPlugin();
registerWebhookEntityPlugin();
registerStubEntityPlugins();

// ---------------------------------------------------------------------------
// Dependencies
// ---------------------------------------------------------------------------

const dbDep = createDbDependency(DATABASE_URL);

// ---------------------------------------------------------------------------
// Bootstrap
// ---------------------------------------------------------------------------

await createService({
  serviceId: 'notifications',
  port: PORT,
  dependencies: [dbDep],

  register(app, { deps }) {
    const db = deps.get(dbDep);

    app.use('/events', eventsRouter(db));
    app.use('/approvals', approvalsRouter(db));

    // Surface registered entity kinds in a simple status endpoint
    app.get('/status', (_req, res) => {
      res.json({
        entityKinds: entityRegistry.kinds(),
      });
    });

    // Swagger UI — available at GET /docs
    const spec = generateOpenApiDocument();
    app.use('/docs', swaggerUi.serve, swaggerUi.setup(spec));
  },
});

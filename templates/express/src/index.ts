import { createService } from '@open-tomato/express';

import { config } from './config.js';
import { exampleRouter } from './routes/example.js';

await createService({
  serviceId: '@open-tomato/template-service-express',
  port: config.PORT,
  register(app) {
    app.use('/example', exampleRouter);
  },
});

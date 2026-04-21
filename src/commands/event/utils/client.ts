/**
 * Axios HTTP client factory for the notification service.
 */
import axios from 'axios';

import { getServiceUrl } from './config.js';

export function createClient(port?: number) {
  return axios.create({
    baseURL: getServiceUrl(port),
    headers: { 'Content-Type': 'application/json' },
  });
}

export type NotificationClient = ReturnType<typeof createClient>;

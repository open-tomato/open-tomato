export interface BusEvent {
  topic: string;
  payload: string;
  source?: string;
  target?: string;
  waveMetadata?: Record<string, unknown>;
  ts?: string;
}

export type SubscriptionHandler = (event: BusEvent) => Promise<void> | void;

export type ObserverHandler = (event: BusEvent) => void;

export interface Subscription {
  pattern: string;
  handler: SubscriptionHandler;
  isWildcard: boolean;
}

export interface EventBusOptions {
  persistencePath?: string;
}

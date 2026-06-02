export type LocalQueueConfig = {
  enabled: boolean;
  concurrency: number;
  maxQueued: number | null;
  queuedTtlSeconds: number | null;
  heartbeatTtlSeconds: number | null;
  cancelQueuedOnDisconnect: boolean;
  upstreamQueueSupported: boolean;
  upstreamCancelSupported: boolean;
};

export type QueueStatus = {
  enabled: boolean;
  position: number | null;
  size: number | null;
  concurrency: number;
  upstreamQueueSupported: boolean;
  upstreamCancelSupported: boolean;
};

const DEFAULT_LOCAL_QUEUE_CONFIG: LocalQueueConfig = {
  enabled: false,
  concurrency: 1,
  maxQueued: null,
  queuedTtlSeconds: null,
  heartbeatTtlSeconds: null,
  cancelQueuedOnDisconnect: false,
  upstreamQueueSupported: true,
  upstreamCancelSupported: false,
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function readPositiveInteger(value: unknown, fallback: number) {
  const parsed = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  if (!Number.isInteger(parsed) || parsed < 1) {
    return fallback;
  }
  return parsed;
}

function readOptionalPositiveInteger(value: unknown) {
  const parsed = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  if (!Number.isInteger(parsed) || parsed < 1) {
    return null;
  }
  return parsed;
}

export function parseLocalQueueConfig(executionConfig: unknown): LocalQueueConfig {
  const root = asRecord(executionConfig);
  const localQueue = asRecord(root?.localQueue);
  const upstreamQueue = asRecord(root?.upstreamQueue);
  const upstreamCancel = asRecord(root?.upstreamCancel);

  if (!localQueue) {
    return DEFAULT_LOCAL_QUEUE_CONFIG;
  }

  return {
    enabled: localQueue.enabled === true,
    concurrency: readPositiveInteger(
      localQueue.concurrency,
      DEFAULT_LOCAL_QUEUE_CONFIG.concurrency
    ),
    maxQueued: readOptionalPositiveInteger(localQueue.maxQueued),
    queuedTtlSeconds: readOptionalPositiveInteger(localQueue.queuedTtlSeconds),
    heartbeatTtlSeconds: readOptionalPositiveInteger(localQueue.heartbeatTtlSeconds),
    cancelQueuedOnDisconnect: localQueue.cancelQueuedOnDisconnect === true,
    upstreamQueueSupported:
      upstreamQueue?.supported === undefined
        ? DEFAULT_LOCAL_QUEUE_CONFIG.upstreamQueueSupported
        : upstreamQueue.supported === true,
    upstreamCancelSupported:
      upstreamCancel?.supported === undefined
        ? DEFAULT_LOCAL_QUEUE_CONFIG.upstreamCancelSupported
        : upstreamCancel.supported === true,
  };
}

export function buildQueueStatus(input: {
  config: LocalQueueConfig;
  position?: number | null;
  size?: number | null;
}): QueueStatus {
  return {
    enabled: input.config.enabled,
    position: input.config.enabled ? input.position ?? null : null,
    size: input.config.enabled ? input.size ?? null : null,
    concurrency: input.config.concurrency,
    upstreamQueueSupported: input.config.upstreamQueueSupported,
    upstreamCancelSupported: input.config.upstreamCancelSupported,
  };
}

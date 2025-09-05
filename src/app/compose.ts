// src/app/compose.ts - URL Shortener composition root
import { makeHandle, makeHttpHandle, makeResolver } from './handlers';
import { withMetrics } from '../impl/observability';
import { s0 } from '../spec';
import type { EventBus, Sql, KV, Http, Clock, IdGen } from '../ports';

// Complete ports for URL shortener
export interface UrlShortenerPorts {
  sql: Sql;
  bus: EventBus;
  kv?: KV;
  http?: Http;
  clock?: Clock;
  id?: IdGen;
}

// Main composition function - applies R and O functors
export function compose(ports: UrlShortenerPorts) {
  // R functor: Spec → Impl (realize with concrete adapters)
  const handle0 = makeHandle(ports);
  const httpHandle0 = makeHttpHandle(ports);
  const resolver0 = makeResolver(ports);
  
  // O functor: Impl → Impl×Obs (wrap with observability)
  const handle = withMetrics('url_shortener_handle', handle0);
  const httpHandle = withMetrics('url_shortener_http', httpHandle0);
  const resolver = withMetrics('url_shortener_resolve', resolver0);
  
  return { 
    handle, 
    httpHandle, 
    resolver,
    
    // Utility functions
    getState: withMetrics('get_state', async () => {
      // In production, you'd maintain state snapshots
      // For demo, rebuild from events
      return s0; // Simplified
    }),
    
    // Health check
    healthCheck: withMetrics('health_check', async () => {
      try {
        await ports.sql.query('SELECT 1');
        return { status: 'healthy', timestamp: new Date().toISOString() };
      } catch (error) {
        return { status: 'unhealthy', error: error instanceof Error ? error.message : String(error), timestamp: new Date().toISOString() };
      }
    }),
  };
}

// Composition for testing (all in-memory) - import adapters directly
export function composeForTesting(): ReturnType<typeof compose> {
  // Import adapters locally to avoid potential circular dependency issues
  const { adapters } = require('./adapters');
  
  return compose({
    sql: adapters.inMemorySql(),
    bus: adapters.inMemoryBus(),
    kv: adapters.inMemoryKV(),
    http: adapters.mockHttp(),
    clock: adapters.systemClock(),
    id: adapters.randomIdGen(),
  });
}

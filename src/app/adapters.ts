// Consolidated Adapter Implementations
// All technology adapters in one place to eliminate duplication

import type { EventBus, Sql, KV, Http, BlobStore, Clock, IdGen, Search, Ws } from '../ports';

export const adapters = {
  // ===== SQL ADAPTERS =====
  
  // In-memory SQL (for testing)
  inMemorySql: (config?: any): Sql => {
    const events: any[] = [];
    const outbox: any[] = [];
    const tables = new Map<string, any[]>();
    
    return {
      async query<T = any>(sql: string, params?: unknown[]): Promise<T> {
        if (config?.debug) {
          console.log('SQL Query:', sql, params);
        }
        
        if (sql === 'SELECT 1') return 1 as T;
        if (sql === 'begin' || sql === 'commit' || sql === 'rollback') return undefined as T;
        
        if (sql.includes('insert into events')) {
          events.push({ sql, params, timestamp: new Date() });
          return undefined as T;
        }
        
        if (sql.includes('insert into outbox')) {
          outbox.push({ sql, params, timestamp: new Date() });
          return undefined as T;
        }
        
        if (sql.includes('CREATE TABLE') || sql.includes('DROP TABLE')) {
          return undefined as T;
        }
        
        // Simple SELECT simulation
        if (sql.toLowerCase().includes('select')) {
          const tableName = extractTableName(sql);
          return (tables.get(tableName) || []) as T;
        }
        
        return [] as T;
      },
    };
  },
  
  // SQLite adapter (for development)
  sqlite: (config?: { database?: string; debug?: boolean }): Sql => {
    // In a real implementation, this would use sqlite3 or better-sqlite3
    console.log('SQLite adapter not implemented, falling back to in-memory');
    return adapters.inMemorySql(config);
  },
  
  // PostgreSQL adapter (for production)
  postgres: (config?: { 
    host?: string; 
    port?: number; 
    database?: string; 
    user?: string; 
    password?: string;
    ssl?: boolean;
  }): Sql => {
    // In a real implementation, this would use pg or postgres.js
    console.log('PostgreSQL adapter not implemented, falling back to in-memory');
    return adapters.inMemorySql(config);
  },
  
  // ===== EVENT BUS ADAPTERS =====
  
  // In-memory event bus
  inMemoryBus: (config?: { debug?: boolean; captureEvents?: boolean }): EventBus => {
    const subscribers = new Map<string, Array<(event: any) => Promise<void>>>();
    const capturedEvents: any[] = [];
    
    return {
      async publish(event: any): Promise<void> {
        if (config?.debug) {
          console.log('Publishing event:', event);
        }
        
        if (config?.captureEvents) {
          capturedEvents.push({ ...event, publishedAt: new Date() });
        }
        
        const handlers = subscribers.get(event.kind) || [];
        await Promise.all(handlers.map(h => h(event)));
      },
      
      subscribe(topic: string, handler: (event: any) => Promise<void>) {
        if (!subscribers.has(topic)) {
          subscribers.set(topic, []);
        }
        subscribers.get(topic)!.push(handler);
        
        return () => {
          const handlers = subscribers.get(topic) || [];
          const index = handlers.indexOf(handler);
          if (index >= 0) {
            handlers.splice(index, 1);
          }
        };
      },
    };
  },
  
  // Kafka adapter (for production)
  kafka: (config?: {
    brokers?: string[];
    clientId?: string;
    groupId?: string;
    debug?: boolean;
  }): EventBus => {
    // In a real implementation, this would use kafkajs
    console.log('Kafka adapter not implemented, falling back to in-memory');
    return adapters.inMemoryBus({ debug: config?.debug });
  },
  
  // NATS adapter (for microservices)
  nats: (config?: {
    servers?: string[];
    user?: string;
    pass?: string;
    debug?: boolean;
  }): EventBus => {
    // In a real implementation, this would use nats.js
    console.log('NATS adapter not implemented, falling back to in-memory');
    return adapters.inMemoryBus({ debug: config?.debug });
  },
  
  // ===== BLOB STORE ADAPTERS =====
  
  // In-memory blob store
  inMemoryBlob: (config?: { debug?: boolean }): BlobStore => {
    const store = new Map<string, Uint8Array>();
    
    return {
      async get(key: string): Promise<Uint8Array> {
        if (config?.debug) {
          console.log('Blob GET:', key);
        }
        return store.get(key) || new Uint8Array(0);
      },
      
      async put(key: string, data: Uint8Array): Promise<void> {
        if (config?.debug) {
          console.log('Blob PUT:', key, `${data.length} bytes`);
        }
        store.set(key, data);
      },
    };
  },
  
  // File system blob store
  fsBlob: (config?: { basePath?: string; debug?: boolean }): BlobStore => {
    // In a real implementation, this would use fs/promises
    console.log('File system blob store not implemented, falling back to in-memory');
    return adapters.inMemoryBlob(config);
  },
  
  // S3 blob store
  s3Blob: (config?: {
    bucket?: string;
    region?: string;
    accessKeyId?: string;
    secretAccessKey?: string;
    debug?: boolean;
  }): BlobStore => {
    // In a real implementation, this would use @aws-sdk/client-s3
    console.log('S3 blob store not implemented, falling back to in-memory');
    return adapters.inMemoryBlob({ debug: config?.debug });
  },
  
  // ===== KEY-VALUE ADAPTERS =====
  
  // In-memory KV store
  inMemoryKV: (config?: { debug?: boolean }): KV => {
    const store = new Map<string, { value: string; expires?: number }>();
    
    return {
      async get(key: string): Promise<string | null> {
        if (config?.debug) {
          console.log('KV GET:', key);
        }
        
        const item = store.get(key);
        if (!item) return null;
        
        if (item.expires && Date.now() > item.expires) {
          store.delete(key);
          return null;
        }
        
        return item.value;
      },
      
      async set(key: string, value: string, ttl?: number): Promise<void> {
        if (config?.debug) {
          console.log('KV SET:', key, value, ttl ? `TTL: ${ttl}s` : 'no TTL');
        }
        
        const expires = ttl ? Date.now() + (ttl * 1000) : undefined;
        store.set(key, { value, expires });
      },
    };
  },
  
  // Redis adapter
  redis: (config?: {
    host?: string;
    port?: number;
    password?: string;
    db?: number;
    debug?: boolean;
  }): KV => {
    // In a real implementation, this would use ioredis or redis
    console.log('Redis adapter not implemented, falling back to in-memory');
    return adapters.inMemoryKV({ debug: config?.debug });
  },
  
  // ===== SEARCH ADAPTERS =====
  
  // In-memory search
  inMemorySearch: (config?: { debug?: boolean }): Search => {
    const documents = new Map<string, any>();
    const index = new Map<string, Set<string>>();
    
    return {
      async query(q: string): Promise<Array<{ id: string; score: number }>> {
        if (config?.debug) {
          console.log('Search query:', q);
        }
        
        const terms = q.toLowerCase().split(/\s+/);
        const results = new Map<string, number>();
        
        for (const term of terms) {
          const docIds = index.get(term) || new Set();
          for (const docId of docIds) {
            results.set(docId, (results.get(docId) || 0) + 1);
          }
        }
        
        return Array.from(results.entries())
          .map(([id, score]) => ({ id, score }))
          .sort((a, b) => b.score - a.score);
      },
    };
  },
  
  // Elasticsearch adapter
  elasticsearch: (config?: {
    node?: string;
    index?: string;
    auth?: { username: string; password: string };
    debug?: boolean;
  }): Search => {
    // In a real implementation, this would use @elastic/elasticsearch
    console.log('Elasticsearch adapter not implemented, falling back to in-memory');
    return adapters.inMemorySearch({ debug: config?.debug });
  },
  
  // ===== WEBSOCKET ADAPTERS =====
  
  // In-memory WebSocket (for testing)
  inMemoryWs: (config?: { debug?: boolean }): Ws => {
    const channels = new Map<string, Set<any>>();
    
    return {
      async send(msg: any): Promise<void> {
        if (config?.debug) {
          console.log('WS send:', msg);
        }
        
        const subscribers = channels.get(msg.topic) || new Set();
        // In a real implementation, would send to actual WebSocket connections
      },
    };
  },
  
  // Redis Pub/Sub WebSocket adapter
  redisPubSubWs: (config?: {
    redis?: { host: string; port: number };
    websocket?: { port: number };
    debug?: boolean;
  }): Ws => {
    // In a real implementation, this would combine Redis pub/sub with WebSocket server
    console.log('Redis Pub/Sub WebSocket adapter not implemented, falling back to in-memory');
    return adapters.inMemoryWs({ debug: config?.debug });
  },
  
  // ===== UTILITY ADAPTERS =====
  
  // Mock HTTP client
  mockHttp: (config?: { debug?: boolean; responses?: Record<string, any> }): Http => ({
    async request(req: any) {
      if (config?.debug) {
        console.log('HTTP request:', req);
      }
      
      const response = config?.responses?.[req.url] || { 
        status: 200, 
        headers: {}, 
        body: 'mock response' 
      };
      
      return response;
    },
  }),
  
  // Real HTTP client
  realHttp: (config?: { timeout?: number; debug?: boolean }): Http => {
    // In a real implementation, this would use fetch or axios
    console.log('Real HTTP client not implemented, falling back to mock');
    return adapters.mockHttp(config);
  },
  
  // System clock
  systemClock: (config?: { timezone?: string }): Clock => ({
    now: () => new Date(),
  }),
  
  // Mock clock (for testing)
  mockClock: (config?: { fixedTime?: Date }): Clock => {
    let currentTime = config?.fixedTime || new Date();
    
    return {
      now: () => currentTime,
      // Additional methods for testing
      setTime: (time: Date) => { currentTime = time; },
      advance: (ms: number) => { currentTime = new Date(currentTime.getTime() + ms); },
    } as any;
  },
  
  // Random ID generator
  randomIdGen: (config?: { prefix?: string }): IdGen => ({
    newId: () => {
      const id = Math.random().toString(36).substring(7);
      return config?.prefix ? `${config.prefix}_${id}` : id;
    },
  }),
  
  // Sequential ID generator (for testing)
  sequentialIdGen: (config?: { prefix?: string; start?: number }): IdGen => {
    let counter = config?.start || 1;
    
    return {
      newId: () => {
        const id = counter++;
        return config?.prefix ? `${config.prefix}_${id}` : String(id);
      },
    };
  },
};

// Helper function to extract table name from SQL
function extractTableName(sql: string): string {
  const match = sql.match(/from\s+(\w+)/i) || sql.match(/into\s+(\w+)/i);
  return match ? match[1] : 'unknown';
}

// Adapter registry for environment-based configuration
export const adapterRegistry = {
  sql: {
    memory: adapters.inMemorySql,
    sqlite: adapters.sqlite,
    postgres: adapters.postgres,
  },
  bus: {
    memory: adapters.inMemoryBus,
    kafka: adapters.kafka,
    nats: adapters.nats,
  },
  blob: {
    memory: adapters.inMemoryBlob,
    fs: adapters.fsBlob,
    s3: adapters.s3Blob,
  },
  kv: {
    memory: adapters.inMemoryKV,
    redis: adapters.redis,
  },
  search: {
    memory: adapters.inMemorySearch,
    elasticsearch: adapters.elasticsearch,
  },
  ws: {
    memory: adapters.inMemoryWs,
    'redis-pubsub': adapters.redisPubSubWs,
  },
  http: {
    mock: adapters.mockHttp,
    real: adapters.realHttp,
  },
  clock: {
    system: adapters.systemClock,
    mock: adapters.mockClock,
  },
  id: {
    random: adapters.randomIdGen,
    sequential: adapters.sequentialIdGen,
  },
};

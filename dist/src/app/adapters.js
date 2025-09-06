"use strict";
// Consolidated Adapter Implementations
// All technology adapters in one place to eliminate duplication
Object.defineProperty(exports, "__esModule", { value: true });
exports.adapterRegistry = exports.adapters = void 0;
exports.adapters = {
    // ===== SQL ADAPTERS =====
    // In-memory SQL (for testing)
    inMemorySql: (config) => {
        const events = [];
        const outbox = [];
        const tables = new Map();
        return {
            async query(sql, params) {
                if (config?.debug) {
                    console.log('SQL Query:', sql, params);
                }
                if (sql === 'SELECT 1')
                    return 1;
                if (sql === 'begin' || sql === 'commit' || sql === 'rollback')
                    return undefined;
                if (sql.includes('insert into events')) {
                    events.push({ sql, params, timestamp: new Date() });
                    return undefined;
                }
                if (sql.includes('insert into outbox')) {
                    outbox.push({ sql, params, timestamp: new Date() });
                    return undefined;
                }
                if (sql.includes('CREATE TABLE') || sql.includes('DROP TABLE')) {
                    return undefined;
                }
                // Simple SELECT simulation
                if (sql.toLowerCase().includes('select')) {
                    const tableName = extractTableName(sql);
                    return (tables.get(tableName) || []);
                }
                return [];
            },
        };
    },
    // SQLite adapter (for development)
    sqlite: (config) => {
        // In a real implementation, this would use sqlite3 or better-sqlite3
        console.log('SQLite adapter not implemented, falling back to in-memory');
        return exports.adapters.inMemorySql(config);
    },
    // PostgreSQL adapter (for production)
    postgres: (config) => {
        // In a real implementation, this would use pg or postgres.js
        console.log('PostgreSQL adapter not implemented, falling back to in-memory');
        return exports.adapters.inMemorySql(config);
    },
    // ===== EVENT BUS ADAPTERS =====
    // In-memory event bus
    inMemoryBus: (config) => {
        const subscribers = new Map();
        const capturedEvents = [];
        return {
            async publish(event) {
                if (config?.debug) {
                    console.log('Publishing event:', event);
                }
                if (config?.captureEvents) {
                    capturedEvents.push({ ...event, publishedAt: new Date() });
                }
                const handlers = subscribers.get(event.kind) || [];
                await Promise.all(handlers.map(h => h(event)));
            },
            subscribe(topic, handler) {
                if (!subscribers.has(topic)) {
                    subscribers.set(topic, []);
                }
                subscribers.get(topic).push(handler);
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
    kafka: (config) => {
        // In a real implementation, this would use kafkajs
        console.log('Kafka adapter not implemented, falling back to in-memory');
        return exports.adapters.inMemoryBus({ debug: config?.debug });
    },
    // NATS adapter (for microservices)
    nats: (config) => {
        // In a real implementation, this would use nats.js
        console.log('NATS adapter not implemented, falling back to in-memory');
        return exports.adapters.inMemoryBus({ debug: config?.debug });
    },
    // ===== BLOB STORE ADAPTERS =====
    // In-memory blob store
    inMemoryBlob: (config) => {
        const store = new Map();
        return {
            async get(key) {
                if (config?.debug) {
                    console.log('Blob GET:', key);
                }
                return store.get(key) || new Uint8Array(0);
            },
            async put(key, data) {
                if (config?.debug) {
                    console.log('Blob PUT:', key, `${data.length} bytes`);
                }
                store.set(key, data);
            },
        };
    },
    // File system blob store
    fsBlob: (config) => {
        // In a real implementation, this would use fs/promises
        console.log('File system blob store not implemented, falling back to in-memory');
        return exports.adapters.inMemoryBlob(config);
    },
    // S3 blob store
    s3Blob: (config) => {
        // In a real implementation, this would use @aws-sdk/client-s3
        console.log('S3 blob store not implemented, falling back to in-memory');
        return exports.adapters.inMemoryBlob({ debug: config?.debug });
    },
    // ===== KEY-VALUE ADAPTERS =====
    // In-memory KV store
    inMemoryKV: (config) => {
        const store = new Map();
        return {
            async get(key) {
                if (config?.debug) {
                    console.log('KV GET:', key);
                }
                const item = store.get(key);
                if (!item)
                    return null;
                if (item.expires && Date.now() > item.expires) {
                    store.delete(key);
                    return null;
                }
                return item.value;
            },
            async set(key, value, ttl) {
                if (config?.debug) {
                    console.log('KV SET:', key, value, ttl ? `TTL: ${ttl}s` : 'no TTL');
                }
                const expires = ttl ? Date.now() + (ttl * 1000) : undefined;
                store.set(key, { value, expires });
            },
        };
    },
    // Redis adapter
    redis: (config) => {
        // In a real implementation, this would use ioredis or redis
        console.log('Redis adapter not implemented, falling back to in-memory');
        return exports.adapters.inMemoryKV({ debug: config?.debug });
    },
    // ===== SEARCH ADAPTERS =====
    // In-memory search
    inMemorySearch: (config) => {
        const documents = new Map();
        const index = new Map();
        return {
            async query(q) {
                if (config?.debug) {
                    console.log('Search query:', q);
                }
                const terms = q.toLowerCase().split(/\s+/);
                const results = new Map();
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
    elasticsearch: (config) => {
        // In a real implementation, this would use @elastic/elasticsearch
        console.log('Elasticsearch adapter not implemented, falling back to in-memory');
        return exports.adapters.inMemorySearch({ debug: config?.debug });
    },
    // ===== WEBSOCKET ADAPTERS =====
    // In-memory WebSocket (for testing)
    inMemoryWs: (config) => {
        const channels = new Map();
        return {
            async send(msg) {
                if (config?.debug) {
                    console.log('WS send:', msg);
                }
                const subscribers = channels.get(msg.topic) || new Set();
                // In a real implementation, would send to actual WebSocket connections
            },
        };
    },
    // Redis Pub/Sub WebSocket adapter
    redisPubSubWs: (config) => {
        // In a real implementation, this would combine Redis pub/sub with WebSocket server
        console.log('Redis Pub/Sub WebSocket adapter not implemented, falling back to in-memory');
        return exports.adapters.inMemoryWs({ debug: config?.debug });
    },
    // ===== UTILITY ADAPTERS =====
    // Mock HTTP client
    mockHttp: (config) => ({
        async request(req) {
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
    realHttp: (config) => {
        // In a real implementation, this would use fetch or axios
        console.log('Real HTTP client not implemented, falling back to mock');
        return exports.adapters.mockHttp(config);
    },
    // System clock
    systemClock: (config) => ({
        now: () => new Date(),
    }),
    // Mock clock (for testing)
    mockClock: (config) => {
        let currentTime = config?.fixedTime || new Date();
        return {
            now: () => currentTime,
            // Additional methods for testing
            setTime: (time) => { currentTime = time; },
            advance: (ms) => { currentTime = new Date(currentTime.getTime() + ms); },
        };
    },
    // Random ID generator
    randomIdGen: (config) => ({
        newId: () => {
            const id = Math.random().toString(36).substring(7);
            return config?.prefix ? `${config.prefix}_${id}` : id;
        },
    }),
    // Sequential ID generator (for testing)
    sequentialIdGen: (config) => {
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
function extractTableName(sql) {
    const match = sql.match(/from\s+(\w+)/i) || sql.match(/into\s+(\w+)/i);
    return match ? match[1] : 'unknown';
}
// Adapter registry for environment-based configuration
exports.adapterRegistry = {
    sql: {
        memory: exports.adapters.inMemorySql,
        sqlite: exports.adapters.sqlite,
        postgres: exports.adapters.postgres,
    },
    bus: {
        memory: exports.adapters.inMemoryBus,
        kafka: exports.adapters.kafka,
        nats: exports.adapters.nats,
    },
    blob: {
        memory: exports.adapters.inMemoryBlob,
        fs: exports.adapters.fsBlob,
        s3: exports.adapters.s3Blob,
    },
    kv: {
        memory: exports.adapters.inMemoryKV,
        redis: exports.adapters.redis,
    },
    search: {
        memory: exports.adapters.inMemorySearch,
        elasticsearch: exports.adapters.elasticsearch,
    },
    ws: {
        memory: exports.adapters.inMemoryWs,
        'redis-pubsub': exports.adapters.redisPubSubWs,
    },
    http: {
        mock: exports.adapters.mockHttp,
        real: exports.adapters.realHttp,
    },
    clock: {
        system: exports.adapters.systemClock,
        mock: exports.adapters.mockClock,
    },
    id: {
        random: exports.adapters.randomIdGen,
        sequential: exports.adapters.sequentialIdGen,
    },
};

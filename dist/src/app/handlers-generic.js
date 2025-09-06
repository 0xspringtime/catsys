"use strict";
// Generic Handler Patterns
// Reusable handler implementations that work with any domain
Object.defineProperty(exports, "__esModule", { value: true });
exports.directPublish = exports.persistAndOutbox = exports.dedupeBy = void 0;
exports.createGenericHandler = createGenericHandler;
exports.createGenericService = createGenericService;
exports.createEventSourcingHandler = createEventSourcingHandler;
exports.createCQRSHandler = createCQRSHandler;
// Idempotence wrapper (works with any event type that has an id)
const dedupeBy = (apply) => async (e) => {
    var _a;
    if (!e.id) {
        await apply(e);
        return;
    }
    // Use a simple in-memory set for demo - in production, use KV store
    (_a = globalThis).__seen ?? (_a.__seen = new Set());
    const seen = globalThis.__seen;
    if (seen.has(e.id))
        return;
    seen.add(e.id);
    await apply(e);
};
exports.dedupeBy = dedupeBy;
// Generic outbox pattern implementation
const persistAndOutbox = (sql) => async (events) => {
    await sql.query('begin');
    try {
        await sql.query('insert into events(data) values ($1)', [JSON.stringify(events)]);
        await sql.query('insert into outbox(data) values ($1)', [JSON.stringify(events)]);
        await sql.query('commit');
    }
    catch (error) {
        await sql.query('rollback');
        throw error;
    }
};
exports.persistAndOutbox = persistAndOutbox;
// Generic direct publish
const directPublish = (bus) => async (e) => bus.publish(e);
exports.directPublish = directPublish;
// Generic command handler factory
function createGenericHandler(spec, deps) {
    return {
        // Main command handler
        handle: async (s, c) => {
            // Validate command
            if (!spec.validate(c)) {
                throw new Error(`Invalid command: ${JSON.stringify(c)}`);
            }
            // Check idempotence if KV is available
            const cmdId = c.id || Math.random().toString(36).substring(7);
            if (deps.kv) {
                const seen = await deps.kv.get(`cmd:${cmdId}`);
                if (seen)
                    return s; // Already processed
            }
            // Decide what events to generate
            const events = spec.decide(s, c);
            if (events.length === 0)
                return s;
            // Persist events using outbox pattern
            await (0, exports.persistAndOutbox)(deps.sql)(events);
            // Mark command as processed
            if (deps.kv) {
                await deps.kv.set(`cmd:${cmdId}`, '1', 3600); // 1 hour TTL
            }
            // Publish events
            const publish = (0, exports.dedupeBy)((0, exports.directPublish)(deps.bus));
            for (const event of events) {
                await publish(event);
            }
            // Evolve state
            return spec.fold(spec.evolve, s, events);
        },
        // HTTP handler (Raw → Domain → Command → Events → State)
        httpHandle: async (s, raw) => {
            try {
                // Normalize raw input to domain object
                const domain = spec.normalize(raw);
                // Convert domain to command (this is domain-specific, so we need a way to do this)
                // For now, assume the domain object can be converted to a command
                const command = domain;
                // Handle the command
                const newState = await createGenericHandler(spec, deps).handle(s, command);
                return {
                    state: newState,
                    result: {
                        success: true,
                        status: 200,
                    },
                };
            }
            catch (error) {
                return {
                    state: s,
                    result: {
                        success: false,
                        error: error instanceof Error ? error.message : String(error),
                        status: 400,
                    },
                };
            }
        },
        // Query handler
        query: (s) => {
            return spec.deriveView(s);
        },
        // View-based queries
        queryView: (v) => {
            return spec.queries(v);
        },
    };
}
// Generic service factory
function createGenericService(spec, initialState, ports) {
    // 🚨 ENFORCE CATEGORY THEORY LAWS BEFORE CREATING SERVICE
    spec.verifyLaws();
    const handler = createGenericHandler(spec, ports);
    return {
        ...handler,
        // State management
        getState: async () => {
            // In a real implementation, this would load state from storage
            // For now, return initial state
            return initialState;
        },
        // Health check
        healthCheck: async () => {
            try {
                await ports.sql.query('SELECT 1');
                return {
                    status: 'healthy',
                    timestamp: new Date().toISOString()
                };
            }
            catch (error) {
                return {
                    status: 'unhealthy',
                    error: error instanceof Error ? error.message : String(error),
                    timestamp: new Date().toISOString()
                };
            }
        },
    };
}
// Specialized handler patterns that can be extended
// Event sourcing handler with replay capability
function createEventSourcingHandler(evolve, initialState, deps) {
    return {
        // Replay events to rebuild state
        replay: async () => {
            const events = await deps.sql.query('SELECT * FROM events ORDER BY timestamp');
            return events.reduce(evolve, initialState);
        },
        // Get state at specific point in time
        stateAt: async (timestamp) => {
            const events = await deps.sql.query('SELECT * FROM events WHERE timestamp <= $1 ORDER BY timestamp', [timestamp]);
            return events.reduce(evolve, initialState);
        },
    };
}
// CQRS handler with separate read/write models
function createCQRSHandler(decide, evolve, project, initialState, initialView, deps) {
    return {
        // Write side
        command: async (s, c) => {
            const events = decide(s, c);
            // Persist events
            for (const event of events) {
                await deps.sql.query('INSERT INTO events (data) VALUES ($1)', [JSON.stringify(event)]);
                await deps.bus.publish(event);
            }
            // Evolve state
            return events.reduce(evolve, s);
        },
        // Read side
        query: async (v) => {
            // In a real implementation, this would be updated by event handlers
            return v;
        },
        // Sync read model with write model
        syncReadModel: async () => {
            const events = await deps.sql.query('SELECT * FROM events ORDER BY timestamp');
            return events.reduce(project, initialView);
        },
    };
}

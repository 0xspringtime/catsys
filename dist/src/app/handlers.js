"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.makeResolver = exports.makeHttpHandle = exports.makeHandle = exports.directPublish = exports.persistAndOutbox = exports.dedupeBy = void 0;
// src/app/handlers.ts - URL Shortener handlers using consolidated spec
const spec_1 = require("../spec");
// Idempotence wrapper (per commandId or eventId)
const dedupeBy = (apply) => async (e) => {
    var _a;
    // You can back this with KV/sql to store seen ids
    if (!e.id) {
        await apply(e);
        return;
    }
    // pretend in-memory set for demo
    (_a = globalThis).__seen ?? (_a.__seen = new Set());
    const seen = globalThis.__seen;
    if (seen.has(e.id))
        return;
    seen.add(e.id);
    await apply(e);
};
exports.dedupeBy = dedupeBy;
// Outbox pattern (persist + enqueue outbox; a dispatcher will publish)
const persistAndOutbox = (sql) => async (events) => {
    await sql.query('begin');
    await sql.query('insert into events(data) values ($1)', [JSON.stringify(events)]);
    await sql.query('insert into outbox(data) values ($1)', [JSON.stringify(events)]);
    await sql.query('commit');
};
exports.persistAndOutbox = persistAndOutbox;
// Direct publish (for small/simple systems — still idempotent per e.id)
const directPublish = (bus) => async (e) => bus.publish(e);
exports.directPublish = directPublish;
// Complete Kleisli handler following the pattern: validate → decide → persist → publish → fold
const makeHandle = (deps) => async (s, c) => {
    // (pure) validate
    if (!(0, spec_1.validate)(c)) {
        throw new Error(`Invalid command: ${JSON.stringify(c)}`);
    }
    // Check idempotence
    const cmdId = c.id || Math.random().toString(36).substring(7);
    if (deps.kv) {
        const seen = await deps.kv.get(`cmd:${cmdId}`);
        if (seen)
            return s; // Already processed
    }
    // (pure) decide
    const evts = (0, spec_1.decide)(s, c);
    if (evts.length === 0)
        return s;
    // (effect) persist + outbox
    await (0, exports.persistAndOutbox)(deps.sql)(evts);
    // Mark as processed
    if (deps.kv) {
        await deps.kv.set(`cmd:${cmdId}`, '1', 3600); // 1 hour TTL
    }
    // (effect) publish each (could be via dispatcher; here direct)
    const publish = (0, exports.dedupeBy)((0, exports.directPublish)(deps.bus));
    for (const e of evts)
        await publish(e);
    // (pure) fold evolve
    return evts.reduce(spec_1.evolve, s);
};
exports.makeHandle = makeHandle;
// HTTP request handler (normalize → validate → handle)
const makeHttpHandle = (deps) => async (s, raw) => {
    // (pure) normalize
    let domain;
    try {
        domain = (0, spec_1.normalize)(raw);
    }
    catch (error) {
        return { state: s, result: { error: error instanceof Error ? error.message : String(error), status: 400 } };
    }
    // Convert domain to command
    const command = {
        kind: 'Create',
        long: domain.url,
        custom: domain.custom,
        userId: domain.userId,
        id: Math.random().toString(36).substring(7),
    };
    try {
        const newState = await (0, exports.makeHandle)(deps)(s, command);
        // Extract created short URL
        const newShorts = Object.keys(newState.byShort).filter(short => !s.byShort[short]);
        if (newShorts.length > 0) {
            return {
                state: newState,
                result: {
                    success: true,
                    short: newShorts[0],
                    url: `https://short.ly/${newShorts[0]}`,
                    status: 200,
                },
            };
        }
        return {
            state: newState,
            result: { success: false, error: 'No URL created', status: 400 }
        };
    }
    catch (error) {
        return {
            state: s,
            result: { error: error instanceof Error ? error.message : String(error), status: 500 }
        };
    }
};
exports.makeHttpHandle = makeHttpHandle;
// URL resolver (for redirects)
const makeResolver = (deps) => async (s, short) => {
    // Check if URL exists and is active
    const longUrl = s.byShort[short];
    if (!longUrl || !s.active.has(short)) {
        return { url: null, newState: s };
    }
    // Record click
    const clickCommand = {
        kind: 'Resolve',
        short,
        id: Math.random().toString(36).substring(7),
    };
    const newState = await (0, exports.makeHandle)(deps)(s, clickCommand);
    return { url: longUrl, newState };
};
exports.makeResolver = makeResolver;

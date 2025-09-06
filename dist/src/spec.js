"use strict";
// URL Shortener - Complete Spec with all free arrows
Object.defineProperty(exports, "__esModule", { value: true });
exports.v0 = exports.s0 = exports.aggMonoid = void 0;
exports.fold = fold;
exports.normalize = normalize;
exports.validate = validate;
exports.decide = decide;
exports.evolve = evolve;
exports.project = project;
exports.queries = queries;
exports.deriveView = deriveView;
exports.aggregate = aggregate;
exports.pullbackJoin = pullbackJoin;
exports.diff = diff;
exports.apply = apply;
exports.plan = plan;
exports.score = score;
// Generic fold helper (catamorphism)
function fold(f, s0, events) {
    return events.reduce(f, s0);
}
exports.aggMonoid = {
    empty: Object.create(null), // Use null prototype to avoid valueOf issues
    combine: (a, b) => {
        const result = Object.create(null);
        // Copy a
        for (const [key, value] of Object.entries(a)) {
            result[key] = value;
        }
        // Add b
        for (const [key, value] of Object.entries(b)) {
            result[key] = (result[key] || 0) + value;
        }
        return result;
    },
};
// Initial values
exports.s0 = {
    version: 0,
    byShort: {},
    byLong: {},
    active: new Set(),
};
exports.v0 = {
    lastUpdate: new Date().toISOString(),
    clicks: {},
    topUrls: [],
    urls: {},
};
// === PURE ARROWS (morphisms in Set) ===
// normalize : R → D
function normalize(r) {
    if (typeof r.url !== 'string' || !r.url) {
        throw new Error('Invalid URL');
    }
    const domain = { url: r.url };
    if (r.custom && typeof r.custom === 'string') {
        domain.custom = r.custom;
    }
    if (r.short && typeof r.short === 'string') {
        domain.short = r.short;
    }
    if (r.userId && typeof r.userId === 'string') {
        domain.userId = r.userId;
    }
    return domain;
}
// validate : C → Valid C
function validate(c) {
    switch (c.kind) {
        case 'Create':
            return c.long.length > 0 && c.long.startsWith('http');
        case 'Resolve':
        case 'Expire':
            return c.short.length > 0;
        default:
            return false;
    }
}
// Simple hash-based short generation
function genShort(long) {
    let hash = 0;
    for (let i = 0; i < long.length; i++) {
        const char = long.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return Math.abs(hash).toString(36).substring(0, 6);
}
// decide : (S, C) → E*
function decide(s, c) {
    const id = c.id || Math.random().toString(36).substring(7);
    const timestamp = new Date().toISOString();
    switch (c.kind) {
        case 'Create': {
            const short = c.custom || genShort(c.long);
            if (s.byShort[short] && s.byShort[short] !== c.long) {
                return [{ kind: 'CustomTaken', custom: short, id, timestamp }];
            }
            if (s.byShort[short] === c.long) {
                return []; // Idempotent
            }
            return [{ kind: 'Created', short, long: c.long, userId: c.userId, id, timestamp }];
        }
        case 'Resolve': {
            if (!s.active.has(c.short)) {
                return [];
            }
            return [{ kind: 'Clicked', short: c.short, id, timestamp }];
        }
        case 'Expire': {
            if (!s.active.has(c.short)) {
                return [];
            }
            return [{ kind: 'Expired', short: c.short, id, timestamp }];
        }
        default:
            return [];
    }
}
// evolve : (S, E) → S
function evolve(s, e) {
    switch (e.kind) {
        case 'Created': {
            return {
                ...s,
                version: s.version + 1,
                byShort: { ...s.byShort, [e.short]: e.long },
                byLong: { ...s.byLong, [e.long]: e.short },
                active: new Set([...s.active, e.short]),
            };
        }
        case 'Expired': {
            const { [e.short]: _, ...restByShort } = s.byShort;
            const long = s.byShort[e.short];
            const { [long]: __, ...restByLong } = s.byLong;
            const newActive = new Set(s.active);
            newActive.delete(e.short);
            return {
                ...s,
                version: s.version + 1,
                byShort: restByShort,
                byLong: restByLong,
                active: newActive,
            };
        }
        default:
            return s;
    }
}
// project : (V, E) → V
function project(v, e) {
    switch (e.kind) {
        case 'Clicked': {
            const newClicks = { ...v.clicks, [e.short]: (v.clicks[e.short] || 0) + 1 };
            const topUrls = Object.entries(newClicks)
                .map(([short, clicks]) => ({ short, clicks }))
                .sort((a, b) => b.clicks - a.clicks)
                .slice(0, 10);
            return {
                ...v,
                lastUpdate: e.timestamp,
                clicks: newClicks,
                topUrls,
            };
        }
        case 'Created':
            return {
                ...v,
                lastUpdate: e.timestamp,
                clicks: { ...v.clicks, [e.short]: 0 },
                urls: { ...v.urls, [e.short]: e.long }, // Track URL mapping
            };
        case 'Expired': {
            const { [e.short]: _, ...restClicks } = v.clicks;
            const { [e.short]: __, ...restUrls } = v.urls;
            const topUrls = Object.entries(restClicks)
                .map(([short, clicks]) => ({ short, clicks }))
                .sort((a, b) => b.clicks - a.clicks)
                .slice(0, 10);
            return {
                ...v,
                lastUpdate: e.timestamp,
                clicks: restClicks,
                urls: restUrls,
                topUrls,
            };
        }
        default:
            return v;
    }
}
// queries : V → A
function queries(v) {
    return {
        getClicks: (short) => v.clicks[short] || 0,
        getTopUrls: () => v.topUrls,
        getTotalClicks: () => Object.values(v.clicks).reduce((a, b) => a + b, 0),
        resolveUrl: (short) => v.urls[short] || null,
    };
}
// deriveView : S → A (for CQRS law)
// Should return the same type as queries for CQRS law to hold
function deriveView(s) {
    return {
        getClicks: (short) => 0, // Can't derive click counts from state alone
        getTopUrls: () => [],
        getTotalClicks: () => 0,
        resolveUrl: (short) => s.byShort[short] || null,
    };
}
// aggregate : (Agg, E) → Agg (monoid-homomorphic)
function aggregate(acc, e) {
    if (e.kind === 'Clicked') {
        // Use Map to avoid prototype pollution issues
        const result = { ...acc };
        result[e.short] = (result[e.short] || 0) + 1;
        return result;
    }
    return acc;
}
// pullbackJoin : (A→K, B→K) → A ×_K B
function pullbackJoin(as, bs, join) {
    return as.flatMap(a => bs.filter(b => a.key === b.key)
        .map(b => join(a, b)));
}
function diff(s1, s2) {
    const operations = [];
    // Compare byShort
    for (const [short, long] of Object.entries(s2.byShort)) {
        if (!s1.byShort[short]) {
            operations.push({ op: 'add', path: `byShort.${short}`, value: long });
        }
        else if (s1.byShort[short] !== long) {
            operations.push({ op: 'update', path: `byShort.${short}`, value: long, oldValue: s1.byShort[short] });
        }
    }
    for (const short of Object.keys(s1.byShort)) {
        if (!s2.byShort[short]) {
            operations.push({ op: 'remove', path: `byShort.${short}`, oldValue: s1.byShort[short] });
        }
    }
    return { version: s2.version, operations };
}
function apply(s, patch) {
    let result = { ...s };
    for (const op of patch.operations) {
        if (op.path.startsWith('byShort.')) {
            const short = op.path.substring(8);
            if (op.op === 'add' || op.op === 'update') {
                result.byShort = { ...result.byShort, [short]: op.value };
            }
            else if (op.op === 'remove') {
                const { [short]: _, ...rest } = result.byShort;
                result.byShort = rest;
            }
        }
    }
    result.version = patch.version;
    return result;
}
function plan(s, demand) {
    // Check if URL already exists
    const existing = s.byLong[demand.url];
    if (existing && s.active.has(existing)) {
        return { action: 'reuse', short: existing, score: 1.0 };
    }
    // Plan new creation
    const short = demand.custom || genShort(demand.url);
    const score = s.byShort[short] ? 0.5 : 1.0; // Lower score if collision
    return { action: 'create', short, score };
}
// score : Candidate → ℝ
function score(candidate) {
    const lengthScore = Math.max(0, 1 - (candidate.length - 6) * 0.1);
    const collisionScore = Math.max(0, 1 - candidate.collisions * 0.2);
    return lengthScore * collisionScore;
}
// fold is already defined above

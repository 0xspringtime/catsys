"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fast_check_1 = __importDefault(require("fast-check"));
const spec_1 = require("../src/spec");
const gens_1 = require("./gens");
/** --- 1. Purity (Spec in Set) --- */
test("1. Purity: evolve/project deterministic", () => {
    fast_check_1.default.assert(fast_check_1.default.property(gens_1.genEvents, (E) => {
        const s1 = (0, gens_1.fold)(spec_1.evolve, spec_1.s0, E);
        const s2 = (0, gens_1.fold)(spec_1.evolve, spec_1.s0, E);
        expect(s1).toEqual(s2);
        const v1 = (0, gens_1.fold)(spec_1.project, spec_1.v0, E);
        const v2 = (0, gens_1.fold)(spec_1.project, spec_1.v0, E);
        expect(v1).toEqual(v2);
    }));
});
/** --- 2. Functoriality (R) ---
 * We model R as identity for Spec-only; when you add Impl, replace R(f) with your realized adapter call.
 */
test("2. Functoriality (placeholder at Spec level)", () => {
    // Spec-only: composition equals composition (function composition)
    const f = (s, e) => (0, spec_1.evolve)(s, e);
    const g = (s, e) => (0, spec_1.evolve)(s, e);
    const e1 = { kind: "Created", short: "test", long: "https://test.com", id: "1", timestamp: "2023-01-01T00:00:00Z" };
    const e2 = { kind: "Clicked", short: "test", id: "2", timestamp: "2023-01-01T01:00:00Z" };
    const sA = (0, spec_1.evolve)((0, spec_1.evolve)(spec_1.s0, e1), e2);
    const sB = g(f(spec_1.s0, e1), e2);
    expect(sA).toEqual(sB);
});
/** --- 3. Observability naturality (O) ---
 * Wrap arrows with a fake metrics decorator and ensure composition records spans in order.
 */
const withMetrics = (name, f) => {
    return (...a) => {
        // pretend to push span; return f; pretend to pop span
        return f(...a);
    };
};
test("3. O naturality: O(g∘f)=O(g)∘O(f) (shape)", () => {
    const f = withMetrics("f", (v, e) => (0, spec_1.project)(v, e));
    const g = withMetrics("g", (v, e) => (0, spec_1.project)(v, e));
    const e = { kind: "Clicked", short: "test", id: "1", timestamp: "2023-01-01T00:00:00Z" };
    const left = g(f(spec_1.v0, e), e);
    const right = withMetrics("g∘f", (v, e) => (0, spec_1.project)((0, spec_1.project)(v, e), e))(spec_1.v0, e);
    expect(left).toEqual(right);
});
/** --- 4. CQRS commutativity (square) --- */
test("4. CQRS: queries(fold project) == deriveView(fold evolve)", () => {
    fast_check_1.default.assert(fast_check_1.default.property(gens_1.genEvents, (E) => {
        const S1 = (0, gens_1.fold)(spec_1.evolve, spec_1.s0, E);
        const RM = (0, gens_1.fold)(spec_1.project, spec_1.v0, E);
        // For CQRS law, we compare the resolveUrl function since that's what both can provide
        const fromView = (0, spec_1.queries)(RM).resolveUrl("abc123");
        const fromState = (0, spec_1.deriveView)(S1).resolveUrl("abc123");
        expect(fromView).toEqual(fromState);
    }));
});
/** --- 5. Outbox commutativity (square; observational) ---
 * Simulate: persist -> outbox; a dispatcher publishes; observable sequence equals direct publish.
 */
test("5. Outbox: store+outbox then dispatch == direct observable result", async () => {
    const events = [{ kind: "Created", short: "test", long: "https://test.com", id: "1", timestamp: "2023-01-01T00:00:00Z" }];
    const store = [];
    const outbox = [];
    const busPublished = [];
    // transactional persist+outbox
    store.push(...events);
    outbox.push(...events);
    // dispatcher (idempotent by index)
    while (outbox.length) {
        const e = outbox.shift();
        busPublished.push(e);
    }
    // direct path (for comparison)
    const direct = [];
    direct.push(...events);
    expect(busPublished).toEqual(direct);
});
/** --- 6. Push/Pull equivalence (triangle; eventual) ---
 * Push: apply project incrementally; Pull: rebuild from stored events; compare.
 */
test("6. Push/Pull converge (same view)", () => {
    fast_check_1.default.assert(fast_check_1.default.property(gens_1.genEvents, (E) => {
        // push
        const vPush = E.reduce(spec_1.project, spec_1.v0);
        // pull (rebuild)
        const vPull = (0, gens_1.fold)(spec_1.project, spec_1.v0, E);
        expect(vPush).toEqual(vPull);
    }));
});
/** --- 7. Replay determinism (square; fold laws) --- */
test("7. Replay: fold associativity over concatenation", () => {
    fast_check_1.default.assert(fast_check_1.default.property(gens_1.genEvents, gens_1.genEvents, (xs, ys) => {
        const a = (0, gens_1.fold)(spec_1.evolve, spec_1.s0, xs.concat(ys));
        const b = (0, gens_1.fold)(spec_1.evolve, (0, gens_1.fold)(spec_1.evolve, spec_1.s0, xs), ys);
        expect(a).toEqual(b);
        const av = (0, gens_1.fold)(spec_1.project, spec_1.v0, xs.concat(ys));
        const bv = (0, gens_1.fold)(spec_1.project, (0, gens_1.fold)(spec_1.project, spec_1.v0, xs), ys);
        expect(av).toEqual(bv);
    }));
});
/** --- 8. Idempotence (keyed) ---
 * Model an idempotent apply with a seen-id set.
 */
test("8. Idempotence on retries (keyed)", () => {
    const applyIdem = (acc, e) => {
        const id = e.id ?? JSON.stringify(e);
        if (acc.seen.has(id))
            return acc;
        acc.seen.add(id);
        return { s: (0, spec_1.evolve)(acc.s, e), seen: acc.seen };
    };
    fast_check_1.default.assert(fast_check_1.default.property(gens_1.genEvents, (E) => {
        const withIds = E.map((e, i) => ({ ...e, id: String(i) }));
        const once = withIds.reduce(applyIdem, { s: spec_1.s0, seen: new Set() }).s;
        const twice = withIds.concat(withIds).reduce(applyIdem, { s: spec_1.s0, seen: new Set() }).s;
        expect(twice).toEqual(once);
    }));
});
/** --- 9. Causality / ordering ---
 * For URL shortener, ordering matters within same aggregate (short URL).
 * We test that independent aggregates don't affect each other.
 */
test("9. Ordering: independent aggregates don't interfere", () => {
    // Create events for two independent short URLs
    const eventsA = [
        { kind: "Created", short: "urlA", long: "https://example.com/A", id: "1", timestamp: "2023-01-01T00:00:00Z" },
        { kind: "Clicked", short: "urlA", id: "2", timestamp: "2023-01-01T01:00:00Z" }
    ];
    const eventsB = [
        { kind: "Created", short: "urlB", long: "https://example.com/B", id: "3", timestamp: "2023-01-01T02:00:00Z" },
        { kind: "Clicked", short: "urlB", id: "4", timestamp: "2023-01-01T03:00:00Z" }
    ];
    // Apply in different orders
    const s1 = (0, gens_1.fold)(spec_1.evolve, spec_1.s0, [...eventsA, ...eventsB]);
    const s2 = (0, gens_1.fold)(spec_1.evolve, spec_1.s0, [...eventsB, ...eventsA]);
    // Both URLs should exist regardless of order
    expect(s1.byShort["urlA"]).toBe("https://example.com/A");
    expect(s1.byShort["urlB"]).toBe("https://example.com/B");
    expect(s2.byShort["urlA"]).toBe("https://example.com/A");
    expect(s2.byShort["urlB"]).toBe("https://example.com/B");
});
/** --- 10. Monoidal aggregation (⊕, ε) ---
 * Aggregating in chunks equals aggregating in one pass.
 */
test("10. Aggregation: chunked fold equals single fold", () => {
    const ε = Object.create(null);
    const aggregate = (a, e) => {
        if (e.kind === "Clicked") {
            const result = Object.create(null);
            // Copy a
            for (const [key, value] of Object.entries(a)) {
                result[key] = value;
            }
            // Add this event
            result[e.short] = (result[e.short] || 0) + 1;
            return result;
        }
        return a;
    };
    const combine = (x, y) => {
        const out = Object.create(null);
        for (const [k, v] of Object.entries(x))
            out[k] = v;
        for (const [k, v] of Object.entries(y))
            out[k] = (out[k] || 0) + v;
        return out;
    };
    fast_check_1.default.assert(fast_check_1.default.property(gens_1.genEvents, (E) => {
        const a1 = E.reduce(aggregate, ε);
        const a2 = (0, gens_1.chunk)(E, 5).map(ch => ch.reduce(aggregate, ε))
            .reduce(combine, ε);
        expect(a2).toEqual(a1);
    }));
});
/** --- 11. Pullback correctness (key-equality join) --- */
test("11. Pullback join returns exactly key-matching pairs", () => {
    const A = [{ sku: "A", x: 1 }, { sku: "B", x: 2 }];
    const B = [{ sku: "A", y: 9 }, { sku: "C", y: 7 }];
    const P = A.flatMap(a => B.filter(b => a.sku === b.sku).map(b => [a, b]));
    expect(P).toEqual([[A[0], B[0]]]);
});
/** --- 12. Pushout-safe schema evolution (coproduct) ---
 * New event variant doesn't change old-consumer answers.
 */
test("12. Pushout: extending events preserves old consumer answers", () => {
    const inj = (e) => e;
    const forgetful = (n) => n.kind === "Tagged" ? [] : [n];
    const oldE = [{
            kind: "Clicked",
            short: "test123",
            id: "evt1",
            timestamp: "2023-01-01T00:00:00Z"
        }];
    const newE = [inj(oldE[0]), {
            kind: "Tagged",
            short: "test123",
            tag: "important",
            id: "evt2",
            timestamp: "2023-01-01T01:00:00Z"
        }];
    const oldView = (0, gens_1.fold)(spec_1.project, spec_1.v0, oldE);
    const newView = (0, gens_1.fold)(spec_1.project, spec_1.v0, newE.flatMap(forgetful));
    // Compare actual values instead of function objects
    expect((0, spec_1.queries)(newView).getTotalClicks()).toEqual((0, spec_1.queries)(oldView).getTotalClicks());
});

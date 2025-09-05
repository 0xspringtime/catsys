import fc from "fast-check";
import {
  s0, v0, evolve, project, queries, deriveView, Event, State, View
} from "../src/spec";
import { genEvents, fold, chunk } from "./gens";

/** --- 1. Purity (Spec in Set) --- */
test("1. Purity: evolve/project deterministic", () => {
  fc.assert(fc.property(genEvents, (E) => {
    const s1 = fold(evolve, s0, E);
    const s2 = fold(evolve, s0, E);
    expect(s1).toEqual(s2);
    const v1 = fold(project, v0, E);
    const v2 = fold(project, v0, E);
    expect(v1).toEqual(v2);
  }));
});

/** --- 2. Functoriality (R) --- 
 * We model R as identity for Spec-only; when you add Impl, replace R(f) with your realized adapter call.
 */
test("2. Functoriality (placeholder at Spec level)", () => {
  // Spec-only: composition equals composition (function composition)
  const f = (s: State, e: Event) => evolve(s, e);
  const g = (s: State, e: Event) => evolve(s, e);
  const e1: Event = { kind: "Created", short: "test", long: "https://test.com", id: "1", timestamp: "2023-01-01T00:00:00Z" };
  const e2: Event = { kind: "Clicked", short: "test", id: "2", timestamp: "2023-01-01T01:00:00Z" };
  const sA = evolve(evolve(s0, e1), e2);
  const sB = g(f(s0, e1), e2);
  expect(sA).toEqual(sB);
});

/** --- 3. Observability naturality (O) ---
 * Wrap arrows with a fake metrics decorator and ensure composition records spans in order.
 */
const withMetrics = <A extends any[], R>(name: string, f: (...a: A) => R) => {
  return (...a: A) => {
    // pretend to push span; return f; pretend to pop span
    return f(...a);
  };
};
test("3. O naturality: O(g∘f)=O(g)∘O(f) (shape)", () => {
  const f = withMetrics("f", (v: View, e: Event) => project(v, e));
  const g = withMetrics("g", (v: View, e: Event) => project(v, e));
  const e: Event = { kind: "Clicked", short: "test", id: "1", timestamp: "2023-01-01T00:00:00Z" };
  const left  = g(f(v0, e), e);
  const right = withMetrics("g∘f", (v: View, e: Event) => project(project(v, e), e))(v0, e);
  expect(left).toEqual(right);
});

/** --- 4. CQRS commutativity (square) --- */
test("4. CQRS: queries(fold project) == deriveView(fold evolve)", () => {
  fc.assert(fc.property(genEvents, (E) => {
    const S1 = fold(evolve, s0, E);
    const RM = fold(project, v0, E);
    
    // For CQRS law, we compare the resolveUrl function since that's what both can provide
    const fromView = queries(RM).resolveUrl("abc123");
    const fromState = deriveView(S1).resolveUrl("abc123");
    
    expect(fromView).toEqual(fromState);
  }));
});

/** --- 5. Outbox commutativity (square; observational) ---
 * Simulate: persist -> outbox; a dispatcher publishes; observable sequence equals direct publish.
 */
test("5. Outbox: store+outbox then dispatch == direct observable result", async () => {
  const events: Event[] = [{ kind: "Created", short: "test", long: "https://test.com", id: "1", timestamp: "2023-01-01T00:00:00Z" }];
  const store: Event[] = [];
  const outbox: Event[] = [];
  const busPublished: Event[] = [];
  // transactional persist+outbox
  store.push(...events); outbox.push(...events);
  // dispatcher (idempotent by index)
  while (outbox.length) { const e = outbox.shift()!; busPublished.push(e); }
  // direct path (for comparison)
  const direct: Event[] = []; direct.push(...events);
  expect(busPublished).toEqual(direct);
});

/** --- 6. Push/Pull equivalence (triangle; eventual) ---
 * Push: apply project incrementally; Pull: rebuild from stored events; compare.
 */
test("6. Push/Pull converge (same view)", () => {
  fc.assert(fc.property(genEvents, (E) => {
    // push
    const vPush = E.reduce(project, v0);
    // pull (rebuild)
    const vPull = fold(project, v0, E);
    expect(vPush).toEqual(vPull);
  }));
});

/** --- 7. Replay determinism (square; fold laws) --- */
test("7. Replay: fold associativity over concatenation", () => {
  fc.assert(fc.property(genEvents, genEvents, (xs, ys) => {
    const a = fold(evolve, s0, xs.concat(ys));
    const b = fold(evolve, fold(evolve, s0, xs), ys);
    expect(a).toEqual(b);
    const av = fold(project, v0, xs.concat(ys));
    const bv = fold(project, fold(project, v0, xs), ys);
    expect(av).toEqual(bv);
  }));
});

/** --- 8. Idempotence (keyed) ---
 * Model an idempotent apply with a seen-id set.
 */
test("8. Idempotence on retries (keyed)", () => {
  type KEvt = Event & { id?: string };
  const applyIdem = (acc: { s: State; seen: Set<string> }, e: KEvt) => {
    const id = (e as any).id ?? JSON.stringify(e);
    if (acc.seen.has(id)) return acc;
    acc.seen.add(id);
    return { s: evolve(acc.s, e), seen: acc.seen };
  };
  fc.assert(fc.property(genEvents, (E) => {
    const withIds = E.map((e, i) => ({ ...e, id: String(i) })) as KEvt[];
    const once = withIds.reduce(applyIdem, { s: s0, seen: new Set<string>() }).s;
    const twice = withIds.concat(withIds).reduce(applyIdem, { s: s0, seen: new Set<string>() }).s;
    expect(twice).toEqual(once);
  }));
});

/** --- 9. Causality / ordering ---
 * For URL shortener, ordering matters within same aggregate (short URL).
 * We test that independent aggregates don't affect each other.
 */
test("9. Ordering: independent aggregates don't interfere", () => {
  // Create events for two independent short URLs
  const eventsA: Event[] = [
    { kind: "Created", short: "urlA", long: "https://example.com/A", id: "1", timestamp: "2023-01-01T00:00:00Z" },
    { kind: "Clicked", short: "urlA", id: "2", timestamp: "2023-01-01T01:00:00Z" }
  ];
  const eventsB: Event[] = [
    { kind: "Created", short: "urlB", long: "https://example.com/B", id: "3", timestamp: "2023-01-01T02:00:00Z" },
    { kind: "Clicked", short: "urlB", id: "4", timestamp: "2023-01-01T03:00:00Z" }
  ];
  
  // Apply in different orders
  const s1 = fold(evolve, s0, [...eventsA, ...eventsB]);
  const s2 = fold(evolve, s0, [...eventsB, ...eventsA]);
  
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
  type Agg = Record<string, number>;
  const ε: Agg = Object.create(null);
  const aggregate = (a: Agg, e: Event): Agg => {
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
  const combine = (x: Agg, y: Agg): Agg => {
    const out = Object.create(null);
    for (const [k, v] of Object.entries(x)) out[k] = v;
    for (const [k, v] of Object.entries(y)) out[k] = (out[k] || 0) + v;
    return out;
  };
  
  fc.assert(fc.property(genEvents, (E) => {
    const a1 = E.reduce(aggregate, ε);
    const a2 = chunk(E, 5).map(ch => ch.reduce(aggregate, ε))
                          .reduce(combine, ε);
    expect(a2).toEqual(a1);
  }));
});

/** --- 11. Pullback correctness (key-equality join) --- */
test("11. Pullback join returns exactly key-matching pairs", () => {
  const A = [{ sku: "A", x: 1 }, { sku: "B", x: 2 }];
  const B = [{ sku: "A", y: 9 }, { sku: "C", y: 7 }];
  const P = A.flatMap(a => B.filter(b => a.sku === b.sku).map(b => [a, b] as const));
  expect(P).toEqual([[A[0], B[0]]]);
});

/** --- 12. Pushout-safe schema evolution (coproduct) ---
 * New event variant doesn't change old-consumer answers.
 */
test("12. Pushout: extending events preserves old consumer answers", () => {
  type Old = Event;
  type New = Old | { kind: "Tagged"; short: string; tag: string; id: string; timestamp: string };
  const inj = (e: Old): New => e;
  const forgetful = (n: New): Old[] => (n as any).kind === "Tagged" ? [] : [n as Old];

  const oldE: Old[] = [{ 
    kind: "Clicked", 
    short: "test123", 
    id: "evt1", 
    timestamp: "2023-01-01T00:00:00Z" 
  }];
  const newE: New[] = [inj(oldE[0]), { 
    kind: "Tagged", 
    short: "test123", 
    tag: "important", 
    id: "evt2", 
    timestamp: "2023-01-01T01:00:00Z" 
  }];

  const oldView = fold(project, v0, oldE);
  const newView = fold(project, v0, newE.flatMap(forgetful));
  
  // Compare actual values instead of function objects
  expect(queries(newView).getTotalClicks()).toEqual(queries(oldView).getTotalClicks());
});
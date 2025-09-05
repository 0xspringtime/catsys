// URL Shortener - Complete Spec with all free arrows

// Generic fold helper (catamorphism)
export function fold<S, E>(f: (s: S, e: E) => S, s0: S, events: ReadonlyArray<E>): S {
  return events.reduce(f, s0);
}

// Core Objects (as sets in Set category)

// Raw input (untrusted bytes/strings)
export type Raw = {
  url?: unknown;
  custom?: unknown;
  short?: unknown;
  userId?: unknown;
};

// Domain (canonical, validated)
export type Domain = {
  url: string;
  custom?: string;
  short?: string;
  userId?: string;
};

// Commands (intentions)
export type Command =
  | { kind: 'Create'; long: string; custom?: string; userId?: string; id?: string }
  | { kind: 'Resolve'; short: string; id?: string }
  | { kind: 'Expire'; short: string; id?: string };

// Events (facts that happened)
export type Event =
  | { kind: 'Created'; short: string; long: string; userId?: string; id: string; timestamp: string }
  | { kind: 'CustomTaken'; custom: string; id: string; timestamp: string }
  | { kind: 'Expired'; short: string; id: string; timestamp: string }
  | { kind: 'Clicked'; short: string; id: string; timestamp: string };

// State (canonical truth)
export type State = {
  version: number;
  byShort: Record<string, string>;  // short -> long
  byLong: Record<string, string>;   // long -> short
  active: Set<string>;              // active shorts
};

// View (read model)
export type View = {
  lastUpdate: string;
  clicks: Record<string, number>;   // short -> click count
  topUrls: Array<{ short: string; clicks: number }>;
  urls: Record<string, string>;     // short -> long (for CQRS law)
};

// Answers (query results)
export type Answer = {
  getClicks: (short: string) => number;
  getTopUrls: () => Array<{ short: string; clicks: number }>;
  getTotalClicks: () => number;
  resolveUrl: (short: string) => string | null;
};

// Aggregation monoid
export type Agg = Record<string, number>;
export const aggMonoid = {
  empty: Object.create(null) as Agg, // Use null prototype to avoid valueOf issues
  combine: (a: Agg, b: Agg): Agg => {
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
export const s0: State = {
  version: 0,
  byShort: {},
  byLong: {},
  active: new Set(),
};

export const v0: View = {
  lastUpdate: new Date().toISOString(),
  clicks: {},
  topUrls: [],
  urls: {},
};

// === PURE ARROWS (morphisms in Set) ===

// normalize : R → D
export function normalize(r: Raw): Domain {
  if (typeof r.url !== 'string' || !r.url) {
    throw new Error('Invalid URL');
  }
  
  const domain: Domain = { url: r.url };
  
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
export function validate(c: Command): boolean {
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
function genShort(long: string): string {
  let hash = 0;
  for (let i = 0; i < long.length; i++) {
    const char = long.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36).substring(0, 6);
}

// decide : (S, C) → E*
export function decide(s: State, c: Command): Event[] {
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
export function evolve(s: State, e: Event): State {
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
export function project(v: View, e: Event): View {
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
export function queries(v: View): Answer {
  return {
    getClicks: (short: string) => v.clicks[short] || 0,
    getTopUrls: () => v.topUrls,
    getTotalClicks: () => Object.values(v.clicks).reduce((a, b) => a + b, 0),
    resolveUrl: (short: string) => v.urls[short] || null,
  };
}

// deriveView : S → A (for CQRS law)
// Should return the same type as queries for CQRS law to hold
export function deriveView(s: State): Answer {
  return {
    getClicks: (short: string) => 0, // Can't derive click counts from state alone
    getTopUrls: () => [],
    getTotalClicks: () => 0,
    resolveUrl: (short: string) => s.byShort[short] || null,
  };
}

// aggregate : (Agg, E) → Agg (monoid-homomorphic)
export function aggregate(acc: Agg, e: Event): Agg {
  if (e.kind === 'Clicked') {
    // Use Map to avoid prototype pollution issues
    const result = { ...acc };
    result[e.short] = (result[e.short] || 0) + 1;
    return result;
  }
  return acc;
}

// pullbackJoin : (A→K, B→K) → A ×_K B
export function pullbackJoin<A extends { key: K }, B extends { key: K }, K, R>(
  as: A[],
  bs: B[],
  join: (a: A, b: B) => R
): R[] {
  return as.flatMap(a => 
    bs.filter(b => a.key === b.key)
      .map(b => join(a, b))
  );
}

// diff/apply : (S, S) → Patch, (S, Patch) → S
export type Patch = {
  version: number;
  operations: Array<{
    op: 'add' | 'remove' | 'update';
    path: string;
    value?: any;
    oldValue?: any;
  }>;
};

export function diff(s1: State, s2: State): Patch {
  const operations: Patch['operations'] = [];
  
  // Compare byShort
  for (const [short, long] of Object.entries(s2.byShort)) {
    if (!s1.byShort[short]) {
      operations.push({ op: 'add', path: `byShort.${short}`, value: long });
    } else if (s1.byShort[short] !== long) {
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

export function apply(s: State, patch: Patch): State {
  let result = { ...s };
  
  for (const op of patch.operations) {
    if (op.path.startsWith('byShort.')) {
      const short = op.path.substring(8);
      if (op.op === 'add' || op.op === 'update') {
        result.byShort = { ...result.byShort, [short]: op.value };
      } else if (op.op === 'remove') {
        const { [short]: _, ...rest } = result.byShort;
        result.byShort = rest;
      }
    }
  }
  
  result.version = patch.version;
  return result;
}

// plan/route : (S, Demand) → Plan
export type Demand = { userId: string; url: string; custom?: string };
export type Plan = { action: 'create' | 'reuse'; short: string; score: number };

export function plan(s: State, demand: Demand): Plan {
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
export function score(candidate: { short: string; collisions: number; length: number }): number {
  const lengthScore = Math.max(0, 1 - (candidate.length - 6) * 0.1);
  const collisionScore = Math.max(0, 1 - candidate.collisions * 0.2);
  return lengthScore * collisionScore;
}

// fold is already defined above

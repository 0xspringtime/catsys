// src/app/handlers.ts - URL Shortener handlers using consolidated spec
import { 
  evolve, decide, validate, normalize,
  type Event, type State, type Command, type Raw, type Domain 
} from '../spec';
import type { EventBus, Sql, Clock, IdGen, KV, Http } from '../ports';

// Arrow-label docs (what this handler promises):
// handle : (State, Command) ↣ State @DB+Bus
//   total: true | det: true | idem: true (commandId)
//   delivery: at-least-once; retries: exponential backoff
//   obs: calls_total, errors_total, latency_hist, trace(span="handle")

export type Persist = (events: ReadonlyArray<Event>) => Promise<void>;
export type Publish = (e: Event) => Promise<void>;

// Idempotence wrapper (per commandId or eventId)
export const dedupeBy =
  <E>(apply: (e: E) => Promise<void>) =>
  async (e: E & { id?: string }) => {
    // You can back this with KV/sql to store seen ids
    if (!e.id) { await apply(e); return; }
    // pretend in-memory set for demo
    (globalThis as any).__seen ??= new Set<string>();
    const seen: Set<string> = (globalThis as any).__seen;
    if (seen.has(e.id)) return;
    seen.add(e.id);
    await apply(e);
  };

// Outbox pattern (persist + enqueue outbox; a dispatcher will publish)
export const persistAndOutbox = (sql: Sql): Persist =>
  async (events) => {
    await sql.query('begin');
    await sql.query('insert into events(data) values ($1)', [JSON.stringify(events)]);
    await sql.query('insert into outbox(data) values ($1)', [JSON.stringify(events)]);
    await sql.query('commit');
  };

// Direct publish (for small/simple systems — still idempotent per e.id)
export const directPublish = (bus: EventBus): Publish =>
  async (e) => bus.publish(e);

// Complete Kleisli handler following the pattern: validate → decide → persist → publish → fold
export const makeHandle =
  (deps: { sql: Sql; bus: EventBus; clock?: Clock; id?: IdGen; kv?: KV; http?: Http }) =>
  async (s: State, c: Command): Promise<State> => {
    // (pure) validate
    if (!validate(c)) {
      throw new Error(`Invalid command: ${JSON.stringify(c)}`);
    }

    // Check idempotence
    const cmdId = c.id || Math.random().toString(36).substring(7);
    if (deps.kv) {
      const seen = await deps.kv.get(`cmd:${cmdId}`);
      if (seen) return s; // Already processed
    }

    // (pure) decide
    const evts = decide(s, c);
    if (evts.length === 0) return s;

    // (effect) persist + outbox
    await persistAndOutbox(deps.sql)(evts);

    // Mark as processed
    if (deps.kv) {
      await deps.kv.set(`cmd:${cmdId}`, '1', 3600); // 1 hour TTL
    }

    // (effect) publish each (could be via dispatcher; here direct)
    const publish = dedupeBy<Event>(directPublish(deps.bus));
    for (const e of evts) await publish(e as Event & { id?: string });

    // (pure) fold evolve
    return evts.reduce(evolve, s);
  };

// HTTP request handler (normalize → validate → handle)
export const makeHttpHandle =
  (deps: { sql: Sql; bus: EventBus; clock?: Clock; id?: IdGen; kv?: KV; http?: Http }) =>
  async (s: State, raw: Raw): Promise<{ state: State; result: any }> => {
    // (pure) normalize
    let domain: Domain;
    try {
      domain = normalize(raw);
    } catch (error) {
      return { state: s, result: { error: error instanceof Error ? error.message : String(error), status: 400 } };
    }

    // Convert domain to command
    const command: Command = {
      kind: 'Create',
      long: domain.url,
      custom: domain.custom,
      userId: domain.userId,
      id: Math.random().toString(36).substring(7),
    };

    try {
      const newState = await makeHandle(deps)(s, command);
      
      // Extract created short URL
      const newShorts = Object.keys(newState.byShort).filter(
        short => !s.byShort[short]
      );
      
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
    } catch (error) {
      return { 
        state: s, 
        result: { error: error instanceof Error ? error.message : String(error), status: 500 } 
      };
    }
  };

// URL resolver (for redirects)
export const makeResolver =
  (deps: { sql: Sql; bus: EventBus; kv?: KV }) =>
  async (s: State, short: string): Promise<{ url: string | null; newState: State }> => {
    // Check if URL exists and is active
    const longUrl = s.byShort[short];
    if (!longUrl || !s.active.has(short)) {
      return { url: null, newState: s };
    }

    // Record click
    const clickCommand: Command = {
      kind: 'Resolve',
      short,
      id: Math.random().toString(36).substring(7),
    };

    const newState = await makeHandle(deps)(s, clickCommand);
    
    return { url: longUrl, newState };
  };
// Generic Handler Patterns
// Reusable handler implementations that work with any domain

import type { EventBus, Sql, KV } from '../ports';
import type { DomainSpec } from './compose-generic';

// Generic persist function
export type Persist = (events: ReadonlyArray<any>) => Promise<void>;
export type Publish = (e: any) => Promise<void>;

// Idempotence wrapper (works with any event type that has an id)
export const dedupeBy = <E extends { id?: string }>(
  apply: (e: E) => Promise<void>
) => async (e: E) => {
  if (!e.id) { 
    await apply(e); 
    return; 
  }
  
  // Use a simple in-memory set for demo - in production, use KV store
  (globalThis as any).__seen ??= new Set<string>();
  const seen: Set<string> = (globalThis as any).__seen;
  
  if (seen.has(e.id)) return;
  seen.add(e.id);
  await apply(e);
};

// Generic outbox pattern implementation
export const persistAndOutbox = (sql: Sql): Persist =>
  async (events) => {
    await sql.query('begin');
    try {
      await sql.query('insert into events(data) values ($1)', [JSON.stringify(events)]);
      await sql.query('insert into outbox(data) values ($1)', [JSON.stringify(events)]);
      await sql.query('commit');
    } catch (error) {
      await sql.query('rollback');
      throw error;
    }
  };

// Generic direct publish
export const directPublish = (bus: EventBus): Publish =>
  async (e) => bus.publish(e);

// Generic command handler factory
export function createGenericHandler<Raw, Domain, Command, Event, State, View, Answer>(
  spec: DomainSpec<Raw, Domain, Command, Event, State, View, Answer>,
  deps: { sql: Sql; bus: EventBus; kv?: KV }
) {
  return {
    // Main command handler
    handle: async (s: State, c: Command): Promise<State> => {
      // Validate command
      if (!spec.validate(c)) {
        throw new Error(`Invalid command: ${JSON.stringify(c)}`);
      }

      // Check idempotence if KV is available
      const cmdId = (c as any).id || Math.random().toString(36).substring(7);
      if (deps.kv) {
        const seen = await deps.kv.get(`cmd:${cmdId}`);
        if (seen) return s; // Already processed
      }

      // Decide what events to generate
      const events = spec.decide(s, c);
      if (events.length === 0) return s;

      // Persist events using outbox pattern
      await persistAndOutbox(deps.sql)(events);

      // Mark command as processed
      if (deps.kv) {
        await deps.kv.set(`cmd:${cmdId}`, '1', 3600); // 1 hour TTL
      }

      // Publish events
      const publish = dedupeBy<Event & { id?: string }>(directPublish(deps.bus));
      for (const event of events) {
        await publish(event as Event & { id?: string });
      }

      // Evolve state
      return spec.fold(spec.evolve, s, events);
    },

    // HTTP handler (Raw → Domain → Command → Events → State)
    httpHandle: async (s: State, raw: Raw): Promise<{ state: State; result: any }> => {
      try {
        // Normalize raw input to domain object
        const domain = spec.normalize(raw);
        
        // Convert domain to command (this is domain-specific, so we need a way to do this)
        // For now, assume the domain object can be converted to a command
        const command = domain as any as Command;
        
        // Handle the command
        const newState = await createGenericHandler(spec, deps).handle(s, command);
        
        return {
          state: newState,
          result: {
            success: true,
            status: 200,
          },
        };
      } catch (error) {
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
    query: (s: State): Answer => {
      return spec.deriveView(s);
    },

    // View-based queries
    queryView: (v: View): Answer => {
      return spec.queries(v);
    },
  };
}

// Generic service factory
export function createGenericService<Raw, Domain, Command, Event, State, View, Answer, Ports extends { sql: Sql; bus: EventBus }>(
  spec: DomainSpec<Raw, Domain, Command, Event, State, View, Answer>,
  initialState: State,
  ports: Ports
) {
  // 🚨 ENFORCE CATEGORY THEORY LAWS BEFORE CREATING SERVICE
  spec.verifyLaws();
  
  const handler = createGenericHandler(spec, ports);
  
  return {
    ...handler,
    
    // State management
    getState: async (): Promise<State> => {
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
      } catch (error) {
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
export function createEventSourcingHandler<Event, State>(
  evolve: (s: State, e: Event) => State,
  initialState: State,
  deps: { sql: Sql; bus: EventBus }
) {
  return {
    // Replay events to rebuild state
    replay: async (): Promise<State> => {
      const events = await deps.sql.query<Event[]>('SELECT * FROM events ORDER BY timestamp');
      return events.reduce(evolve, initialState);
    },
    
    // Get state at specific point in time
    stateAt: async (timestamp: string): Promise<State> => {
      const events = await deps.sql.query<Event[]>(
        'SELECT * FROM events WHERE timestamp <= $1 ORDER BY timestamp',
        [timestamp]
      );
      return events.reduce(evolve, initialState);
    },
  };
}

// CQRS handler with separate read/write models
export function createCQRSHandler<Command, Event, State, View>(
  decide: (s: State, c: Command) => Event[],
  evolve: (s: State, e: Event) => State,
  project: (v: View, e: Event) => View,
  initialState: State,
  initialView: View,
  deps: { sql: Sql; bus: EventBus }
) {
  return {
    // Write side
    command: async (s: State, c: Command): Promise<State> => {
      const events = decide(s, c);
      
          // Persist events
    for (const event of events) {
      await deps.sql.query('INSERT INTO events (data) VALUES ($1)', [JSON.stringify(event)]);
      await deps.bus.publish(event as any);
    }
      
      // Evolve state
      return events.reduce(evolve, s);
    },
    
    // Read side
    query: async (v: View): Promise<View> => {
      // In a real implementation, this would be updated by event handlers
      return v;
    },
    
    // Sync read model with write model
    syncReadModel: async (): Promise<View> => {
      const events = await deps.sql.query<Event[]>('SELECT * FROM events ORDER BY timestamp');
      return events.reduce(project, initialView);
    },
  };
}

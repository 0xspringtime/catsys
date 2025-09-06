import type { EventBus, Sql, KV } from '../ports';
import type { DomainSpec } from './compose-generic';
export type Persist = (events: ReadonlyArray<any>) => Promise<void>;
export type Publish = (e: any) => Promise<void>;
export declare const dedupeBy: <E extends {
    id?: string;
}>(apply: (e: E) => Promise<void>) => (e: E) => Promise<void>;
export declare const persistAndOutbox: (sql: Sql) => Persist;
export declare const directPublish: (bus: EventBus) => Publish;
export declare function createGenericHandler<Raw, Domain, Command, Event, State, View, Answer>(spec: DomainSpec<Raw, Domain, Command, Event, State, View, Answer>, deps: {
    sql: Sql;
    bus: EventBus;
    kv?: KV;
}): {
    handle: (s: State, c: Command) => Promise<State>;
    httpHandle: (s: State, raw: Raw) => Promise<{
        state: State;
        result: any;
    }>;
    query: (s: State) => Answer;
    queryView: (v: View) => Answer;
};
export declare function createGenericService<Raw, Domain, Command, Event, State, View, Answer, Ports extends {
    sql: Sql;
    bus: EventBus;
}>(spec: DomainSpec<Raw, Domain, Command, Event, State, View, Answer>, initialState: State, ports: Ports): {
    getState: () => Promise<State>;
    healthCheck: () => Promise<{
        status: string;
        timestamp: string;
        error?: undefined;
    } | {
        status: string;
        error: string;
        timestamp: string;
    }>;
    handle: (s: State, c: Command) => Promise<State>;
    httpHandle: (s: State, raw: Raw) => Promise<{
        state: State;
        result: any;
    }>;
    query: (s: State) => Answer;
    queryView: (v: View) => Answer;
};
export declare function createEventSourcingHandler<Event, State>(evolve: (s: State, e: Event) => State, initialState: State, deps: {
    sql: Sql;
    bus: EventBus;
}): {
    replay: () => Promise<State>;
    stateAt: (timestamp: string) => Promise<State>;
};
export declare function createCQRSHandler<Command, Event, State, View>(decide: (s: State, c: Command) => Event[], evolve: (s: State, e: Event) => State, project: (v: View, e: Event) => View, initialState: State, initialView: View, deps: {
    sql: Sql;
    bus: EventBus;
}): {
    command: (s: State, c: Command) => Promise<State>;
    query: (v: View) => Promise<View>;
    syncReadModel: () => Promise<View>;
};

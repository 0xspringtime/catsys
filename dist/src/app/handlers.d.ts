import { type Event, type State, type Command, type Raw } from '../spec';
import type { EventBus, Sql, Clock, IdGen, KV, Http } from '../ports';
export type Persist = (events: ReadonlyArray<Event>) => Promise<void>;
export type Publish = (e: Event) => Promise<void>;
export declare const dedupeBy: <E>(apply: (e: E) => Promise<void>) => (e: E & {
    id?: string;
}) => Promise<void>;
export declare const persistAndOutbox: (sql: Sql) => Persist;
export declare const directPublish: (bus: EventBus) => Publish;
export declare const makeHandle: (deps: {
    sql: Sql;
    bus: EventBus;
    clock?: Clock;
    id?: IdGen;
    kv?: KV;
    http?: Http;
}) => (s: State, c: Command) => Promise<State>;
export declare const makeHttpHandle: (deps: {
    sql: Sql;
    bus: EventBus;
    clock?: Clock;
    id?: IdGen;
    kv?: KV;
    http?: Http;
}) => (s: State, raw: Raw) => Promise<{
    state: State;
    result: any;
}>;
export declare const makeResolver: (deps: {
    sql: Sql;
    bus: EventBus;
    kv?: KV;
}) => (s: State, short: string) => Promise<{
    url: string | null;
    newState: State;
}>;

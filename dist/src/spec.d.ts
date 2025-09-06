export declare function fold<S, E>(f: (s: S, e: E) => S, s0: S, events: ReadonlyArray<E>): S;
export type Raw = {
    url?: unknown;
    custom?: unknown;
    short?: unknown;
    userId?: unknown;
};
export type Domain = {
    url: string;
    custom?: string;
    short?: string;
    userId?: string;
};
export type Command = {
    kind: 'Create';
    long: string;
    custom?: string;
    userId?: string;
    id?: string;
} | {
    kind: 'Resolve';
    short: string;
    id?: string;
} | {
    kind: 'Expire';
    short: string;
    id?: string;
};
export type Event = {
    kind: 'Created';
    short: string;
    long: string;
    userId?: string;
    id: string;
    timestamp: string;
} | {
    kind: 'CustomTaken';
    custom: string;
    id: string;
    timestamp: string;
} | {
    kind: 'Expired';
    short: string;
    id: string;
    timestamp: string;
} | {
    kind: 'Clicked';
    short: string;
    id: string;
    timestamp: string;
};
export type State = {
    version: number;
    byShort: Record<string, string>;
    byLong: Record<string, string>;
    active: Set<string>;
};
export type View = {
    lastUpdate: string;
    clicks: Record<string, number>;
    topUrls: Array<{
        short: string;
        clicks: number;
    }>;
    urls: Record<string, string>;
};
export type Answer = {
    getClicks: (short: string) => number;
    getTopUrls: () => Array<{
        short: string;
        clicks: number;
    }>;
    getTotalClicks: () => number;
    resolveUrl: (short: string) => string | null;
};
export type Agg = Record<string, number>;
export declare const aggMonoid: {
    empty: Agg;
    combine: (a: Agg, b: Agg) => Agg;
};
export declare const s0: State;
export declare const v0: View;
export declare function normalize(r: Raw): Domain;
export declare function validate(c: Command): boolean;
export declare function decide(s: State, c: Command): Event[];
export declare function evolve(s: State, e: Event): State;
export declare function project(v: View, e: Event): View;
export declare function queries(v: View): Answer;
export declare function deriveView(s: State): Answer;
export declare function aggregate(acc: Agg, e: Event): Agg;
export declare function pullbackJoin<A extends {
    key: K;
}, B extends {
    key: K;
}, K, R>(as: A[], bs: B[], join: (a: A, b: B) => R): R[];
export type Patch = {
    version: number;
    operations: Array<{
        op: 'add' | 'remove' | 'update';
        path: string;
        value?: any;
        oldValue?: any;
    }>;
};
export declare function diff(s1: State, s2: State): Patch;
export declare function apply(s: State, patch: Patch): State;
export type Demand = {
    userId: string;
    url: string;
    custom?: string;
};
export type Plan = {
    action: 'create' | 'reuse';
    short: string;
    score: number;
};
export declare function plan(s: State, demand: Demand): Plan;
export declare function score(candidate: {
    short: string;
    collisions: number;
    length: number;
}): number;

import type { EventBus, Sql, KV, Http, Clock, IdGen } from '../ports';
export interface UrlShortenerPorts {
    sql: Sql;
    bus: EventBus;
    kv?: KV;
    http?: Http;
    clock?: Clock;
    id?: IdGen;
}
export declare function compose(ports: UrlShortenerPorts): {
    handle: (s: import("../spec").State, c: import("../spec").Command) => Promise<import("../spec").State>;
    httpHandle: (s: import("../spec").State, raw: import("../spec").Raw) => Promise<{
        state: import("../spec").State;
        result: any;
    }>;
    resolver: (s: import("../spec").State, short: string) => Promise<{
        url: string | null;
        newState: import("../spec").State;
    }>;
    getState: () => Promise<import("../spec").State>;
    healthCheck: () => Promise<{
        status: string;
        timestamp: string;
        error?: undefined;
    } | {
        status: string;
        error: string;
        timestamp: string;
    }>;
};
export declare function composeForTesting(): ReturnType<typeof compose>;

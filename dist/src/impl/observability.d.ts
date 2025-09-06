export declare const withMetrics: <A extends any[], R>(name: string, f: (...a: A) => Promise<R>) => (...a: A) => Promise<R>;

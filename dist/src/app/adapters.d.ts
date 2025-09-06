import type { EventBus, Sql, KV, Http, BlobStore, Clock, IdGen, Search, Ws } from '../ports';
export declare const adapters: {
    inMemorySql: (config?: any) => Sql;
    sqlite: (config?: {
        database?: string;
        debug?: boolean;
    }) => Sql;
    postgres: (config?: {
        host?: string;
        port?: number;
        database?: string;
        user?: string;
        password?: string;
        ssl?: boolean;
    }) => Sql;
    inMemoryBus: (config?: {
        debug?: boolean;
        captureEvents?: boolean;
    }) => EventBus;
    kafka: (config?: {
        brokers?: string[];
        clientId?: string;
        groupId?: string;
        debug?: boolean;
    }) => EventBus;
    nats: (config?: {
        servers?: string[];
        user?: string;
        pass?: string;
        debug?: boolean;
    }) => EventBus;
    inMemoryBlob: (config?: {
        debug?: boolean;
    }) => BlobStore;
    fsBlob: (config?: {
        basePath?: string;
        debug?: boolean;
    }) => BlobStore;
    s3Blob: (config?: {
        bucket?: string;
        region?: string;
        accessKeyId?: string;
        secretAccessKey?: string;
        debug?: boolean;
    }) => BlobStore;
    inMemoryKV: (config?: {
        debug?: boolean;
    }) => KV;
    redis: (config?: {
        host?: string;
        port?: number;
        password?: string;
        db?: number;
        debug?: boolean;
    }) => KV;
    inMemorySearch: (config?: {
        debug?: boolean;
    }) => Search;
    elasticsearch: (config?: {
        node?: string;
        index?: string;
        auth?: {
            username: string;
            password: string;
        };
        debug?: boolean;
    }) => Search;
    inMemoryWs: (config?: {
        debug?: boolean;
    }) => Ws;
    redisPubSubWs: (config?: {
        redis?: {
            host: string;
            port: number;
        };
        websocket?: {
            port: number;
        };
        debug?: boolean;
    }) => Ws;
    mockHttp: (config?: {
        debug?: boolean;
        responses?: Record<string, any>;
    }) => Http;
    realHttp: (config?: {
        timeout?: number;
        debug?: boolean;
    }) => Http;
    systemClock: (config?: {
        timezone?: string;
    }) => Clock;
    mockClock: (config?: {
        fixedTime?: Date;
    }) => Clock;
    randomIdGen: (config?: {
        prefix?: string;
    }) => IdGen;
    sequentialIdGen: (config?: {
        prefix?: string;
        start?: number;
    }) => IdGen;
};
export declare const adapterRegistry: {
    sql: {
        memory: (config?: any) => Sql;
        sqlite: (config?: {
            database?: string;
            debug?: boolean;
        }) => Sql;
        postgres: (config?: {
            host?: string;
            port?: number;
            database?: string;
            user?: string;
            password?: string;
            ssl?: boolean;
        }) => Sql;
    };
    bus: {
        memory: (config?: {
            debug?: boolean;
            captureEvents?: boolean;
        }) => EventBus;
        kafka: (config?: {
            brokers?: string[];
            clientId?: string;
            groupId?: string;
            debug?: boolean;
        }) => EventBus;
        nats: (config?: {
            servers?: string[];
            user?: string;
            pass?: string;
            debug?: boolean;
        }) => EventBus;
    };
    blob: {
        memory: (config?: {
            debug?: boolean;
        }) => BlobStore;
        fs: (config?: {
            basePath?: string;
            debug?: boolean;
        }) => BlobStore;
        s3: (config?: {
            bucket?: string;
            region?: string;
            accessKeyId?: string;
            secretAccessKey?: string;
            debug?: boolean;
        }) => BlobStore;
    };
    kv: {
        memory: (config?: {
            debug?: boolean;
        }) => KV;
        redis: (config?: {
            host?: string;
            port?: number;
            password?: string;
            db?: number;
            debug?: boolean;
        }) => KV;
    };
    search: {
        memory: (config?: {
            debug?: boolean;
        }) => Search;
        elasticsearch: (config?: {
            node?: string;
            index?: string;
            auth?: {
                username: string;
                password: string;
            };
            debug?: boolean;
        }) => Search;
    };
    ws: {
        memory: (config?: {
            debug?: boolean;
        }) => Ws;
        'redis-pubsub': (config?: {
            redis?: {
                host: string;
                port: number;
            };
            websocket?: {
                port: number;
            };
            debug?: boolean;
        }) => Ws;
    };
    http: {
        mock: (config?: {
            debug?: boolean;
            responses?: Record<string, any>;
        }) => Http;
        real: (config?: {
            timeout?: number;
            debug?: boolean;
        }) => Http;
    };
    clock: {
        system: (config?: {
            timezone?: string;
        }) => Clock;
        mock: (config?: {
            fixedTime?: Date;
        }) => Clock;
    };
    id: {
        random: (config?: {
            prefix?: string;
        }) => IdGen;
        sequential: (config?: {
            prefix?: string;
            start?: number;
        }) => IdGen;
    };
};

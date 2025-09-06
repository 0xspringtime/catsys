import fc from 'fast-check';
export declare abstract class DomainSpec<Raw, Domain, Command, Event, State, View, Answer> {
    abstract normalize(raw: Raw): Domain;
    abstract validate(command: Command): boolean;
    abstract decide(state: State, command: Command): Event[];
    abstract evolve(state: State, event: Event): State;
    abstract project(view: View, event: Event): View;
    abstract queries(view: View): Answer;
    abstract deriveView(state: State): Answer;
    abstract initialState: State;
    abstract initialView: View;
    abstract generateEvents(): fc.Arbitrary<Event[]>;
    abstract generateCommands(): fc.Arbitrary<Command>;
    abstract generateRaw(): fc.Arbitrary<Raw>;
    fold<S, E>(f: (s: S, e: E) => S, s0: S, events: ReadonlyArray<E>): S;
    private _lawsVerified;
    verifyLaws(): void;
}
export interface DomainService<State, Command, Raw, Answer> {
    handle: (state: State, command: Command) => Promise<State>;
    httpHandle: (state: State, raw: Raw) => Promise<{
        state: State;
        result: any;
    }>;
    getState: () => Promise<State>;
    healthCheck: () => Promise<{
        status: string;
        timestamp: string;
        error?: string;
    }>;
    queries: (state: State) => Answer;
}
export type AdapterConfig<Ports> = {
    [K in keyof Ports]: () => Ports[K];
};
export type EnvironmentConfig = {
    environment: 'development' | 'staging' | 'production';
    adapters: {
        sql?: 'memory' | 'sqlite' | 'postgres';
        bus?: 'memory' | 'kafka' | 'nats';
        blob?: 'memory' | 'fs' | 's3' | 'gcs';
        kv?: 'memory' | 'redis' | 'dynamodb';
        search?: 'memory' | 'elasticsearch' | 'algolia';
        ws?: 'memory' | 'redis-pubsub' | 'kafka-streams';
    };
    config?: Record<string, any>;
};
export declare function createCompositionRoot<Ports, Service>(serviceFactory: (ports: Ports) => Service, adapterConfig: AdapterConfig<Ports>): Service;
export declare function createFromEnvironment<Ports, Service>(serviceFactory: (ports: Ports) => Service, envConfig: EnvironmentConfig, adapters: Record<string, Record<string, (config?: any) => any>>): Service;
export declare function createMigrationRoot<Ports, Service>(serviceFactory: (ports: Ports) => Service, currentConfig: AdapterConfig<Ports>, targetConfig: AdapterConfig<Ports>, migrationStrategy?: 'immediate' | 'gradual' | 'canary'): Service;
export declare function createMultiTenantRoot<Ports, Service>(serviceFactory: (ports: Ports) => Service, tenantConfigs: Map<string, AdapterConfig<Ports>>, defaultConfig?: AdapterConfig<Ports>): (tenantId: string) => Service;
export interface DevelopmentOptions {
    enableHotReload?: boolean;
    enableDebugLogging?: boolean;
    enableTimeTravel?: boolean;
    mockExternalServices?: boolean;
    captureEvents?: boolean;
}
export declare function createDevelopmentRoot<Ports, Service>(serviceFactory: (ports: Ports) => Service, adapters: Record<string, Record<string, (config?: any) => any>>, options?: DevelopmentOptions): Service;
export interface TestingHelpers {
    getCapturedEvents?: () => any[];
    setTime?: (time: Date) => void;
    resetState?: () => void;
    getMetrics?: () => Record<string, any>;
}
export declare function createTestingRoot<Ports, Service>(serviceFactory: (ports: Ports) => Service, adapters: Record<string, Record<string, (config?: any) => any>>, testConfig?: {
    deterministic?: boolean;
    captureEvents?: boolean;
    mockTime?: boolean;
    isolateTests?: boolean;
}): Service & TestingHelpers;

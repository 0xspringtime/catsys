export declare class TestInfrastructure {
    private transactions;
    private eventBus;
    private publishedEvents;
    private kvStore;
    private websocketClients;
    private httpCache;
    beginTransaction(txId: string): Promise<void>;
    persistEvents(txId: string, events: any[]): Promise<void>;
    enqueueOutbox(txId: string, events: any[]): Promise<void>;
    commitTransaction(txId: string): Promise<void>;
    rollbackTransaction(txId: string): Promise<void>;
    subscribeToEvents(handler: (event: any) => void): () => void;
    getPublishedEvents(): any[];
    kvGet(key: string): Promise<any | null>;
    kvSet(key: string, value: any, ttlSeconds?: number): Promise<void>;
    sendWebSocketMessage(clientId: string, message: any): Promise<void>;
    getWebSocketMessages(clientId: string): any[];
    setHttpCache(key: string, value: any): Promise<void>;
    getHttpCache(key: string): Promise<any | null>;
    reset(): void;
}
export declare function verifyOutboxLaw(infrastructure: TestInfrastructure): Promise<boolean>;
export declare function verifyPushPullLaw(infrastructure: TestInfrastructure): Promise<boolean>;
export declare function verifyIdempotenceLaw(infrastructure: TestInfrastructure): Promise<boolean>;
export declare function verifyCausalityLaw(infrastructure: TestInfrastructure): Promise<boolean>;
export declare function verifyInfrastructureLaws(): Promise<{
    law5: boolean;
    law6: boolean;
    law8: boolean;
    law9: boolean;
    allPassed: boolean;
}>;

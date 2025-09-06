import { DomainSpec } from '../src/index';
interface CounterState {
    count: number;
}
interface CounterView {
    lastCount: number;
}
interface CounterCommand {
    kind: 'Increment';
    amount: number;
}
interface CounterEvent {
    kind: 'Incremented';
    amount: number;
    timestamp: string;
}
interface CounterRaw {
    value: number;
}
interface CounterAnswer {
    getLastCount: () => number;
}
export declare class CounterSpec extends DomainSpec<CounterRaw, CounterRaw, CounterCommand, CounterEvent, CounterState, CounterView, CounterAnswer> {
    readonly initialState: CounterState;
    readonly initialView: CounterView;
    generateEvents(): any;
    generateCommands(): any;
    generateRaw(): any;
    normalize(raw: CounterRaw): CounterRaw;
    validate(command: CounterCommand): boolean;
    decide(state: CounterState, command: CounterCommand): CounterEvent[];
    evolve(state: CounterState, event: CounterEvent): CounterState;
    project(view: CounterView, event: CounterEvent): CounterView;
    queries(view: CounterView): CounterAnswer;
    deriveView(state: CounterState): CounterAnswer;
}
export declare const createCounterService: () => {
    getState: () => Promise<CounterState>;
    healthCheck: () => Promise<{
        status: string;
        timestamp: string;
        error?: undefined;
    } | {
        status: string;
        error: string;
        timestamp: string;
    }>;
    handle: (s: CounterState, c: CounterCommand) => Promise<CounterState>;
    httpHandle: (s: CounterState, raw: CounterRaw) => Promise<{
        state: CounterState;
        result: any;
    }>;
    query: (s: CounterState) => CounterAnswer;
    queryView: (v: CounterView) => CounterAnswer;
};
export {};

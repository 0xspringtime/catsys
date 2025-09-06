"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createCounterService = exports.CounterSpec = void 0;
const index_1 = require("../src/index");
class CounterSpec extends index_1.DomainSpec {
    constructor() {
        super(...arguments);
        this.initialState = { count: 0 };
        this.initialView = { lastCount: 0 };
    }
    generateEvents() {
        const fc = require('fast-check');
        return fc.array(fc.record({
            kind: fc.constant('Incremented'),
            amount: fc.integer(),
            timestamp: fc.string()
        }));
    }
    generateCommands() {
        const fc = require('fast-check');
        return fc.record({
            kind: fc.constant('Increment'),
            amount: fc.integer()
        });
    }
    generateRaw() {
        const fc = require('fast-check');
        return fc.record({
            value: fc.integer()
        });
    }
    normalize(raw) { return raw; }
    validate(command) {
        return command.kind === 'Increment';
    }
    decide(state, command) {
        if (command.kind === 'Increment') {
            return [{
                    kind: 'Incremented',
                    amount: command.amount,
                    timestamp: new Date().toISOString()
                }];
        }
        return [];
    }
    evolve(state, event) {
        if (event.kind === 'Incremented') {
            return { count: state.count + event.amount };
        }
        return state;
    }
    project(view, event) {
        if (event.kind === 'Incremented') {
            return { lastCount: view.lastCount + event.amount };
        }
        return view;
    }
    queries(view) {
        return { getLastCount: () => view.lastCount };
    }
    deriveView(state) {
        return { getLastCount: () => state.count };
    }
}
exports.CounterSpec = CounterSpec;
// Create and export service instance
const createCounterService = () => {
    const spec = new CounterSpec();
    return (0, index_1.createGenericService)(spec, spec.initialState, {
        sql: index_1.adapters.inMemorySql(),
        bus: index_1.adapters.inMemoryBus()
    });
};
exports.createCounterService = createCounterService;

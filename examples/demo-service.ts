import { DomainSpec, createGenericService, adapters } from '../src/index';

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

export class CounterSpec extends DomainSpec<
  CounterRaw,
  CounterRaw,
  CounterCommand,
  CounterEvent,
  CounterState,
  CounterView,
  CounterAnswer
> {
  readonly initialState: CounterState = { count: 0 };
  readonly initialView: CounterView = { lastCount: 0 };

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

  normalize(raw: CounterRaw): CounterRaw { return raw; }
  
  validate(command: CounterCommand): boolean { 
    return command.kind === 'Increment'; 
  }

  decide(state: CounterState, command: CounterCommand): CounterEvent[] {
    if (command.kind === 'Increment') {
      return [{
        kind: 'Incremented',
        amount: command.amount,
        timestamp: new Date().toISOString()
      }];
    }
    return [];
  }

  evolve(state: CounterState, event: CounterEvent): CounterState {
    if (event.kind === 'Incremented') {
      return { count: state.count + event.amount };
    }
    return state;
  }

  project(view: CounterView, event: CounterEvent): CounterView {
    if (event.kind === 'Incremented') {
      return { lastCount: view.lastCount + event.amount };
    }
    return view;
  }

  queries(view: CounterView): CounterAnswer {
    return { getLastCount: () => view.lastCount };
  }

  deriveView(state: CounterState): CounterAnswer {
    return { getLastCount: () => state.count };
  }
}

// Create and export service instance
export const createCounterService = () => {
  const spec = new CounterSpec();
  return createGenericService(spec, spec.initialState, {
    sql: adapters.inMemorySql(),
    bus: adapters.inMemoryBus()
  });
};

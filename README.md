# CatSys: Category-Theoretic System Design Framework

[![License: GPL-3.0](https://img.shields.io/badge/License-GPL%203.0-blue.svg)](https://www.gnu.org/licenses/gpl-3.0)
[![npm version](https://badge.fury.io/js/%40catsys%2Fcore.svg)](https://www.npmjs.com/package/@catsys/core)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0%2B-blue)](https://www.typescriptlang.org/)

CatSys is a robust framework for building scalable, modular systems using category theory principles. It provides mathematical guarantees for system correctness through 12 foundational laws.

## Key Features

- **Mathematical Foundations**: Built on category theory principles ensuring system correctness
- **Type-Safe**: Written in TypeScript with comprehensive type definitions
- **Modular Architecture**: Clean separation of domain logic from infrastructure
- **Event Sourcing & CQRS**: Built-in support with mathematical guarantees
- **Property-Based Testing**: Automated verification of category theory laws
- **Infrastructure Independence**: Swap implementations without changing business logic
- **Observability**: Built-in metrics and tracing that compose correctly

## Quick Start

```bash
npm install @catsys/core
```

```typescript
import { DomainSpec, createGenericService, adapters } from '@catsys/core';

// Define your domain
class CounterSpec extends DomainSpec {
  constructor() {
    super();
    this.initialState = { count: 0 };
  }

  decide(state, command) {
    if (command.kind === 'Increment') {
      return [{ kind: 'Incremented', amount: command.amount }];
    }
    return [];
  }

  evolve(state, event) {
    if (event.kind === 'Incremented') {
      return { count: state.count + event.amount };
    }
    return state;
  }
}

// Create service with in-memory adapters
const service = createGenericService(
  new CounterSpec(),
  { count: 0 },
  {
    sql: adapters.inMemorySql(),
    bus: adapters.inMemoryBus()
  }
);

// Use the service
await service.handle({ count: 0 }, { kind: 'Increment', amount: 5 });
```

## Core Concepts

### Category Theory Laws

CatSys enforces 12 mathematical laws that guarantee system correctness:

1. **Purity**: Domain logic is pure and deterministic
2. **Functoriality**: Implementation preserves composition
3. **Observability**: Metrics and traces compose correctly
4. **CQRS Commutativity**: Read models are consistent
5. **Outbox Pattern**: Reliable event publishing
6. **Push/Pull Equivalence**: UI state convergence
7. **Replay Determinism**: Event sourcing correctness
8. **Idempotence**: Safe command retries
9. **Causality**: Event ordering preservation
10. **Monoidal Aggregation**: Correct analytics
11. **Pullback Correctness**: Safe data joins
12. **Schema Evolution**: Safe upgrades

### Architecture

CatSys uses a ports and adapters architecture with:

- **Domain Layer**: Pure business logic (Set category)
- **Application Layer**: Infrastructure integration (Kleisli category)
- **Infrastructure Layer**: Concrete implementations
- **Composition Root**: Dependency injection point

### Type System

```typescript
type Command = { kind: string, ... }
type Event = { kind: string, ... }
type State = any
type View = any
type Raw = any

interface DomainSpec {
  decide(state: State, command: Command): Event[]
  evolve(state: State, event: Event): State
  project(view: View, event: Event): View
  // ... other methods
}
```

## Testing

CatSys includes comprehensive testing tools:

```typescript
// Property-based testing
spec.verifyLaws();

// Unit testing
test('increment', async () => {
  const result = await service.handle(
    { count: 0 },
    { kind: 'Increment', amount: 1 }
  );
  expect(result).toEqual({ count: 1 });
});
```

## Documentation

- [Complete Guide](./GUIDE.md): In-depth explanation of concepts
- [Installation Guide](./INSTALLATION.md): Detailed setup instructions
- [Contributing Guide](./CONTRIBUTING.md): How to contribute

## Examples

See the [examples directory](./examples) for:

- Video streaming service
- Document management system
- Multi-tenant architecture
- Blue/green deployments
- Event sourcing patterns

## Security

CatSys takes security seriously:

- No eval() or dynamic code execution
- No sensitive data in logs/metrics
- Secure by default adapters
- Input validation at boundaries
- Safe schema evolution

## License

GPL-3.0 - see [LICENSE](./LICENSE) for details.

## Support

- [GitHub Issues](https://github.com/catsys-org/catsys/issues)
- [Documentation](./GUIDE.md)
- [Contributing](./CONTRIBUTING.md)
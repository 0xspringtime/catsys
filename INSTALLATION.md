# CatSys Installation and Testing Guide

## Installation

```bash
npm install catsys
```

## Quick Verification

After installation, you can verify that CatSys is working correctly:

```typescript
import { 
  DomainSpec, 
  createGenericService, 
  adapters,
  FRAMEWORK_VERSION,
  LAWS_VERIFIED 
} from 'catsys';

// Check version and laws
console.log(`CatSys v${FRAMEWORK_VERSION} loaded`);
console.log(`${LAWS_VERIFIED} mathematical laws available`);

// Create a simple service
const service = createGenericService(
  mySpec,
  initialState,
  {
    sql: adapters.inMemorySql(),
    bus: adapters.inMemoryBus()
  }
);

// Health check
const health = await service.healthCheck();
console.log('Health:', health);
```

## Testing Options

### 1. Interactive Demo
Run the interactive browser demo:

```bash
git clone https://github.com/catsys-org/catsys.git
cd catsys
npm install
npm run example
```

This starts a live server with the demo application at http://localhost:3000.

### 2. Video Streaming Example
Run the complete video platform example:

```typescript
import { VideoStreamingService } from 'catsys/examples/video-streaming';

// Create service for testing (without law verification)
const service = VideoStreamingService.createForTesting();

// Run example flow
await service.handle({
  kind: 'UploadVideo',
  videoId: 'v1',
  title: 'Test Video',
  content: 'test.mp4',
  userId: 'u1'
});

const video = await service.getVideo('v1');
console.log('Video:', video);
```

### 3. Test Core Features

#### Basic Service with Law Verification
```typescript
import { DomainSpec, createGenericService } from 'catsys';

class MySpec extends DomainSpec {
  // Implement required methods...
}

const service = createGenericService(new MySpec(), initialState, {
  sql: adapters.inMemorySql(),
  bus: adapters.inMemoryBus()
});

// All 12 laws are automatically verified
```

#### Event Sourcing
```typescript
import { createEventSourcingHandler } from 'catsys';

const eventSourcing = createEventSourcingHandler(
  evolve,
  initialState,
  {
    sql: adapters.inMemorySql(),
    bus: adapters.inMemoryBus()
  }
);

// Store events
await sql.query('INSERT INTO events (data) VALUES ($1)', [event]);

// Replay state
const state = await eventSourcing.replay();

// Get state at specific time
const pastState = await eventSourcing.stateAt('2025-01-01T00:00:00Z');
```

#### CQRS Pattern
```typescript
import { createCQRSHandler } from 'catsys';

const cqrs = createCQRSHandler(
  decide,
  evolve,
  project,
  initialState,
  initialView,
  {
    sql: adapters.inMemorySql(),
    bus: adapters.inMemoryBus()
  }
);

// Write side
const state = await cqrs.command(currentState, {
  kind: 'CreateDocument',
  id: 'doc1'
});

// Read side
const view = await cqrs.syncReadModel();
```

#### Multi-tenant Setup
```typescript
import { createMultiTenantRoot } from 'catsys';

const multiTenant = createMultiTenantRoot(
  (ports) => createGenericService(spec, initialState, ports),
  new Map([
    ['tenant1', {
      sql: () => adapters.postgres({ /* config */ }),
      bus: () => adapters.kafka({ /* config */ })
    }],
    ['tenant2', {
      sql: () => adapters.sqlite({ /* config */ }),
      bus: () => adapters.nats({ /* config */ })
    }]
  ])
);

const tenant1Service = multiTenant('tenant1');
const tenant2Service = multiTenant('tenant2');
```

#### Observability
```typescript
import { withMetrics } from 'catsys';

const observedOperation = withMetrics('create_document', async (title) => {
  // Your operation here
});

// Metrics are automatically collected
await observedOperation('Test Doc');
```

### 4. Test All Features
To run a comprehensive test of all features:

```bash
# Clone and install
git clone https://github.com/catsys-org/catsys.git
cd catsys
npm install

# Run the comprehensive feature test
node test-real-features.js
```

This will test:
- Law verification
- Basic service operations
- Event sourcing
- CQRS
- Multi-tenant isolation
- Observability

## Available Adapters

CatSys comes with 21 built-in adapters:

### Storage
- `adapters.inMemorySql()`
- `adapters.postgres(config)`
- `adapters.sqlite(config)`
- `adapters.mysql(config)`

### Message Bus
- `adapters.inMemoryBus()`
- `adapters.kafka(config)`
- `adapters.nats(config)`
- `adapters.redis(config)`

### Blob Storage
- `adapters.inMemoryBlob()`
- `adapters.s3(config)`
- `adapters.gcs(config)`
- `adapters.azureBlob(config)`

### Cache
- `adapters.inMemoryCache()`
- `adapters.redis(config)`
- `adapters.memcached(config)`

### Search
- `adapters.inMemorySearch()`
- `adapters.elasticsearch(config)`
- `adapters.opensearch(config)`

### Other
- `adapters.inMemoryAuth()`
- `adapters.inMemoryIdGen()`
- `adapters.inMemoryClock()`

## Environment Setup

For production use, create an environment-specific composition root:

```typescript
const service = createFromEnvironment(createMyService, {
  environment: process.env.NODE_ENV,
  adapters: {
    sql: process.env.DB_TYPE,
    bus: process.env.BUS_TYPE,
    blob: process.env.STORAGE_TYPE
  }
});
```

This will automatically select the appropriate adapters based on your environment configuration.

## Next Steps

- Read the [Complete Guide](GUIDE.md) for detailed documentation
- Check out the [examples/](examples/) directory for more examples
- Join our [Discord community](https://discord.gg/catsys) for help
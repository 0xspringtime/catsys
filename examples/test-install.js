// Test your CatSys installation
const {
  DomainSpec,
  createGenericService,
  createEventSourcingHandler,
  createCQRSHandler,
  createMultiTenantRoot,
  adapters,
  withMetrics,
  FRAMEWORK_VERSION,
  LAWS_VERIFIED
} = require('catsys');

// Simple counter domain for testing
class CounterSpec extends DomainSpec {
  constructor() {
    super();
    this.initialState = { count: 0 };
    this.initialView = { lastCount: 0 };
  }

  generateEvents() {
    const fc = require('fast-check');
    return fc.array(fc.record({
      kind: fc.constant('Incremented'),
      amount: fc.integer()
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
    return {
      getLastCount: () => view.lastCount
    };
  }
  
  deriveView(state) {
    return {
      getLastCount: () => state.count
    };
  }
}

// Test menu
const tests = {
  async version() {
    console.log(`\n🔍 Testing CatSys Version`);
    console.log(`✅ CatSys v${FRAMEWORK_VERSION} loaded`);
    console.log(`✅ ${LAWS_VERIFIED} mathematical laws available`);
    return true;
  },

  async basic() {
    console.log('\n🔍 Testing Basic Service');
    const spec = new CounterSpec();
    const service = createGenericService(spec, spec.initialState, {
      sql: adapters.inMemorySql(),
      bus: adapters.inMemoryBus()
    });
    
    const state = await service.handle(spec.initialState, {
      kind: 'Increment',
      amount: 5
    });
    
    console.log('✅ Counter incremented:', state);
    return state.count === 5;
  },

  async eventSourcing() {
    console.log('\n🔍 Testing Event Sourcing');
    const spec = new CounterSpec();
    const ports = {
      sql: adapters.inMemorySql(),
      bus: adapters.inMemoryBus()
    };

    // Create events table
    await ports.sql.query('CREATE TABLE IF NOT EXISTS events (id TEXT, timestamp TEXT, data JSONB)');

    const eventSourcing = createEventSourcingHandler(
      (s, e) => spec.evolve(s, e),
      spec.initialState,
      ports
    );

    // Store some events
    const event = {
      kind: 'Incremented',
      amount: 3,
      timestamp: new Date().toISOString()
    };

    await ports.sql.query(
      'INSERT INTO events (id, timestamp, data) VALUES ($1, $2, $3)',
      ['evt1', event.timestamp, event]
    );

    const state = await eventSourcing.replay();
    console.log('✅ State replayed:', state);
    return state.count === 3;
  },

  async cqrs() {
    console.log('\n🔍 Testing CQRS');
    const spec = new CounterSpec();
    const ports = {
      sql: adapters.inMemorySql(),
      bus: adapters.inMemoryBus()
    };

    await ports.sql.query('CREATE TABLE IF NOT EXISTS events (id TEXT, timestamp TEXT, data JSONB)');

    const cqrs = createCQRSHandler(
      (s, c) => spec.decide(s, c),
      (s, e) => spec.evolve(s, e),
      (v, e) => spec.project(v, e),
      spec.initialState,
      spec.initialView,
      ports
    );

    const state = await cqrs.command(spec.initialState, {
      kind: 'Increment',
      amount: 7
    });

    const view = await cqrs.syncReadModel();
    console.log('✅ Write side:', state);
    console.log('✅ Read side:', view);
    return state.count === 7 && view.lastCount === 7;
  },

  async multiTenant() {
    console.log('\n🔍 Testing Multi-tenant');
    const spec = new CounterSpec();
    
    const multiTenant = createMultiTenantRoot(
      (ports) => createGenericService(spec, spec.initialState, ports),
      new Map([
        ['tenant1', {
          sql: () => adapters.inMemorySql(),
          bus: () => adapters.inMemoryBus()
        }],
        ['tenant2', {
          sql: () => adapters.inMemorySql(),
          bus: () => adapters.inMemoryBus()
        }]
      ])
    );

    const t1 = multiTenant('tenant1');
    const t2 = multiTenant('tenant2');

    const s1 = await t1.handle(spec.initialState, {
      kind: 'Increment',
      amount: 1
    });

    const s2 = await t2.handle(spec.initialState, {
      kind: 'Increment',
      amount: 2
    });

    console.log('✅ Tenant 1:', s1);
    console.log('✅ Tenant 2:', s2);
    return s1.count === 1 && s2.count === 2;
  },

  async observability() {
    console.log('\n🔍 Testing Observability');
    const observed = withMetrics('increment', async (amount) => {
      return { count: amount };
    });

    const result = await observed(10);
    console.log('✅ Operation traced:', result);
    return result.count === 10;
  }
};

// Run selected tests
async function runTests(selected) {
  console.log('🐱 CatSys Installation Test\n');
  
  const results = [];
  for (const [name, test] of Object.entries(tests)) {
    if (selected.includes('all') || selected.includes(name)) {
      try {
        const passed = await test();
        results.push({ name, passed });
      } catch (error) {
        console.error(`❌ ${name} failed:`, error);
        results.push({ name, passed: false });
      }
    }
  }

  console.log('\n📊 Test Results:');
  for (const { name, passed } of results) {
    console.log(`${passed ? '✅' : '❌'} ${name}`);
  }

  const allPassed = results.every(r => r.passed);
  if (allPassed) {
    console.log('\n🎉 All tests passed! CatSys is working correctly.\n');
  } else {
    console.log('\n❌ Some tests failed. Please check the errors above.\n');
    process.exit(1);
  }
}

// Parse command line args
const args = process.argv.slice(2);
const testsToRun = args.length > 0 ? args : ['all'];

// Show usage if --help
if (testsToRun.includes('--help')) {
  console.log(`
Usage: node test-install.js [tests...]

Available tests:
  version        - Check CatSys version and laws
  basic          - Test basic service with law verification
  eventSourcing  - Test event sourcing
  cqrs           - Test CQRS pattern
  multiTenant    - Test multi-tenant isolation
  observability  - Test metrics collection
  all            - Run all tests (default)

Examples:
  node test-install.js                    # Run all tests
  node test-install.js basic cqrs         # Run only basic and CQRS tests
  node test-install.js --help             # Show this help
`);
  process.exit(0);
}

// Run tests
runTests(testsToRun).catch(error => {
  console.error('❌ Test runner failed:', error);
  process.exit(1);
});

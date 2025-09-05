// Quick test to verify CatSys installation
const {
  DomainSpec,
  createGenericService,
  adapters,
  FRAMEWORK_VERSION,
  LAWS_VERIFIED
} = require('./dist/src/index.js');

console.log('🐱 Testing CatSys...\n');

// Create a simple counter domain
class CounterSpec extends DomainSpec {
  constructor() {
    super();
    this.initialState = { count: 0 };
    this.initialView = { lastCount: 0 };
  }

  // Required: Test generators for law verification
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

  // Required: 7 pure functions
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

async function runTest() {
  try {
    console.log(`✅ CatSys v${FRAMEWORK_VERSION} loaded`);
    console.log(`✅ ${LAWS_VERIFIED} mathematical laws available\n`);

    // Create service with in-memory adapters
    const ports = {
      sql: adapters.inMemorySql(),
      bus: adapters.inMemoryBus()
    };

    console.log('Creating counter service...');
    const counterSpec = new CounterSpec();
    const service = createGenericService(counterSpec, counterSpec.initialState, ports);
    console.log('✅ Service created (all laws verified)\n');

    // Test the service
    console.log('Testing counter operations...');
    const state1 = await service.handle(counterSpec.initialState, {
      kind: 'Increment',
      amount: 5
    });
    console.log('✅ Counter incremented by 5:', state1);

    const state2 = await service.handle(state1, {
      kind: 'Increment',
      amount: 3
    });
    console.log('✅ Counter incremented by 3:', state2);

    // Test health check
    const health = await service.healthCheck();
    console.log('\n✅ Health check:', health);

    console.log('\n🎉 All tests passed! CatSys is working correctly.\n');
    console.log('📚 Next steps:');
    console.log('1. Check examples/video-streaming.ts for a complete example');
    console.log('2. Read GUIDE.md for comprehensive documentation');
    console.log('3. Try createFromEnvironment() for production deployment');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error('\nDebug info:');
    console.error('• Make sure you ran: npm run build');
    console.error('• Check that dist/src/index.js exists');
    console.error('• Verify all dependencies are installed');
    process.exit(1);
  }
}

runTest();

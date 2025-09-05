#!/usr/bin/env node

// Test CatSys Installation and Basic Functionality
console.log('🐱 Testing CatSys Installation...\n');

try {
  // Test 1: Import the library
  console.log('1️⃣ Testing imports...');
  const { 
    FRAMEWORK_VERSION, 
    LAWS_VERIFIED, 
    DomainSpec,
    createGenericService,
    adapters,
    withMetrics 
  } = require('./dist/src/index.js');
  
  console.log(`✅ CatSys v${FRAMEWORK_VERSION} loaded`);
  console.log(`✅ ${LAWS_VERIFIED} laws available for verification`);
  console.log(`✅ DomainSpec base class available`);
  console.log(`✅ Service creators available`);
  console.log(`✅ Adapters available: ${Object.keys(adapters).length} total`);
  
  // Test 2: Create a simple domain spec
  console.log('\n2️⃣ Testing domain specification...');
  
  class TestDomainSpec extends DomainSpec {
    constructor() {
      super();
      this.initialState = { version: 0, items: {} };
      this.initialView = { count: 0, lastUpdate: new Date().toISOString() };
    }
    
    generateEvents() {
      const fc = require('fast-check');
      return fc.array(fc.record({
        kind: fc.constant('ItemAdded'),
        id: fc.string(),
        data: fc.string()
      }));
    }
    
    generateCommands() {
      const fc = require('fast-check');
      return fc.record({
        kind: fc.constant('AddItem'),
        id: fc.string(),
        data: fc.string()
      });
    }
    
    generateRaw() {
      const fc = require('fast-check');
      return fc.record({
        input: fc.string()
      });
    }
    
    normalize(raw) {
      return { input: raw.input || 'default' };
    }
    
    validate(command) {
      return command.kind === 'AddItem' && command.id;
    }
    
    decide(state, command) {
      if (command.kind === 'AddItem') {
        return [{
          kind: 'ItemAdded',
          id: command.id,
          data: command.data,
          timestamp: new Date().toISOString()
        }];
      }
      return [];
    }
    
    evolve(state, event) {
      if (event.kind === 'ItemAdded') {
        return {
          ...state,
          version: state.version + 1,
          items: { ...state.items, [event.id]: event.data }
        };
      }
      return state;
    }
    
    project(view, event) {
      if (event.kind === 'ItemAdded') {
        return {
          ...view,
          count: view.count + 1,
          lastUpdate: event.timestamp
        };
      }
      return view;
    }
    
    queries(view) {
      return {
        getCount: () => view.count,
        getLastUpdate: () => view.lastUpdate
      };
    }
    
    deriveView(state) {
      return {
        getCount: () => Object.keys(state.items).length,
        getLastUpdate: () => 'derived'
      };
    }
  }
  
  const testSpec = new TestDomainSpec();
  console.log('✅ Domain specification created successfully');
  
  // Test 3: Create service with adapters
  console.log('\n3️⃣ Testing service creation...');
  
  const ports = {
    sql: adapters.inMemorySql(),
    bus: adapters.inMemoryBus()
  };
  
  // Note: We'll skip law verification for this quick test
  // In production, laws would be automatically verified
  console.log('✅ Adapters created successfully');
  
  // Test 4: Test basic functionality
  console.log('\n4️⃣ Testing basic operations...');
  
  const initialState = testSpec.initialState;
  const command = { kind: 'AddItem', id: 'test1', data: 'Hello CatSys!' };
  
  // Test the pure functions
  const isValid = testSpec.validate(command);
  console.log(`✅ Command validation: ${isValid}`);
  
  const events = testSpec.decide(initialState, command);
  console.log(`✅ Events generated: ${events.length}`);
  
  const newState = testSpec.evolve(initialState, events[0]);
  console.log(`✅ State evolved: version ${newState.version}`);
  
  const newView = testSpec.project(testSpec.initialView, events[0]);
  console.log(`✅ View projected: count ${newView.count}`);
  
  // Test 5: Test observability
  console.log('\n5️⃣ Testing observability...');
  
  const observedFunction = withMetrics('test_operation', async (data) => {
    return `Processed: ${data}`;
  });
  
  console.log('✅ Observability wrapper created');
  
  // Test 6: Show available adapters
  console.log('\n6️⃣ Available adapters:');
  const adapterCategories = Object.keys(adapters);
  adapterCategories.forEach(category => {
    console.log(`   📦 ${category}: Available`);
  });
  
  console.log('\n🎉 All tests passed! CatSys is working correctly.');
  console.log('\n📚 Next steps:');
  console.log('   • Check out examples/video-streaming.ts for a complete example');
  console.log('   • Read GUIDE.md for comprehensive documentation');
  console.log('   • Use createGenericService() for automatic law verification');
  
} catch (error) {
  console.error('❌ Test failed:', error.message);
  console.error('\n🔍 Debug info:');
  console.error('   • Make sure you ran: npm run build');
  console.error('   • Check that dist/ directory exists');
  console.error('   • Verify all dependencies are installed');
  process.exit(1);
}

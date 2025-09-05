#!/usr/bin/env node

// Test CatSys Installation and Basic Functionality (ES Modules)
console.log('🐱 Testing CatSys Installation...\n');

try {
  // Test 1: Import the library using ES modules
  console.log('1️⃣ Testing ES module imports...');
  
  const { 
    FRAMEWORK_VERSION, 
    LAWS_VERIFIED
  } = await import('./dist/src/index.js');
  
  console.log(`✅ CatSys v${FRAMEWORK_VERSION} loaded`);
  console.log(`✅ ${LAWS_VERIFIED} laws available for verification`);
  
  // Test 2: Test adapters
  console.log('\n2️⃣ Testing adapters...');
  const { adapters } = await import('./dist/src/index.js');
  
  const sqlAdapter = adapters.inMemorySql();
  const busAdapter = adapters.inMemoryBus();
  
  console.log('✅ SQL adapter created');
  console.log('✅ Event bus adapter created');
  
  // Test 3: Test basic SQL operations
  console.log('\n3️⃣ Testing SQL operations...');
  const result = await sqlAdapter.query('SELECT 1');
  console.log(`✅ SQL query result: ${result}`);
  
  // Test 4: Test event bus
  console.log('\n4️⃣ Testing event bus...');
  await busAdapter.publish({ kind: 'TestEvent', data: 'Hello CatSys!' });
  console.log('✅ Event published successfully');
  
  // Test 5: Test observability
  console.log('\n5️⃣ Testing observability...');
  const { withMetrics } = await import('./dist/src/index.js');
  
  const observedFunction = withMetrics('test_operation', async (data) => {
    return `Processed: ${data}`;
  });
  
  const result2 = await observedFunction('test data');
  console.log(`✅ Observed function result: ${result2}`);
  
  console.log('\n🎉 All basic tests passed! CatSys is working correctly.');
  console.log('\n📚 Next steps:');
  console.log('   • Run: node examples/video-streaming.js (if compiled)');
  console.log('   • Or run: npm run example (for the demo server)');
  console.log('   • Check GUIDE.md for comprehensive documentation');
  
} catch (error) {
  console.error('❌ Test failed:', error.message);
  console.error('\n🔍 Debug info:');
  console.error('   • Error stack:', error.stack);
  process.exit(1);
}

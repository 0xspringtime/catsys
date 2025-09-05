import { DomainSpec, createGenericService, adapters } from '../src/index';
import * as fc from 'fast-check';

async function quickTest() {
  console.log('🐱 Testing CatSys imports...\n');

  // Test core imports
  console.log('✅ Core imports working');
  console.log('  - DomainSpec:', !!DomainSpec);
  console.log('  - createGenericService:', !!createGenericService);
  console.log('  - adapters:', !!adapters);

  // Test adapters
  const sql = adapters.inMemorySql();
  const bus = adapters.inMemoryBus();
  console.log('\n✅ Adapters working');
  console.log('  - SQL adapter:', !!sql);
  console.log('  - Bus adapter:', !!bus);

  // Test service creation
  // Create a minimal DomainSpec implementation
  class MinimalSpec extends DomainSpec<any, any, any, any, any, any, any> {
    readonly initialState = {};
    readonly initialView = {};
    generateEvents() { return fc.array(fc.anything()); }
    generateCommands() { return fc.anything(); }
    generateRaw() { return fc.anything(); }
    normalize(raw: any) { return raw; }
    validate(command: any) { return true; }
    decide(state: any, command: any) { return []; }
    evolve(state: any, event: any) { return state; }
    project(view: any, event: any) { return view; }
    queries(view: any) { return {}; }
    deriveView(state: any) { return {}; }
  }

  const service = createGenericService(
    new MinimalSpec(), 
    {}, 
    { sql, bus }
  );
  console.log('\n✅ Service creation working');
  console.log('  - Service instance:', !!service);

  // Test health check
  const health = await service.healthCheck();
  console.log('\n✅ Health check working');
  console.log('  - Health:', health);
}

quickTest().catch(console.error);
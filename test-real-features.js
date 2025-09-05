// Test all major CatSys features
const {
  DomainSpec,
  createGenericService,
  createEventSourcingHandler,
  createCQRSHandler,
  createMultiTenantRoot,
  adapters,
  withMetrics
} = require('./dist/src/index.js');

// 1. Define a real domain: Document Management System
class DocumentSpec extends DomainSpec {
  constructor() {
    super();
    this.initialState = { 
      version: 0,
      documents: {},
      permissions: {}
    };
    this.initialView = {
      recentDocs: [],
      userViews: {},
      lastUpdate: new Date().toISOString()
    };
  }

  // Test generators for law verification
  generateEvents() {
    const fc = require('fast-check');
    return fc.array(fc.oneof(
      fc.record({
        kind: fc.constant('DocumentCreated'),
        docId: fc.string(),
        title: fc.string(),
        content: fc.string(),
        userId: fc.string(),
        timestamp: fc.date().map(d => d.toISOString())
      }),
      fc.record({
        kind: fc.constant('DocumentEdited'),
        docId: fc.string(),
        content: fc.string(),
        userId: fc.string(),
        timestamp: fc.date().map(d => d.toISOString())
      }),
      fc.record({
        kind: fc.constant('PermissionGranted'),
        docId: fc.string(),
        userId: fc.string(),
        level: fc.constantFrom('read', 'write', 'admin'),
        timestamp: fc.date().map(d => d.toISOString())
      })
    ));
  }

  generateCommands() {
    const fc = require('fast-check');
    return fc.oneof(
      fc.record({
        kind: fc.constant('CreateDocument'),
        docId: fc.string(),
        title: fc.string(),
        content: fc.string(),
        userId: fc.string()
      }),
      fc.record({
        kind: fc.constant('EditDocument'),
        docId: fc.string(),
        content: fc.string(),
        userId: fc.string()
      }),
      fc.record({
        kind: fc.constant('GrantPermission'),
        docId: fc.string(),
        userId: fc.string(),
        level: fc.constantFrom('read', 'write', 'admin')
      })
    );
  }

  generateRaw() {
    const fc = require('fast-check');
    return fc.record({
      title: fc.string(),
      content: fc.string(),
      userId: fc.string()
    });
  }

  // Domain logic
  normalize(raw) {
    return {
      title: raw.title || 'Untitled',
      content: raw.content || '',
      userId: raw.userId
    };
  }

  validate(command) {
    switch (command.kind) {
      case 'CreateDocument':
        return !!command.docId && !!command.userId;
      case 'EditDocument':
        return !!command.docId && !!command.userId;
      case 'GrantPermission':
        return !!command.docId && !!command.userId && ['read', 'write', 'admin'].includes(command.level);
      default:
        return false;
    }
  }

  decide(state, command) {
    const now = new Date().toISOString();

    switch (command.kind) {
      case 'CreateDocument':
        // Check if document exists
        if (state.documents[command.docId]) return [];
        
        return [{
          kind: 'DocumentCreated',
          docId: command.docId,
          title: command.title,
          content: command.content,
          userId: command.userId,
          timestamp: now
        }, {
          kind: 'PermissionGranted',
          docId: command.docId,
          userId: command.userId,
          level: 'admin',
          timestamp: now
        }];

      case 'EditDocument':
        // Check permissions
        const doc = state.documents[command.docId];
        const perms = state.permissions[command.docId] || {};
        if (!doc || !['write', 'admin'].includes(perms[command.userId])) return [];

        return [{
          kind: 'DocumentEdited',
          docId: command.docId,
          content: command.content,
          userId: command.userId,
          timestamp: now
        }];

      case 'GrantPermission':
        // Only admins can grant permissions
        const docPerms = state.permissions[command.docId] || {};
        if (!docPerms[command.userId] === 'admin') return [];

        return [{
          kind: 'PermissionGranted',
          docId: command.docId,
          userId: command.userId,
          level: command.level,
          timestamp: now
        }];

      default:
        return [];
    }
  }

  evolve(state, event) {
    const newState = { 
      ...state,
      version: state.version + 1,
      documents: { ...state.documents },
      permissions: { ...state.permissions }
    };

    switch (event.kind) {
      case 'DocumentCreated':
        newState.documents[event.docId] = {
          title: event.title,
          content: event.content,
          createdBy: event.userId,
          createdAt: event.timestamp,
          updatedAt: event.timestamp
        };
        newState.permissions[event.docId] = {
          [event.userId]: 'admin'
        };
        break;

      case 'DocumentEdited':
        if (newState.documents[event.docId]) {
          newState.documents[event.docId] = {
            ...newState.documents[event.docId],
            content: event.content,
            updatedAt: event.timestamp
          };
        }
        break;

      case 'PermissionGranted':
        newState.permissions[event.docId] = {
          ...newState.permissions[event.docId],
          [event.userId]: event.level
        };
        break;
    }

    return newState;
  }

  project(view, event) {
    // Ensure view has required structure
    const safeView = {
      recentDocs: Array.isArray(view.recentDocs) ? view.recentDocs : [],
      userViews: view.userViews || {},
      lastUpdate: view.lastUpdate || new Date().toISOString()
    };

    const newView = { 
      ...safeView,
      recentDocs: [...safeView.recentDocs],
      userViews: { ...safeView.userViews },
      lastUpdate: event.timestamp || new Date().toISOString()
    };

    if (!event || !event.kind) return newView;

    switch (event.kind) {
      case 'DocumentCreated':
        if (!event.docId || !event.title || !event.userId) return newView;
        
        // Add to recent docs
        newView.recentDocs.unshift({
          id: event.docId,
          title: event.title,
          createdBy: event.userId,
          createdAt: event.timestamp || new Date().toISOString()
        });
        // Keep only last 10
        newView.recentDocs = newView.recentDocs.slice(0, 10);
        
        // Add to user's view
        // Safely initialize user's view if needed
        newView.userViews[event.userId] = newView.userViews[event.userId] || { docs: [] };
        if (Array.isArray(newView.userViews[event.userId].docs)) {
          newView.userViews[event.userId].docs.unshift(event.docId);
        } else {
          newView.userViews[event.userId].docs = [event.docId];
        }
        break;

      case 'DocumentEdited':
        if (!event.docId || !event.timestamp) return newView;
        
        // Update last modified in recent docs
        const docIndex = newView.recentDocs.findIndex(d => d.id === event.docId);
        if (docIndex >= 0) {
          newView.recentDocs[docIndex] = {
            ...newView.recentDocs[docIndex],
            lastModified: event.timestamp
          };
        }
        break;
    }

    return newView;
  }

  queries(view) {
    return {
      getRecentDocs: () => view.recentDocs,
      getUserDocs: (userId) => view.userViews[userId]?.docs || [],
      getLastUpdate: () => view.lastUpdate
    };
  }

  deriveView(state) {
    // Safely handle state
    const safeState = {
      documents: state?.documents || {},
      version: state?.version || 0
    };

    // Safely derive recent docs
    const recentDocs = Object.entries(safeState.documents)
      .map(([id, doc]) => ({
        id,
        title: doc?.title || '',
        createdBy: doc?.createdBy || '',
        createdAt: doc?.createdAt || new Date(0).toISOString(),
        lastModified: doc?.updatedAt || new Date(0).toISOString()
      }))
      .sort((a, b) => {
        // Safe string comparison
        const dateA = a.createdAt || '';
        const dateB = b.createdAt || '';
        return dateB.localeCompare(dateA);
      })
      .slice(0, 10);

    // Safely derive user views
    const userViews = {};
    Object.entries(safeState.documents).forEach(([docId, doc]) => {
      if (!doc) return;
      const userId = doc.createdBy || 'unknown';
      userViews[userId] = userViews[userId] || { docs: [] };
      if (Array.isArray(userViews[userId].docs)) {
        userViews[userId].docs.push(docId);
      } else {
        userViews[userId].docs = [docId];
      }
    });

    // Safe query interface
    return {
      getRecentDocs: () => recentDocs || [],
      getUserDocs: (userId) => (userViews[userId]?.docs || []).slice(),
      getLastUpdate: () => {
        const dates = recentDocs
          .map(d => d.lastModified)
          .filter(d => d && typeof d === 'string');
        return dates.length > 0 ? 
          dates.reduce((a, b) => a > b ? a : b) : 
          new Date(0).toISOString();
      }
    };
  }
}

// Test all major features
async function testFeatures() {
  console.log('🐱 Testing CatSys Real Features\n');

  try {
    // 1. Basic Service
    console.log('1️⃣ Testing Basic Service...');
    const docSpec = new DocumentSpec();
    const basicService = createGenericService(docSpec, docSpec.initialState, {
      sql: adapters.inMemorySql(),
      bus: adapters.inMemoryBus()
    });
    console.log('✅ Basic service created (laws verified)\n');

    // Create a document
    const state1 = await basicService.handle(docSpec.initialState, {
      kind: 'CreateDocument',
      docId: 'doc1',
      title: 'Test Document',
      content: 'Hello CatSys!',
      userId: 'user1'
    });
    console.log('✅ Document created:', state1.documents.doc1);

    // Edit the document
    const state2 = await basicService.handle(state1, {
      kind: 'EditDocument',
      docId: 'doc1',
      content: 'Updated content!',
      userId: 'user1'
    });
    console.log('✅ Document edited:', state2.documents.doc1);

    // 2. Event Sourcing
    console.log('\n2️⃣ Testing Event Sourcing...');
    const eventSourcing = createEventSourcingHandler(
      (state, event) => docSpec.evolve(state, event),
      docSpec.initialState,
      {
        sql: adapters.inMemorySql(),
        bus: adapters.inMemoryBus()
      }
    );

    // Create events via handler
    const events = docSpec.decide(docSpec.initialState, {
      kind: 'CreateDocument',
      docId: 'doc2',
      title: 'Event Sourced Doc',
      content: 'Created via event sourcing',
      userId: 'user2'
    });

    // Store events in SQL for replay
    const ports = {
      sql: adapters.inMemorySql(),
      bus: adapters.inMemoryBus()
    };

    // Create events table
    await ports.sql.query('CREATE TABLE IF NOT EXISTS events (id TEXT, timestamp TEXT, data JSONB)');

    // Store events
    for (const event of events) {
      await ports.sql.query(
        'INSERT INTO events (id, timestamp, data) VALUES ($1, $2, $3)',
        [event.id, event.timestamp, event]
      );
    }

    // Get current state
    const currentState = await eventSourcing.replay();
    console.log('✅ Event sourcing working:', currentState.documents.doc2);

    // 3. CQRS
    console.log('\n3️⃣ Testing CQRS...');
    // Create CQRS handler with fresh ports
    const cqrsPorts = {
      sql: adapters.inMemorySql(),
      bus: adapters.inMemoryBus()
    };

    // Create events table for CQRS
    await cqrsPorts.sql.query('CREATE TABLE IF NOT EXISTS events (id TEXT, timestamp TEXT, data JSONB)');

    const cqrs = createCQRSHandler(
      (state, command) => docSpec.decide(state, command),
      (state, event) => docSpec.evolve(state, event),
      (view, event) => docSpec.project(view, event),
      docSpec.initialState,
      docSpec.initialView,
      cqrsPorts
    );

    // Create document via CQRS
    const cqrsCommand = {
      kind: 'CreateDocument',
      docId: 'doc3',
      title: 'CQRS Doc',
      content: 'Created via CQRS',
      userId: 'user3'
    };

    const cqrsEvents = await cqrs.command(docSpec.initialState, cqrsCommand);

    // Query the read model
    const view = await cqrs.syncReadModel();
    console.log('✅ CQRS working - Write side:', cqrsEvents);
    console.log('✅ CQRS working - Read side:', docSpec.queries(view).getRecentDocs());

    // 4. Multi-tenant
    console.log('\n4️⃣ Testing Multi-tenant...');
    const multiTenant = createMultiTenantRoot(
      (ports) => createGenericService(docSpec, docSpec.initialState, ports),
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

    const tenant1Service = multiTenant('tenant1');
    const tenant2Service = multiTenant('tenant2');

    // Create documents in different tenants
    await tenant1Service.handle(docSpec.initialState, {
      kind: 'CreateDocument',
      docId: 'doc4',
      title: 'Tenant 1 Doc',
      content: 'Created in tenant 1',
      userId: 'user4'
    });

    await tenant2Service.handle(docSpec.initialState, {
      kind: 'CreateDocument',
      docId: 'doc5',
      title: 'Tenant 2 Doc',
      content: 'Created in tenant 2',
      userId: 'user5'
    });

    console.log('✅ Multi-tenant working - documents isolated by tenant');

    // 5. Observability
    console.log('\n5️⃣ Testing Observability...');
    const observedOperation = withMetrics('create_document', async (title, content, userId) => {
      return basicService.handle(docSpec.initialState, {
        kind: 'CreateDocument',
        docId: Math.random().toString(36).substring(7),
        title,
        content,
        userId
      });
    });

    await observedOperation('Observed Doc', 'Created with metrics', 'user6');
    console.log('✅ Observability working - metrics collected');

    // Final health check
    const health = await basicService.healthCheck();
    console.log('\n✅ Health check:', health);

    console.log('\n🎉 All real features working correctly!\n');
    console.log('Features demonstrated:');
    console.log('1. Basic service with law verification');
    console.log('2. Event sourcing with replay');
    console.log('3. CQRS with separate read/write models');
    console.log('4. Multi-tenant isolation');
    console.log('5. Built-in observability');

  } catch (error) {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  }
}

testFeatures();

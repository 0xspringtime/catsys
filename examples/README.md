# 🎬 Examples & Live Demo

## 🚀 Quick Start

```bash
# Run the live demo
npm run demo

# Or directly
node examples/live-server.js

# Visit: http://localhost:3000
```

## 📁 What's Here

### **🎬 Interactive Demo** (`demo.html`)
Complete YouTube/Netflix-style video streaming service running in your browser:
- Upload videos with metadata
- Watch videos (track views)
- Add comments to videos
- Like/dislike videos
- Real-time state updates
- Complete action logging

### **📹 Video Streaming Implementation** (`video-streaming.ts`)
Full production-ready implementation showing:
- Domain objects (Command, Event, State)
- Pure business logic (decide, evolve, validate)
- Infrastructure ports (Sql, EventBus, BlobStore)
- Custom handlers with observability
- Adapter swapping (dev ↔ production)

### **🧪 Tests** (`video-streaming.test.ts`)
Comprehensive test suite demonstrating:
- Service creation and initialization
- Video upload state management
- Complete workflow execution

### **🌐 Live Server** (`live-server.js`)
HTTP server providing:
- Interactive demo at `/demo`
- Source code browsing at `/examples/`
- API endpoints for examples
- Static file serving

## 🎯 Key Demonstrations

### **Mathematical Guarantees**
- **Purity**: All business logic deterministic
- **Composability**: Complex systems from simple parts
- **Technology Independence**: Same logic, any infrastructure
- **Observability**: Built-in metrics and monitoring
- **Scalability**: Patterns work from demo to production

### **Architecture Patterns**
- **Event Sourcing**: Complete audit trail
- **CQRS**: Separate read/write models
- **Ports & Adapters**: Technology-agnostic design
- **Natural Transformations**: Infrastructure swapping
- **Kleisli Composition**: Effectful operation chaining

## 🔧 How to Extend

### **Add New Features**
1. Define new Command/Event types
2. Update decide() and evolve() functions
3. Add UI controls in demo.html
4. Test with existing patterns

### **Swap Infrastructure**
```typescript
// Development
const devService = createVideoStreamingService({
  sql: inMemorySql(),
  bus: inMemoryBus(),
  blob: inMemoryBlob()
});

// Production
const prodService = createVideoStreamingService({
  sql: postgresSql(DATABASE_URL),
  bus: kafkaBus(KAFKA_BROKERS),
  blob: s3BlobStore(S3_BUCKET)
});
// Same business logic, different infrastructure!
```

## 📊 What You'll Learn

- How category theory creates mathematically sound systems
- How pure functions eliminate entire bug categories
- How port-adapter architecture enables technology independence
- How event sourcing provides complete auditability
- How the same patterns scale from prototype to production

**Start with the demo, explore the code, build your own system!** ✨

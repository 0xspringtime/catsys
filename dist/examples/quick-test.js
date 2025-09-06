"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const index_1 = require("../src/index");
const fc = __importStar(require("fast-check"));
async function quickTest() {
    console.log('🐱 Testing CatSys imports...\n');
    // Test core imports
    console.log('✅ Core imports working');
    console.log('  - DomainSpec:', !!index_1.DomainSpec);
    console.log('  - createGenericService:', !!index_1.createGenericService);
    console.log('  - adapters:', !!index_1.adapters);
    // Test adapters
    const sql = index_1.adapters.inMemorySql();
    const bus = index_1.adapters.inMemoryBus();
    console.log('\n✅ Adapters working');
    console.log('  - SQL adapter:', !!sql);
    console.log('  - Bus adapter:', !!bus);
    // Test service creation
    // Create a minimal DomainSpec implementation
    class MinimalSpec extends index_1.DomainSpec {
        constructor() {
            super(...arguments);
            this.initialState = {};
            this.initialView = {};
        }
        generateEvents() { return fc.array(fc.anything()); }
        generateCommands() { return fc.anything(); }
        generateRaw() { return fc.anything(); }
        normalize(raw) { return raw; }
        validate(command) { return true; }
        decide(state, command) { return []; }
        evolve(state, event) { return state; }
        project(view, event) { return view; }
        queries(view) { return {}; }
        deriveView(state) { return {}; }
    }
    const service = (0, index_1.createGenericService)(new MinimalSpec(), {}, { sql, bus });
    console.log('\n✅ Service creation working');
    console.log('  - Service instance:', !!service);
    // Test health check
    const health = await service.healthCheck();
    console.log('\n✅ Health check working');
    console.log('  - Health:', health);
}
quickTest().catch(console.error);

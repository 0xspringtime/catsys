"use strict";
// Generic Composition Root - The Heart of the Category Theory Framework
// This is where functors are applied and technology choices are made
Object.defineProperty(exports, "__esModule", { value: true });
exports.DomainSpec = void 0;
exports.createCompositionRoot = createCompositionRoot;
exports.createFromEnvironment = createFromEnvironment;
exports.createMigrationRoot = createMigrationRoot;
exports.createMultiTenantRoot = createMultiTenantRoot;
exports.createDevelopmentRoot = createDevelopmentRoot;
exports.createTestingRoot = createTestingRoot;
const observability_1 = require("../impl/observability");
const law_enforcement_1 = require("../law-enforcement");
// Generic domain specification interface
class DomainSpec {
    constructor() {
        // Law enforcement - called automatically when creating services
        this._lawsVerified = false;
    }
    // Default implementations for common patterns
    fold(f, s0, events) {
        return events.reduce(f, s0);
    }
    verifyLaws() {
        if (this._lawsVerified)
            return; // Only verify once
        const laws = {
            normalize: this.normalize.bind(this),
            validate: this.validate.bind(this),
            decide: this.decide.bind(this),
            evolve: this.evolve.bind(this),
            project: this.project.bind(this),
            queries: this.queries.bind(this),
            deriveView: this.deriveView.bind(this),
            initialState: this.initialState,
            initialView: this.initialView,
            generateEvents: this.generateEvents.bind(this),
            generateCommands: this.generateCommands.bind(this),
            generateRaw: this.generateRaw.bind(this),
            fold: this.fold.bind(this),
        };
        // This will throw if any laws fail
        (0, law_enforcement_1.enforceLaws)(laws);
        this._lawsVerified = true;
    }
}
exports.DomainSpec = DomainSpec;
// Generic composition root builder
function createCompositionRoot(serviceFactory, adapterConfig) {
    // Apply R functor (realization) - transform pure adapters to Promise-based
    const realizedPorts = Object.fromEntries(Object.entries(adapterConfig).map(([key, adapterFactory]) => [
        key,
        typeof adapterFactory === 'function' ? adapterFactory() : adapterFactory
    ]));
    // Create service with realized ports
    const service = serviceFactory(realizedPorts);
    // Apply O functor (observability) to all service methods
    const observableService = Object.fromEntries(Object.entries(service).map(([methodName, method]) => [
        methodName,
        typeof method === 'function'
            ? (0, observability_1.withMetrics)(`service_${methodName}`, method)
            : method
    ]));
    return observableService;
}
// Environment-aware composition root
function createFromEnvironment(serviceFactory, envConfig, adapters) {
    const adapterConfig = buildAdapterConfig(envConfig, adapters);
    return createCompositionRoot(serviceFactory, adapterConfig);
}
function buildAdapterConfig(env, adapters) {
    const config = {};
    Object.entries(env.adapters).forEach(([portName, adapterType]) => {
        if (adapterType && adapters[portName] && adapters[portName][adapterType]) {
            config[portName] = () => adapters[portName][adapterType](env.config?.[portName]);
        }
    });
    return config;
}
// Migration support for blue/green deployments
function createMigrationRoot(serviceFactory, currentConfig, targetConfig, migrationStrategy = 'gradual') {
    if (migrationStrategy === 'immediate') {
        return createCompositionRoot(serviceFactory, targetConfig);
    }
    // For gradual/canary, create hybrid ports that route based on strategy
    // This would need more sophisticated implementation in practice
    const hybridConfig = { ...currentConfig };
    return createCompositionRoot(serviceFactory, hybridConfig);
}
// Multi-tenant support
function createMultiTenantRoot(serviceFactory, tenantConfigs, defaultConfig) {
    const tenantServices = new Map();
    return (tenantId) => {
        if (!tenantServices.has(tenantId)) {
            const config = tenantConfigs.get(tenantId) || defaultConfig;
            if (!config) {
                throw new Error(`No configuration found for tenant: ${tenantId}`);
            }
            const service = createCompositionRoot(serviceFactory, config);
            tenantServices.set(tenantId, service);
        }
        return tenantServices.get(tenantId);
    };
}
function createDevelopmentRoot(serviceFactory, adapters, options = {}) {
    const devConfig = {
        environment: 'development',
        adapters: {
            sql: options.enableTimeTravel ? 'memory' : 'memory',
            bus: options.enableDebugLogging ? 'memory' : 'memory',
            blob: 'memory',
            kv: 'memory',
            search: 'memory',
            ws: 'memory',
        },
        config: {
            debug: options.enableDebugLogging,
            timeTravel: options.enableTimeTravel,
            mockExternal: options.mockExternalServices,
            captureEvents: options.captureEvents,
        }
    };
    return createFromEnvironment(serviceFactory, devConfig, adapters);
}
function createTestingRoot(serviceFactory, adapters, testConfig = {}) {
    const envConfig = {
        environment: 'development',
        adapters: {
            sql: 'memory',
            bus: 'memory',
            blob: 'memory',
            kv: 'memory',
            search: 'memory',
            ws: 'memory',
        },
        config: {
            ...testConfig,
            testing: true,
        }
    };
    const service = createFromEnvironment(serviceFactory, envConfig, adapters);
    // Add testing helpers
    const testingHelpers = {
        getCapturedEvents: () => [],
        setTime: (time) => { },
        resetState: () => { },
        getMetrics: () => ({}),
    };
    return { ...service, ...testingHelpers };
}

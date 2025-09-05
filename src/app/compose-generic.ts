// Generic Composition Root - The Heart of the Category Theory Framework
// This is where functors are applied and technology choices are made

import { withMetrics } from '../impl/observability';
import { R } from '../impl';

import { enforceLaws, type DomainLaws } from '../law-enforcement';
import fc from 'fast-check';

// Generic domain specification interface
export abstract class DomainSpec<Raw, Domain, Command, Event, State, View, Answer> {
  abstract normalize(raw: Raw): Domain;
  abstract validate(command: Command): boolean;
  abstract decide(state: State, command: Command): Event[];
  abstract evolve(state: State, event: Event): State;
  abstract project(view: View, event: Event): View;
  abstract queries(view: View): Answer;
  abstract deriveView(state: State): Answer;
  
  // Abstract properties that must be provided for law verification
  abstract initialState: State;
  abstract initialView: View;
  abstract generateEvents(): fc.Arbitrary<Event[]>;
  abstract generateCommands(): fc.Arbitrary<Command>;
  abstract generateRaw(): fc.Arbitrary<Raw>;
  
  // Default implementations for common patterns
  fold<S, E>(f: (s: S, e: E) => S, s0: S, events: ReadonlyArray<E>): S {
    return events.reduce(f, s0);
  }
  
  // Law enforcement - called automatically when creating services
  private _lawsVerified = false;
  
  verifyLaws(): void {
    if (this._lawsVerified) return; // Only verify once
    
    const laws: DomainLaws<Raw, Domain, Command, Event, State, View, Answer> = {
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
    enforceLaws(laws);
    this._lawsVerified = true;
  }
}

// Generic service interface
export interface DomainService<State, Command, Raw, Answer> {
  handle: (state: State, command: Command) => Promise<State>;
  httpHandle: (state: State, raw: Raw) => Promise<{ state: State; result: any }>;
  getState: () => Promise<State>;
  healthCheck: () => Promise<{ status: string; timestamp: string; error?: string }>;
  queries: (state: State) => Answer;
}

// Adapter configuration type
export type AdapterConfig<Ports> = {
  [K in keyof Ports]: () => Ports[K];
};

// Environment configuration
export type EnvironmentConfig = {
  environment: 'development' | 'staging' | 'production';
  adapters: {
    sql?: 'memory' | 'sqlite' | 'postgres';
    bus?: 'memory' | 'kafka' | 'nats';
    blob?: 'memory' | 'fs' | 's3' | 'gcs';
    kv?: 'memory' | 'redis' | 'dynamodb';
    search?: 'memory' | 'elasticsearch' | 'algolia';
    ws?: 'memory' | 'redis-pubsub' | 'kafka-streams';
  };
  config?: Record<string, any>;
};

// Generic composition root builder
export function createCompositionRoot<Ports, Service>(
  serviceFactory: (ports: Ports) => Service,
  adapterConfig: AdapterConfig<Ports>
): Service {
  // Apply R functor (realization) - transform pure adapters to Promise-based
  const realizedPorts = Object.fromEntries(
    Object.entries(adapterConfig).map(([key, adapterFactory]) => [
      key, 
      typeof adapterFactory === 'function' ? adapterFactory() : adapterFactory
    ])
  ) as Ports;
  
  // Create service with realized ports
  const service = serviceFactory(realizedPorts);
  
  // Apply O functor (observability) to all service methods
  const observableService = Object.fromEntries(
    Object.entries(service as any).map(([methodName, method]) => [
      methodName,
      typeof method === 'function' 
        ? withMetrics(`service_${methodName}`, method as (...args: any[]) => Promise<any>)
        : method
    ])
  ) as Service;
  
  return observableService;
}

// Environment-aware composition root
export function createFromEnvironment<Ports, Service>(
  serviceFactory: (ports: Ports) => Service,
  envConfig: EnvironmentConfig,
  adapters: Record<string, Record<string, (config?: any) => any>>
): Service {
  const adapterConfig = buildAdapterConfig(envConfig, adapters);
  return createCompositionRoot(serviceFactory, adapterConfig);
}

function buildAdapterConfig(
  env: EnvironmentConfig, 
  adapters: Record<string, Record<string, (config?: any) => any>>
): AdapterConfig<any> {
  const config: any = {};
  
  Object.entries(env.adapters).forEach(([portName, adapterType]) => {
    if (adapterType && adapters[portName] && adapters[portName][adapterType]) {
      config[portName] = () => adapters[portName][adapterType](env.config?.[portName]);
    }
  });
  
  return config;
}

// Migration support for blue/green deployments
export function createMigrationRoot<Ports, Service>(
  serviceFactory: (ports: Ports) => Service,
  currentConfig: AdapterConfig<Ports>,
  targetConfig: AdapterConfig<Ports>,
  migrationStrategy: 'immediate' | 'gradual' | 'canary' = 'gradual'
): Service {
  
  if (migrationStrategy === 'immediate') {
    return createCompositionRoot(serviceFactory, targetConfig);
  }
  
  // For gradual/canary, create hybrid ports that route based on strategy
  // This would need more sophisticated implementation in practice
  const hybridConfig = { ...currentConfig };
  
  return createCompositionRoot(serviceFactory, hybridConfig);
}

// Multi-tenant support
export function createMultiTenantRoot<Ports, Service>(
  serviceFactory: (ports: Ports) => Service,
  tenantConfigs: Map<string, AdapterConfig<Ports>>,
  defaultConfig?: AdapterConfig<Ports>
): (tenantId: string) => Service {
  
  const tenantServices = new Map<string, Service>();
  
  return (tenantId: string) => {
    if (!tenantServices.has(tenantId)) {
      const config = tenantConfigs.get(tenantId) || defaultConfig;
      if (!config) {
        throw new Error(`No configuration found for tenant: ${tenantId}`);
      }
      const service = createCompositionRoot(serviceFactory, config);
      tenantServices.set(tenantId, service);
    }
    return tenantServices.get(tenantId)!;
  };
}

// Development helpers
export interface DevelopmentOptions {
  enableHotReload?: boolean;
  enableDebugLogging?: boolean;
  enableTimeTravel?: boolean;
  mockExternalServices?: boolean;
  captureEvents?: boolean;
}

export function createDevelopmentRoot<Ports, Service>(
  serviceFactory: (ports: Ports) => Service,
  adapters: Record<string, Record<string, (config?: any) => any>>,
  options: DevelopmentOptions = {}
): Service {
  
  const devConfig: EnvironmentConfig = {
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

// Testing helpers
export interface TestingHelpers {
  getCapturedEvents?: () => any[];
  setTime?: (time: Date) => void;
  resetState?: () => void;
  getMetrics?: () => Record<string, any>;
}

export function createTestingRoot<Ports, Service>(
  serviceFactory: (ports: Ports) => Service,
  adapters: Record<string, Record<string, (config?: any) => any>>,
  testConfig: {
    deterministic?: boolean;
    captureEvents?: boolean;
    mockTime?: boolean;
    isolateTests?: boolean;
  } = {}
): Service & TestingHelpers {
  
  const envConfig: EnvironmentConfig = {
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
  const testingHelpers: TestingHelpers = {
    getCapturedEvents: () => [],
    setTime: (time: Date) => { /* implementation */ },
    resetState: () => { /* implementation */ },
    getMetrics: () => ({}),
  };
  
  return { ...service, ...testingHelpers };
}

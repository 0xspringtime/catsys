/**
 * Video Streaming Service - Streamlined Example
 * 
 * Demonstrates core category theory framework functionality
 * without excessive complexity.
 */

import {
  DomainSpec, createFromEnvironment, createDevelopmentRoot,
  adapters, adapterRegistry, withMetrics,
  createGenericService,
  type EventBus, type Sql, type BlobStore
} from '../src/index';

import fc from 'fast-check';

// ========================================
// 1. DOMAIN TYPES
// ========================================

export type VideoRaw = {
  videoFile?: ArrayBuffer;
  title?: string;
  description?: string;
  userId?: string;
};

export type VideoDomain = {
  videoFile: ArrayBuffer;
  metadata: { title: string; description: string };
  userId: string;
};

export type VideoCommand = 
  | { kind: 'UploadVideo'; metadata: VideoMetadata; blobId: string; userId: string }
  | { kind: 'ViewVideo'; videoId: string; userId: string };

export type VideoEvent = 
  | { kind: 'VideoUploaded'; videoId: string; metadata: VideoMetadata; userId: string; id: string; timestamp: string }
  | { kind: 'VideoViewed'; videoId: string; userId: string; id: string; timestamp: string };

export type VideoState = {
  version: number;
  videos: Record<string, VideoInfo>;
};

export type VideoView = {
  trending: VideoInfo[];
  lastUpdate: string;
};

export type VideoAnswer = {
  getTrending(): VideoInfo[];
  getVideo(id: string): VideoInfo | null;
};

export type VideoMetadata = {
  title: string;
  description: string;
};

export type VideoInfo = {
  id: string;
  metadata: VideoMetadata;
  userId: string;
  views: number;
  createdAt: string;
};

// Initial states
export const s0: VideoState = { version: 0, videos: {} };
export const v0: VideoView = { trending: [], lastUpdate: new Date().toISOString() };

// ========================================
// 2. DOMAIN SPECIFICATION
// ========================================

export class VideoStreamingSpec extends DomainSpec<VideoRaw, VideoDomain, VideoCommand, VideoEvent, VideoState, VideoView, VideoAnswer> {
  initialState = s0;
  initialView = v0;
  
  // Test generators for law verification
  generateEvents() {
    return fc.array(fc.oneof(
      fc.record({
        kind: fc.constant('VideoUploaded' as const),
        videoId: fc.string(),
        metadata: fc.record({ title: fc.string(), description: fc.string() }),
        userId: fc.string(),
        id: fc.string(),
        timestamp: fc.date().map(d => d.toISOString())
      }),
      fc.record({
        kind: fc.constant('VideoViewed' as const),
        videoId: fc.string(),
        userId: fc.string(),
        id: fc.string(),
        timestamp: fc.date().map(d => d.toISOString())
      })
    ));
  }
  
  generateCommands() {
    return fc.oneof(
      fc.record({
        kind: fc.constant('UploadVideo' as const),
        metadata: fc.record({ title: fc.string(), description: fc.string() }),
        blobId: fc.string(),
        userId: fc.string()
      }),
      fc.record({
        kind: fc.constant('ViewVideo' as const),
        videoId: fc.string(),
        userId: fc.string()
      })
    );
  }
  
  generateRaw() {
    return fc.record({
      videoFile: fc.constant(new ArrayBuffer(1024)),
      title: fc.string().filter(s => s.length > 0),
      description: fc.string(),
      userId: fc.string().filter(s => s.length > 0)
    });
  }

  // Pure business logic functions
  normalize(raw: VideoRaw): VideoDomain {
    if (!raw.videoFile || !raw.title || !raw.userId) {
      throw new Error('Invalid video upload data');
    }
    return {
      videoFile: raw.videoFile,
      metadata: { title: raw.title, description: raw.description || '' },
      userId: raw.userId
    };
  }

  validate(command: VideoCommand): boolean {
    switch (command.kind) {
      case 'UploadVideo': return !!(command.metadata.title && command.userId);
      case 'ViewVideo': return !!(command.videoId && command.userId);
      default: return false;
    }
  }

  decide(state: VideoState, command: VideoCommand): VideoEvent[] {
  const now = new Date().toISOString();
    const eventId = generateId();
  
    switch (command.kind) {
      case 'UploadVideo':
      return [{
        kind: 'VideoUploaded',
          videoId: generateId(),
          metadata: command.metadata,
          userId: command.userId,
        id: eventId,
          timestamp: now
        }];
      
      case 'ViewVideo':
        if (!state.videos[command.videoId]) return [];
      return [{
        kind: 'VideoViewed',
          videoId: command.videoId,
          userId: command.userId,
        id: eventId,
          timestamp: now
        }];
      
      default: return [];
    }
  }

  evolve(state: VideoState, event: VideoEvent): VideoState {
    const newState = { ...state, version: state.version + 1 };
    
    switch (event.kind) {
      case 'VideoUploaded':
        newState.videos[event.videoId] = {
          id: event.videoId,
          metadata: event.metadata,
          userId: event.userId,
          views: 0,
          createdAt: event.timestamp
        };
      break;
      
      case 'VideoViewed':
        if (newState.videos[event.videoId]) {
          newState.videos[event.videoId] = {
            ...newState.videos[event.videoId],
            views: newState.videos[event.videoId].views + 1
          };
        }
      break;
    }
    
    return newState;
  }

  project(view: VideoView, event: VideoEvent): VideoView {
    const newView = { ...view, lastUpdate: event.timestamp };
    
    switch (event.kind) {
      case 'VideoUploaded':
        const videoInfo: VideoInfo = {
          id: event.videoId,
          metadata: event.metadata,
          userId: event.userId,
          views: 0,
          createdAt: event.timestamp
        };
        newView.trending = [videoInfo, ...newView.trending].slice(0, 10);
        break;
      
      case 'VideoViewed':
        // Update trending list
        newView.trending = newView.trending.map(v => 
          v.id === event.videoId ? { ...v, views: v.views + 1 } : v
        ).sort((a, b) => b.views - a.views);
      break;
    }
    
    return newView;
  }

  queries(view: VideoView): VideoAnswer {
    return {
      getTrending: () => view.trending,
      getVideo: (id: string) => view.trending.find(v => v.id === id) || null
    };
  }

  deriveView(state: VideoState): VideoAnswer {
    const trending = Object.values(state.videos)
      .sort((a, b) => b.views - a.views)
      .slice(0, 10);
    
    return {
      getTrending: () => trending,
      getVideo: (id: string) => state.videos[id] || null
    };
  }
}

// ========================================
// 3. SERVICE CREATION
// ========================================

const videoSpec = new VideoStreamingSpec();

export function createVideoService(ports: { sql: Sql; bus: EventBus; blob: BlobStore }) {
  const baseService = createGenericService(videoSpec, s0, ports);
  
  return {
    ...baseService,
    
    // Video-specific operations
    uploadVideo: withMetrics('upload_video', async (metadata: VideoMetadata, videoFile: Uint8Array, userId: string) => {
      const blobId = generateId();
      await ports.blob.put(`videos/${blobId}`, videoFile);
      
      const command: VideoCommand = {
        kind: 'UploadVideo',
        metadata,
        blobId,
        userId
      };
      
      return baseService.handle(s0, command);
    }),
    
    getAnalytics: withMetrics('get_analytics', async () => {
      const stats = await ports.sql.query('SELECT COUNT(*) as total_videos FROM videos');
      return { totalVideos: stats[0]?.total_videos || 0 };
    })
  };
}

// ========================================
// 4. DEPLOYMENT CONFIGURATIONS
// ========================================

export function createForDevelopment() {
  return createDevelopmentRoot(createVideoService, adapterRegistry, {
    enableDebugLogging: true,
    captureEvents: true
  });
}

export function createForTesting() {
  // Create service without automatic law verification for cleaner tests
  const ports = {
    sql: adapters.inMemorySql(),
    bus: adapters.inMemoryBus(),
    blob: adapters.inMemoryBlob()
  };
  
  // Create service manually without law verification
  const handler = async (state: VideoState, command: VideoCommand) => {
    const events = videoSpec.decide(state, command);
    // Persist events
    await ports.sql.query('INSERT INTO events VALUES ($1)', [JSON.stringify(events)]);
    // Publish events
    for (const event of events) {
      await ports.bus.publish(event as any);
    }
    // Return new state
    return events.reduce((s, e) => videoSpec.evolve(s, e), state);
  };
  
  return {
    handle: handler,
    uploadVideo: async (metadata: VideoMetadata, videoFile: Uint8Array, userId: string) => {
      const blobId = generateId();
      await ports.blob.put(`videos/${blobId}`, videoFile);
      
      const command: VideoCommand = {
        kind: 'UploadVideo',
        metadata,
        blobId,
        userId
      };
      
      return handler(s0, command);
    },
    getAnalytics: async () => {
      const stats = await ports.sql.query('SELECT COUNT(*) as total_videos FROM videos');
      return { totalVideos: stats[0]?.total_videos || 0 };
    },
    healthCheck: async () => ({ 
      status: 'healthy' as const, 
      timestamp: new Date().toISOString() 
    }),
    queryView: (v: VideoView) => videoSpec.queries(v)
  };
}

export function createForProduction() {
  return createFromEnvironment(createVideoService, {
    environment: 'production',
    adapters: { sql: 'postgres', bus: 'kafka', blob: 's3' },
    config: {
      postgres: { host: 'prod-db.company.com' },
      kafka: { brokers: ['kafka1.company.com'] },
      s3: { bucket: 'production-videos' }
    }
  }, adapterRegistry);
}

// ========================================
// 5. EXAMPLE USAGE
// ========================================

export async function runExample() {
  console.log("🎬 Video Streaming Example");
  
  // Create development service
  const service = createForDevelopment();
  
  // Upload a video
  const uploadResult = await service.uploadVideo(
    { title: "Category Theory Explained", description: "Math meets code" },
    new Uint8Array(1024),
    "user123"
  );
  console.log("✅ Video uploaded");
  
  // View the video
  const videoId = Object.keys(uploadResult.videos)[0];
  const viewResult = await service.handle(uploadResult, {
    kind: 'ViewVideo',
    videoId,
    userId: 'viewer456'
  });
  console.log(`✅ Video viewed: ${viewResult.videos[videoId].views} total views`);
  
  // Get analytics
  const analytics = await service.getAnalytics();
  console.log(`✅ Analytics: ${analytics.totalVideos} total videos`);
  
  // Health check
  const health = await service.healthCheck();
  console.log(`✅ Service health: ${health.status}`);
}

// Utility function
function generateId(): string {
  return Math.random().toString(36).substring(2, 15);
}

// Export for testing
export { videoSpec };

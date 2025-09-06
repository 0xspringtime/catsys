"use strict";
/**
 * Video Streaming Service - Streamlined Example
 *
 * Demonstrates core category theory framework functionality
 * without excessive complexity.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.videoSpec = exports.VideoStreamingSpec = exports.v0 = exports.s0 = void 0;
exports.createVideoService = createVideoService;
exports.createForDevelopment = createForDevelopment;
exports.createForTesting = createForTesting;
exports.createForProduction = createForProduction;
exports.runExample = runExample;
const index_1 = require("../src/index");
const fast_check_1 = __importDefault(require("fast-check"));
// Initial states
exports.s0 = { version: 0, videos: {} };
exports.v0 = { trending: [], lastUpdate: new Date().toISOString() };
// ========================================
// 2. DOMAIN SPECIFICATION
// ========================================
class VideoStreamingSpec extends index_1.DomainSpec {
    constructor() {
        super(...arguments);
        this.initialState = exports.s0;
        this.initialView = exports.v0;
    }
    // Test generators for law verification
    generateEvents() {
        return fast_check_1.default.array(fast_check_1.default.oneof(fast_check_1.default.record({
            kind: fast_check_1.default.constant('VideoUploaded'),
            videoId: fast_check_1.default.string(),
            metadata: fast_check_1.default.record({ title: fast_check_1.default.string(), description: fast_check_1.default.string() }),
            userId: fast_check_1.default.string(),
            id: fast_check_1.default.string(),
            timestamp: fast_check_1.default.date().map(d => d.toISOString())
        }), fast_check_1.default.record({
            kind: fast_check_1.default.constant('VideoViewed'),
            videoId: fast_check_1.default.string(),
            userId: fast_check_1.default.string(),
            id: fast_check_1.default.string(),
            timestamp: fast_check_1.default.date().map(d => d.toISOString())
        })));
    }
    generateCommands() {
        return fast_check_1.default.oneof(fast_check_1.default.record({
            kind: fast_check_1.default.constant('UploadVideo'),
            metadata: fast_check_1.default.record({ title: fast_check_1.default.string(), description: fast_check_1.default.string() }),
            blobId: fast_check_1.default.string(),
            userId: fast_check_1.default.string()
        }), fast_check_1.default.record({
            kind: fast_check_1.default.constant('ViewVideo'),
            videoId: fast_check_1.default.string(),
            userId: fast_check_1.default.string()
        }));
    }
    generateRaw() {
        return fast_check_1.default.record({
            videoFile: fast_check_1.default.constant(new ArrayBuffer(1024)),
            title: fast_check_1.default.string().filter(s => s.length > 0),
            description: fast_check_1.default.string(),
            userId: fast_check_1.default.string().filter(s => s.length > 0)
        });
    }
    // Pure business logic functions
    normalize(raw) {
        if (!raw.videoFile || !raw.title || !raw.userId) {
            throw new Error('Invalid video upload data');
        }
        return {
            videoFile: raw.videoFile,
            metadata: { title: raw.title, description: raw.description || '' },
            userId: raw.userId
        };
    }
    validate(command) {
        switch (command.kind) {
            case 'UploadVideo': return !!(command.metadata.title && command.userId);
            case 'ViewVideo': return !!(command.videoId && command.userId);
            default: return false;
        }
    }
    decide(state, command) {
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
                if (!state.videos[command.videoId])
                    return [];
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
    evolve(state, event) {
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
    project(view, event) {
        const newView = { ...view, lastUpdate: event.timestamp };
        switch (event.kind) {
            case 'VideoUploaded':
                const videoInfo = {
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
                newView.trending = newView.trending.map(v => v.id === event.videoId ? { ...v, views: v.views + 1 } : v).sort((a, b) => b.views - a.views);
                break;
        }
        return newView;
    }
    queries(view) {
        return {
            getTrending: () => view.trending,
            getVideo: (id) => view.trending.find(v => v.id === id) || null
        };
    }
    deriveView(state) {
        const trending = Object.values(state.videos)
            .sort((a, b) => b.views - a.views)
            .slice(0, 10);
        return {
            getTrending: () => trending,
            getVideo: (id) => state.videos[id] || null
        };
    }
}
exports.VideoStreamingSpec = VideoStreamingSpec;
// ========================================
// 3. SERVICE CREATION
// ========================================
const videoSpec = new VideoStreamingSpec();
exports.videoSpec = videoSpec;
function createVideoService(ports) {
    const baseService = (0, index_1.createGenericService)(videoSpec, exports.s0, ports);
    return {
        ...baseService,
        // Video-specific operations
        uploadVideo: (0, index_1.withMetrics)('upload_video', async (metadata, videoFile, userId) => {
            const blobId = generateId();
            await ports.blob.put(`videos/${blobId}`, videoFile);
            const command = {
                kind: 'UploadVideo',
                metadata,
                blobId,
                userId
            };
            return baseService.handle(exports.s0, command);
        }),
        getAnalytics: (0, index_1.withMetrics)('get_analytics', async () => {
            const stats = await ports.sql.query('SELECT COUNT(*) as total_videos FROM videos');
            return { totalVideos: stats[0]?.total_videos || 0 };
        })
    };
}
// ========================================
// 4. DEPLOYMENT CONFIGURATIONS
// ========================================
function createForDevelopment() {
    return (0, index_1.createDevelopmentRoot)(createVideoService, index_1.adapterRegistry, {
        enableDebugLogging: true,
        captureEvents: true
    });
}
function createForTesting() {
    // Create service without automatic law verification for cleaner tests
    const ports = {
        sql: index_1.adapters.inMemorySql(),
        bus: index_1.adapters.inMemoryBus(),
        blob: index_1.adapters.inMemoryBlob()
    };
    // Create service manually without law verification
    const handler = async (state, command) => {
        const events = videoSpec.decide(state, command);
        // Persist events
        await ports.sql.query('INSERT INTO events VALUES ($1)', [JSON.stringify(events)]);
        // Publish events
        for (const event of events) {
            await ports.bus.publish(event);
        }
        // Return new state
        return events.reduce((s, e) => videoSpec.evolve(s, e), state);
    };
    return {
        handle: handler,
        uploadVideo: async (metadata, videoFile, userId) => {
            const blobId = generateId();
            await ports.blob.put(`videos/${blobId}`, videoFile);
            const command = {
                kind: 'UploadVideo',
                metadata,
                blobId,
                userId
            };
            return handler(exports.s0, command);
        },
        getAnalytics: async () => {
            const stats = await ports.sql.query('SELECT COUNT(*) as total_videos FROM videos');
            return { totalVideos: stats[0]?.total_videos || 0 };
        },
        healthCheck: async () => ({
            status: 'healthy',
            timestamp: new Date().toISOString()
        }),
        queryView: (v) => videoSpec.queries(v)
    };
}
function createForProduction() {
    return (0, index_1.createFromEnvironment)(createVideoService, {
        environment: 'production',
        adapters: { sql: 'postgres', bus: 'kafka', blob: 's3' },
        config: {
            postgres: { host: 'prod-db.company.com' },
            kafka: { brokers: ['kafka1.company.com'] },
            s3: { bucket: 'production-videos' }
        }
    }, index_1.adapterRegistry);
}
// ========================================
// 5. EXAMPLE USAGE
// ========================================
async function runExample() {
    console.log("🎬 Video Streaming Example");
    // Create development service
    const service = createForDevelopment();
    // Upload a video
    const uploadResult = await service.uploadVideo({ title: "Category Theory Explained", description: "Math meets code" }, new Uint8Array(1024), "user123");
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
function generateId() {
    return Math.random().toString(36).substring(2, 15);
}

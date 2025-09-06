/**
 * Video Streaming Service - Streamlined Example
 *
 * Demonstrates core category theory framework functionality
 * without excessive complexity.
 */
import { DomainSpec, type EventBus, type Sql, type BlobStore } from '../src/index';
import fc from 'fast-check';
export type VideoRaw = {
    videoFile?: ArrayBuffer;
    title?: string;
    description?: string;
    userId?: string;
};
export type VideoDomain = {
    videoFile: ArrayBuffer;
    metadata: {
        title: string;
        description: string;
    };
    userId: string;
};
export type VideoCommand = {
    kind: 'UploadVideo';
    metadata: VideoMetadata;
    blobId: string;
    userId: string;
} | {
    kind: 'ViewVideo';
    videoId: string;
    userId: string;
};
export type VideoEvent = {
    kind: 'VideoUploaded';
    videoId: string;
    metadata: VideoMetadata;
    userId: string;
    id: string;
    timestamp: string;
} | {
    kind: 'VideoViewed';
    videoId: string;
    userId: string;
    id: string;
    timestamp: string;
};
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
export declare const s0: VideoState;
export declare const v0: VideoView;
export declare class VideoStreamingSpec extends DomainSpec<VideoRaw, VideoDomain, VideoCommand, VideoEvent, VideoState, VideoView, VideoAnswer> {
    initialState: VideoState;
    initialView: VideoView;
    generateEvents(): fc.Arbitrary<({
        kind: "VideoUploaded";
        videoId: string;
        metadata: {
            title: string;
            description: string;
        };
        userId: string;
        id: string;
        timestamp: string;
    } | {
        kind: "VideoViewed";
        videoId: string;
        userId: string;
        id: string;
        timestamp: string;
    })[]>;
    generateCommands(): fc.Arbitrary<{
        kind: "UploadVideo";
        metadata: {
            title: string;
            description: string;
        };
        blobId: string;
        userId: string;
    } | {
        kind: "ViewVideo";
        videoId: string;
        userId: string;
    }>;
    generateRaw(): fc.Arbitrary<{
        videoFile: ArrayBuffer;
        title: string;
        description: string;
        userId: string;
    }>;
    normalize(raw: VideoRaw): VideoDomain;
    validate(command: VideoCommand): boolean;
    decide(state: VideoState, command: VideoCommand): VideoEvent[];
    evolve(state: VideoState, event: VideoEvent): VideoState;
    project(view: VideoView, event: VideoEvent): VideoView;
    queries(view: VideoView): VideoAnswer;
    deriveView(state: VideoState): VideoAnswer;
}
declare const videoSpec: VideoStreamingSpec;
export declare function createVideoService(ports: {
    sql: Sql;
    bus: EventBus;
    blob: BlobStore;
}): {
    uploadVideo: (metadata: VideoMetadata, videoFile: Uint8Array<ArrayBufferLike>, userId: string) => Promise<VideoState>;
    getAnalytics: () => Promise<{
        totalVideos: any;
    }>;
    getState: () => Promise<VideoState>;
    healthCheck: () => Promise<{
        status: string;
        timestamp: string;
        error?: undefined;
    } | {
        status: string;
        error: string;
        timestamp: string;
    }>;
    handle: (s: VideoState, c: {
        kind: "UploadVideo";
        metadata: {
            title: string;
            description: string;
        };
        blobId: string;
        userId: string;
    } | {
        kind: "ViewVideo";
        videoId: string;
        userId: string;
    }) => Promise<VideoState>;
    httpHandle: (s: VideoState, raw: VideoRaw) => Promise<{
        state: VideoState;
        result: any;
    }>;
    query: (s: VideoState) => VideoAnswer;
    queryView: (v: VideoView) => VideoAnswer;
};
export declare function createForDevelopment(): {
    uploadVideo: (metadata: VideoMetadata, videoFile: Uint8Array<ArrayBufferLike>, userId: string) => Promise<VideoState>;
    getAnalytics: () => Promise<{
        totalVideos: any;
    }>;
    getState: () => Promise<VideoState>;
    healthCheck: () => Promise<{
        status: string;
        timestamp: string;
        error?: undefined;
    } | {
        status: string;
        error: string;
        timestamp: string;
    }>;
    handle: (s: VideoState, c: {
        kind: "UploadVideo";
        metadata: {
            title: string;
            description: string;
        };
        blobId: string;
        userId: string;
    } | {
        kind: "ViewVideo";
        videoId: string;
        userId: string;
    }) => Promise<VideoState>;
    httpHandle: (s: VideoState, raw: VideoRaw) => Promise<{
        state: VideoState;
        result: any;
    }>;
    query: (s: VideoState) => VideoAnswer;
    queryView: (v: VideoView) => VideoAnswer;
};
export declare function createForTesting(): {
    handle: (state: VideoState, command: VideoCommand) => Promise<VideoState>;
    uploadVideo: (metadata: VideoMetadata, videoFile: Uint8Array, userId: string) => Promise<VideoState>;
    getAnalytics: () => Promise<{
        totalVideos: any;
    }>;
    healthCheck: () => Promise<{
        status: "healthy";
        timestamp: string;
    }>;
    queryView: (v: VideoView) => VideoAnswer;
};
export declare function createForProduction(): {
    uploadVideo: (metadata: VideoMetadata, videoFile: Uint8Array<ArrayBufferLike>, userId: string) => Promise<VideoState>;
    getAnalytics: () => Promise<{
        totalVideos: any;
    }>;
    getState: () => Promise<VideoState>;
    healthCheck: () => Promise<{
        status: string;
        timestamp: string;
        error?: undefined;
    } | {
        status: string;
        error: string;
        timestamp: string;
    }>;
    handle: (s: VideoState, c: {
        kind: "UploadVideo";
        metadata: {
            title: string;
            description: string;
        };
        blobId: string;
        userId: string;
    } | {
        kind: "ViewVideo";
        videoId: string;
        userId: string;
    }) => Promise<VideoState>;
    httpHandle: (s: VideoState, raw: VideoRaw) => Promise<{
        state: VideoState;
        result: any;
    }>;
    query: (s: VideoState) => VideoAnswer;
    queryView: (v: VideoView) => VideoAnswer;
};
export declare function runExample(): Promise<void>;
export { videoSpec };

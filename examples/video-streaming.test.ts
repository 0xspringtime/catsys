/**
 * Basic test for video streaming example
 */

import { createForTesting, runExample } from '../examples/video-streaming';

describe('Video Streaming Example', () => {
  test('can create video streaming service', () => {
    const service = createForTesting();
    
    expect(service).toBeDefined();
    expect(service.handle).toBeDefined();
    expect(service.uploadVideo).toBeDefined();
    expect(service.getAnalytics).toBeDefined();
  });
  
  test('video upload creates proper state', async () => {
    const service = createForTesting();
    
    const metadata = {
      title: "Test Video",
      description: "A test video"
    };
    
    const result = await service.uploadVideo(
      metadata,
      new Uint8Array(1024), // 1KB test file
      "testuser"
    );
    
    expect(result.version).toBe(1);
    expect(Object.keys(result.videos).length).toBeGreaterThan(0);
    
    const videoId = Object.keys(result.videos)[0];
    const video = result.videos[videoId];
    
    // Check that the video was created with correct metadata
    expect(video).toBeDefined();
    expect(video.metadata).toBeDefined();
    expect(video.metadata.title).toBe(metadata.title);
    expect(video.metadata.description).toBe(metadata.description);
    expect(video.userId).toBe("testuser");
    expect(video.views).toBe(0);
    expect(video.createdAt).toBeDefined();
  });

  test('can run example workflow', async () => {
    // This tests that our example doesn't crash
    await expect(runExample()).resolves.not.toThrow();
  });
});

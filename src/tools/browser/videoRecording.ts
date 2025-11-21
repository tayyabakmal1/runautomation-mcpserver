/**
 * Author: Tayyab Akmal
 * Linkedin: https://www.linkedin.com/in/tayyab-sqa-engineer/
 */

import { BrowserToolBase } from './base.js';
import { ToolContext, ToolResponse, createSuccessResponse, createErrorResponse } from '../common/types.js';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Video recording settings
 */
interface VideoSettings {
  dir?: string;
  size?: { width: number; height: number };
  recordOnFailure?: boolean;
  quality?: number; // 0-100
  fps?: number;
}

/**
 * Video recording state
 */
interface RecordingState {
  isRecording: boolean;
  videoPath?: string;
  startTime?: number;
  settings: VideoSettings;
  annotations: Array<{
    timestamp: number;
    message: string;
  }>;
}

// Global recording state
let recordingState: RecordingState = {
  isRecording: false,
  settings: {
    dir: './videos',
    recordOnFailure: false,
    quality: 100,
    fps: 30
  },
  annotations: []
};

/**
 * Tool for starting video recording
 */
export class StartVideoRecordingTool extends BrowserToolBase {
  /**
   * Execute the start video recording tool
   */
  async execute(args: any, context: ToolContext): Promise<ToolResponse> {
    return this.safeExecute(context, async (page) => {
      try {
        // Check if already recording
        if (recordingState.isRecording) {
          return createErrorResponse('Video recording is already in progress. Please stop the current recording first.');
        }

        const {
          outputPath,
          size,
          recordOnFailure = false
        } = args;

        // Determine video directory and filename
        const videoDir = recordingState.settings.dir || './videos';
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = outputPath ? path.basename(outputPath) : `recording-${timestamp}.webm`;
        const fullPath = outputPath || path.join(videoDir, filename);

        // Ensure directory exists
        const dir = path.dirname(fullPath);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }

        // Get browser context
        const browserContext = page.context();

        // Close the current page and create a new one with video recording enabled
        const currentUrl = page.url();
        await page.close();

        // Create new context with video recording
        const videoSize = size || recordingState.settings.size;
        const browser = context.browser!;

        // Close old context and create new one with video
        await browserContext.close();

        const newContext = await browser.newContext({
          recordVideo: {
            dir: dir,
            size: videoSize
          },
          viewport: videoSize || { width: 1280, height: 720 }
        });

        // Create new page
        const newPage = await newContext.newPage();

        // Navigate to the previous URL if it exists
        if (currentUrl && currentUrl !== 'about:blank') {
          await newPage.goto(currentUrl, { waitUntil: 'domcontentloaded' });
        }

        // Update global page reference
        const { setGlobalPage } = await import('../../toolHandler.js');
        setGlobalPage(newPage);

        // Update recording state
        recordingState = {
          isRecording: true,
          videoPath: fullPath,
          startTime: Date.now(),
          settings: {
            ...recordingState.settings,
            recordOnFailure
          },
          annotations: []
        };

        return createSuccessResponse([
          `Video recording started`,
          `Output path: ${fullPath}`,
          `Record on failure: ${recordOnFailure}`,
          `Size: ${videoSize ? `${videoSize.width}x${videoSize.height}` : 'default'}`,
          `Started at: ${new Date().toLocaleString()}`
        ]);

      } catch (error) {
        recordingState.isRecording = false;
        return createErrorResponse(`Failed to start video recording: ${(error as Error).message}`);
      }
    });
  }
}

/**
 * Tool for stopping video recording
 */
export class StopVideoRecordingTool extends BrowserToolBase {
  /**
   * Execute the stop video recording tool
   */
  async execute(args: any, context: ToolContext): Promise<ToolResponse> {
    return this.safeExecute(context, async (page) => {
      try {
        // Check if recording
        if (!recordingState.isRecording) {
          return createErrorResponse('No video recording is in progress.');
        }

        const {
          saveVideo = true,
          customPath
        } = args;

        // Get video path before closing
        const videoPath = await page.video()?.path();

        if (!videoPath) {
          recordingState.isRecording = false;
          return createErrorResponse('Video recording path is not available.');
        }

        // Close the page to finalize the video
        const browserContext = page.context();
        const currentUrl = page.url();
        await page.close();

        // Wait a bit for video to be written
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Calculate recording duration
        const duration = recordingState.startTime
          ? Math.round((Date.now() - recordingState.startTime) / 1000)
          : 0;

        let finalPath = videoPath;

        // Handle video file
        if (saveVideo) {
          // Move to custom path if specified
          if (customPath) {
            const customDir = path.dirname(customPath);
            if (!fs.existsSync(customDir)) {
              fs.mkdirSync(customDir, { recursive: true });
            }

            // Wait for file to be fully written
            let retries = 10;
            while (retries > 0 && !fs.existsSync(videoPath)) {
              await new Promise(resolve => setTimeout(resolve, 500));
              retries--;
            }

            if (fs.existsSync(videoPath)) {
              fs.renameSync(videoPath, customPath);
              finalPath = customPath;
            }
          }

          // Save annotations if any
          if (recordingState.annotations.length > 0) {
            const annotationsPath = finalPath.replace(/\.[^.]+$/, '-annotations.json');
            const annotationsData = {
              videoFile: path.basename(finalPath),
              duration: duration,
              annotations: recordingState.annotations,
              recordingStart: new Date(recordingState.startTime!).toISOString()
            };
            fs.writeFileSync(annotationsPath, JSON.stringify(annotationsData, null, 2));
          }
        } else {
          // Delete video if not saving
          if (fs.existsSync(videoPath)) {
            fs.unlinkSync(videoPath);
          }
        }

        // Create new context without video recording
        const browser = context.browser!;
        const newContext = await browser.newContext({
          viewport: { width: 1280, height: 720 }
        });
        const newPage = await newContext.newPage();

        // Navigate back to the previous URL
        if (currentUrl && currentUrl !== 'about:blank') {
          await newPage.goto(currentUrl, { waitUntil: 'domcontentloaded' });
        }

        // Update global page reference
        const { setGlobalPage } = await import('../../toolHandler.js');
        setGlobalPage(newPage);

        // Reset recording state
        const annotationCount = recordingState.annotations.length;
        recordingState = {
          isRecording: false,
          settings: recordingState.settings,
          annotations: []
        };

        const result = [
          `Video recording stopped`,
          `Duration: ${duration} seconds`,
          `Annotations: ${annotationCount}`,
          `Stopped at: ${new Date().toLocaleString()}`
        ];

        if (saveVideo) {
          result.push(`Video saved: ${finalPath}`);
          if (annotationCount > 0) {
            result.push(`Annotations saved: ${finalPath.replace(/\.[^.]+$/, '-annotations.json')}`);
          }
        } else {
          result.push(`Video discarded (not saved)`);
        }

        return createSuccessResponse(result);

      } catch (error) {
        recordingState.isRecording = false;
        return createErrorResponse(`Failed to stop video recording: ${(error as Error).message}`);
      }
    });
  }
}

/**
 * Tool for adding annotations/timestamps to video recording
 */
export class AddVideoAnnotationTool extends BrowserToolBase {
  /**
   * Execute the add video annotation tool
   */
  async execute(args: any, context: ToolContext): Promise<ToolResponse> {
    return this.safeExecute(context, async (page) => {
      try {
        if (!recordingState.isRecording) {
          return createErrorResponse('No video recording is in progress.');
        }

        const { message, timestamp } = args;

        if (!message) {
          return createErrorResponse('Annotation message is required.');
        }

        // Calculate timestamp from recording start
        const recordingTimestamp = recordingState.startTime
          ? Date.now() - recordingState.startTime
          : 0;

        // Add annotation
        recordingState.annotations.push({
          timestamp: timestamp || recordingTimestamp,
          message: message
        });

        // Format timestamp as MM:SS
        const seconds = Math.floor(recordingTimestamp / 1000);
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        const timeStr = `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;

        return createSuccessResponse([
          `Annotation added at ${timeStr}`,
          `Message: "${message}"`,
          `Total annotations: ${recordingState.annotations.length}`
        ]);

      } catch (error) {
        return createErrorResponse(`Failed to add video annotation: ${(error as Error).message}`);
      }
    });
  }
}

/**
 * Tool for configuring video recording settings
 */
export class ConfigureVideoSettingsTool extends BrowserToolBase {
  /**
   * Execute the configure video settings tool
   */
  async execute(args: any, context: ToolContext): Promise<ToolResponse> {
    return this.safeExecute(context, async (page) => {
      try {
        const {
          outputDir,
          size,
          recordOnFailure,
          quality,
          fps
        } = args;

        // Update settings
        if (outputDir !== undefined) {
          recordingState.settings.dir = outputDir;

          // Ensure directory exists
          if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
          }
        }

        if (size !== undefined) {
          recordingState.settings.size = size;
        }

        if (recordOnFailure !== undefined) {
          recordingState.settings.recordOnFailure = recordOnFailure;
        }

        if (quality !== undefined) {
          if (quality < 0 || quality > 100) {
            return createErrorResponse('Quality must be between 0 and 100.');
          }
          recordingState.settings.quality = quality;
        }

        if (fps !== undefined) {
          if (fps < 1 || fps > 60) {
            return createErrorResponse('FPS must be between 1 and 60.');
          }
          recordingState.settings.fps = fps;
        }

        return createSuccessResponse([
          `Video recording settings updated`,
          `Output directory: ${recordingState.settings.dir}`,
          `Size: ${recordingState.settings.size ? `${recordingState.settings.size.width}x${recordingState.settings.size.height}` : 'default'}`,
          `Record on failure: ${recordingState.settings.recordOnFailure}`,
          `Quality: ${recordingState.settings.quality}%`,
          `FPS: ${recordingState.settings.fps}`
        ]);

      } catch (error) {
        return createErrorResponse(`Failed to configure video settings: ${(error as Error).message}`);
      }
    });
  }
}

/**
 * Tool for getting video recording status
 */
export class GetVideoStatusTool extends BrowserToolBase {
  /**
   * Execute the get video status tool
   */
  async execute(args: any, context: ToolContext): Promise<ToolResponse> {
    return this.safeExecute(context, async (page) => {
      try {
        if (!recordingState.isRecording) {
          return createSuccessResponse([
            `No video recording in progress`,
            `Settings:`,
            `  Output directory: ${recordingState.settings.dir}`,
            `  Size: ${recordingState.settings.size ? `${recordingState.settings.size.width}x${recordingState.settings.size.height}` : 'default'}`,
            `  Record on failure: ${recordingState.settings.recordOnFailure}`
          ]);
        }

        // Calculate current duration
        const duration = recordingState.startTime
          ? Math.round((Date.now() - recordingState.startTime) / 1000)
          : 0;

        const minutes = Math.floor(duration / 60);
        const seconds = duration % 60;
        const durationStr = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

        return createSuccessResponse([
          `Video recording in progress`,
          `Output path: ${recordingState.videoPath}`,
          `Duration: ${durationStr}`,
          `Annotations: ${recordingState.annotations.length}`,
          `Started at: ${new Date(recordingState.startTime!).toLocaleString()}`,
          `Record on failure: ${recordingState.settings.recordOnFailure}`
        ]);

      } catch (error) {
        return createErrorResponse(`Failed to get video status: ${(error as Error).message}`);
      }
    });
  }
}

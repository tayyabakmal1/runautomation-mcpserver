/**
 * Author: Tayyab Akmal
 * Linkedin: https://www.linkedin.com/in/tayyab-sqa-engineer/
 */

import { BrowserToolBase } from './base.js';
import { ToolContext, ToolResponse, createSuccessResponse, createErrorResponse } from '../common/types.js';

/**
 * Tool for handling file downloads
 */
export class DownloadFileTool extends BrowserToolBase {
  /**
   * Execute the download file tool
   */
  async execute(args: any, context: ToolContext): Promise<ToolResponse> {
    return this.safeExecute(context, async (page) => {
      const timeout = args.timeout || 30000;

      // Set up download promise before triggering download
      const downloadPromise = page.waitForEvent('download', { timeout });

      // Trigger the download
      if (args.triggerSelector) {
        await page.click(args.triggerSelector);
      }

      // Wait for download to start
      const download = await downloadPromise;

      // Get suggested filename
      const suggestedFilename = download.suggestedFilename();

      // Optionally validate expected filename
      if (args.expectedFileName && suggestedFilename !== args.expectedFileName) {
        return createErrorResponse(
          `Download filename mismatch. Expected: ${args.expectedFileName}, Got: ${suggestedFilename}`
        );
      }

      // Save to downloads directory or specified path
      const downloadPath = args.savePath || `downloads/${suggestedFilename}`;
      await download.saveAs(downloadPath);

      return createSuccessResponse([
        `File downloaded successfully`,
        `Filename: ${suggestedFilename}`,
        `Saved to: ${downloadPath}`,
        `Size: ${await download.path() ? 'Available' : 'N/A'}`
      ]);
    });
  }
}

/**
 * Tool for copying text to clipboard
 */
export class CopyToClipboardTool extends BrowserToolBase {
  /**
   * Execute the copy to clipboard tool
   */
  async execute(args: any, context: ToolContext): Promise<ToolResponse> {
    return this.safeExecute(context, async (page) => {
      const { text } = args;

      // Grant clipboard permissions
      await context.browser?.contexts()[0]?.grantPermissions(['clipboard-read', 'clipboard-write']);

      // Use JavaScript to copy to clipboard
      await page.evaluate((textToCopy) => {
        return navigator.clipboard.writeText(textToCopy);
      }, text);

      return createSuccessResponse(`Copied text to clipboard: "${text.substring(0, 50)}${text.length > 50 ? '...' : ''}"`);
    });
  }
}

/**
 * Tool for reading text from clipboard
 */
export class ReadClipboardTool extends BrowserToolBase {
  /**
   * Execute the read clipboard tool
   */
  async execute(args: any, context: ToolContext): Promise<ToolResponse> {
    return this.safeExecute(context, async (page) => {
      // Grant clipboard permissions
      await context.browser?.contexts()[0]?.grantPermissions(['clipboard-read', 'clipboard-write']);

      // Read from clipboard
      const clipboardText = await page.evaluate(() => {
        return navigator.clipboard.readText();
      });

      return createSuccessResponse([
        `Clipboard content:`,
        clipboardText || '(empty)'
      ]);
    });
  }
}

/**
 * Tool for handling native browser dialogs (alert, confirm, prompt)
 */
export class HandleDialogTool extends BrowserToolBase {
  /**
   * Execute the handle dialog tool
   */
  async execute(args: any, context: ToolContext): Promise<ToolResponse> {
    return this.safeExecute(context, async (page) => {
      const { action, promptText } = args;

      // Set up dialog handler
      page.once('dialog', async (dialog) => {
        const dialogType = dialog.type();
        const dialogMessage = dialog.message();

        if (action === 'accept') {
          await dialog.accept(promptText);
        } else if (action === 'dismiss') {
          await dialog.dismiss();
        }
      });

      return createSuccessResponse(`Dialog handler registered: will ${action} the next dialog`);
    });
  }
}

/**
 * Tool for expecting and validating dialog messages
 */
export class ExpectDialogTool extends BrowserToolBase {
  /**
   * Execute the expect dialog tool
   */
  async execute(args: any, context: ToolContext): Promise<ToolResponse> {
    return this.safeExecute(context, async (page) => {
      const { expectedMessage, action = 'accept', promptText, timeout = 5000 } = args;

      try {
        // Wait for dialog with timeout
        const dialog = await page.waitForEvent('dialog', { timeout });

        const actualMessage = dialog.message();
        const dialogType = dialog.type();

        // Validate message
        let messageMatches = false;
        if (args.exactMatch !== false) {
          messageMatches = actualMessage === expectedMessage;
        } else {
          messageMatches = actualMessage.includes(expectedMessage);
        }

        // Handle the dialog
        if (action === 'accept') {
          await dialog.accept(promptText);
        } else {
          await dialog.dismiss();
        }

        if (!messageMatches) {
          return createErrorResponse(
            `Dialog message mismatch\nExpected: "${expectedMessage}"\nActual: "${actualMessage}"`
          );
        }

        return createSuccessResponse([
          `Dialog validated and ${action}ed`,
          `Type: ${dialogType}`,
          `Message: "${actualMessage}"`
        ]);
      } catch (error) {
        return createErrorResponse(`No dialog appeared within ${timeout}ms: ${(error as Error).message}`);
      }
    });
  }
}

/**
 * Tool for dragging to specific coordinates
 */
export class DragToPositionTool extends BrowserToolBase {
  /**
   * Execute the drag to position tool
   */
  async execute(args: any, context: ToolContext): Promise<ToolResponse> {
    return this.safeExecute(context, async (page) => {
      const { sourceSelector, targetX, targetY, steps = 10 } = args;

      // Get source element
      const sourceElement = await page.waitForSelector(sourceSelector);
      if (!sourceElement) {
        return createErrorResponse(`Source element not found: ${sourceSelector}`);
      }

      // Get source element position
      const sourceBound = await sourceElement.boundingBox();
      if (!sourceBound) {
        return createErrorResponse(`Could not get source element bounding box`);
      }

      // Calculate source center
      const sourceX = sourceBound.x + sourceBound.width / 2;
      const sourceY = sourceBound.y + sourceBound.height / 2;

      // Perform drag with smooth steps
      await page.mouse.move(sourceX, sourceY);
      await page.mouse.down();

      // Move in steps for smooth animation
      const stepX = (targetX - sourceX) / steps;
      const stepY = (targetY - sourceY) / steps;

      for (let i = 1; i <= steps; i++) {
        await page.mouse.move(
          sourceX + stepX * i,
          sourceY + stepY * i
        );
      }

      await page.mouse.up();

      return createSuccessResponse([
        `Dragged element from (${Math.round(sourceX)}, ${Math.round(sourceY)}) to (${targetX}, ${targetY})`,
        `Steps: ${steps}`
      ]);
    });
  }
}

/**
 * Tool for getting element coordinates
 */
export class GetElementPositionTool extends BrowserToolBase {
  /**
   * Execute the get element position tool
   */
  async execute(args: any, context: ToolContext): Promise<ToolResponse> {
    return this.safeExecute(context, async (page) => {
      const { selector } = args;

      const element = await page.waitForSelector(selector);
      if (!element) {
        return createErrorResponse(`Element not found: ${selector}`);
      }

      const boundingBox = await element.boundingBox();
      if (!boundingBox) {
        return createErrorResponse(`Could not get element bounding box`);
      }

      const centerX = Math.round(boundingBox.x + boundingBox.width / 2);
      const centerY = Math.round(boundingBox.y + boundingBox.height / 2);

      return createSuccessResponse([
        `Element position for: ${selector}`,
        `X: ${Math.round(boundingBox.x)}`,
        `Y: ${Math.round(boundingBox.y)}`,
        `Width: ${Math.round(boundingBox.width)}`,
        `Height: ${Math.round(boundingBox.height)}`,
        `Center X: ${centerX}`,
        `Center Y: ${centerY}`
      ]);
    });
  }
}

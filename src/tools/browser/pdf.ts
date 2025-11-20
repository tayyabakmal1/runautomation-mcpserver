/**
 * Author: Tayyab Akmal
 * Linkedin: https://www.linkedin.com/in/tayyab-sqa-engineer/
 */

import fs from 'node:fs';
import * as path from 'node:path';
import type { Page, Download } from 'playwright';
import { BrowserToolBase } from './base.js';
import { ToolContext, ToolResponse, createSuccessResponse, createErrorResponse } from '../common/types.js';

// PDF parsing will be done using pdf-parse library
// Import will be dynamic to avoid build errors if not installed
let pdfParse: any = null;

/**
 * Dynamically import pdf-parse library
 */
async function getPdfParse() {
  if (!pdfParse) {
    try {
      pdfParse = (await import('pdf-parse')).default;
    } catch (error) {
      throw new Error('pdf-parse library is not installed. Run: npm install pdf-parse');
    }
  }
  return pdfParse;
}

/**
 * Extract text content from a PDF file
 */
export class ExtractPdfTextTool extends BrowserToolBase {
  async execute(args: any, context: ToolContext): Promise<ToolResponse> {
    try {
      const pdfPath = args.pdfPath;

      if (!pdfPath) {
        return createErrorResponse('pdfPath is required');
      }

      // Check if file exists
      if (!fs.existsSync(pdfPath)) {
        return createErrorResponse(`PDF file not found: ${pdfPath}`);
      }

      // Read PDF file
      const dataBuffer = fs.readFileSync(pdfPath);

      // Parse PDF
      const parse = await getPdfParse();
      const data = await parse(dataBuffer);

      const result = {
        text: data.text,
        pages: data.numpages,
        info: data.info,
        metadata: data.metadata,
        version: data.version
      };

      // Optionally save text to file
      if (args.saveToFile) {
        const outputPath = args.saveToFile;
        fs.writeFileSync(outputPath, data.text, 'utf8');

        return createSuccessResponse([
          `\u{1F4C4} PDF Text Extraction Complete`,
          ``,
          `File: ${path.basename(pdfPath)}`,
          `Pages: ${data.numpages}`,
          `Characters: ${data.text.length}`,
          ``,
          `\u{1F4BE} Text saved to: ${outputPath}`,
          ``,
          `Preview (first 500 characters):`,
          `${data.text.substring(0, 500)}${data.text.length > 500 ? '...' : ''}`
        ]);
      }

      return createSuccessResponse([
        `\u{1F4C4} PDF Text Extraction Complete`,
        ``,
        `File: ${path.basename(pdfPath)}`,
        `Pages: ${data.numpages}`,
        `Characters: ${data.text.length}`,
        ``,
        `Extracted Text:`,
        `${data.text}`
      ]);
    } catch (error) {
      return createErrorResponse(`Failed to extract PDF text: ${(error as Error).message}`);
    }
  }
}

/**
 * Validate that a PDF contains specific text content
 */
export class ValidatePdfContentTool extends BrowserToolBase {
  async execute(args: any, context: ToolContext): Promise<ToolResponse> {
    try {
      const pdfPath = args.pdfPath;
      const expectedText = args.expectedText;
      const caseSensitive = args.caseSensitive !== false; // default true
      const exactMatch = args.exactMatch === true; // default false

      if (!pdfPath) {
        return createErrorResponse('pdfPath is required');
      }

      if (!expectedText) {
        return createErrorResponse('expectedText is required');
      }

      // Check if file exists
      if (!fs.existsSync(pdfPath)) {
        return createErrorResponse(`PDF file not found: ${pdfPath}`);
      }

      // Read and parse PDF
      const dataBuffer = fs.readFileSync(pdfPath);
      const parse = await getPdfParse();
      const data = await parse(dataBuffer);

      const pdfText = data.text;
      let searchText = expectedText;
      let textToSearch = pdfText;

      // Handle case sensitivity
      if (!caseSensitive) {
        searchText = searchText.toLowerCase();
        textToSearch = textToSearch.toLowerCase();
      }

      // Check for match
      let found = false;
      if (exactMatch) {
        found = textToSearch === searchText;
      } else {
        found = textToSearch.includes(searchText);
      }

      if (found) {
        // Count occurrences
        const occurrences = textToSearch.split(searchText).length - 1;

        return createSuccessResponse([
          `\u{2705} PDF Content Validation PASSED`,
          ``,
          `File: ${path.basename(pdfPath)}`,
          `Pages: ${data.numpages}`,
          `Expected Text: "${expectedText}"`,
          `Match Type: ${exactMatch ? 'Exact Match' : 'Contains'}`,
          `Case Sensitive: ${caseSensitive}`,
          ``,
          `\u{2705} Text found ${occurrences} time(s) in the PDF`
        ]);
      } else {
        return {
          content: [{
            type: "text",
            text: [
              `\u{274C} PDF Content Validation FAILED`,
              ``,
              `File: ${path.basename(pdfPath)}`,
              `Pages: ${data.numpages}`,
              `Expected Text: "${expectedText}"`,
              `Match Type: ${exactMatch ? 'Exact Match' : 'Contains'}`,
              `Case Sensitive: ${caseSensitive}`,
              ``,
              `\u{274C} Expected text NOT found in the PDF`,
              ``,
              `PDF Content Preview (first 500 characters):`,
              `${pdfText.substring(0, 500)}${pdfText.length > 500 ? '...' : ''}`
            ].join('\n')
          }],
          isError: true
        };
      }
    } catch (error) {
      return createErrorResponse(`Failed to validate PDF content: ${(error as Error).message}`);
    }
  }
}

/**
 * Count the number of pages in a PDF file
 */
export class CountPdfPagesTool extends BrowserToolBase {
  async execute(args: any, context: ToolContext): Promise<ToolResponse> {
    try {
      const pdfPath = args.pdfPath;

      if (!pdfPath) {
        return createErrorResponse('pdfPath is required');
      }

      // Check if file exists
      if (!fs.existsSync(pdfPath)) {
        return createErrorResponse(`PDF file not found: ${pdfPath}`);
      }

      // Read and parse PDF
      const dataBuffer = fs.readFileSync(pdfPath);
      const parse = await getPdfParse();
      const data = await parse(dataBuffer);

      const fileStats = fs.statSync(pdfPath);
      const fileSizeKB = (fileStats.size / 1024).toFixed(2);

      return createSuccessResponse([
        `\u{1F4CA} PDF Page Count`,
        ``,
        `File: ${path.basename(pdfPath)}`,
        `Path: ${pdfPath}`,
        `Size: ${fileSizeKB} KB`,
        ``,
        `\u{1F4C4} Total Pages: ${data.numpages}`,
        ``,
        `PDF Info:`,
        `  \u{2022} Title: ${data.info?.Title || 'N/A'}`,
        `  \u{2022} Author: ${data.info?.Author || 'N/A'}`,
        `  \u{2022} Subject: ${data.info?.Subject || 'N/A'}`,
        `  \u{2022} Creator: ${data.info?.Creator || 'N/A'}`,
        `  \u{2022} Producer: ${data.info?.Producer || 'N/A'}`,
        `  \u{2022} PDF Version: ${data.version || 'N/A'}`,
        ``,
        `Text Content:`,
        `  \u{2022} Total Characters: ${data.text.length}`,
        `  \u{2022} Average Characters per Page: ${Math.round(data.text.length / data.numpages)}`
      ]);
    } catch (error) {
      return createErrorResponse(`Failed to count PDF pages: ${(error as Error).message}`);
    }
  }
}

/**
 * Download a PDF from the browser and optionally extract its content
 * This tool is useful when testing PDF download functionality
 */
export class DownloadAndExtractPdfTool extends BrowserToolBase {
  async execute(args: any, context: ToolContext): Promise<ToolResponse> {
    return this.safeExecute(context, async (page) => {
      try {
        const triggerSelector = args.triggerSelector;
        const expectedFileName = args.expectedFileName;
        const extractText = args.extractText !== false; // default true
        const savePath = args.savePath;
        const timeout = args.timeout || 30000;

        if (!triggerSelector) {
          return createErrorResponse('triggerSelector is required');
        }

        // Set up download handler
        const downloadPromise = page.waitForEvent('download', { timeout });

        // Trigger the download
        await page.click(triggerSelector);

        // Wait for download to start
        const download = await downloadPromise;

        // Get suggested filename
        const suggestedFilename = download.suggestedFilename();

        // Validate filename if expected
        if (expectedFileName && suggestedFilename !== expectedFileName) {
          return createErrorResponse(
            `Downloaded filename "${suggestedFilename}" does not match expected "${expectedFileName}"`
          );
        }

        // Determine save path
        const finalSavePath = savePath || path.join('downloads', suggestedFilename);
        const saveDir = path.dirname(finalSavePath);

        // Create directory if it doesn't exist
        if (!fs.existsSync(saveDir)) {
          fs.mkdirSync(saveDir, { recursive: true });
        }

        // Save the file
        await download.saveAs(finalSavePath);

        const fileStats = fs.statSync(finalSavePath);
        const fileSizeKB = (fileStats.size / 1024).toFixed(2);

        // Extract text if requested
        if (extractText && finalSavePath.toLowerCase().endsWith('.pdf')) {
          try {
            const dataBuffer = fs.readFileSync(finalSavePath);
            const parse = await getPdfParse();
            const data = await parse(dataBuffer);

            return createSuccessResponse([
              `\u{2705} PDF Download and Extraction Complete`,
              ``,
              `Downloaded File: ${suggestedFilename}`,
              `Saved To: ${finalSavePath}`,
              `File Size: ${fileSizeKB} KB`,
              ``,
              `\u{1F4C4} PDF Content:`,
              `  \u{2022} Pages: ${data.numpages}`,
              `  \u{2022} Characters: ${data.text.length}`,
              ``,
              `Text Preview (first 500 characters):`,
              `${data.text.substring(0, 500)}${data.text.length > 500 ? '...' : ''}`
            ]);
          } catch (extractError) {
            return createSuccessResponse([
              `\u{2705} PDF Downloaded Successfully`,
              ``,
              `Downloaded File: ${suggestedFilename}`,
              `Saved To: ${finalSavePath}`,
              `File Size: ${fileSizeKB} KB`,
              ``,
              `\u{26A0}\uFE0F Could not extract PDF text: ${(extractError as Error).message}`
            ]);
          }
        }

        return createSuccessResponse([
          `\u{2705} File Downloaded Successfully`,
          ``,
          `Downloaded File: ${suggestedFilename}`,
          `Saved To: ${finalSavePath}`,
          `File Size: ${fileSizeKB} KB`
        ]);
      } catch (error) {
        return createErrorResponse(`Failed to download PDF: ${(error as Error).message}`);
      }
    });
  }
}

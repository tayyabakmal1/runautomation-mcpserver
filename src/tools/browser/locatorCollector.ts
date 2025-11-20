/**
 * Author: Tayyab Akmal
 * Linkedin: https://www.linkedin.com/in/tayyab-sqa-engineer/
 */

import * as fs from 'fs';
import * as path from 'path';
import type { Page } from 'playwright';
import { BrowserToolBase } from './base.js';
import { ToolContext, ToolResponse, createErrorResponse, createSuccessResponse } from '../common/types.js';

/**
 * Interface for collected locator information
 */
interface CollectedLocator {
  name: string;
  locatorStrategy: string;
  locatorValue: string;
  elementType: string;
  locatorCode: string;
  section: string; // Section/region this locator belongs to
  stability: number; // Stability score 1-5 (5 = most stable)
}

/**
 * Interface for candidate locator
 */
interface CandidateLocator {
  priority: number;
  strategy: string;
  value: string;
  code: string;
}

/**
 * Configuration options for locator collection
 */
interface CollectorConfig {
  includeText: boolean;           // Collect text elements
  includeHiddenElements: boolean; // Include hidden elements
  minTextLength: number;          // Minimum text length
  maxTextLength: number;          // Maximum text length
  excludeSelectors: string[];     // CSS selectors to exclude
  customAttributes: string[];     // Custom data attributes for testing
}

/**
 * Interface for tracking locator changes
 */
interface LocatorChange {
  type: 'added' | 'removed' | 'modified' | 'unchanged';
  name: string;
  oldCode?: string;
  newCode?: string;
  details?: string;
}

/**
 * Tool for collecting all visible locators on the current page
 * and generating a Page Object Model file
 */
export class CollectLocatorsTool extends BrowserToolBase {
  /**
   * Execute the collect locators tool
   */
  async execute(args: any, context: ToolContext): Promise<ToolResponse> {
    return this.safeExecute(context, async (page) => {
      try {
        const {
          outputDir = './pageObjects',
          language = 'typescript',
          urls = [], // Array of URLs for batch collection
          // Filtering options with defaults
          includeText = true,
          includeHiddenElements = false,
          minTextLength = 2,
          maxTextLength = 200,
          excludeSelectors = [],
          customAttributes = []
        } = args;

        // Build configuration
        const config: CollectorConfig = {
          includeText,
          includeHiddenElements,
          minTextLength,
          maxTextLength,
          excludeSelectors: Array.isArray(excludeSelectors) ? excludeSelectors : [],
          customAttributes: Array.isArray(customAttributes) ? customAttributes : []
        };

        // Check if batch mode is enabled
        if (urls && Array.isArray(urls) && urls.length > 0) {
          return await this.executeBatchCollection(page, urls, outputDir, language, config);
        }

        // Single page collection (current behavior)
        // Collect all visible elements with their locators
        const locators = await this.collectVisibleLocators(page, config);

        if (locators.length === 0) {
          return createSuccessResponse(
            'No suitable locators found on the current page. ' +
            'The page may not have elements with stable, unique selectors.'
          );
        }

        // Check for existing file and detect changes
        const pageUrl = page.url();
        const pageTitle = await page.title();
        const pageName = this.derivePageName(pageTitle, pageUrl);
        const fullOutputDir = path.isAbsolute(outputDir) ? outputDir : path.join(process.cwd(), outputDir);
        const fileExtension = language === 'typescript' ? 'ts' : 'js';
        const expectedFilePath = path.join(fullOutputDir, `${pageName}.${fileExtension}`);

        // Parse previous locators if file exists
        const previousLocators = this.parseExistingPageObject(expectedFilePath);
        const changes = this.detectChanges(locators, previousLocators);

        // Generate Page Object Model file
        const pageInfo = await this.generatePageObjectFile(page, locators, outputDir, language);

        // Read the generated file content for preview
        const fileContent = fs.readFileSync(pageInfo.filePath, 'utf-8');

        // Group locators by section for output
        const locatorsBySection = new Map<string, CollectedLocator[]>();
        locators.forEach(loc => {
          const section = loc.section || 'Main Content';
          if (!locatorsBySection.has(section)) {
            locatorsBySection.set(section, []);
          }
          locatorsBySection.get(section)!.push(loc);
        });

        // Sort sections
        const sectionOrder = ['Header', 'Navigation', 'Hero Section', 'Main Content', 'Sidebar', 'Footer', 'Modal', 'Form'];
        const sortedSections = Array.from(locatorsBySection.keys()).sort((a, b) => {
          const aIndex = sectionOrder.findIndex(s => a.includes(s));
          const bIndex = sectionOrder.findIndex(s => b.includes(s));
          if (aIndex === -1 && bIndex === -1) return a.localeCompare(b);
          if (aIndex === -1) return 1;
          if (bIndex === -1) return -1;
          return aIndex - bIndex;
        });

        // Calculate stability statistics
        const stabilityCount = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
        locators.forEach(loc => {
          stabilityCount[loc.stability as keyof typeof stabilityCount]++;
        });

        // Build filter info lines
        const filterInfo = [
          `=== Filter Configuration ===`,
          `Text Elements: ${config.includeText ? 'Enabled' : 'Disabled'}`,
          `Hidden Elements: ${config.includeHiddenElements ? 'Included' : 'Excluded'}`,
          `Text Length: ${config.minTextLength}-${config.maxTextLength} characters`
        ];

        if (config.excludeSelectors.length > 0) {
          filterInfo.push(`Excluded Selectors: ${config.excludeSelectors.join(', ')}`);
        }
        if (config.customAttributes.length > 0) {
          filterInfo.push(`Custom Attributes: ${config.customAttributes.join(', ')}`);
        }

        // Build change summary if there were previous locators
        const changeInfo: string[] = [];
        if (previousLocators.size > 0) {
          const added = changes.filter(c => c.type === 'added');
          const removed = changes.filter(c => c.type === 'removed');
          const modified = changes.filter(c => c.type === 'modified');
          const unchanged = changes.filter(c => c.type === 'unchanged');

          changeInfo.push(`=== Changes from Previous Collection ===`);
          changeInfo.push(``);

          // Show summary counts
          changeInfo.push(`✓ ${unchanged.length} unchanged`);
          if (added.length > 0) changeInfo.push(`+ ${added.length} added`);
          if (removed.length > 0) changeInfo.push(`- ${removed.length} removed`);
          if (modified.length > 0) changeInfo.push(`~ ${modified.length} modified`);
          changeInfo.push(``);

          // Show details for added locators
          if (added.length > 0) {
            changeInfo.push(`Added Locators:`);
            added.forEach(change => {
              changeInfo.push(`  + ${change.name} (${change.details})`);
            });
            changeInfo.push(``);
          }

          // Show details for removed locators
          if (removed.length > 0) {
            changeInfo.push(`Removed Locators:`);
            removed.forEach(change => {
              changeInfo.push(`  - ${change.name} (${change.details})`);
            });
            changeInfo.push(``);
          }

          // Show details for modified locators
          if (modified.length > 0) {
            changeInfo.push(`Modified Locators:`);
            modified.forEach(change => {
              changeInfo.push(`  ~ ${change.name} (${change.details})`);
              changeInfo.push(`    Old: ${change.oldCode}`);
              changeInfo.push(`    New: ${change.newCode}`);
            });
            changeInfo.push(``);
          }
        }

        // Build detailed output
        const output: string[] = [
          `✓ Successfully collected ${locators.length} locators from the page`,
          `✓ Generated Page Object file: ${pageInfo.filePath}`,
          `✓ Page: ${pageInfo.pageName}`,
          `✓ Language: ${language}`,
          `✓ Sections: ${sortedSections.length}`,
          ``,
          ...filterInfo,
          ``,
          ...(changeInfo.length > 0 ? [...changeInfo] : []),
          `=== Stability Summary ===`,
          `⭐⭐⭐⭐⭐ (5-star): ${stabilityCount[5]} locators - data-testid attributes`,
          `⭐⭐⭐⭐☆ (4-star): ${stabilityCount[4]} locators - Role-based with accessible names`,
          `⭐⭐⭐☆☆ (3-star): ${stabilityCount[3]} locators - Stable IDs`,
          `⭐⭐☆☆☆ (2-star): ${stabilityCount[2]} locators - CSS selectors`,
          `⭐☆☆☆☆ (1-star): ${stabilityCount[1]} locators - Text-based (least stable)`,
          ``,
          `=== Collected Locators by Section (${locators.length}) ===`,
          ``
        ];

        // Add locators grouped by section
        let locatorIndex = 1;
        sortedSections.forEach(section => {
          const sectionLocators = locatorsBySection.get(section)!;
          output.push(`--- ${section} (${sectionLocators.length} locators) ---`);
          output.push(``);

          sectionLocators.forEach(loc => {
            const stars = this.getStabilityStars(loc.stability);
            output.push(`${locatorIndex}. ${loc.name}`);
            output.push(`   Strategy: ${loc.locatorStrategy}`);
            output.push(`   Type: ${loc.elementType}`);
            output.push(`   Stability: ${stars} (${loc.stability}/5) - ${this.getStabilityDescription(loc.locatorStrategy)}`);
            output.push(`   Code: ${loc.locatorCode}`);
            output.push(``);
            locatorIndex++;
          });
        });

        output.push(`=== Generated Page Object File ===`);
        output.push(``);
        output.push(fileContent);

        return createSuccessResponse(output);
      } catch (error) {
        return createErrorResponse(`Failed to collect locators: ${(error as Error).message}`);
      }
    });
  }

  /**
   * Execute batch collection from multiple URLs
   */
  private async executeBatchCollection(
    page: Page,
    urls: string[],
    outputDir: string,
    language: 'typescript' | 'javascript',
    config: CollectorConfig
  ): Promise<ToolResponse> {
    const results: any[] = [];
    const errors: string[] = [];
    const generatedFiles: string[] = [];

    // Get base URL from current page
    const currentUrl = page.url();
    const baseUrl = new URL(currentUrl).origin;

    for (const url of urls) {
      try {
        // Construct full URL (handle relative and absolute URLs)
        const fullUrl = url.startsWith('http') ? url : `${baseUrl}${url.startsWith('/') ? url : '/' + url}`;

        // Navigate to the URL
        await page.goto(fullUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });

        // Wait a bit for dynamic content to load
        await page.waitForTimeout(1000);

        // Collect locators for this page
        const locators = await this.collectVisibleLocators(page, config);

        if (locators.length === 0) {
          errors.push(`${url}: No suitable locators found`);
          continue;
        }

        // Check for existing file and detect changes
        const pageTitle = await page.title();
        const pageName = this.derivePageName(pageTitle, fullUrl);
        const fullOutputDir = path.isAbsolute(outputDir) ? outputDir : path.join(process.cwd(), outputDir);
        const fileExtension = language === 'typescript' ? 'ts' : 'js';
        const expectedFilePath = path.join(fullOutputDir, `${pageName}.${fileExtension}`);

        // Parse previous locators if file exists
        const previousLocators = this.parseExistingPageObject(expectedFilePath);
        const changes = this.detectChanges(locators, previousLocators);

        // Generate Page Object Model file
        const pageInfo = await this.generatePageObjectFile(page, locators, outputDir, language);

        generatedFiles.push(pageInfo.filePath);

        // Calculate stability statistics
        const stabilityCount = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
        locators.forEach(loc => {
          stabilityCount[loc.stability as keyof typeof stabilityCount]++;
        });

        // Build change summary if there were previous locators
        const changeInfo: string[] = [];
        if (previousLocators.size > 0) {
          const added = changes.filter(c => c.type === 'added').length;
          const removed = changes.filter(c => c.type === 'removed').length;
          const modified = changes.filter(c => c.type === 'modified').length;
          const unchanged = changes.filter(c => c.type === 'unchanged').length;

          changeInfo.push(`Changes: ✓${unchanged} +${added} -${removed} ~${modified}`);
        }

        results.push({
          url: url,
          pageName: pageInfo.pageName,
          filePath: pageInfo.filePath,
          locatorsCount: locators.length,
          stability: stabilityCount,
          changes: changeInfo.length > 0 ? changeInfo[0] : 'New file'
        });

      } catch (error) {
        errors.push(`${url}: ${(error as Error).message}`);
      }
    }

    // Build output summary
    const output: string[] = [
      `✓ Batch Collection Complete`,
      `✓ Processed ${urls.length} URLs`,
      `✓ Successfully generated ${generatedFiles.length} Page Object files`,
      `✓ Output directory: ${path.isAbsolute(outputDir) ? outputDir : path.join(process.cwd(), outputDir)}`,
      `✓ Language: ${language}`,
      ``,
      `=== Filter Configuration ===`,
      `Text Elements: ${config.includeText ? 'Enabled' : 'Disabled'}`,
      `Hidden Elements: ${config.includeHiddenElements ? 'Included' : 'Excluded'}`,
      `Text Length: ${config.minTextLength}-${config.maxTextLength} characters`
    ];

    if (config.excludeSelectors.length > 0) {
      output.push(`Excluded Selectors: ${config.excludeSelectors.join(', ')}`);
    }
    if (config.customAttributes.length > 0) {
      output.push(`Custom Attributes: ${config.customAttributes.join(', ')}`);
    }

    output.push('');
    output.push(`=== Generated Files ===`);
    output.push('');

    results.forEach((result, index) => {
      output.push(`${index + 1}. ${result.pageName}`);
      output.push(`   URL: ${result.url}`);
      output.push(`   File: ${result.filePath}`);
      output.push(`   Locators: ${result.locatorsCount}`);
      output.push(`   Stability: ⭐×${result.stability[5]} ⭐⭐⭐⭐×${result.stability[4]} ⭐⭐⭐×${result.stability[3]} ⭐⭐×${result.stability[2]} ⭐×${result.stability[1]}`);
      output.push(`   ${result.changes}`);
      output.push('');
    });

    if (errors.length > 0) {
      output.push(`=== Errors (${errors.length}) ===`);
      output.push('');
      errors.forEach((error, index) => {
        output.push(`${index + 1}. ${error}`);
      });
      output.push('');
    }

    output.push(`=== Summary ===`);
    output.push(`Total URLs: ${urls.length}`);
    output.push(`Successful: ${results.length}`);
    output.push(`Failed: ${errors.length}`);
    output.push('');
    output.push(`Generated files:`);
    generatedFiles.forEach(file => {
      output.push(`  - ${file}`);
    });

    return createSuccessResponse(output);
  }

  /**
   * Collect all visible elements and their best locators
   */
  private async collectVisibleLocators(page: Page, config: CollectorConfig): Promise<CollectedLocator[]> {
    // Execute the collection logic in the browser context
    const elementsData = await page.evaluate((cfg) => {
      const results: any[] = [];
      const usedNames = new Set<string>();

      // Helper: Check if element is visible
      function isVisible(element: Element): boolean {
        if (!(element instanceof HTMLElement)) return false;

        const style = window.getComputedStyle(element);
        if (style.display === 'none') return false;
        if (style.visibility === 'hidden') return false;
        if (style.opacity === '0') return false;
        if (element.getAttribute('aria-hidden') === 'true') return false;

        const rect = element.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) return false;

        return true;
      }

      // Helper: Check if element matches exclude selectors
      function shouldExclude(element: Element): boolean {
        if (!cfg.excludeSelectors || cfg.excludeSelectors.length === 0) return false;

        for (const selector of cfg.excludeSelectors) {
          try {
            if (element.matches(selector)) return true;
            // Also check if any ancestor matches
            if (element.closest(selector)) return true;
          } catch (e) {
            // Invalid selector, skip
            continue;
          }
        }
        return false;
      }

      // Helper: Generate a unique name
      function generateUniqueName(baseName: string): string {
        let name = baseName;
        let counter = 1;
        while (usedNames.has(name)) {
          name = `${baseName}${counter}`;
          counter++;
        }
        usedNames.add(name);
        return name;
      }

      // Helper: Convert text to camelCase
      function toCamelCase(text: string): string {
        return text
          .replace(/[^a-zA-Z0-9]+(.)/g, (_, chr) => chr.toUpperCase())
          .replace(/^[A-Z]/, (chr) => chr.toLowerCase())
          .replace(/[^a-zA-Z0-9]/g, '');
      }

      // Helper: Check if ID looks auto-generated
      function isStableId(id: string): boolean {
        // Avoid IDs that look like: id_12345, guid-xxx-xxx, react_123, etc.
        const unstablePatterns = [
          /^[a-z]+_\d+$/i,           // prefix_numbers
          /^[0-9a-f]{8}-[0-9a-f]{4}-/i, // GUID/UUID pattern
          /^react[-_]\d+/i,          // React generated
          /^ember\d+/i,              // Ember generated
          /^mui-\d+/i,               // Material-UI generated
          /^\d+$/,                   // Only numbers
        ];
        return !unstablePatterns.some(pattern => pattern.test(id));
      }

      // Helper: Get accessible name for role-based locators
      function getAccessibleName(element: Element): string | null {
        if (!(element instanceof HTMLElement)) return null;

        // Check aria-label
        const ariaLabel = element.getAttribute('aria-label');
        if (ariaLabel) return ariaLabel;

        // Check aria-labelledby
        const labelledBy = element.getAttribute('aria-labelledby');
        if (labelledBy) {
          const labelElement = document.getElementById(labelledBy);
          if (labelElement) return labelElement.textContent?.trim() || null;
        }

        // For form inputs, check associated label
        if (element instanceof HTMLInputElement ||
            element instanceof HTMLTextAreaElement ||
            element instanceof HTMLSelectElement) {
          const label = document.querySelector(`label[for="${element.id}"]`);
          if (label) return label.textContent?.trim() || null;

          // Check if wrapped in label
          const parentLabel = element.closest('label');
          if (parentLabel) {
            const text = parentLabel.textContent?.trim() || '';
            return text.replace(element.value || '', '').trim() || null;
          }
        }

        // For buttons and links, use text content
        if (element instanceof HTMLButtonElement ||
            element instanceof HTMLAnchorElement) {
          return element.textContent?.trim() || null;
        }

        return null;
      }

      // Helper: Get ARIA role
      function getRole(element: Element): string | null {
        // Explicit role
        const explicitRole = element.getAttribute('role');
        if (explicitRole) return explicitRole;

        // Implicit roles based on tag
        const tagName = element.tagName.toLowerCase();
        const implicitRoles: { [key: string]: string } = {
          'button': 'button',
          'a': 'link',
          'input': element.getAttribute('type') === 'button' || element.getAttribute('type') === 'submit' ? 'button' : 'textbox',
          'textarea': 'textbox',
          'select': 'combobox',
          'h1': 'heading',
          'h2': 'heading',
          'h3': 'heading',
          'h4': 'heading',
          'h5': 'heading',
          'h6': 'heading',
          'nav': 'navigation',
          'main': 'main',
          'header': 'banner',
          'footer': 'contentinfo',
          'aside': 'complementary',
          'img': 'img',
          'form': 'form',
        };

        return implicitRoles[tagName] || null;
      }

      // Helper: Generate CSS selector
      function generateCssSelector(element: Element): string | null {
        // Try name attribute for inputs
        if (element instanceof HTMLInputElement ||
            element instanceof HTMLTextAreaElement ||
            element instanceof HTMLSelectElement) {
          const name = element.getAttribute('name');
          if (name) {
            const tagName = element.tagName.toLowerCase();
            return `${tagName}[name="${name}"]`;
          }
        }

        // Try type attribute for inputs/buttons
        if (element instanceof HTMLInputElement || element instanceof HTMLButtonElement) {
          const type = element.getAttribute('type');
          if (type) {
            const tagName = element.tagName.toLowerCase();
            const selector = `${tagName}[type="${type}"]`;
            // Check if unique
            if (document.querySelectorAll(selector).length === 1) {
              return selector;
            }
          }
        }

        // Try combining tag with meaningful class
        const classes = Array.from(element.classList).filter(cls => {
          // Filter out utility classes and dynamic classes
          return !cls.match(/^(active|disabled|hidden|visible|show|hide|d-|p-|m-|text-|bg-|border-|w-|h-)/);
        });

        if (classes.length > 0) {
          const tagName = element.tagName.toLowerCase();
          const classSelector = classes.slice(0, 2).map(c => `.${c}`).join('');
          const selector = `${tagName}${classSelector}`;
          if (document.querySelectorAll(selector).length === 1) {
            return selector;
          }
        }

        return null;
      }

      // Helper: Check if a selector is unique
      function isUnique(selector: string): boolean {
        try {
          return document.querySelectorAll(selector).length === 1;
        } catch {
          return false;
        }
      }

      // Helper: Generate candidates for an element
      function generateCandidates(element: Element): CandidateLocator[] {
        const candidates: CandidateLocator[] = [];

        // Priority 1: Data-test attributes (including custom attributes)
        const dataAttrs = ['data-testid', 'data-test-id', 'data-id', 'data-qa', 'data-test'];

        // Add custom attributes from config
        if (cfg.customAttributes && cfg.customAttributes.length > 0) {
          dataAttrs.push(...cfg.customAttributes);
        }

        for (const attr of dataAttrs) {
          const value = element.getAttribute(attr);
          if (value) {
            const selector = `[${attr}="${value}"]`;
            if (isUnique(selector)) {
              candidates.push({
                priority: 1,
                strategy: `data-${attr}`,
                value: value,
                code: `page.locator('[${attr}="${value}"]')`
              });
            }
          }
        }

        // Priority 2: Role + accessible name
        const role = getRole(element);
        const accessibleName = getAccessibleName(element);
        if (role && accessibleName) {
          // Check if this combination is unique
          const roleElements = Array.from(document.querySelectorAll(`[role="${role}"], ${element.tagName.toLowerCase()}`))
            .filter(el => getRole(el) === role && getAccessibleName(el) === accessibleName);

          if (roleElements.length === 1) {
            candidates.push({
              priority: 2,
              strategy: 'role',
              value: `${role}[name="${accessibleName}"]`,
              code: `page.getByRole('${role}', { name: '${accessibleName.replace(/'/g, "\\'")}' })`
            });
          }
        }

        // Priority 3: Stable ID
        const id = element.getAttribute('id');
        if (id && isStableId(id)) {
          const selector = `#${id}`;
          if (isUnique(selector)) {
            candidates.push({
              priority: 3,
              strategy: 'id',
              value: id,
              code: `page.locator('#${id}')`
            });
          }
        }

        // Priority 4: CSS selector
        const cssSelector = generateCssSelector(element);
        if (cssSelector && isUnique(cssSelector)) {
          candidates.push({
            priority: 4,
            strategy: 'css',
            value: cssSelector,
            code: `page.locator('${cssSelector}')`
          });
        }

        return candidates;
      }

      // Helper: Extract meaningful context from parent elements
      function getParentContext(element: Element): string {
        let current: Element | null = element.parentElement;

        while (current) {
          const tagName = current.tagName.toLowerCase();
          const id = current.getAttribute('id');
          const classList = Array.from(current.classList);

          // Check for form context
          if (tagName === 'form') {
            const formId = current.getAttribute('id');
            const formName = current.getAttribute('name');
            if (formId) {
              return toCamelCase(formId.replace(/-form$/i, ''));
            }
            if (formName) {
              return toCamelCase(formName.replace(/-form$/i, ''));
            }
            return 'form';
          }

          // Check for modal/dialog context
          if (id && (id.includes('modal') || id.includes('dialog') || id.includes('popup'))) {
            return toCamelCase(id.replace(/-modal|-dialog|-popup/gi, ''));
          }
          for (const cls of classList) {
            if (cls.includes('modal') || cls.includes('dialog') || cls.includes('popup')) {
              return toCamelCase(cls.replace(/-modal|-dialog|-popup/gi, ''));
            }
          }

          // Check for section/article with meaningful id
          if ((tagName === 'section' || tagName === 'article' || tagName === 'div') && id) {
            // Skip generic ids like 'content', 'main', 'wrapper'
            if (!['content', 'main', 'wrapper', 'container', 'page'].includes(id.toLowerCase())) {
              return toCamelCase(id);
            }
          }

          // Check for specific semantic containers
          if (id && (
            id.includes('panel') ||
            id.includes('card') ||
            id.includes('widget') ||
            id.includes('sidebar') ||
            id.includes('navigation') ||
            id.includes('header') ||
            id.includes('footer')
          )) {
            return toCamelCase(id.replace(/-panel|-card|-widget/gi, ''));
          }

          current = current.parentElement;
        }

        return ''; // No meaningful context found
      }

      // Helper: Get element type suffix for deduplication
      function getElementTypeSuffix(element: Element): string {
        const tagName = element.tagName.toLowerCase();
        const role = getRole(element);

        // Map roles and tags to suffixes
        if (role === 'button' || tagName === 'button') return 'Button';
        if (role === 'link' || tagName === 'a') return 'Link';
        if (role === 'textbox' || role === 'combobox' || tagName === 'input' || tagName === 'textarea') return 'Input';
        if (tagName === 'select') return 'Select';
        if (tagName === 'h1' || tagName === 'h2' || tagName === 'h3') return 'Heading';
        if (tagName === 'label') return 'Label';
        if (tagName === 'p') return 'Text';
        if (tagName === 'img') return 'Image';
        if (tagName === 'form') return 'Form';

        // Capitalize first letter of tag name
        return tagName.charAt(0).toUpperCase() + tagName.slice(1);
      }

      // Helper: Derive element name from various sources
      function deriveElementName(element: Element, locator: CandidateLocator): string {
        let baseName = '';
        let context = getParentContext(element);
        let elementTypeSuffix = getElementTypeSuffix(element);

        // Try data-testid or similar
        if (locator.strategy.startsWith('data-')) {
          baseName = toCamelCase(locator.value);
        }
        // Try accessible name
        else if (locator.strategy === 'role') {
          const accessibleName = getAccessibleName(element);
          if (accessibleName) {
            baseName = toCamelCase(accessibleName);
            // Only add suffix if not already in the name
            const baseNameLower = baseName.toLowerCase();
            const suffixLower = elementTypeSuffix.toLowerCase();
            if (!baseNameLower.includes(suffixLower) && !baseNameLower.endsWith(suffixLower)) {
              baseName += elementTypeSuffix;
            }
          }
        }
        // Try ID
        else if (locator.strategy === 'id') {
          baseName = toCamelCase(locator.value);
        }
        // Try CSS - extract meaningful part
        else if (locator.strategy === 'css') {
          const match = locator.value.match(/\.([\w-]+)/);
          if (match) {
            baseName = toCamelCase(match[1]);
          } else {
            const tagName = element.tagName.toLowerCase();
            baseName = tagName;
            const text = element.textContent?.trim().slice(0, 15);
            if (text) {
              baseName = toCamelCase(text) + elementTypeSuffix;
            }
          }
        }

        // Fallback to tag name
        if (!baseName || baseName.length < 2) {
          baseName = element.tagName.toLowerCase();
          const text = element.textContent?.trim().slice(0, 15);
          if (text) {
            baseName = toCamelCase(text) + elementTypeSuffix;
          } else {
            baseName += elementTypeSuffix;
          }
        }

        // Prepend context if available and not already in the name
        if (context && context.length > 0) {
          const baseNameLower = baseName.toLowerCase();
          const contextLower = context.toLowerCase();

          // Only add context if it's not already part of the base name
          if (!baseNameLower.includes(contextLower)) {
            baseName = context + baseName.charAt(0).toUpperCase() + baseName.slice(1);
          }
        }

        // Ensure it starts with lowercase and is valid JS identifier
        baseName = baseName.replace(/^[^a-z]/i, 'element');
        if (!/^[a-z]/i.test(baseName)) {
          baseName = 'element' + baseName;
        }

        return generateUniqueName(baseName);
      }

      // Helper: Get direct text content (not including children)
      function getDirectTextContent(element: Element): string {
        let text = '';
        for (const node of Array.from(element.childNodes)) {
          if (node.nodeType === Node.TEXT_NODE) {
            text += node.textContent || '';
          }
        }
        return text.trim();
      }

      // Helper: Check if element is a text element
      function isTextElement(element: Element): boolean {
        const tagName = element.tagName.toLowerCase();
        const textTags = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'span', 'div', 'label', 'li', 'td', 'th', 'strong', 'em', 'b', 'i'];
        return textTags.includes(tagName);
      }

      // Helper: Calculate stability score based on locator strategy
      function calculateStability(strategy: string): number {
        // ⭐⭐⭐⭐⭐ (5 stars): data-testid and similar test attributes
        if (strategy.startsWith('data-')) return 5;

        // ⭐⭐⭐⭐ (4 stars): Role-based locators with accessible names
        if (strategy === 'role') return 4;

        // ⭐⭐⭐ (3 stars): Stable IDs
        if (strategy === 'id') return 3;

        // ⭐⭐ (2 stars): CSS selectors
        if (strategy === 'css') return 2;

        // ⭐ (1 star): Text-based locators (least stable)
        if (strategy === 'text') return 1;

        // Default fallback
        return 2;
      }

      // Helper: Determine which section/region an element belongs to
      function detectSection(element: Element): string {
        // Check the element and all its ancestors
        let current: Element | null = element;

        while (current) {
          const tagName = current.tagName.toLowerCase();
          const role = current.getAttribute('role');
          const id = current.getAttribute('id')?.toLowerCase() || '';
          const classList = Array.from(current.classList).map(c => c.toLowerCase());

          // 1. Check semantic HTML5 tags
          if (tagName === 'header' || role === 'banner') return 'Header';
          if (tagName === 'nav' || role === 'navigation') return 'Navigation';
          if (tagName === 'main' || role === 'main') return 'Main Content';
          if (tagName === 'aside' || role === 'complementary') return 'Sidebar';
          if (tagName === 'footer' || role === 'contentinfo') return 'Footer';

          // 2. Check for form elements
          if (tagName === 'form') {
            // Try to get form name/id for better section naming
            const formId = current.getAttribute('id');
            const formName = current.getAttribute('name');
            if (formId) return `${formId.charAt(0).toUpperCase() + formId.slice(1)} Form`;
            if (formName) return `${formName.charAt(0).toUpperCase() + formName.slice(1)} Form`;
            return 'Form';
          }

          // 3. Check common ID patterns
          if (id.includes('header') || id.includes('top')) return 'Header';
          if (id.includes('nav') || id.includes('menu')) return 'Navigation';
          if (id.includes('sidebar') || id.includes('aside')) return 'Sidebar';
          if (id.includes('footer') || id.includes('bottom')) return 'Footer';
          if (id.includes('modal') || id.includes('dialog')) return 'Modal';
          if (id.includes('form') || id.includes('login') || id.includes('signup') || id.includes('search')) {
            return `${id.charAt(0).toUpperCase() + id.slice(1).replace(/-/g, ' ')}`;
          }

          // 4. Check common class patterns
          for (const cls of classList) {
            if (cls.includes('header') || cls === 'top') return 'Header';
            if (cls.includes('nav') || cls.includes('menu')) return 'Navigation';
            if (cls.includes('sidebar') || cls.includes('aside')) return 'Sidebar';
            if (cls.includes('footer') || cls === 'bottom') return 'Footer';
            if (cls.includes('modal') || cls.includes('dialog') || cls.includes('popup')) return 'Modal';
            if (cls.includes('hero') || cls === 'banner') return 'Hero Section';
            if (cls.includes('card')) return 'Card';
            if (cls.includes('table')) return 'Table';
          }

          // 5. Check for modal/dialog
          if (role === 'dialog' || role === 'alertdialog') return 'Modal';

          // 6. Check for table
          if (tagName === 'table') return 'Table';

          // Move to parent
          current = current.parentElement;
        }

        // Default section
        return 'Main Content';
      }

      // Main collection logic
      const allElements = document.querySelectorAll('*');
      const collectedTextContent = new Set<string>(); // Track collected text to avoid duplicates

      for (const element of Array.from(allElements)) {
        // Skip non-visible elements (unless includeHiddenElements is true)
        if (!cfg.includeHiddenElements && !isVisible(element)) continue;

        // Skip excluded elements
        if (shouldExclude(element)) continue;

        const tagName = element.tagName.toLowerCase();
        const isGenericContainer = ['div', 'span', 'section', 'article'].includes(tagName);
        const hasNoAttributes = element.attributes.length === 0;
        const hasNoInteraction = !element.getAttribute('onclick') &&
                                 !element.getAttribute('role') &&
                                 !(element instanceof HTMLButtonElement) &&
                                 !(element instanceof HTMLAnchorElement) &&
                                 !(element instanceof HTMLInputElement) &&
                                 !(element instanceof HTMLSelectElement) &&
                                 !(element instanceof HTMLTextAreaElement);

        // Check if this is a text element with visible text
        const isText = isTextElement(element);
        const directText = isText ? getDirectTextContent(element) : '';
        const hasVisibleText = directText.length > 0;

        // Process interactive elements and elements with attributes
        if (!isGenericContainer || !hasNoAttributes || !hasNoInteraction) {
          // Generate candidates
          const candidates = generateCandidates(element);
          if (candidates.length > 0) {
            // Select best candidate (lowest priority number = highest priority)
            candidates.sort((a, b) => a.priority - b.priority);
            const bestLocator = candidates[0];

            // Derive element name
            const elementName = deriveElementName(element, bestLocator);

            // Detect section
            const section = detectSection(element);

            // Calculate stability
            const stability = calculateStability(bestLocator.strategy);

            // Add to results
            results.push({
              name: elementName,
              locatorStrategy: bestLocator.strategy,
              locatorValue: bestLocator.value,
              locatorCode: bestLocator.code,
              elementType: tagName,
              section: section,
              stability: stability
            });
          }
        }

        // Process text elements - collect ALL visible text (if enabled)
        if (cfg.includeText && isText && hasVisibleText && !collectedTextContent.has(directText)) {
          // Avoid collecting text that's too long or too short (using config values)
          if (directText.length >= cfg.minTextLength && directText.length <= cfg.maxTextLength) {
            collectedTextContent.add(directText);

            // Create text locator
            const escapedText = directText.replace(/'/g, "\\'");
            const textLocator: CandidateLocator = {
              priority: 5, // Lower priority than interactive elements
              strategy: 'text',
              value: directText,
              code: `page.getByText('${escapedText}', { exact: true })`
            };

            // Generate name from text content with element type suffix
            const textBase = toCamelCase(directText.slice(0, 20)); // Use first 20 chars
            let textBaseName = textBase;

            // Get element type suffix for deduplication
            const elementTypeSuffix = getElementTypeSuffix(element);

            // Only add suffix if not already in the name
            const textBaseLower = textBase.toLowerCase();
            const suffixLower = elementTypeSuffix.toLowerCase();
            if (!textBaseLower.includes(suffixLower) && !textBaseLower.endsWith(suffixLower)) {
              textBaseName = textBase + elementTypeSuffix;
            }

            const elementName = generateUniqueName(textBaseName);

            // Detect section
            const section = detectSection(element);

            // Calculate stability (text locators are least stable = 1 star)
            const stability = calculateStability('text');

            // Add to results
            results.push({
              name: elementName,
              locatorStrategy: 'text',
              locatorValue: directText,
              locatorCode: textLocator.code,
              elementType: tagName,
              section: section,
              stability: stability
            });
          }
        }
      }

      return results;
    }, config);

    return elementsData as CollectedLocator[];
  }

  /**
   * Generate Page Object Model file
   */
  private async generatePageObjectFile(
    page: Page,
    locators: CollectedLocator[],
    outputDir: string,
    language: 'typescript' | 'javascript'
  ): Promise<{ filePath: string; pageName: string }> {
    // Get page title and URL
    const pageTitle = await page.title();
    const pageUrl = page.url();

    // Derive page name from title or URL
    const pageName = this.derivePageName(pageTitle, pageUrl);

    // Create output directory if it doesn't exist
    const fullOutputDir = path.isAbsolute(outputDir) ? outputDir : path.join(process.cwd(), outputDir);
    if (!fs.existsSync(fullOutputDir)) {
      fs.mkdirSync(fullOutputDir, { recursive: true });
    }

    // Generate file content
    const fileExtension = language === 'typescript' ? 'ts' : 'js';
    const fileName = `${pageName}.${fileExtension}`;
    const filePath = path.join(fullOutputDir, fileName);

    const fileContent = this.generatePageObjectContent(pageName, locators, language);

    // Write file
    fs.writeFileSync(filePath, fileContent, 'utf-8');

    return { filePath, pageName };
  }

  /**
   * Derive page name from URL path (e.g., /login -> LoginPage)
   */
  private derivePageName(title: string, url: string): string {
    try {
      const urlObj = new URL(url);
      let pathname = urlObj.pathname;

      // Remove leading/trailing slashes
      pathname = pathname.replace(/^\/+|\/+$/g, '');

      // If empty pathname (root), use 'Home'
      if (!pathname) {
        return 'HomePage';
      }

      // Split path into parts
      const parts = pathname.split('/').filter(Boolean);

      // Take the last meaningful part (handles /user/123 -> user)
      let pathPart = parts[parts.length - 1];

      // Remove numeric IDs and common dynamic patterns
      // Handles: /user/123 -> user, /product/abc123 -> product
      pathPart = pathPart.replace(/[-_]?\d+$/, ''); // Remove trailing numbers
      pathPart = pathPart.replace(/[^a-zA-Z0-9]/g, '-'); // Replace special chars with dash

      // If the part is now empty or only numbers, use the previous part
      if (!pathPart || /^\d+$/.test(pathPart)) {
        if (parts.length > 1) {
          pathPart = parts[parts.length - 2];
          pathPart = pathPart.replace(/[-_]?\d+$/, '');
          pathPart = pathPart.replace(/[^a-zA-Z0-9]/g, '-');
        } else {
          pathPart = 'home';
        }
      }

      // Convert to PascalCase
      const pageName = pathPart
        .split(/[-_]+/)
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join('');

      return pageName + 'Page';
    } catch {
      return 'GeneratedPage';
    }
  }

  /**
   * Parse existing Page Object file to extract previous locators
   */
  private parseExistingPageObject(filePath: string): Map<string, string> {
    const locatorMap = new Map<string, string>();

    if (!fs.existsSync(filePath)) {
      return locatorMap; // No previous file
    }

    try {
      const content = fs.readFileSync(filePath, 'utf-8');

      // Regex to match locator assignments in constructor
      // Matches patterns like: this.loginButton = this.page.locator(...)
      const locatorRegex = /this\.(\w+)\s*=\s*(this\.page\..+?);$/gm;

      let match: RegExpExecArray | null;
      while ((match = locatorRegex.exec(content)) !== null) {
        const locatorName = match[1];
        const locatorCode = match[2].replace('this.page.', 'page.');
        locatorMap.set(locatorName, locatorCode);
      }
    } catch (error) {
      // Ignore parse errors
      console.error('Failed to parse existing file:', error);
    }

    return locatorMap;
  }

  /**
   * Compare current locators with previous ones and detect changes
   */
  private detectChanges(
    currentLocators: CollectedLocator[],
    previousLocators: Map<string, string>
  ): LocatorChange[] {
    const changes: LocatorChange[] = [];
    const currentNames = new Set(currentLocators.map(loc => loc.name));
    const previousNames = new Set(previousLocators.keys());

    // Check for added and modified locators
    for (const locator of currentLocators) {
      if (!previousLocators.has(locator.name)) {
        // New locator
        changes.push({
          type: 'added',
          name: locator.name,
          newCode: locator.locatorCode,
          details: `New ${locator.elementType} element`
        });
      } else {
        // Existing locator - check if modified
        const oldCode = previousLocators.get(locator.name)!;
        if (oldCode !== locator.locatorCode) {
          changes.push({
            type: 'modified',
            name: locator.name,
            oldCode: oldCode,
            newCode: locator.locatorCode,
            details: `Locator strategy changed`
          });
        } else {
          changes.push({
            type: 'unchanged',
            name: locator.name
          });
        }
      }
    }

    // Check for removed locators
    for (const prevName of previousNames) {
      if (!currentNames.has(prevName)) {
        changes.push({
          type: 'removed',
          name: prevName,
          oldCode: previousLocators.get(prevName),
          details: 'Element no longer exists'
        });
      }
    }

    return changes;
  }

  /**
   * Convert stability score to star representation
   */
  private getStabilityStars(stability: number): string {
    const stars = '⭐'.repeat(stability);
    const empty = '☆'.repeat(5 - stability);
    return stars + empty;
  }

  /**
   * Get stability description
   */
  private getStabilityDescription(strategy: string): string {
    if (strategy.startsWith('data-')) return 'data-testid attributes';
    if (strategy === 'role') return 'Role-based locator with accessible name';
    if (strategy === 'id') return 'Stable ID';
    if (strategy === 'css') return 'CSS selector';
    if (strategy === 'text') return 'Text-based locator (may break with content changes)';
    return 'Unknown strategy';
  }

  /**
   * Generate the Page Object class content
   */
  private generatePageObjectContent(
    pageName: string,
    locators: CollectedLocator[],
    language: 'typescript' | 'javascript'
  ): string {
    const isTypeScript = language === 'typescript';
    const lines: string[] = [];

    // Imports
    if (isTypeScript) {
      lines.push(`import { Page, Locator } from '@playwright/test';`);
    } else {
      lines.push(`// @ts-check`);
    }
    lines.push('');

    // Class declaration
    lines.push(`/**`);
    lines.push(` * Page Object Model for ${pageName}`);
    lines.push(` * Auto-generated by Playwright MCP Locator Collector`);
    lines.push(` * Generated: ${new Date().toISOString()}`);
    lines.push(` */`);

    // Group locators by section
    const locatorsBySection = new Map<string, CollectedLocator[]>();
    locators.forEach(loc => {
      const section = loc.section || 'Main Content';
      if (!locatorsBySection.has(section)) {
        locatorsBySection.set(section, []);
      }
      locatorsBySection.get(section)!.push(loc);
    });

    // Sort sections in logical order
    const sectionOrder = ['Header', 'Navigation', 'Hero Section', 'Main Content', 'Sidebar', 'Footer', 'Modal', 'Form'];
    const sortedSections = Array.from(locatorsBySection.keys()).sort((a, b) => {
      const aIndex = sectionOrder.findIndex(s => a.includes(s));
      const bIndex = sectionOrder.findIndex(s => b.includes(s));
      if (aIndex === -1 && bIndex === -1) return a.localeCompare(b);
      if (aIndex === -1) return 1;
      if (bIndex === -1) return -1;
      return aIndex - bIndex;
    });

    if (isTypeScript) {
      lines.push(`export class ${pageName} {`);
      lines.push(`  readonly page: Page;`);
      lines.push('');

      // Locator field declarations grouped by section
      sortedSections.forEach(section => {
        const sectionLocators = locatorsBySection.get(section)!;
        lines.push(`  // ==================== ${section} ====================`);
        lines.push('');
        sectionLocators.forEach(loc => {
          // Add JSDoc comment with stability info
          const stars = this.getStabilityStars(loc.stability);
          const description = this.getStabilityDescription(loc.locatorStrategy);
          lines.push(`  /**`);
          lines.push(`   * Locator: ${loc.name}`);
          lines.push(`   * Strategy: ${loc.locatorStrategy}`);
          lines.push(`   * Stability: ${stars} (${loc.stability}/5)`);
          lines.push(`   * Type: ${description}`);
          lines.push(`   */`);
          lines.push(`  readonly ${loc.name}: Locator;`);
          lines.push('');
        });
      });
    } else {
      lines.push(`export class ${pageName} {`);
      lines.push(`  /**`);
      lines.push(`   * @param {import('@playwright/test').Page} page`);
      lines.push(`   */`);
    }

    lines.push('');

    // Constructor
    if (isTypeScript) {
      lines.push(`  constructor(page: Page) {`);
    } else {
      lines.push(`  constructor(page) {`);
    }

    lines.push(`    this.page = page;`);
    lines.push('');

    // Initialize locators grouped by section
    sortedSections.forEach(section => {
      const sectionLocators = locatorsBySection.get(section)!;
      lines.push(`    // ${section}`);
      sectionLocators.forEach(loc => {
        const code = loc.locatorCode.replace('page.', 'this.page.');
        lines.push(`    this.${loc.name} = ${code};`);
      });
      lines.push('');
    });

    lines.push(`  }`);
    lines.push('');

    // Helper methods
    lines.push(`  // Interaction Methods`);
    lines.push('');

    // Group locators by type for generating appropriate methods
    const buttons = locators.filter(loc =>
      loc.elementType === 'button' ||
      loc.locatorStrategy === 'role' && loc.locatorValue.includes('button')
    );
    const inputs = locators.filter(loc =>
      ['input', 'textarea'].includes(loc.elementType)
    );
    const links = locators.filter(loc =>
      loc.elementType === 'a' ||
      loc.locatorStrategy === 'role' && loc.locatorValue.includes('link')
    );

    // Generate click methods for buttons and links
    [...buttons, ...links].forEach(loc => {
      const methodName = `click${loc.name.charAt(0).toUpperCase() + loc.name.slice(1)}`;
      lines.push(`  async ${methodName}() {`);
      lines.push(`    await this.${loc.name}.click();`);
      lines.push(`  }`);
      lines.push('');
    });

    // Generate fill methods for inputs
    inputs.forEach(loc => {
      const methodName = `fill${loc.name.charAt(0).toUpperCase() + loc.name.slice(1)}`;
      if (isTypeScript) {
        lines.push(`  async ${methodName}(value: string) {`);
      } else {
        lines.push(`  /**`);
        lines.push(`   * @param {string} value`);
        lines.push(`   */`);
        lines.push(`  async ${methodName}(value) {`);
      }
      lines.push(`    await this.${loc.name}.fill(value);`);
      lines.push(`  }`);
      lines.push('');
    });

    // Close class
    lines.push(`}`);

    return lines.join('\n');
  }
}

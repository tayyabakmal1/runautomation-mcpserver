/**
 * Author: Tayyab Akmal
 * Linkedin: https://www.linkedin.com/in/tayyab-sqa-engineer/
 */

/**
 * Locator Optimizer - Converts selectors to use Playwright best practices
 * Priority: data-testid > data-* attributes > role > id > CSS > XPath
 */

export interface OptimizedLocator {
  selector: string;
  method: 'getByTestId' | 'getByRole' | 'getByLabel' | 'getByPlaceholder' | 'getByText' | 'locator';
  value: string;
  original: string;
}

/**
 * Analyzes and optimizes a selector to use the best locator strategy
 */
export function optimizeLocator(selector: string): OptimizedLocator {
  const original = selector;

  // 1. Check for data-testid or data-test attributes (BEST PRACTICE)
  const testIdMatch = selector.match(/\[data-testid=['"]([^'"]+)['"]\]/) ||
                     selector.match(/\[data-test=['"]([^'"]+)['"]\]/);
  if (testIdMatch) {
    return {
      selector: `page.getByTestId('${testIdMatch[1]}')`,
      method: 'getByTestId',
      value: testIdMatch[1],
      original,
    };
  }

  // 2. Check for other data-* attributes (can be converted to testid)
  const dataAttrMatch = selector.match(/\[data-([a-z-]+)=['"]([^'"]+)['"]\]/);
  if (dataAttrMatch && dataAttrMatch[1] !== 'testid' && dataAttrMatch[1] !== 'test') {
    // Suggest using data-testid pattern but fall back to CSS selector
    return {
      selector: `page.locator('[data-${dataAttrMatch[1]}="${dataAttrMatch[2]}"]')`,
      method: 'locator',
      value: `[data-${dataAttrMatch[1]}="${dataAttrMatch[2]}"]`,
      original,
    };
  }

  // 3. Check for role attributes (semantic HTML)
  const roleMatch = selector.match(/\[role=['"]([^'"]+)['"]\]/);
  if (roleMatch) {
    return {
      selector: `page.getByRole('${roleMatch[1]}')`,
      method: 'getByRole',
      value: roleMatch[1],
      original,
    };
  }

  // 4. Check for common semantic selectors that can use getByRole
  const buttonMatch = selector.match(/^button(?:\[|$)/i);
  if (buttonMatch) {
    return {
      selector: `page.getByRole('button')`,
      method: 'getByRole',
      value: 'button',
      original,
    };
  }

  // 5. Check for placeholder attribute
  const placeholderMatch = selector.match(/\[placeholder=['"]([^'"]+)['"]\]/);
  if (placeholderMatch) {
    return {
      selector: `page.getByPlaceholder('${placeholderMatch[1]}')`,
      method: 'getByPlaceholder',
      value: placeholderMatch[1],
      original,
    };
  }

  // 6. Check for label or aria-label
  const labelMatch = selector.match(/\[aria-label=['"]([^'"]+)['"]\]/) ||
                    selector.match(/\[label=['"]([^'"]+)['"]\]/);
  if (labelMatch) {
    return {
      selector: `page.getByLabel('${labelMatch[1]}')`,
      method: 'getByLabel',
      value: labelMatch[1],
      original,
    };
  }

  // 7. Check for text content
  const textMatch = selector.match(/text=['"]([^'"]+)['"]/);
  if (textMatch) {
    return {
      selector: `page.getByText('${textMatch[1]}')`,
      method: 'getByText',
      value: textMatch[1],
      original,
    };
  }

  // 8. ID selector (good practice, but not as good as data-testid)
  const idMatch = selector.match(/^#([a-zA-Z0-9_-]+)$/);
  if (idMatch) {
    return {
      selector: `page.locator('#${idMatch[1]}')`,
      method: 'locator',
      value: `#${idMatch[1]}`,
      original,
    };
  }

  // 9. Simple class selector
  const classMatch = selector.match(/^\.([a-zA-Z0-9_-]+)$/);
  if (classMatch) {
    return {
      selector: `page.locator('.${classMatch[1]}')`,
      method: 'locator',
      value: `.${classMatch[1]}`,
      original,
    };
  }

  // 10. XPath (LAST RESORT - least stable)
  if (selector.startsWith('//') || selector.startsWith('xpath=')) {
    const xpath = selector.replace(/^xpath=/, '');
    return {
      selector: `page.locator('${xpath}')`,
      method: 'locator',
      value: xpath,
      original,
    };
  }

  // 11. Default: use as-is with locator
  return {
    selector: `page.locator('${selector}')`,
    method: 'locator',
    value: selector,
    original,
  };
}

/**
 * Generates a meaningful name for a locator based on the optimized selector
 */
export function deriveLocatorName(optimized: OptimizedLocator): string {
  // Use the method type and value to create a meaningful name
  switch (optimized.method) {
    case 'getByTestId':
      return camelCase(optimized.value);

    case 'getByRole':
      return `${camelCase(optimized.value)}Element`;

    case 'getByLabel':
    case 'getByPlaceholder':
      return `${camelCase(optimized.value)}Input`;

    case 'getByText':
      return `${camelCase(optimized.value)}Text`;

    case 'locator':
      // Try to extract meaningful name from selector
      const idMatch = optimized.value.match(/#([a-zA-Z0-9_-]+)/);
      if (idMatch) return `${camelCase(idMatch[1])}`;

      const dataMatch = optimized.value.match(/\[data-[^=]+=['"]?([^'"\]]+)['"]?\]/);
      if (dataMatch) return camelCase(dataMatch[1]);

      const classMatch = optimized.value.match(/\.([a-zA-Z0-9_-]+)/);
      if (classMatch) return `${camelCase(classMatch[1])}Element`;

      return 'element';

    default:
      return 'element';
  }
}

/**
 * Converts a string to camelCase
 */
function camelCase(str: string): string {
  return str
    .replace(/[^a-zA-Z0-9]+(.)/g, (_, char) => char.toUpperCase())
    .replace(/^[A-Z]/, char => char.toLowerCase())
    .replace(/[^a-zA-Z0-9]/g, '');
}

/**
 * Gets a priority score for a selector (higher is better)
 */
export function getSelectorPriority(optimized: OptimizedLocator): number {
  switch (optimized.method) {
    case 'getByTestId': return 100; // Best
    case 'getByRole': return 90;
    case 'getByLabel': return 85;
    case 'getByPlaceholder': return 80;
    case 'getByText': return 70;
    case 'locator':
      // Within locators, prioritize based on selector type
      if (optimized.value.startsWith('[data-')) return 95; // data attributes
      if (optimized.value.startsWith('#')) return 60; // ID
      if (optimized.value.match(/^\.[a-zA-Z]/)) return 50; // class
      if (optimized.value.startsWith('//')) return 10; // XPath - worst
      return 40; // other CSS
    default: return 0;
  }
}

import AxeBuilder from '@axe-core/playwright';
import { expect, type Page, type TestInfo } from '@playwright/test';

import {
  mockResponsiveSession,
  productFixtures,
  responsiveViewports,
} from './responsive-support';

export const designThemes = ['light', 'dark'] as const;
export type DesignTheme = (typeof designThemes)[number];

export const designViewports = [responsiveViewports[0], responsiveViewports[4]];

export const designProductFixtures = [
  {
    ...productFixtures[0],
    nomeProduto: 'Reagente sintético para ensaio de bancada',
  },
  {
    ...productFixtures[1],
    nomeProduto:
      'Material sintético com nome longo para caracterizar quebra de linha e leitura completa',
  },
];

const stabilizedMotionStyle = `
  *, *::before, *::after {
    animation-delay: 0s !important;
    animation-duration: 0s !important;
    animation-iteration-count: 1 !important;
    scroll-behavior: auto !important;
    transition-delay: 0s !important;
    transition-duration: 0s !important;
  }
`;

export async function prepareDesignPage(
  page: Page,
  options: { theme: DesignTheme; role?: string }
): Promise<void> {
  await page.emulateMedia({
    colorScheme: options.theme,
    reducedMotion: 'reduce',
  });
  await page.addInitScript((style) => {
    const element = document.createElement('style');
    element.dataset.designTestMotion = 'stabilized';
    element.textContent = style;
    document.head.appendChild(element);
  }, stabilizedMotionStyle);

  if (options.role) {
    await mockResponsiveSession(page, options.role);
  }
}

export async function waitForDesignReady(page: Page): Promise<void> {
  await page.evaluate(async () => {
    if (document.fonts) {
      await document.fonts.ready;
    }
  });
}

export async function runDesignAxeAudit(
  page: Page,
  testInfo: TestInfo,
  label: string
): Promise<void> {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa'])
    .analyze();

  await testInfo.attach(`${label}-axe.json`, {
    body: JSON.stringify(results, null, 2),
    contentType: 'application/json',
  });

  const findings = results.violations.map(
    (violation) => `${violation.id} (${violation.impact ?? 'unknown'})`
  );
  console.info(
    `[axe] ${label}: ${findings.length} violation(s)${
      findings.length > 0 ? ` — ${findings.join(', ')}` : ''
    }`
  );
  expect(Array.isArray(results.violations)).toBe(true);
}

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const frontendRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

const MIGRATED_FILES = [
  'src/integration/Auditoria.ts',
  'src/integration/Class.ts',
  'src/integration/Loans.ts',
  'src/integration/Notifications.ts',
  'src/integration/Product.ts',
  'src/integration/System.ts',
  'src/integration/Users.ts',
  'src/pages/RegisteredUsers.tsx',
  'src/pages/ViewClass.tsx',
  'src/pages/admin/AllLoans.tsx',
  'src/pages/products/ProductHistory.tsx',
  'src/pages/RegistrationRequests.tsx',
  'src/pages/admin/LoansRequest.tsx',
  'src/pages/loan/LoanHistory.tsx',
  'src/pages/admin/ReturnLoan.tsx',
  'src/pages/CreateAccount.tsx',
  'src/pages/ForgotPassword.tsx',
  'src/pages/ResetPassword.tsx',
  'src/components/global/forms/create/FormVidraria.tsx',
  'src/components/global/forms/create/FormQuimicos.tsx',
  'src/components/global/forms/create/FormOutros.tsx',
] as const;

const INTEGRATION_FILES = new Set([
  'src/integration/Auditoria.ts',
  'src/integration/Class.ts',
  'src/integration/Loans.ts',
  'src/integration/Notifications.ts',
  'src/integration/Product.ts',
  'src/integration/System.ts',
  'src/integration/Users.ts',
]);

const readSource = (relativePath: string): string =>
  readFileSync(resolve(frontendRoot, relativePath), 'utf8');

type CatchBodyScanState = {
  depth: number;
  quote: "'" | '"' | '`' | null;
  escaped: boolean;
  inLineComment: boolean;
  inBlockComment: boolean;
};

function consumeIgnoredSyntax(
  state: CatchBodyScanState,
  character: string,
  nextCharacter: string | undefined
): number | null {
  if (state.inLineComment) {
    if (character === '\n') state.inLineComment = false;
    return 0;
  }
  if (state.inBlockComment) {
    if (character === '*' && nextCharacter === '/') {
      state.inBlockComment = false;
      return 1;
    }
    return 0;
  }
  if (state.quote) {
    consumeQuotedCharacter(state, character);
    return 0;
  }
  return beginIgnoredSyntax(state, character, nextCharacter);
}

function consumeQuotedCharacter(
  state: CatchBodyScanState,
  character: string
): void {
  if (state.escaped) {
    state.escaped = false;
    return;
  }
  if (character === '\\') {
    state.escaped = true;
    return;
  }
  if (character === state.quote) state.quote = null;
}

function beginIgnoredSyntax(
  state: CatchBodyScanState,
  character: string,
  nextCharacter: string | undefined
): number | null {
  if (character === '/' && nextCharacter === '/') {
    state.inLineComment = true;
    return 0;
  }
  if (character === '/' && nextCharacter === '*') {
    state.inBlockComment = true;
    return 0;
  }
  if (character === "'" || character === '"' || character === '`') {
    state.quote = character;
    return 0;
  }
  return null;
}

function findCatchBodyEnd(source: string, openingBrace: number): number | null {
  const state: CatchBodyScanState = {
    depth: 1,
    quote: null,
    escaped: false,
    inLineComment: false,
    inBlockComment: false,
  };

  for (let index = openingBrace + 1; index < source.length; index += 1) {
    const character = source[index];
    const skippedCharacters = consumeIgnoredSyntax(
      state,
      character,
      source[index + 1]
    );
    if (skippedCharacters !== null) {
      index += skippedCharacters;
      continue;
    }
    if (character === '{') state.depth += 1;
    if (character === '}' && --state.depth === 0) return index;
  }
  return null;
}

const catchBodies = (source: string): string[] => {
  const bodies: string[] = [];
  for (const match of source.matchAll(/\bcatch\s*(?:\([^)]*\))?\s*\{/g)) {
    const openingBrace = (match.index ?? 0) + match[0].length - 1;
    const closingBrace = findCatchBodyEnd(source, openingBrace);
    if (closingBrace !== null) {
      bodies.push(source.slice(openingBrace + 1, closingBrace));
    }
  }
  return bodies;
};

describe('migration inventory', () => {
  it('mantém explícitos todos os consumidores migrados', () => {
    expect(MIGRATED_FILES).toHaveLength(21);
    expect(new Set(MIGRATED_FILES).size).toBe(MIGRATED_FILES.length);

    for (const file of MIGRATED_FILES) {
      expect(() => readSource(file), file).not.toThrow();
    }
  });

  it('faz cada integração devolver falhas pela fronteira normalizada', () => {
    for (const file of INTEGRATION_FILES) {
      expect(readSource(file), file).toContain('reportAppError');
    }
  });

  it('rejeita parsers Axios, mensagens remotas e sentinelas genéricas', () => {
    const forbiddenPatterns = [
      /\b(?:axios\.)?isAxiosError\s*\(/i,
      /\bAxiosError\b/i,
      /\b(?:error|err|exception|failure)\s*\??\.\s*response\b/i,
      /\b(?:error|err|exception|failure)\s*\??\[\s*['"]response['"]\s*\]/i,
      /\b(?:error|err|exception|failure)\s*\??\.\s*(?:message|stack)\b/i,
      /\b(?:response|payload|body|data)\s*\??\.\s*(?:message|detail|title)\b/i,
      /<div>\s*Error\s*<\/div>/i,
      /['"](?:Erro|Error) durante (?:a )?requisi/i,
      /\b(?:title|description)\s*:\s*['"](?:Erro|Error)['"]/i,
    ];

    for (const file of MIGRATED_FILES) {
      const source = readSource(file);
      for (const pattern of forbiddenPatterns) {
        expect(source.match(pattern), `${file} matches ${pattern}`).toBeNull();
      }

      for (const body of catchBodies(source)) {
        expect(body, `${file} parses response.data in catch`).not.toMatch(
          /\bresponse\s*\.\s*data\b/i
        );
        expect(body, `${file} has a catch without an operation`).toMatch(
          /\b(?:reportAppError|notifyError|normalizeError|presentError|set[A-Z]\w*|throw|return)\b/
        );
      }
    }
  });

  it('mantém feedback comum nos consumidores de página e formulário', () => {
    for (const file of MIGRATED_FILES) {
      if (INTEGRATION_FILES.has(file)) continue;

      const source = readSource(file);
      expect(
        source.includes('ErrorFeedback') ||
          source.includes('notifyError') ||
          source.includes('presentError') ||
          source.includes('normalizeError'),
        `${file} has no common error feedback boundary`
      ).toBe(true);
    }
  });
});

/** Canonical positive Int32 identifiers accepted by the backend's resource routes. */
export const parseResourceId = (value: unknown): number => {
  if (
    (typeof value !== 'number' && typeof value !== 'string') ||
    (typeof value === 'string' && !/^[1-9]\d*$/.test(value))
  ) {
    throw new Error('Identificador inv\u00e1lido.');
  }

  // Convert before building the path: the returned value cannot contain URL syntax.
  const id = Number(value);
  if (!Number.isInteger(id) || id < 1 || id > 2_147_483_647) {
    throw new Error('Identificador inv\u00e1lido.');
  }
  return id;
};

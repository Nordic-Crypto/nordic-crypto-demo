/**
 * Contracts shared by the web client and the API.
 * One zod schema = one source of truth for validation on both sides.
 */
export * from './health.js';
export * from './limits.js';
export * from './api-error.js';
export * from './auth.js';

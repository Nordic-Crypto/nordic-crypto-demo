import fastifyCookie from '@fastify/cookie';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import type { FastifyRequest } from 'fastify';
import type Redis from 'ioredis';
import type { Env } from '../config/env';
import { statusOf, toApiError } from './errors';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * CSRF defence-in-depth. Session cookies will be SameSite=Strict, but we
 * additionally reject any state-changing request whose Origin is not exactly
 * our own. Browsers always send Origin on cross-site POST/PUT/PATCH/DELETE.
 */
export function isAllowedOrigin(
  method: string,
  origin: string | undefined,
  allowed: string,
): boolean {
  if (SAFE_METHODS.has(method.toUpperCase())) return true;
  return origin === allowed;
}

export async function registerSecurity(
  app: NestFastifyApplication,
  env: Env,
  redis?: Redis,
): Promise<void> {
  const fastify = app.getHttpAdapter().getInstance();

  // Errors raised by Fastify itself or its plugins (oversized body, malformed
  // JSON, rate limit) get the same safe shape as errors from route handlers.
  fastify.setErrorHandler((error, req, reply) => {
    const status = statusOf(error);
    if (status >= 500) req.log.error({ err: error }, 'unhandled error');
    void reply
      .status(status)
      .header('cache-control', 'no-store')
      .send(toApiError(status, String(req.id)));
  });

  // Cookie parsing for the session cookie (no signing needed: the value is a
  // random 256-bit id that is only meaningful to our server).
  await app.register(fastifyCookie);

  // Security headers. The API only serves JSON, so its CSP forbids everything.
  // (The web app's own CSP is set by Caddy for the static files.)
  await app.register(helmet, {
    contentSecurityPolicy: {
      useDefaults: false,
      directives: {
        defaultSrc: ["'none'"],
        frameAncestors: ["'none'"],
        baseUri: ["'none'"],
        formAction: ["'none'"],
      },
    },
    crossOriginEmbedderPolicy: false,
    crossOriginOpenerPolicy: { policy: 'same-origin' },
    crossOriginResourcePolicy: { policy: 'same-origin' },
    referrerPolicy: { policy: 'no-referrer' },
    hsts:
      env.NODE_ENV === 'production'
        ? { maxAge: 63_072_000, includeSubDomains: true, preload: true }
        : false,
  });

  // Global rate limit per client IP, shared across API instances via Redis.
  await app.register(rateLimit, {
    global: true,
    max: env.RATE_LIMIT_PER_MINUTE,
    timeWindow: '1 minute',
    ...(redis ? { redis, nameSpace: 'bastion:rl:' } : {}),
    skipOnError: false,
    allowList: (req: FastifyRequest) => req.url === '/api/health/live',
    errorResponseBuilder: () => ({ statusCode: 429, message: 'rate limited' }),
  });

  fastify.addHook('onRequest', async (req, reply) => {
    if (!isAllowedOrigin(req.method, req.headers.origin, env.PUBLIC_ORIGIN)) {
      return reply
        .status(403)
        .header('cache-control', 'no-store')
        .send(toApiError(403, String(req.id)));
    }
  });

  // API responses carry user data: never let a browser, proxy or Service Worker cache them.
  fastify.addHook('onSend', async (_req, reply, payload) => {
    if (!reply.hasHeader('cache-control')) reply.header('cache-control', 'no-store');
    reply.header('pragma', 'no-cache');
    return payload;
  });
}

import 'reflect-metadata';
import { Test } from '@nestjs/testing';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { configureApp, createFastifyAdapter } from '../app.factory';
import { AppModule } from '../app.module';
import { ENV, Env, loadEnv } from '../config/env';
import { DB, PG_POOL } from '../infrastructure/database/database.module';
import { REDIS } from '../infrastructure/redis/redis.module';
import { HEALTH_PROBES, HealthProbes } from '../modules/health/health.probes';

export const TEST_ORIGIN = 'https://chat.test';

export function testEnv(overrides: Partial<Record<string, string>> = {}): Env {
  return loadEnv({
    NODE_ENV: 'test',
    LOG_LEVEL: 'fatal',
    PUBLIC_ORIGIN: TEST_ORIGIN,
    DATABASE_URL: 'postgres://u:p@localhost:5432/db',
    REDIS_URL: 'redis://localhost:6379',
    DATA_ENCRYPTION_KEY: Buffer.alloc(32, 1).toString('base64'),
    ...overrides,
  });
}

/** Boots the real AppModule with infrastructure replaced by in-memory fakes. */
export async function createTestApp(
  opts: { probes?: Partial<HealthProbes>; env?: Partial<Record<string, string>> } = {},
): Promise<NestFastifyApplication> {
  const env = testEnv(opts.env);
  const probes: HealthProbes = {
    database: async () => undefined,
    redis: async () => undefined,
    ...opts.probes,
  };

  const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(ENV)
    .useValue(env)
    .overrideProvider(PG_POOL)
    .useValue({ end: async () => undefined })
    .overrideProvider(DB)
    .useValue({})
    .overrideProvider(REDIS)
    .useValue({ quit: async () => 'OK' })
    .overrideProvider(HEALTH_PROBES)
    .useValue(probes)
    .compile();

  const app = moduleRef.createNestApplication<NestFastifyApplication>(createFastifyAdapter(env));
  await configureApp(app, env);
  await app.init();
  await app.getHttpAdapter().getInstance().ready();
  return app;
}

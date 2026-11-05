import 'reflect-metadata';
import { Test } from '@nestjs/testing';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import type Redis from 'ioredis';
import type { Pool } from 'pg';
import { configureApp, createFastifyAdapter } from '../app.factory';
import { AppModule } from '../app.module';
import { ENV } from '../config/env';
import { PG_POOL } from '../infrastructure/database/database.module';
import { REDIS } from '../infrastructure/redis/redis.module';
import { testEnv } from './create-test-app';

/**
 * Integration tests run against real PostgreSQL and Redis. CI provides them as
 * service containers; locally the tests are skipped unless both URLs are set.
 */
export const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL ?? '';
export const TEST_REDIS_URL = process.env.TEST_REDIS_URL ?? '';
export const HAS_INTEGRATION_ENV = Boolean(TEST_DATABASE_URL && TEST_REDIS_URL);

export async function createIntegrationApp(): Promise<NestFastifyApplication> {
  const env = testEnv({ DATABASE_URL: TEST_DATABASE_URL, REDIS_URL: TEST_REDIS_URL });
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(ENV)
    .useValue(env)
    .compile();
  const app = moduleRef.createNestApplication<NestFastifyApplication>(createFastifyAdapter(env));
  await configureApp(app, env, app.get<Redis>(REDIS));
  await app.init();
  await app.getHttpAdapter().getInstance().ready();
  return app;
}

/** Empties all tables and Redis between tests. */
export async function resetState(app: NestFastifyApplication): Promise<void> {
  await app
    .get<Pool>(PG_POOL)
    .query('TRUNCATE audit_log, recovery_codes, passkeys, invites, users RESTART IDENTITY CASCADE');
  await app.get<Redis>(REDIS).flushdb();
}

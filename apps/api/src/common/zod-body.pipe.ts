import { PipeTransform, UnprocessableEntityException } from '@nestjs/common';
import type { z } from 'zod';

/**
 * Validates a request body against a shared zod schema. Unknown fields are
 * rejected by `.strict()` schemas; details are not echoed back to the client.
 */
export class ZodBody<S extends z.ZodType> implements PipeTransform<unknown, z.output<S>> {
  constructor(private readonly schema: S) {}

  transform(value: unknown): z.output<S> {
    const result = this.schema.safeParse(value);
    if (!result.success) throw new UnprocessableEntityException();
    return result.data;
  }
}

import { z } from 'zod';

/**
 * Body for the admin-triggered maintenance run. Everything is optional: the
 * defaults come from the environment (see `ORDER_PAYMENT_WINDOW_MINUTES`), so a
 * bare `POST` simply runs the same job the cron trigger runs.
 */
export const expireOrdersSchema = z
  .object({
    /** Only orders older than this many minutes are cancelled. */
    olderThanMinutes: z.number().int().min(1).max(60 * 24 * 30).optional(),
    /** Maximum orders handled in this run (hard-capped by the service). */
    limit: z.number().int().min(1).max(100).optional(),
  })
  .strict()
  // A bare POST (no body at all) is valid: it runs with the env defaults.
  .default({});

export type ExpireOrdersInput = z.infer<typeof expireOrdersSchema>;

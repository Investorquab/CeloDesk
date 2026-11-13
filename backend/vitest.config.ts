import { defineConfig } from 'vitest/config';

// Smoke tests cover pure logic (attribution tag, recurrence dates, currency
// formatting). They never touch the database, but importing the service layer
// constructs a PrismaClient, which wants DATABASE_URL present at load time.
// A dummy URL satisfies that without any connection ever being opened.
export default defineConfig({
  test: {
    environment: 'node',
    env: {
      DATABASE_URL:
        process.env.DATABASE_URL ||
        'postgresql://smoke:smoke@localhost:5432/celodesk_smoke',
    },
  },
});

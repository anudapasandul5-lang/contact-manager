import * as dotenv from "dotenv";

// Loads .env.test.local. Guard for DATABASE_URL_TEST lives in createTestDb(),
// NOT here — so smoke tests pass without DATABASE_URL_TEST being set.
dotenv.config({ path: ".env.test.local" });

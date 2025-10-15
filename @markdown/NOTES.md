- after updating wrangler.jsonc, you need to run `pnpm run cf-typegen` to update the worker-configuration.d.ts file.

# DATA OPS
- running `pnpm run drizzle:generate` generates sql migration 
- running `pnpm run drizzle:migrate` applies the migrations to the database

# USER AP
- secrets are stored in the .env file in the webapp package
- public variables are stored in the wrangler.jsonc file in the webapp package
- running cf-typegen generates the worker-configuration.d.ts file in the webapp package according to the two env providers above
- .env file is not available to worker deployment. needs explicit `wrangler secret put VAR_NAME` command
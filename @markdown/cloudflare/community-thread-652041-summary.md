# Cloudflare Community Thread: Binding Service RPC Using TypeScript (652041)

**user20284** (May 2024):  
I'm trying to use service binding RPC with TypeScript. My learning POC works, but I can't figure out how to get the service class definition from my Service to the client. In JavaScript it works without problem, in TypeScript too, but with errors. (Property 'ping' does not exist on type)

Service Worker:
```typescript
import { WorkerEntrypoint } from "cloudflare:workers";

export default class extends WorkerEntrypoint {
    async ping() : Promise<Number>{
        console.log('Call: ping');
        return Date.now()
    }
};
```

Client Worker:
```typescript
interface Env {
    SERVICE_TS_TEST_A: Fetcher;
}

export default {
    async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
        const value = await env.SERVICE_TS_TEST_A.ping();
        return new Response(`${value}`,{status: 200});
    }
}
```

wrangler.toml:
```toml
[[services]]
binding = "SERVICE_TS_TEST_A"
service = "service-ts-test-a"
```

Documentation example shows:
```typescript
interface Env {
    SUM_SERVICE: Service<SumService>;
}
```

My question is how do I make this association? In the example, how and where is the SumService type defined?

**blaziusbb** (Jun 2024):  
Bumping this, as it has not been replied to for 27 days and the documentation is definitely lacking proper TypeScript examples!

I'm running into the same issue as @user20284. I've tried another approach which led to yet another error.

Running `wrangler types` automatically generates, and forcibly overwrites the type definition to `Fetcher`:

```typescript
// WorkerA - worker-configuration.d.ts
interface Env {
    BATCH_WORKER: Fetcher;
}
```

I've tried manually setting the type as per the documentation and skipping running `wrangler types`:

```typescript
// WorkerA - worker-configuration.d.ts
interface Env {
    BATCH_WORKER: Service<BatchWorker>;
}
```

But now I run into the TypeScript error: "Type instantiation is excessively deep and possibly infinite.ts(2589)"

Because my bound worker is defined as:

```typescript
// Worker B - src/index.ts
export default class BatchWorker extends WorkerEntrypoint<Env> {
    async doSomeBatchWork() {
        const url = this.env.API_URL;
        const { results } = await this.env.D1.prepare("...").all();
    }
}

// Worker B - worker-configuration.d.ts
interface Env {
    API_URL = "https://...";
    D1: D1Database;
}
```

Notice the generic type `Env`, which is needed to access environment variables, D1 etc.

Everything in Worker B works as expected.

So, Cloudflare team, please do not neglect updating the documentation with complete TS examples, not just stubs (without any context as seen on RPC > TypeScript)

**labithiotis** (Nov 2024):  
You can get this working without import source files between workers if you have monorepo setup and use root types.d.ts

I have the following files:
```
package.json
types.d.ts
workers/
  workerA/
    index.ts
  workerB/
    index.ts
```

In workerA/index.ts:
```typescript
declare global {
  type WorkerAService = Service<Entrypoint>;
}

export default class Entrypoint extends WorkerEntrypoint<Env> implements ExportedHandler<Env> {
  ...
}
```

In workerB/index.ts:
```typescript
interface Env {
  workerAService: WorkerAService;
}

export default {
  async fetch(req, env): Promise<Response> {
    env.workerAService.method();
  }
}
```

In types.d.ts:
```typescript
// We need to hoist global types to its available for workerB
import('./workers/workerA/index');
```

**labithiotis** (Nov 2024):  
Oh you also need to import the types.d.ts in each tsconfig.

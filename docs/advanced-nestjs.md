# Tab 4 — Advanced NestJS

← [Back to README](../README.md)

---

## Table of Contents

- [What You Will Learn](#what-you-will-learn)
- [Custom Guards](#custom-guards)
- [Custom Decorators and Metadata](#custom-decorators-and-metadata)
- [Response Interceptors](#response-interceptors)
- [Try It Yourself](#try-it-yourself)

---

This tab builds on the NestJS CRUD tab and introduces four advanced patterns that you will encounter in real-world NestJS applications. All of the code lives in **`nestjs/src/advanced.controller.ts`** and is served under the `/api/advanced` prefix.

The tab is split into four interactive sub-sections in the UI. Each one shows the relevant code snippet alongside a live demo you can run directly in the browser.

---

## What You Will Learn

| Pattern | NestJS concept | Endpoint |
|---|---|---|
| Public endpoint | `@Public()` custom decorator + `Reflector` | `GET /api/advanced/public` |
| API key guard | `@UseGuards(ApiKeyGuard)` | `GET /api/advanced/guarded` |
| Response wrapping | `@UseInterceptors(WrapResponseInterceptor)` | All `/api/advanced/*` routes |

---

## Custom Guards

> **New to Guards?** See [Guards](../docs/concepts.md#guards) in the Core Concepts reference for a plain-English explanation before reading the code below.

A **Guard** is a class that implements `CanActivate`. NestJS calls it before the route handler and lets it decide whether the request should proceed.

```ts
// nestjs/src/advanced.controller.ts

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // (see next section for the isPublic check)
    const request = context.switchToHttp().getRequest();
    const apiKey = request.headers["x-api-key"];
    if (apiKey !== "secret-key-123") {
      throw new BadRequestException(
        "Invalid or missing API key (use x-api-key: secret-key-123)"
      );
    }
    return true;
  }
}
```

Apply the guard to an entire controller with `@UseGuards`:

```ts
@Controller("api/advanced")
@UseGuards(ApiKeyGuard)   // ← every route in this controller is now protected
export class AdvancedController { ... }
```

Guards are registered as **providers** in the module so NestJS can inject their dependencies:

```ts
// nestjs/src/app.module.ts
@Module({
  controllers: [ItemsController, AdvancedController],
  providers: [ApiKeyGuard],   // ← required for DI to work
})
export class AppModule {}
```

> **Why use a guard instead of middleware?**  
> Guards have access to the `ExecutionContext`, which lets them inspect the route handler's metadata (see the next section). Middleware runs before routing and cannot do this.

---

## Custom Decorators and Metadata

Sometimes you want to **opt certain routes out** of a guard — for example, a public health-check endpoint that should not require authentication.

NestJS provides `@SetMetadata` to attach arbitrary metadata to a route handler, and the `Reflector` service to read it back inside a guard.

### Step 1 — Create a custom decorator

```ts
// A shorthand decorator that sets the "isPublic" metadata flag to true
export const Public = () => SetMetadata("isPublic", true);
```

### Step 2 — Read the metadata inside the guard

```ts
@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Check if the route (or its controller) has been marked @Public()
    const isPublic = this.reflector.getAllAndOverride<boolean>("isPublic", [
      context.getHandler(),   // check the method first
      context.getClass(),     // then the class
    ]);
    if (isPublic) return true;   // skip the API key check

    // ... normal API key check
  }
}
```

### Step 3 — Use the decorator on a route

```ts
@Get("public")
@Public()   // ← this route bypasses the guard
publicEndpoint() {
  return { message: "No API key needed!" };
}
```

> **`getAllAndOverride`** checks the method-level metadata first, then falls back to the class-level metadata. This means you can mark an entire controller as public and override individual routes, or vice versa.

---

## Response Interceptors

> **New to Interceptors?** See [Interceptors](../docs/concepts.md#interceptors) in the Core Concepts reference for a plain-English explanation before reading the code below.

An **Interceptor** wraps the execution of a route handler. It can transform the response, add headers, log timing, or handle errors — before and after the handler runs.

This example wraps every response in a consistent envelope:

```ts
@Injectable()
export class WrapResponseInterceptor<T>
  implements NestInterceptor<T, { success: boolean; data: T; timestamp: string }>
{
  intercept(context: ExecutionContext, next: CallHandler<T>) {
    return next.handle().pipe(
      map((data) => ({
        success: true,
        data,
        timestamp: new Date().toISOString(),
      }))
    );
  }
}
```

Apply it to the controller with `@UseInterceptors`:

```ts
@Controller("api/advanced")
@UseGuards(ApiKeyGuard)
@UseInterceptors(WrapResponseInterceptor)   // ← wraps every response
export class AdvancedController { ... }
```

Every response from this controller now looks like:

```json
{
  "success": true,
  "timestamp": "2026-05-15T22:00:00.000Z",
  "data": { ... original response ... }
}
```

> **Interceptors use RxJS Observables.** `next.handle()` returns an `Observable` of the response. `pipe(map(...))` transforms each emitted value — in practice this is always a single value for HTTP responses.

---

## Try It Yourself

1. Start all servers: `./scripts/start-servers.sh`
2. Open **http://localhost:3000** and click the **🚀 Advanced NestJS** tab.
3. Work through each sub-section in order:

   **🌐 Public Endpoint** — Click the button. No API key is needed. Notice the response is still wrapped by the interceptor.

   **🔑 API Key Guard** — Try the request with the correct key (`secret-key-123`), then change it to something wrong and try again. Observe the 400 error. Notice the successful response is wrapped by the interceptor.

4. Try the endpoints directly with `curl`:

```bash
# Public endpoint — no API key needed
curl http://localhost:3002/api/advanced/public

# Guarded endpoint — correct key (response is wrapped by the interceptor)
curl http://localhost:3002/api/advanced/guarded \
  -H "x-api-key: secret-key-123"

# Guarded endpoint — wrong key → 400 error
curl http://localhost:3002/api/advanced/guarded \
  -H "x-api-key: wrong-key"
```

5. **Read the source:** Open `nestjs/src/advanced.controller.ts`. The file contains the guard, interceptor, and controller all in one place — easy to read top-to-bottom as a self-contained example.

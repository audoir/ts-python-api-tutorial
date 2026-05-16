# Tab 4 — Advanced NestJS

← [Back to README](../README.md)

---

## Table of Contents

- [What You Will Learn](#what-you-will-learn)
- [Custom Guards](#custom-guards)
- [Custom Decorators and Metadata](#custom-decorators-and-metadata)
- [Response Interceptors](#response-interceptors)
- [Dependency Injection](#dependency-injection)
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
| Dependency injection | `@Injectable()` + module `providers` | `GET /api/advanced/di` |

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

## Dependency Injection

**Dependency Injection (DI)** is the mechanism NestJS uses to wire your application together. Instead of manually creating instances of services, you declare what you need in a constructor and NestJS's IoC container provides them automatically.

This example goes one step further than basic DI: it demonstrates **swappable implementations** — a real-world pattern where you program to an abstract contract and swap the concrete class in one place (the module) without touching the controller at all.

### Step 1 — Define the contract (abstract class)

An abstract class serves as both the TypeScript type and the DI injection token.

```ts
// nestjs/src/advanced.controller.ts

export abstract class GreetingService {
  abstract getRandomGreeting(): string;
  abstract getStats(): { implementation: string; totalGreetings: number; greetings: string[] };
}
```

### Step 2 — Two concrete implementations

```ts
// Implementation A — human languages
@Injectable()
export class HumanGreetingService extends GreetingService {
  private readonly greetings = ["Hello", "Hola", "Bonjour", "Ciao", "こんにちは"];
  getRandomGreeting() { return this.greetings[Math.floor(Math.random() * this.greetings.length)]; }
  getStats() { return { implementation: "HumanGreetingService", totalGreetings: this.greetings.length, greetings: this.greetings }; }
}

// Implementation B — fictional / sci-fi phrases
@Injectable()
export class FictionalGreetingService extends GreetingService {
  private readonly greetings = ["Qapla'", "Shaka, when the walls fell", "Hodor", "Bazinga", "Expecto Patronum"];
  getRandomGreeting() { return this.greetings[Math.floor(Math.random() * this.greetings.length)]; }
  getStats() { return { implementation: "FictionalGreetingService", totalGreetings: this.greetings.length, greetings: this.greetings }; }
}
```

### Step 3 — Bind the implementation in AppModule with a custom provider

Instead of listing the class directly in `providers`, use the `{ provide, useClass }` object form. This binds the abstract token to a concrete class:

```ts
// nestjs/src/app.module.ts

@Module({
  controllers: [ItemsController, AdvancedController],
  providers: [
    ApiKeyGuard,
    {
      provide: GreetingService,         // ← the abstract token
      useClass: HumanGreetingService,   // ← swap to FictionalGreetingService here
    },
  ],
})
export class AppModule {}
```

To switch implementations, change `useClass` and restart the server. **Nothing else changes.**

### Step 4 — Controller is unaware of the concrete class

```ts
@Controller("api/advanced")
export class AdvancedController {
  constructor(
    private reflector: Reflector,
    private greetingService: GreetingService,   // ← abstract type only
  ) {}

  @Get("di")
  @Public()
  dependencyInjectionDemo() {
    return {
      greeting: this.greetingService.getRandomGreeting(),
      ...this.greetingService.getStats(),
      tip: "Change useClass in AppModule to swap the implementation.",
    };
  }
}
```

NestJS reads the TypeScript constructor parameter types at runtime (via `emitDecoratorMetadata`) and resolves the correct singleton instance from the container — no `new HumanGreetingService()` needed anywhere.

> **Singleton by default.** Providers are singletons within their module scope. The same instance is shared across every class that injects it. You can change this with custom [provider scopes](https://docs.nestjs.com/fundamentals/injection-scopes), but the default is almost always what you want.

> **Other `provide` forms.** Beyond `useClass`, NestJS supports `useValue` (inject a plain object or constant), `useFactory` (inject the result of a factory function, with async support), and `useExisting` (alias one token to another). These are all variations of the same custom provider pattern.

---

## Try It Yourself

1. Start all servers: `./scripts/start-servers.sh`
2. Open **http://localhost:3000** and click the **🚀 Advanced NestJS** tab.
3. Work through each sub-section in order:

   **🌐 Public Endpoint** — Click the button. No API key is needed. Notice the response is still wrapped by the interceptor.

   **🔑 API Key Guard** — Try the request with the correct key (`secret-key-123`), then change it to something wrong and try again. Observe the 400 error. Notice the successful response is wrapped by the interceptor.

   **🧩 Dependency Injection** — Click the button. The response includes an `implementation` field showing which concrete class is active (`HumanGreetingService`). To see the swap, change `useClass` in `nestjs/src/app.module.ts` to `FictionalGreetingService`, restart the NestJS server, and click again — the controller code is unchanged.

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

# DI demo — no API key needed (marked @Public())
curl http://localhost:3002/api/advanced/di
```

5. **Read the source:** Open `nestjs/src/advanced.controller.ts`. The file contains the guard, interceptor, and controller all in one place — easy to read top-to-bottom as a self-contained example.

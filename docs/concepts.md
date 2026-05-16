# Core Concepts

← [Back to README](../README.md)

This is a reference guide for the foundational concepts that appear throughout the tutorial. If you encounter an unfamiliar term in one of the tab docs, this is the place to look it up.

---

## Table of Contents

- [HTTP and REST APIs](#http-and-rest-apis)
- [CRUD](#crud)
- [Middleware](#middleware)
- [Routing](#routing)
- [Validation and Schemas](#validation-and-schemas)
- [Dependency Injection (DI)](#dependency-injection-di)
- [Decorators](#decorators)
- [Modules](#modules)
- [Guards](#guards)
- [Interceptors](#interceptors)
- [CORS](#cors)
- [WSGI vs ASGI](#wsgi-vs-asgi)
- [Sync vs Async](#sync-vs-async)
- [In-Memory Store](#in-memory-store)
- [OpenAPI / Swagger](#openapi--swagger)

---

## HTTP and REST APIs

**HTTP (HyperText Transfer Protocol)** is the foundation of data communication on the web. When a browser or client wants to interact with a server, it sends an **HTTP request** — a structured message that includes:

- A **method** (verb) — what action to perform (`GET`, `POST`, `PUT`, `PATCH`, `DELETE`)
- A **URL** — which resource to act on (e.g. `/api/items/42`)
- **Headers** — metadata about the request (e.g. `Content-Type: application/json`)
- A **body** — optional data sent with the request (e.g. a JSON object for `POST`)

The server responds with an **HTTP response** that includes:

- A **status code** — a number indicating success or failure (e.g. `200 OK`, `201 Created`, `404 Not Found`, `422 Unprocessable Entity`)
- **Headers** — metadata about the response
- A **body** — the returned data (usually JSON in a REST API)

**REST (Representational State Transfer)** is a set of conventions for designing HTTP APIs. A RESTful API organises resources as URLs and uses HTTP methods to express intent:

| Method | URL | Meaning |
|---|---|---|
| `GET` | `/api/items` | List all items |
| `POST` | `/api/items` | Create a new item |
| `GET` | `/api/items/42` | Get item with ID 42 |
| `PUT` | `/api/items/42` | Replace item 42 entirely |
| `PATCH` | `/api/items/42` | Partially update item 42 |
| `DELETE` | `/api/items/42` | Delete item 42 |

All five frameworks in this tutorial implement the same REST API contract — the same URLs, the same methods, the same JSON shapes.

---

## CRUD

**CRUD** stands for **Create, Read, Update, Delete** — the four fundamental operations you can perform on a resource. It maps directly to HTTP methods:

| CRUD | HTTP method | Example |
|---|---|---|
| **C**reate | `POST` | `POST /api/items` |
| **R**ead | `GET` | `GET /api/items` or `GET /api/items/1` |
| **U**pdate | `PUT` / `PATCH` | `PUT /api/items/1` (full) or `PATCH /api/items/1` (partial) |
| **D**elete | `DELETE` | `DELETE /api/items/1` |

Every tab in this tutorial implements a complete CRUD API for a simple "items" resource.

---

## Middleware

**Middleware** is a function that sits between the incoming HTTP request and your route handler. Every request passes through a chain of middleware functions in order, and each one can read or modify the request, send a response early, or pass control to the next function in the chain.

Think of it like a series of checkpoints at an airport. Your request is the passenger, and each checkpoint (middleware) can inspect it, stamp it, or turn it away before it reaches the gate (your route handler).

```
Incoming request
      ↓
  cors(...)         ← adds CORS headers so the browser allows the request
      ↓
  express.json()    ← reads the raw body and parses it as JSON
      ↓
  your route handler  ← finally handles the request and sends a response
```

In **Express**, middleware functions receive three arguments:

```ts
function myMiddleware(req, res, next) {
  // req  — the incoming request (headers, body, params, etc.)
  // res  — the outgoing response (use this to send a reply)
  // next — call this to pass control to the next middleware
  console.log(`${req.method} ${req.path}`);
  next(); // ← must call this, or the request will hang
}

app.use(myMiddleware); // register it for all routes
```

Express also has a special **error-handling middleware** with four parameters `(err, req, res, next)`. If any route handler throws an error, Express skips the normal middleware chain and jumps straight to the error handler.

In **NestJS**, the equivalent concepts are [Guards](#guards) and [Interceptors](#interceptors), which have access to richer context than plain middleware.

In **FastAPI**, middleware is added via `app.add_middleware(...)` — for example, `CORSMiddleware` from Starlette.

Middleware is what makes web frameworks flexible: you can add logging, authentication, rate limiting, body parsing, and CORS support by simply stacking middleware functions — without touching your route handlers at all.

---

## Routing

**Routing** is how a framework maps an incoming HTTP request (method + URL) to the function that should handle it.

Each framework in this tutorial takes a different approach:

| Framework | Routing style | Example |
|---|---|---|
| **Next.js** | File-system — a file at `app/api/items/route.ts` handles `/api/items`; exported function names (`GET`, `POST`) map to HTTP methods | `export async function GET() { ... }` |
| **Express** | Imperative — you call `app.get(...)`, `app.post(...)`, etc. in code | `app.get("/api/items", handler)` |
| **NestJS** | Declarative decorators — `@Controller`, `@Get`, `@Post` on classes and methods | `@Get() findAll() { ... }` |
| **Flask** | Decorator on the function — `@app.route(...)` with a `methods` list | `@app.route("/api/items", methods=["GET"])` |
| **FastAPI** | One decorator per HTTP method — `@app.get(...)`, `@app.post(...)` | `@app.get("/api/items")` |

**Dynamic segments** (path parameters) let you capture part of the URL as a variable:

| Framework | Syntax | How to access |
|---|---|---|
| Next.js | `app/api/items/[id]/route.ts` | `const { id } = await params` |
| Express | `/api/items/:id` | `req.params.id` |
| NestJS | `@Get(":id")` | `@Param("id") id: string` |
| Flask | `/api/items/<int:item_id>` | `item_id` function argument |
| FastAPI | `/api/items/{item_id}` | `item_id: int` function argument |

---

## Validation and Schemas

**Validation** is the process of checking that incoming data (a request body, a query parameter, a path segment) matches the shape and rules your API expects — before you try to use it.

Without validation, a user could send `{"name": ""}` or `{"name": 12345}` and your code might crash or store bad data silently.

A **schema** is a description of the expected shape of data. You define it once and use it to validate every incoming request.

### Zod (TypeScript)

[Zod](https://zod.dev) is a TypeScript-first schema validation library used by Next.js, Express, and NestJS in this tutorial.

```ts
import { z } from "zod";

const createItemSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional().default(""),
});

// Throws a ZodError if the data doesn't match
const { name, description } = createItemSchema.parse(body);
```

Zod uses a **fluent builder API** — you chain methods to describe constraints (`z.string().min(2).max(100)`).

One of Zod's biggest strengths is **dual-use**: the same schema can validate data on the server *and* provide user-friendly error messages in the browser UI — no duplication needed.

### Pydantic (Python)

[Pydantic](https://docs.pydantic.dev) is Python's answer to Zod. It uses standard Python type hints to define schemas and validates data at runtime. Pydantic v2 (used here) is written in Rust and is extremely fast.

```python
from pydantic import BaseModel, field_validator
from typing import Optional

class CreateItemSchema(BaseModel):
    name: str
    description: Optional[str] = ""

    @field_validator("name")
    @classmethod
    def name_must_not_be_empty(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Name is required and cannot be empty")
        return v
```

Pydantic uses **class definitions with type hints** and `@field_validator` decorators for custom rules.

### Comparing Zod and Pydantic

| | Zod (TypeScript) | Pydantic (Python) |
|---|---|---|
| **Schema definition** | `z.object({ name: z.string() })` | `class Schema(BaseModel): name: str` |
| **String min length** | `z.string().min(2)` | `@field_validator` with `len(v) < 2` check |
| **Optional field** | `z.string().optional()` | `Optional[str] = None` |
| **Validate** | `schema.parse(body)` — throws `ZodError` | `Schema.model_validate(body)` — raises `ValidationError` |
| **Error message** | `err.issues[0].message` | `exc.errors()[0]["msg"]` |

Both approaches achieve the same goal — catching bad input before it reaches your business logic.

### Automatic validation in FastAPI

FastAPI takes validation one step further: you declare the Pydantic model as a function parameter and FastAPI calls `model_validate()` for you. If validation fails, FastAPI automatically returns a `422 Unprocessable Entity` response — no `try/except` needed in your route handler.

```python
# Flask — you validate manually
data = CreateItemSchema.model_validate(body)  # inside a try/except

# FastAPI — validation is automatic
@app.post("/api/items")
def create_item(body: CreateItemSchema):  # FastAPI validates for you
    ...
```

---

## Dependency Injection (DI)

**Dependency Injection (DI)** is a pattern where a class declares what it needs (its *dependencies*), and the framework creates and provides those dependencies automatically — you never call `new SomeService()` yourself.

Think of it like a restaurant kitchen. A chef (controller) needs a knife (service). Instead of the chef going to the store to buy a knife, the kitchen manager (the DI container) hands the chef a knife when they start their shift.

```ts
// Without DI (manual wiring — like Express)
const emailService = new EmailService();
const userController = new UserController(emailService);

// With DI (NestJS handles this for you)
@Controller("users")
export class UserController {
  constructor(private emailService: EmailService) {}
  // NestJS automatically creates EmailService and passes it in
}
```

**Why does this matter?** The difference becomes clear when you need to swap an implementation — for example, switching from a real email service to a fake one for testing, or switching from one greeting strategy to another.

#### Without DI — manual wiring (like Express)

You can still define an abstract `EmailService` and two concrete implementations — that's just good object-oriented design. The problem is that *someone* has to call `new ConcreteClass()`, and that decision is buried inside each class that needs the dependency. To swap the implementation you have to edit every class that constructs it:

```ts
// The abstract contract and two implementations — same as the DI version
abstract class EmailService {
  abstract send(to: string, body: string): void;
}

class SmtpEmailService extends EmailService {
  send(to: string, body: string) { /* calls real SMTP server */ }
}

class FakeEmailService extends EmailService {
  send(to: string, body: string) { console.log(`[FAKE] To: ${to} — ${body}`); }
}

// Without DI — WelcomeService must pick a concrete class itself
class WelcomeService {
  private emailService: EmailService;

  constructor() {
    // ↓ Hard-coded choice. To use FakeEmailService you must edit this file.
    this.emailService = new SmtpEmailService();
  }

  welcome(user: string) {
    this.emailService.send(user, "Welcome!");
  }
}

class UserController {
  private welcomeService: WelcomeService;

  constructor() {
    this.welcomeService = new WelcomeService(); // ← also hard-coded
  }

  register(user: string) {
    this.welcomeService.welcome(user);
  }
}

// To swap SmtpEmailService → FakeEmailService you must open WelcomeService and
// change the `new` call. If ten other classes also do `new SmtpEmailService()`,
// you have to find and edit all ten.
const controller = new UserController();
```

#### With DI — NestJS handles the wiring

Classes declare what they need; the IoC container creates and injects the right instance. To swap the implementation, you change **one line** in the module — nothing else:

```ts
// With DI — declare the contract (abstract class = the token)
abstract class EmailService {
  abstract send(to: string, body: string): void;
}

// Implementation A — real SMTP
@Injectable()
class SmtpEmailService extends EmailService {
  send(to: string, body: string) { /* calls real SMTP server */ }
}

// Implementation B — fake for tests / local dev
@Injectable()
class FakeEmailService extends EmailService {
  send(to: string, body: string) { console.log(`[FAKE] To: ${to} — ${body}`); }
}

// WelcomeService and UserController never change — they only know about the abstract type
@Injectable()
class WelcomeService {
  constructor(private emailService: EmailService) {} // ← injected automatically
  welcome(user: string) { this.emailService.send(user, "Welcome!"); }
}

@Controller("users")
class UserController {
  constructor(private welcomeService: WelcomeService) {} // ← injected automatically
  register(user: string) { this.welcomeService.welcome(user); }
}

// Swap the implementation here — nowhere else
@Module({
  controllers: [UserController],
  providers: [
    WelcomeService,
    {
      provide: EmailService,
      useClass: SmtpEmailService,   // ← change to FakeEmailService for tests
    },
  ],
})
export class AppModule {}
```

The key insight: `WelcomeService` and `UserController` are completely unaware of whether they're talking to `SmtpEmailService` or `FakeEmailService`. The module is the only place that knows — and it's the only place you need to change.

**Summary of benefits:**

- **Testability** — swap `SmtpEmailService` for `FakeEmailService` in one place; no class edits needed.
- **Flexibility** — replace any implementation (e.g. swap a real database service for an in-memory one) without touching the classes that use it.
- **Decoupling** — classes don't know how to construct their dependencies, and don't care which concrete class they get.

DI is a first-class feature in **NestJS**. The other frameworks in this tutorial (Express, Flask, FastAPI) do not have a built-in DI container — you wire dependencies manually.

---

## Decorators

A **decorator** is a special `@Something` annotation you place above a class, method, or parameter. It is a TypeScript (and Python) feature that lets you attach extra behaviour or metadata to code without changing the code itself.

Think of it like a label on a box. The box (your function) still does the same thing, but the label tells the framework what role it plays.

### TypeScript decorators (NestJS)

| Decorator | What it tells NestJS |
|---|---|
| `@Controller("api/items")` | "This class handles HTTP routes that start with `/api/items`." |
| `@Get()` | "This method handles `GET` requests." |
| `@Post()` | "This method handles `POST` requests." |
| `@Body()` | "Inject the parsed request body as this parameter." |
| `@Param("id")` | "Inject the `:id` route parameter as this parameter." |
| `@Module(...)` | "This class is a NestJS module — here are its controllers and services." |
| `@Injectable()` | "This class can be injected as a dependency." |
| `@UseGuards(...)` | "Apply this guard to the controller or method." |
| `@UseInterceptors(...)` | "Apply this interceptor to the controller or method." |

Without decorators you would write `app.get("/api/items", handler)` like in Express. With decorators, the routing is declared *on* the class itself, which keeps related code together and makes large projects easier to navigate.

> **Note:** NestJS decorators require two extra TypeScript compiler options: `"experimentalDecorators": true` and `"emitDecoratorMetadata": true` in `tsconfig.json`.

### Python decorators (Flask, FastAPI)

Python has had decorators since Python 2.4. Flask and FastAPI use them to register route handlers:

```python
# Flask
@app.route("/api/items", methods=["GET"])
def list_items():
    ...

# FastAPI
@app.get("/api/items")
def list_items():
    ...
```

---

## Modules

A **module** is a NestJS concept — a class decorated with `@Module()` that groups related controllers and services together. Every NestJS application has at least one module — the root module (`AppModule`).

Think of a module like a folder in your project, but enforced by the framework. Instead of just *organising* files into folders, a module explicitly declares what belongs together and what is shared with the rest of the app.

```
AppModule
  ├── ItemsController   (handles /api/items routes)
  └── AdvancedController (handles /api/advanced routes)
```

In a larger app you might have a `UsersModule`, an `AuthModule`, and an `OrdersModule` — each one self-contained with its own controllers and services.

```ts
@Module({
  controllers: [ItemsController, AdvancedController],
  providers: [ApiKeyGuard],
})
export class AppModule {}
```

The other frameworks in this tutorial do not have a formal module system — you organise code into files and folders yourself.

---

## Guards

A **Guard** is a NestJS concept — a class that implements `CanActivate`. NestJS calls it before the route handler and lets it decide whether the request should proceed.

Guards are the NestJS equivalent of authentication/authorisation middleware in Express, but they have access to the `ExecutionContext` — which lets them inspect the route handler's metadata (e.g. whether a route has been marked `@Public()`).

```ts
@Injectable()
export class ApiKeyGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const apiKey = request.headers["x-api-key"];
    if (apiKey !== "secret-key-123") {
      throw new BadRequestException("Invalid or missing API key");
    }
    return true;
  }
}
```

Apply a guard to an entire controller or a single route:

```ts
@Controller("api/advanced")
@UseGuards(ApiKeyGuard)   // ← every route in this controller is now protected
export class AdvancedController { ... }
```

> **Guard vs middleware:** Guards run after middleware but before the route handler. They have access to the `ExecutionContext`, which lets them read decorator metadata. Plain middleware cannot do this.

---

## Interceptors

An **Interceptor** is a NestJS concept — a class that wraps the execution of a route handler. It can transform the response, add headers, log timing, or handle errors — both before and after the handler runs.

A common use case is wrapping every response in a consistent envelope:

```ts
@Injectable()
export class WrapResponseInterceptor<T> implements NestInterceptor {
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

Every response from a controller using this interceptor now looks like:

```json
{
  "success": true,
  "timestamp": "2026-05-15T22:00:00.000Z",
  "data": { "...": "original response" }
}
```

> **Interceptors use RxJS Observables.** `next.handle()` returns an `Observable` of the response. `pipe(map(...))` transforms each emitted value — in practice this is always a single value for HTTP responses.

---

## CORS

**CORS (Cross-Origin Resource Sharing)** is a browser security mechanism that blocks JavaScript from making HTTP requests to a different origin (domain + port) than the page it is running on.

In this tutorial, the Next.js UI runs on `http://localhost:3000` and the backend APIs run on ports 3001–3004. Without CORS headers, the browser would block the UI from fetching data from those backends.

Each framework handles CORS differently:

| Framework | How CORS is configured |
|---|---|
| **Next.js** | Not needed — the UI and API are on the same origin |
| **Express** | `app.use(cors({ origin: "http://localhost:3000" }))` via the `cors` npm package |
| **NestJS** | `app.enableCors({ origin: "http://localhost:3000" })` |
| **Flask** | Manual `@app.after_request` hook that adds `Access-Control-Allow-*` headers |
| **FastAPI** | `app.add_middleware(CORSMiddleware, allow_origins=["*"])` from Starlette |

The key header is `Access-Control-Allow-Origin`. When the browser sees this header in a response, it allows the JavaScript on the page to read the response body.

**Preflight requests:** For non-simple requests (e.g. `POST` with `Content-Type: application/json`), the browser first sends an `OPTIONS` request to check whether the server allows the cross-origin call. Flask requires a manual `OPTIONS` handler; the other frameworks handle this automatically.

---

## WSGI vs ASGI

These are two different interfaces that define how a Python web server communicates with a Python web application.

| | **WSGI** | **ASGI** |
|---|---|---|
| **Stands for** | Web Server Gateway Interface | Asynchronous Server Gateway Interface |
| **Introduced** | 2003 (PEP 333) | 2019 |
| **Concurrency model** | Synchronous — one request at a time per worker | Asynchronous — many requests concurrently in one worker |
| **`async def` support** | ❌ No (requires workarounds) | ✅ Yes (native) |
| **Server** | gunicorn, uWSGI | uvicorn, hypercorn, daphne |
| **Used by** | Flask (default), Django | FastAPI, Django Channels, Starlette |

**Flask** is WSGI by default. It handles one request at a time per worker process. For I/O-bound workloads (waiting on a database, calling an external API), this means workers sit idle while waiting — you need more worker processes to handle concurrency.

**FastAPI** is ASGI. A single worker can handle many requests concurrently using Python's `async`/`await` — while one request is waiting for a database query, the worker can start processing another request.

For this tutorial's in-memory store, the difference is not observable. In production with real databases and external services, ASGI can significantly improve throughput.

---

## Sync vs Async

**Synchronous (sync)** code runs one step at a time. Each line waits for the previous one to finish before executing.

**Asynchronous (async)** code can pause at certain points (like waiting for a network response or a database query) and let other code run in the meantime. When the wait is over, it resumes.

### In JavaScript / TypeScript

All five frameworks support `async/await`. In Next.js, Express, and NestJS, route handlers can be `async` functions:

```ts
// Sync
app.get("/api/items", (req, res) => {
  res.json(items); // instant — no waiting
});

// Async (needed when you await a database call, external API, etc.)
app.get("/api/items", async (req, res) => {
  const items = await db.query("SELECT * FROM items");
  res.json(items);
});
```

### In Python

Python added `async`/`await` in Python 3.5. Flask has limited async support (Flask 2+ allows `async def` views but still runs on WSGI). FastAPI is async-first — all route handlers can be `async def`:

```python
# Sync (Flask or FastAPI)
@app.get("/api/items")
def list_items():
    return list(_items.values())

# Async (FastAPI — preferred for I/O-bound work)
@app.get("/api/items")
async def list_items():
    items = await db.fetch_all("SELECT * FROM items")
    return items
```

In this tutorial, all route handlers use the in-memory store (no I/O), so sync functions are used throughout. In a real application with a database, you would use async handlers in FastAPI.

---

## In-Memory Store

All five APIs in this tutorial store data **in memory** — a plain array or dictionary in module scope — rather than in a database.

```ts
// TypeScript (Next.js, Express, NestJS)
let items: Item[] = [
  { id: 1, name: "Sample Item", description: "This is a sample item" },
];
let nextId = 2;
```

```python
# Python (Flask, FastAPI)
_items: dict[int, dict] = {}
_next_id = 1
```

**Why?** The focus of this tutorial is the API layer — routing, validation, middleware, and framework patterns. Adding a database would introduce setup complexity (installing a database, running migrations, managing connections) that would distract from those goals.

**Trade-offs to be aware of:**

- Data is **lost when the server restarts** — every restart starts with a fresh store.
- Data is **not shared between processes** — if you run multiple server instances, each has its own copy.
- There are **no transactions** — concurrent writes could theoretically corrupt data (the Python servers use a `threading.Lock()` to mitigate this).

In a real application you would replace the in-memory store with a database (PostgreSQL, SQLite, MongoDB, etc.) and an ORM or query builder (Prisma, TypeORM, SQLAlchemy, etc.).

---

## OpenAPI / Swagger

**OpenAPI** (formerly known as Swagger) is a standard, machine-readable format for describing REST APIs. An OpenAPI document is a JSON or YAML file that lists every endpoint, its parameters, request body shape, and possible responses.

**Swagger UI** is an interactive web interface generated from an OpenAPI document. It lets you explore and test an API directly in the browser — no `curl` commands needed.

**FastAPI** generates both automatically from your route decorators and Pydantic schemas:

- **Swagger UI:** http://localhost:3004/docs
- **ReDoc:** http://localhost:3004/redoc
- **Raw OpenAPI JSON:** http://localhost:3004/openapi.json

The other frameworks in this tutorial do not generate API docs automatically. In a real project you would add a library (e.g. `swagger-jsdoc` + `swagger-ui-express` for Express, or `@nestjs/swagger` for NestJS) to get the same functionality.

The OpenAPI spec is also useful for **generating client SDKs** — tools like [openapi-generator](https://openapi-generator.tech/) can read the spec and produce a typed client library in TypeScript, Python, Go, or any other language.

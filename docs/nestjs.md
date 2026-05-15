# Tab 3 — NestJS CRUD

← [Back to README](../README.md)

---

## Table of Contents

- [What is NestJS?](#what-is-nestjs)
- [Key Differences from Express](#key-differences-from-express)
- [How the API Works](#how-the-api-works)
- [How the UI Connects](#how-the-ui-connects)
- [Try It Yourself](#try-it-yourself)

---

## What is NestJS?

[NestJS](https://nestjs.com) is a **progressive Node.js framework** for building efficient, reliable, and scalable server-side applications. It is built on top of Express (by default) but adds a strong **architectural layer** inspired by Angular — using TypeScript decorators, dependency injection, and a module system to organise your code.

If Express is a blank canvas, NestJS is a structured blueprint. It enforces conventions that make large codebases easier to navigate and maintain.

NestJS is built around three core concepts — **decorators**, **modules**, and **dependency injection**. If any of these are unfamiliar, read the relevant sections in the [Core Concepts reference](../docs/concepts.md) before continuing:

- [Decorators](../docs/concepts.md#decorators)
- [Modules](../docs/concepts.md#modules)
- [Dependency Injection](../docs/concepts.md#dependency-injection-di)

Key selling points:

| Feature | Description |
|---|---|
| **Decorators** | Routes, parameters, and HTTP methods are declared with TypeScript decorators (`@Controller`, `@Get`, `@Post`, `@Body`, `@Param`, …) instead of imperative `app.get(...)` calls. |
| **Modules** | Code is organised into `@Module()` classes that declare which controllers and providers belong together — similar to Angular modules. |
| **Dependency Injection** | NestJS has a built-in DI container. Services are injected into controllers automatically, making code easy to test and swap out. |
| **Built on Express** | Under the hood, NestJS uses Express (or optionally Fastify). All Express middleware and ecosystem packages work out of the box. |
| **Opinionated structure** | Unlike Express, NestJS tells you exactly where things go — controllers handle HTTP, services handle business logic, modules wire them together. |

---

## Key Differences from Express

| | Express (Tab 2) | NestJS (Tab 3) |
|---|---|---|
| **Routing style** | Imperative (`app.get(...)`) | Declarative decorators (`@Get()`, `@Post()`) |
| **Code organisation** | Single file or ad-hoc structure | Enforced module/controller/service pattern |
| **Parameter extraction** | `req.params.id`, `req.body` | `@Param('id')`, `@Body()` decorators |
| **Error responses** | Manual `res.status(404).json(...)` | Built-in exception classes (`NotFoundException`, `BadRequestException`) |
| **Dependency injection** | None (manual wiring) | Built-in DI container |
| **TypeScript config** | Standard | Requires `experimentalDecorators` + `emitDecoratorMetadata` |
| **Port** | 3001 | 3002 |

---

## How the API Works

The NestJS server lives in **`nestjs/src/`** and is split across three files. Here is a guided tour:

### 1. Entry point — `nestjs/src/main.ts`

```ts
import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";

const PORT = 3002;

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({ origin: "http://localhost:3000" });
  await app.listen(PORT);
  console.log(`NestJS server running on http://localhost:${PORT}`);
}

bootstrap();
```

- `import "reflect-metadata"` must be the very first import — it enables the decorator metadata that NestJS relies on.
- `NestFactory.create(AppModule)` bootstraps the application from the root module.
- `app.enableCors(...)` is the NestJS equivalent of `app.use(cors(...))` in Express.

### 2. Root module — `nestjs/src/app.module.ts`

```ts
import { Module } from "@nestjs/common";
import { ItemsController } from "./items.controller";

@Module({
  controllers: [ItemsController],
})
export class AppModule {}
```

The `@Module()` decorator tells NestJS which controllers (and providers) belong to this module. For this tutorial there is only one controller, so the module is minimal.

### 3. Controller — `nestjs/src/items.controller.ts`

This is where all the route logic lives. Compare it to the Express routes — the logic is identical, but the *declaration style* is very different:

```ts
import {
  Controller, Get, Post, Put, Patch, Delete,
  Param, Body, HttpCode, HttpStatus,
  NotFoundException, BadRequestException, ParseIntPipe,
} from "@nestjs/common";

@Controller("api/items")          // base path for all routes in this controller
export class ItemsController {

  @Get()                          // GET /api/items
  findAll(): Item[] {
    return items;
  }

  @Post()                         // POST /api/items
  @HttpCode(HttpStatus.CREATED)   // respond with 201
  create(@Body() body: unknown): Item {
    const { name, description } = createItemSchema.parse(body);
    const newItem = { id: nextId++, name, description };
    items.push(newItem);
    return newItem;
  }

  @Get(":id")                     // GET /api/items/:id
  findOne(@Param("id", ParseIntPipe) id: number): Item {
    const item = items.find(i => i.id === id);
    if (!item) throw new NotFoundException("Item not found");
    return item;
  }

  @Put(":id")                     // PUT /api/items/:id
  update(@Param("id", ParseIntPipe) id: number, @Body() body: unknown): Item {
    const index = items.findIndex(i => i.id === id);
    if (index === -1) throw new NotFoundException("Item not found");
    const { name, description } = updateItemSchema.parse(body);
    items[index] = { id, name, description };
    return items[index];
  }

  @Patch(":id")                   // PATCH /api/items/:id
  partialUpdate(@Param("id", ParseIntPipe) id: number, @Body() body: unknown): Item {
    const index = items.findIndex(i => i.id === id);
    if (index === -1) throw new NotFoundException("Item not found");
    const patch = patchItemSchema.parse(body);
    items[index] = { ...items[index], ...patch, id };
    return items[index];
  }

  @Delete(":id")                  // DELETE /api/items/:id
  remove(@Param("id", ParseIntPipe) id: number): Item {
    const index = items.findIndex(i => i.id === id);
    if (index === -1) throw new NotFoundException("Item not found");
    return items.splice(index, 1)[0];
  }
}
```

Key things to notice:

- **`@Controller("api/items")`** sets the base path. All method decorators (`@Get`, `@Post`, etc.) are relative to it.
- **`@Param("id", ParseIntPipe)`** extracts the `:id` route parameter *and* automatically converts it from a string to a number. No `Number(req.params.id)` needed.
- **`@Body()`** extracts the parsed request body. NestJS handles JSON parsing automatically — no `app.use(express.json())` needed.
- **`NotFoundException` / `BadRequestException`** are built-in NestJS exception classes. Throwing them automatically sends the correct HTTP status code and a JSON error body — no manual `res.status(404).json(...)` needed.
- **`@HttpCode(HttpStatus.CREATED)`** sets the response status to 201 for the `create` method.

### 4. TypeScript configuration

NestJS decorators require two extra compiler options in `nestjs/tsconfig.json`:

```json
{
  "compilerOptions": {
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true
  }
}
```

Without these, the decorators will not work at runtime.

---

## How the UI Connects

The `NestjsCrud` component (`nextjs/app/components/NestjsCrud.tsx`) follows the same pattern as `ExpressCrud`, pointing to port 3002:

```ts
// ExpressCrud — port 3001
const EXPRESS_API = "http://localhost:3001";

// NestjsCrud — port 3002
const NESTJS_API = "http://localhost:3002";
```

The form, validation, and item list rendering are identical across all three tabs. The only thing that changes between tabs is the API base URL — which is the whole point: the same frontend can talk to any backend that speaks the same HTTP contract.

> **Note:** NestJS wraps error messages slightly differently from Express. When NestJS throws a `BadRequestException`, the response body uses a `message` field instead of `error`. The `NestjsCrud` component reads `err.message` to handle this correctly.

---

## Try It Yourself

1. Start all servers: `./scripts/start-servers.sh`
2. Open **http://localhost:3000** and click the **🐦 NestJS** tab.
3. Create, edit, and delete items — the UI behaves identically to the other tabs.
4. Open DevTools → Network and notice the requests go to `http://localhost:3002`.
5. Try the NestJS API directly with `curl`:

```bash
# List all items
curl http://localhost:3002/api/items

# Create an item
curl -X POST http://localhost:3002/api/items \
  -H "Content-Type: application/json" \
  -d '{"name":"NestJS Item","description":"Created via curl"}'

# Try an invalid body — Zod will reject it
curl -X POST http://localhost:3002/api/items \
  -H "Content-Type: application/json" \
  -d '{"name":""}'

# Update an item
curl -X PUT http://localhost:3002/api/items/1 \
  -H "Content-Type: application/json" \
  -d '{"name":"Updated","description":"New description"}'

# Partially update an item (PATCH)
curl -X PATCH http://localhost:3002/api/items/1 \
  -H "Content-Type: application/json" \
  -d '{"description":"Only the description changed"}'

# Delete an item
curl -X DELETE http://localhost:3002/api/items/1
```

6. **Compare the code:** Open `express/src/index.ts` and `nestjs/src/items.controller.ts` side-by-side. The business logic is identical — the difference is purely in how routes are *declared*. Express uses imperative function calls; NestJS uses declarative decorators.

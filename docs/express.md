# Tab 2 — Express CRUD

← [Back to README](../README.md)

---

## Table of Contents

- [What is Express?](#what-is-express)
- [Key Differences from Next.js](#key-differences-from-nextjs)
- [How the API Works](#how-the-api-works)
- [How the UI Connects](#how-the-ui-connects)
- [Try It Yourself](#try-it-yourself)

---

## What is Express?

[Express](https://expressjs.com) is the most widely-used **Node.js web framework**. Unlike Next.js, it is a pure backend library — it has no opinions about your frontend, no file-system routing, and no build step for the browser. You wire everything up yourself, which makes it a great way to understand what a web framework actually does under the hood.

Express is built around the concept of **middleware** — functions that sit between the incoming request and your route handler. If you are not familiar with middleware, read the [Middleware](../docs/concepts.md#middleware) section in the Core Concepts reference before continuing.

Key selling points:

| Feature | Description |
|---|---|
| **Minimal & unopinionated** | Express gives you routing and middleware — nothing more. You choose your own structure, validation library, ORM, etc. |
| **Middleware pipeline** | Every request flows through a chain of `(req, res, next)` functions. This makes it easy to add logging, auth, CORS, body parsing, and error handling in a composable way. |
| **Explicit routing** | Routes are registered with `app.get(...)`, `app.post(...)`, etc. — no magic file-system conventions. |
| **Huge ecosystem** | Thousands of npm packages are built specifically for Express (passport, multer, helmet, …). |
| **Separate from the frontend** | The Express server runs on its own port. The Next.js UI fetches data from it over HTTP — just like a real production setup where the frontend and backend are deployed independently. |

---

## Key Differences from Next.js

| | Next.js (Tab 1) | Express (Tab 2) |
|---|---|---|
| **Where the API lives** | Same process as the UI | Separate server on port 3001 |
| **Routing style** | File-system (`app/api/items/route.ts`) | Code-based (`app.get('/api/items', ...)`) |
| **CORS** | Not needed (same origin) | Required — browser blocks cross-origin requests by default |
| **Body parsing** | Built-in (`request.json()`) | Middleware (`app.use(express.json())`) |
| **Error handling** | Per-route try/catch | Global error-handler middleware |
| **Frontend fetch URL** | `/api/items` (relative) | `http://localhost:3001/api/items` (absolute) |

---

## How the API Works

The entire Express server lives in **`express/src/index.ts`**. Here is a guided tour:

### 1. Setup and middleware

```ts
import express from "express";
import cors from "cors";

const app = express();
const PORT = 3001;

// Allow requests from the Next.js dev server (port 3000)
app.use(cors({ origin: "http://localhost:3000" }));

// Parse JSON request bodies automatically
app.use(express.json());
```

- `cors(...)` adds the `Access-Control-Allow-Origin` header so the browser allows the Next.js page (on port 3000) to call this server (on port 3001).
- `express.json()` is a built-in middleware that reads the raw request body and parses it as JSON, making it available as `req.body`.

### 2. In-memory store

```ts
interface Item {
  id: number;
  name: string;
  description: string;
}

let items: Item[] = [
  { id: 1, name: "Sample Item", description: "This is a sample item" },
];
let nextId = 2;
```

Same pattern as the Next.js tab — a plain array in module scope. Data resets when the server restarts.

### 3. Routes

```ts
// GET /api/items — list all items
app.get("/api/items", (_req, res) => {
  res.json(items);
});

// POST /api/items — create a new item
app.post("/api/items", (req, res) => {
  const { name, description } = createItemSchema.parse(req.body);
  const newItem = { id: nextId++, name, description };
  items.push(newItem);
  res.status(201).json(newItem);
});

// PUT /api/items/:id — full update
app.put("/api/items/:id", (req, res) => {
  const index = items.findIndex(i => i.id === Number(req.params.id));
  if (index === -1) { res.status(404).json({ error: "Item not found" }); return; }
  const { name, description } = updateItemSchema.parse(req.body);
  items[index] = { id: Number(req.params.id), name, description };
  res.json(items[index]);
});

// DELETE /api/items/:id
app.delete("/api/items/:id", (req, res) => {
  const index = items.findIndex(i => i.id === Number(req.params.id));
  if (index === -1) { res.status(404).json({ error: "Item not found" }); return; }
  const deleted = items.splice(index, 1)[0];
  res.json(deleted);
});
```

- Route parameters (`:id`) are accessed via `req.params.id`.
- `res.json(value)` serialises the value and sets `Content-Type: application/json`.
- `res.status(404).json(...)` chains the status code before sending.

### 4. Global error handler

```ts
app.use((err, _req, res, _next) => {
  if (err instanceof ZodError) {
    res.status(400).json({ error: err.issues[0]?.message ?? "Validation error" });
    return;
  }
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});
```

Express recognises a middleware with **four parameters** `(err, req, res, next)` as an error handler. Any unhandled error thrown inside a route handler is forwarded here automatically.

> **Tip:** The Zod schemas (`express/src/schemas.ts`) are identical to the ones in the Next.js tab. In a real monorepo you would share them from a common package — here they are duplicated to keep each folder self-contained.

---

## How the UI Connects

The `ExpressCrud` component (`nextjs/app/components/ExpressCrud.tsx`) is almost identical to `NextjsCrud`, with one key difference — the base URL:

```ts
// NextjsCrud — same-origin, relative URL
const res = await fetch("/api/items");

// ExpressCrud — cross-origin, absolute URL pointing at the Express server
const EXPRESS_API = "http://localhost:3001";
const res = await fetch(`${EXPRESS_API}/api/items`);
```

Everything else — form handling, Zod client-side validation, edit/delete logic — is the same. This makes it easy to compare the two tabs side-by-side and see that the only real difference is *where* the API lives.

---

## Try It Yourself

1. Start both servers: `./scripts/start-servers.sh`
2. Open **http://localhost:3000** and click the **⚡ Express** tab.
3. Create, edit, and delete items — the UI behaves identically to the Next.js tab.
4. Open DevTools → Network and notice the requests now go to `http://localhost:3001` instead of the same origin.
5. Try the Express API directly with `curl`:

```bash
# List all items
curl http://localhost:3001/api/items

# Create an item
curl -X POST http://localhost:3001/api/items \
  -H "Content-Type: application/json" \
  -d '{"name":"Express Item","description":"Created via curl"}'

# Try an invalid body — Zod will reject it
curl -X POST http://localhost:3001/api/items \
  -H "Content-Type: application/json" \
  -d '{"name":""}'

# Update an item
curl -X PUT http://localhost:3001/api/items/1 \
  -H "Content-Type: application/json" \
  -d '{"name":"Updated","description":"New description"}'

# Partially update an item (PATCH)
curl -X PATCH http://localhost:3001/api/items/1 \
  -H "Content-Type: application/json" \
  -d '{"description":"Only the description changed"}'

# Delete an item
curl -X DELETE http://localhost:3001/api/items/1
```

6. **Experiment:** Stop the Express server (`Ctrl-C` in its terminal) and switch to the Express tab in the browser. Notice the error that appears when the frontend can't reach the backend — this is what a network failure looks like in a real separated frontend/backend setup.

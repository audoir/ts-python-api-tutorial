# Tab 1 — Next.js CRUD

← [Back to README](../README.md)

---

## Table of Contents

- [What is Next.js?](#what-is-nextjs)
- [Key Features Demonstrated](#key-features-demonstrated)
- [How the API Works](#how-the-api-works)
- [How the UI Works](#how-the-ui-works)
- [Validation with Zod](#validation-with-zod)
- [Try It Yourself](#try-it-yourself)

---

## What is Next.js?

[Next.js](https://nextjs.org) is a **full-stack React framework** built on top of Node.js. It lets you write both your frontend (React components) and your backend (API endpoints) in the same project, using the same language — TypeScript.

Key selling points:

| Feature | Description |
|---|---|
| **App Router** | File-system based routing — a file at `app/page.tsx` becomes `/`, a file at `app/about/page.tsx` becomes `/about`. |
| **Route Handlers** | Files named `route.ts` inside `app/api/…` become HTTP endpoints. Export a function named `GET`, `POST`, `PUT`, etc. and Next.js wires it up automatically. |
| **Server & Client Components** | By default, components run on the server (zero JS sent to the browser). Add `"use client"` at the top to opt into client-side React. |
| **Turbopack** | The built-in dev bundler — extremely fast hot-module replacement. |
| **TypeScript first** | Full TypeScript support out of the box, no extra config needed. |

---

## Key Features Demonstrated

This tab shows the **simplest possible CRUD API** using Next.js Route Handlers:

- **`GET /api/items`** — return all items as JSON
- **`POST /api/items`** — create a new item from a JSON body
- **`GET /api/items/[id]`** — return a single item by ID
- **`PUT /api/items/[id]`** — replace an item (full update)
- **`PATCH /api/items/[id]`** — partially update an item
- **`DELETE /api/items/[id]`** — remove an item

Data is stored **in-memory** (a plain JavaScript array) so there are no database dependencies — the focus is entirely on the API layer.

---

## How the API Works

### Collection route — `nextjs/app/api/items/route.ts`

```ts
// GET /api/items
export async function GET() {
  return NextResponse.json(items);
}

// POST /api/items
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { name, description } = createItemSchema.parse(body); // throws if invalid
  const newItem = { id: nextId++, name, description };
  items.push(newItem);
  return NextResponse.json(newItem, { status: 201 });
}
```

- Each exported function name maps directly to an HTTP method.
- `NextResponse.json()` serialises the value and sets `Content-Type: application/json`.
- `request.json()` parses the incoming JSON body.
- `schema.parse()` validates the body and throws a `ZodError` if it doesn't match.

### Item route — `nextjs/app/api/items/[id]/route.ts`

The folder name `[id]` creates a **dynamic segment**. Next.js passes the captured value through the second argument:

```ts
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;   // e.g. "42"
  const item = items.find(i => i.id === Number(id));
  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(item);
}
```

> **Note:** In Next.js 15+, `params` is a `Promise` — you must `await` it.

---

## How the UI Works

The frontend lives in `nextjs/app/page.tsx` and follows the **tab shell** pattern:

```
page.tsx
  └── PageHeader        (static header)
  └── TabNavigation     (tab bar — one tab per tutorial)
  └── NextjsCrud        (the CRUD UI for this tab)
```

`NextjsCrud` is a **Client Component** (`"use client"`) that:

1. Fetches the item list from `/api/items` on mount via `useEffect`.
2. Validates the form data client-side with Zod before sending a request.
3. Renders a form that calls `POST /api/items` (create) or `PUT /api/items/:id` (update).
4. Renders each item with **Edit** and **Delete** buttons.

Because the API and the UI live in the same Next.js process, there is no CORS configuration needed — the browser fetches `/api/items` relative to the same origin.

---

## Validation with Zod

[Zod](https://zod.dev) is a TypeScript-first schema validation library. Schemas are defined once and reused on both the server and the client.

### Shared schemas — `nextjs/app/lib/schemas.ts`

```ts
import { z } from "zod";

export const createItemSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional().default(""),
});

export const updateItemSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional().default(""),
});

export const patchItemSchema = z.object({
  name: z.string().min(1, "Name must not be empty").optional(),
  description: z.string().optional(),
});
```

### On the backend (API routes)

Each write handler calls `schema.parse(body)`. If the body is invalid, Zod throws a `ZodError` immediately — no manual `if (!name)` checks needed:

```ts
// POST /api/items
const { name, description } = createItemSchema.parse(body);

// PUT /api/items/:id
const { name, description } = updateItemSchema.parse(body);

// PATCH /api/items/:id
const patch = patchItemSchema.parse(body);
```

### On the frontend (React component)

The same schemas are imported into the client component and called before the `fetch`. This gives instant feedback without a network round-trip:

```ts
try {
  createItemSchema.parse({ name, description }); // throws ZodError if invalid
  const res = await fetch("/api/items", { method: "POST", ... });
  ...
} catch (err) {
  if (err instanceof ZodError) {
    setError(err.issues[0]?.message ?? "Validation error");
  }
}
```

This **single-schema, dual-use** pattern is one of Zod's biggest strengths: the same rules enforce correctness at the API boundary *and* provide user-friendly error messages in the UI.

---

## Try It Yourself

1. Start the server: `./scripts/start-servers.sh`
2. Open **http://localhost:3000**
3. Use the form to **create** a few items.
4. Try submitting the form with an **empty name** — Zod will catch it client-side and show an error message immediately.
5. Click **Edit** on an item, change the name, and click **Update**.
6. Click **Delete** to remove an item.
7. Open your browser's DevTools → Network tab and watch the `fetch` calls to `/api/items`.
8. Try the API directly with `curl`:

```bash
# List all items
curl http://localhost:3000/api/items

# Create an item
curl -X POST http://localhost:3000/api/items \
  -H "Content-Type: application/json" \
  -d '{"name":"My Item","description":"Hello from curl"}'

# Try sending an invalid body — Zod will throw on the server
curl -X POST http://localhost:3000/api/items \
  -H "Content-Type: application/json" \
  -d '{"name":""}'

# Update an item (replace 1 with the actual id)
curl -X PUT http://localhost:3000/api/items/1 \
  -H "Content-Type: application/json" \
  -d '{"name":"Updated Name","description":"Updated desc"}'

# Delete an item
curl -X DELETE http://localhost:3000/api/items/1
```

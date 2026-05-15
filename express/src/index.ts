import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import { ZodError } from "zod";
import {
  createItemSchema,
  updateItemSchema,
  patchItemSchema,
} from "./schemas";

const app = express();
const PORT = 3001;

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(cors({ origin: "http://localhost:3000" }));
app.use(express.json());

// ── In-memory store ───────────────────────────────────────────────────────────
interface Item {
  id: number;
  name: string;
  description: string;
}

let items: Item[] = [
  { id: 1, name: "Sample Item", description: "This is a sample item" },
];
let nextId = 2;

// ── Routes ────────────────────────────────────────────────────────────────────

// GET /api/items — list all items
app.get("/api/items", (_req: Request, res: Response) => {
  res.json(items);
});

// POST /api/items — create a new item
app.post("/api/items", (req: Request, res: Response) => {
  const { name, description } = createItemSchema.parse(req.body);
  const newItem: Item = { id: nextId++, name, description };
  items.push(newItem);
  res.status(201).json(newItem);
});

// GET /api/items/:id — get a single item
app.get("/api/items/:id", (req: Request, res: Response) => {
  const item = items.find((i) => i.id === Number(req.params.id));
  if (!item) {
    res.status(404).json({ error: "Item not found" });
    return;
  }
  res.json(item);
});

// PUT /api/items/:id — full update
app.put("/api/items/:id", (req: Request, res: Response) => {
  const index = items.findIndex((i) => i.id === Number(req.params.id));
  if (index === -1) {
    res.status(404).json({ error: "Item not found" });
    return;
  }
  const { name, description } = updateItemSchema.parse(req.body);
  items[index] = { id: Number(req.params.id), name, description };
  res.json(items[index]);
});

// PATCH /api/items/:id — partial update
app.patch("/api/items/:id", (req: Request, res: Response) => {
  const index = items.findIndex((i) => i.id === Number(req.params.id));
  if (index === -1) {
    res.status(404).json({ error: "Item not found" });
    return;
  }
  const patch = patchItemSchema.parse(req.body);
  items[index] = { ...items[index], ...patch, id: Number(req.params.id) };
  res.json(items[index]);
});

// DELETE /api/items/:id
app.delete("/api/items/:id", (req: Request, res: Response) => {
  const index = items.findIndex((i) => i.id === Number(req.params.id));
  if (index === -1) {
    res.status(404).json({ error: "Item not found" });
    return;
  }
  const deleted = items.splice(index, 1)[0];
  res.json(deleted);
});

// ── Global error handler ──────────────────────────────────────────────────────
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof ZodError) {
    res.status(400).json({ error: err.issues[0]?.message ?? "Validation error" });
    return;
  }
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`Express server running on http://localhost:${PORT}`);
});

import { NextRequest, NextResponse } from "next/server";
import { Item } from "../route";
import { updateItemSchema, patchItemSchema } from "@/app/lib/schemas";

// We share the same in-memory store via the parent module.
// Because Next.js compiles each route file independently, we re-export
// the store reference from the parent route module.
// NOTE: In a real app you'd use a database; this is for demo purposes.

// Import the mutable arrays from the parent module
import { items } from "../route";

function getItems(): Item[] {
  return items;
}

type Params = { id: string };

// GET /api/items/:id
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<Params> }
) {
  const { id } = await params;
  const item = getItems().find((i) => i.id === Number(id));
  if (!item) {
    return NextResponse.json({ error: "Item not found" }, { status: 404 });
  }
  return NextResponse.json(item);
}

// PUT /api/items/:id — full update
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<Params> }
) {
  const { id } = await params;
  const items = getItems();
  const index = items.findIndex((i) => i.id === Number(id));
  if (index === -1) {
    return NextResponse.json({ error: "Item not found" }, { status: 404 });
  }

  const body = await request.json();
  const { name, description } = updateItemSchema.parse(body);

  items[index] = { id: Number(id), name, description };
  return NextResponse.json(items[index]);
}

// PATCH /api/items/:id — partial update
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<Params> }
) {
  const { id } = await params;
  const items = getItems();
  const index = items.findIndex((i) => i.id === Number(id));
  if (index === -1) {
    return NextResponse.json({ error: "Item not found" }, { status: 404 });
  }

  const body = await request.json();
  const patch = patchItemSchema.parse(body);

  items[index] = { ...items[index], ...patch, id: Number(id) };
  return NextResponse.json(items[index]);
}

// DELETE /api/items/:id
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<Params> }
) {
  const { id } = await params;
  const items = getItems();
  const index = items.findIndex((i) => i.id === Number(id));
  if (index === -1) {
    return NextResponse.json({ error: "Item not found" }, { status: 404 });
  }

  const deleted = items.splice(index, 1)[0];
  return NextResponse.json(deleted);
}

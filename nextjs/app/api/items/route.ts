import { NextRequest, NextResponse } from "next/server";
import { createItemSchema } from "@/app/lib/schemas";

// In-memory store (resets on server restart)
export interface Item {
  id: number;
  name: string;
  description: string;
}

// Module-level store shared across requests in the same process
export let items: Item[] = [
  { id: 1, name: "Sample Item", description: "This is a sample item" },
];
export let nextId = 2;

// GET /api/items — list all items
export async function GET() {
  return NextResponse.json(items);
}

// POST /api/items — create a new item
export async function POST(request: NextRequest) {
  const body = await request.json();

  const { name, description } = createItemSchema.parse(body);

  const newItem: Item = {
    id: nextId++,
    name,
    description,
  };
  items.push(newItem);
  return NextResponse.json(newItem, { status: 201 });
}

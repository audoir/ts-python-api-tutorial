import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Param,
  Body,
  HttpCode,
  HttpStatus,
  NotFoundException,
  BadRequestException,
  ParseIntPipe,
} from "@nestjs/common";
import { ZodError } from "zod";
import {
  createItemSchema,
  updateItemSchema,
  patchItemSchema,
} from "./schemas";

interface Item {
  id: number;
  name: string;
  description: string;
}

let items: Item[] = [
  { id: 1, name: "Sample Item", description: "This is a sample item" },
];
let nextId = 2;

@Controller("api/items")
export class ItemsController {
  // GET /api/items — list all items
  @Get()
  findAll(): Item[] {
    return items;
  }

  // POST /api/items — create a new item
  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() body: unknown): Item {
    try {
      const { name, description } = createItemSchema.parse(body);
      const newItem: Item = { id: nextId++, name, description };
      items.push(newItem);
      return newItem;
    } catch (err) {
      if (err instanceof ZodError) {
        throw new BadRequestException(err.issues[0]?.message ?? "Validation error");
      }
      throw err;
    }
  }

  // GET /api/items/:id — get a single item
  @Get(":id")
  findOne(@Param("id", ParseIntPipe) id: number): Item {
    const item = items.find((i) => i.id === id);
    if (!item) throw new NotFoundException("Item not found");
    return item;
  }

  // PUT /api/items/:id — full update
  @Put(":id")
  update(@Param("id", ParseIntPipe) id: number, @Body() body: unknown): Item {
    const index = items.findIndex((i) => i.id === id);
    if (index === -1) throw new NotFoundException("Item not found");
    try {
      const { name, description } = updateItemSchema.parse(body);
      items[index] = { id, name, description };
      return items[index];
    } catch (err) {
      if (err instanceof ZodError) {
        throw new BadRequestException(err.issues[0]?.message ?? "Validation error");
      }
      throw err;
    }
  }

  // PATCH /api/items/:id — partial update
  @Patch(":id")
  partialUpdate(@Param("id", ParseIntPipe) id: number, @Body() body: unknown): Item {
    const index = items.findIndex((i) => i.id === id);
    if (index === -1) throw new NotFoundException("Item not found");
    try {
      const patch = patchItemSchema.parse(body);
      items[index] = { ...items[index], ...patch, id };
      return items[index];
    } catch (err) {
      if (err instanceof ZodError) {
        throw new BadRequestException(err.issues[0]?.message ?? "Validation error");
      }
      throw err;
    }
  }

  // DELETE /api/items/:id
  @Delete(":id")
  remove(@Param("id", ParseIntPipe) id: number): Item {
    const index = items.findIndex((i) => i.id === id);
    if (index === -1) throw new NotFoundException("Item not found");
    const deleted = items.splice(index, 1)[0];
    return deleted;
  }
}

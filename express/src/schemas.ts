import { z } from "zod";

// Schema for creating a new item (name required, description optional)
export const createItemSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional().default(""),
});

// Schema for fully updating an item (PUT — name required)
export const updateItemSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional().default(""),
});

// Schema for partially updating an item (PATCH — all fields optional)
export const patchItemSchema = z.object({
  name: z.string().min(1, "Name must not be empty").optional(),
  description: z.string().optional(),
});

export type CreateItemInput = z.infer<typeof createItemSchema>;
export type UpdateItemInput = z.infer<typeof updateItemSchema>;
export type PatchItemInput = z.infer<typeof patchItemSchema>;

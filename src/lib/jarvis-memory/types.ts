import { z } from "zod";

export const jarvisMemoryCategorySchema = z.enum([
  "fact",
  "preference",
  "research",
  "strategy",
  "watchlist",
  "temporary",
]);

export type JarvisMemoryCategory = z.infer<typeof jarvisMemoryCategorySchema>;

export const jarvisMemoryInputSchema = z.object({
  content: z.string().trim().min(1).max(5_000),
  category: jarvisMemoryCategorySchema.default("fact"),
  importance: z.number().int().min(1).max(5).default(3),
  metadata: z.record(z.string(), z.string().max(500)).default({}),
  expiresAt: z.string().datetime().optional(),
});

export type JarvisMemoryInput = z.infer<typeof jarvisMemoryInputSchema>;

export interface JarvisMemory {
  id: string;
  container: string;
  category: JarvisMemoryCategory;
  content: string;
  importance: number;
  metadata: Record<string, string>;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
}

import { defineCollection, z } from "astro:content";

const articles = defineCollection({
  type: "content",
  schema: z.object({
    title: z.string().min(5).max(160),
    description: z.string().min(30).max(240),
    date: z.coerce.date(),
    updated: z.coerce.date().optional(),
    category: z.enum(["mind", "islam", "philosophy", "history", "science", "technology", "world"]),
    tags: z.array(z.string()).max(8).default([]),
    readingTime: z.number().int().min(1).max(30),
    featured: z.boolean().default(false),
    status: z.enum(["published", "draft", "review"]).default("published"),
    author: z.string().default("Reader Editorial"),
    cover: z.string().optional(),
    sources: z.array(z.string()).default([]),
    canonical: z.string().url().optional()
  })
});

export const collections = { articles };

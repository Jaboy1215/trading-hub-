import { createClient } from "@supabase/supabase-js";

import {
  jarvisMemoryInputSchema,
  type JarvisMemory,
  type JarvisMemoryInput,
} from "./types";

const DEFAULT_CONTAINER = "trading-hub";

interface JarvisMemoryRow {
  id: string;
  container: string;
  category: JarvisMemory["category"];
  content: string;
  importance: number;
  metadata: Record<string, string>;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}

function getMemoryContainer(): string {
  return process.env["JARVIS_MEMORY_CONTAINER"]?.trim() || DEFAULT_CONTAINER;
}

function getSupabaseClient() {
  const url = process.env["SUPABASE_URL"];
  const serviceRoleKey = process.env["SUPABASE_SERVICE_ROLE_KEY"];

  if (!url || !serviceRoleKey) {
    const missing = [
      ...(url ? [] : ["SUPABASE_URL"]),
      ...(serviceRoleKey ? [] : ["SUPABASE_SERVICE_ROLE_KEY"]),
    ];
    throw new Error(`Jarvis cloud memory is not configured: missing ${missing.join(", ")}.`);
  }

  return createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function toMemory(row: JarvisMemoryRow): JarvisMemory {
  return {
    id: row.id,
    container: row.container,
    category: row.category,
    content: row.content,
    importance: row.importance,
    metadata: row.metadata,
    expiresAt: row.expires_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Stores a durable fact or short-lived context for the configured Jarvis
 * container. This service-role client is server-only and must not be imported
 * by browser code or public server functions.
 */
export async function rememberJarvisMemory(input: JarvisMemoryInput): Promise<JarvisMemory> {
  const memory = jarvisMemoryInputSchema.parse(input);
  const { data, error } = await getSupabaseClient()
    .from("jarvis_memories")
    .insert({
      container: getMemoryContainer(),
      category: memory.category,
      content: memory.content,
      importance: memory.importance,
      metadata: memory.metadata,
      expires_at: memory.expiresAt ?? null,
    })
    .select("id, container, category, content, importance, metadata, expires_at, created_at, updated_at")
    .single();

  if (error) throw new Error(`Unable to store Jarvis memory: ${error.message}`);
  return toMemory(data as JarvisMemoryRow);
}

/**
 * Retrieves bounded, non-expired context from the configured Jarvis container.
 * An empty query returns the highest-priority recent memories.
 */
export async function recallJarvisMemories(query: string, limit = 8): Promise<JarvisMemory[]> {
  const boundedLimit = Math.min(Math.max(Math.floor(limit), 1), 20);
  const client = getSupabaseClient();
  let request = client
    .from("jarvis_memories")
    .select("id, container, category, content, importance, metadata, expires_at, created_at, updated_at")
    .eq("container", getMemoryContainer())
    .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
    .order("importance", { ascending: false })
    .order("updated_at", { ascending: false })
    .limit(boundedLimit);

  const trimmedQuery = query.trim();
  if (trimmedQuery) {
    request = request.textSearch("search_document", trimmedQuery, { type: "websearch" });
  }

  const { data, error } = await request;
  if (error) throw new Error(`Unable to retrieve Jarvis memory: ${error.message}`);
  return (data as JarvisMemoryRow[] | null ?? []).map(toMemory);
}

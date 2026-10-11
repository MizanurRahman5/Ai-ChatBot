import { useSyncExternalStore } from "react";
import type { UIMessage } from "ai";

export type Thread = { id: string; title: string; updatedAt: number; messages: UIMessage[] };
export type Doc = { id: string; name: string; addedAt: number; chunks: string[] };

const THREADS_KEY = "codeowl.threads.v1";
const DOCS_KEY = "codeowl.docs.v1";

function makeStore<T>(key: string) {
  let cache: T[] | null = null;
  const listeners = new Set<() => void>();
  const EMPTY: T[] = [];
  const read = (): T[] => {
    if (typeof window === "undefined") return EMPTY;
    if (cache) return cache;
    try {
      cache = JSON.parse(localStorage.getItem(key) || "[]") as T[];
    } catch {
      cache = [];
    }
    return cache;
  };
  const write = (next: T[]) => {
    localStorage.setItem(key, JSON.stringify(next)); // may throw QuotaExceededError
    cache = next;
    listeners.forEach((l) => l());
  };
  const subscribe = (l: () => void) => {
    listeners.add(l);
    return () => listeners.delete(l);
  };
  const use = () => useSyncExternalStore(subscribe, read, () => EMPTY);
  return { read, write, use };
}

const threads = makeStore<Thread>(THREADS_KEY);
const docs = makeStore<Doc>(DOCS_KEY);

export const useThreads = threads.use;
export const useDocs = docs.use;
export const readThreads = threads.read;
export const readDocs = docs.read;

const uid = () => crypto.randomUUID().slice(0, 8);

export function createThread(): Thread {
  const t: Thread = { id: uid(), title: "New chat", updatedAt: Date.now(), messages: [] };
  threads.write([t, ...threads.read()]);
  return t;
}

export function saveMessages(id: string, messages: UIMessage[]) {
  const list = threads.read();
  const existing = list.find((t) => t.id === id);
  const firstText = messages
    .find((m) => m.role === "user")
    ?.parts.find((p) => p.type === "text") as { text?: string } | undefined;
  const title = firstText?.text ? firstText.text.slice(0, 48) : "New chat";
  const updated: Thread = { id, title, updatedAt: Date.now(), messages };
  if (existing && JSON.stringify(existing.messages) === JSON.stringify(messages)) return;
  threads.write([updated, ...list.filter((t) => t.id !== id)]);
}

export function deleteThread(id: string) {
  threads.write(threads.read().filter((t) => t.id !== id));
}

export function addDoc(name: string, chunks: string[]) {
  docs.write([{ id: uid(), name, addedAt: Date.now(), chunks }, ...docs.read()]);
}

export function removeDoc(id: string) {
  docs.write(docs.read().filter((d) => d.id !== id));
}

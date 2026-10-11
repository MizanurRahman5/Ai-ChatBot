import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { AlertCircle, FileText, Loader2, Menu, Plus, Trash2, Upload, X, Eraser, Image as ImageIcon } from "lucide-react";
import logo from "@/assets/logo.png";
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
  type PromptInputMessage,
} from "@/components/ai-elements/prompt-input";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { Button } from "@/components/ui/button";
import {
  addDoc,
  createThread,
  deleteThread,
  readDocs,
  readThreads,
  removeDoc,
  saveMessages,
  useDocs,
  useThreads,
} from "@/lib/store";
import { chunkText, retrieve } from "@/lib/rag";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/chat/$threadId")({
  head: () => ({
    meta: [
      { title: "Chat — CodeOwl" },
      { name: "description", content: "Your CodeOwl conversation about CSE and programming." },
      { property: "og:title", content: "Chat — CodeOwl" },
      { property: "og:description", content: "Your CodeOwl conversation about CSE and programming." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ChatPage,
});

function ChatPage() {
  const { threadId } = Route.useParams();
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [initial, setInitial] = useState<UIMessage[]>([]);
  const [drawer, setDrawer] = useState(false);

  useEffect(() => {
    const t = readThreads().find((x) => x.id === threadId);
    if (!t) {
      const first = readThreads()[0] ?? createThread();
      navigate({ to: "/chat/$threadId", params: { threadId: first.id }, replace: true });
      return;
    }
    setInitial(t.messages);
    setReady(true);
    setDrawer(false);
  }, [threadId, navigate]);

  return (
    <div className="flex h-dvh bg-background text-foreground">
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 w-72 border-r border-border bg-sidebar transition-transform md:static md:translate-x-0",
          drawer ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <Sidebar activeId={threadId} onClose={() => setDrawer(false)} />
      </aside>
      {drawer && (
        <button
          aria-label="Close menu"
          className="fixed inset-0 z-30 bg-background/70 md:hidden"
          onClick={() => setDrawer(false)}
        />
      )}
      <main className="flex min-w-0 flex-1 flex-col">
        {ready ? (
          <ChatWindow key={threadId} threadId={threadId} initial={initial} onMenu={() => setDrawer(true)} />
        ) : null}
      </main>
    </div>
  );
}

function Sidebar({ activeId, onClose }: { activeId: string; onClose: () => void }) {
  const threads = useThreads();
  const docs = useDocs();
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState<string | null>(null);

  const newChat = () => {
    const t = createThread();
    navigate({ to: "/chat/$threadId", params: { threadId: t.id } });
  };

  const onFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    const { extractPdfText } = await import("@/lib/pdf");
    for (const file of Array.from(files)) {
      if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
        toast.error(`${file.name} is not a PDF.`);
        continue;
      }
      if (file.size > 20 * 1024 * 1024) {
        toast.error(`${file.name} is larger than 20 MB.`);
        continue;
      }
      setUploading(file.name);
      try {
        const text = await extractPdfText(file);
        const chunks = chunkText(text);
        if (!chunks.length) {
          toast.error(`No readable text in ${file.name} (scanned PDFs aren't supported).`);
          continue;
        }
        addDoc(file.name, chunks);
        toast.success(`${file.name} added (${chunks.length} sections).`);
      } catch (e) {
        const quota = e instanceof DOMException && e.name === "QuotaExceededError";
        toast.error(quota ? "Browser storage is full. Remove a document first." : `Couldn't read ${file.name}.`);
      } finally {
        setUploading(null);
      }
    }
    if (fileRef.current) fileRef.current.value = "";
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 px-4 py-4">
        <img src={logo} alt="CodeOwl" width={32} height={32} className="size-8" />
        <div className="flex-1">
          <div className="font-display text-base font-semibold leading-none">CodeOwl</div>
          <div className="mt-1 text-xs text-muted-foreground">CSE & Programming tutor</div>
        </div>
        <Button variant="ghost" size="icon" className="md:hidden" onClick={onClose} aria-label="Close menu">
          <X />
        </Button>
      </div>
      <div className="px-3">
        <Button onClick={newChat} className="w-full justify-start" variant="default">
          <Plus /> New chat
        </Button>
      </div>

      <div className="mt-4 min-h-0 flex-1 overflow-y-auto px-3">
        <div className="px-1 pb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">Chats</div>
        <ul className="space-y-0.5">
          {threads.map((t) => (
            <li
              key={t.id}
              className={cn(
                "group flex items-center rounded-md text-sm",
                t.id === activeId ? "bg-sidebar-accent text-sidebar-accent-foreground" : "hover:bg-sidebar-accent/60",
              )}
            >
              <Link
                to="/chat/$threadId"
                params={{ threadId: t.id }}
                className="min-w-0 flex-1 truncate px-2.5 py-2"
              >
                {t.title}
              </Link>
              <button
                aria-label="Delete chat"
                className="mr-1 rounded p-1.5 text-muted-foreground opacity-0 hover:text-destructive group-hover:opacity-100 focus:opacity-100"
                onClick={() => {
                  deleteThread(t.id);
                  if (t.id === activeId) {
                    const next = readThreads()[0] ?? createThread();
                    navigate({ to: "/chat/$threadId", params: { threadId: next.id }, replace: true });
                  }
                }}
              >
                <Trash2 className="size-3.5" />
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div className="border-t border-border p-3">
        <div className="flex items-center justify-between px-1 pb-2">
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Study materials</span>
          <span className="text-xs text-muted-foreground">{docs.length}</span>
        </div>
        <ul className="mb-2 max-h-36 space-y-1 overflow-y-auto">
          {docs.map((d) => (
            <li key={d.id} className="flex items-center gap-2 rounded-md bg-muted px-2 py-1.5 text-xs">
              <FileText className="size-3.5 shrink-0 text-primary" />
              <span className="min-w-0 flex-1 truncate" title={d.name}>{d.name}</span>
              <button aria-label={`Remove ${d.name}`} onClick={() => removeDoc(d.id)} className="text-muted-foreground hover:text-destructive">
                <X className="size-3.5" />
              </button>
            </li>
          ))}
        </ul>
        <input ref={fileRef} type="file" accept="application/pdf,.pdf" multiple hidden onChange={(e) => onFiles(e.target.files)} />
        <Button variant="outline" className="w-full" disabled={!!uploading} onClick={() => fileRef.current?.click()}>
          {uploading ? <Loader2 className="animate-spin" /> : <Upload />}
          <span className="truncate">{uploading ? `Reading ${uploading}…` : "Upload PDF"}</span>
        </Button>
      </div>
    </div>
  );
}

const SUGGESTIONS = [
  "Explain Big-O of quicksort vs mergesort",
  "Write a linked list reversal in C++",
  "What is a deadlock and how to prevent it?",
  "Summarize my uploaded notes",
];

function ChatWindow({ threadId, initial, onMenu }: { threadId: string; initial: UIMessage[]; onMenu: () => void }) {
  const [input, setInput] = useState("");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const transport = useMemo(() => new DefaultChatTransport({ api: "/api/chat" }), []);
  const { messages, sendMessage, status, error, stop, setMessages, clearError } = useChat({
    id: threadId,
    messages: initial,
    transport,
    onError: (e) => toast.error(readError(e)),
  });
  const docs = useDocs();
  const busy = status === "submitted" || status === "streaming";
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (status === "ready" || status === "error") {
      try {
        saveMessages(threadId, messages);
      } catch {
        toast.error("Couldn't save chat history — browser storage may be full.");
      }
      textareaRef.current?.focus();
    }
  }, [messages, status, threadId]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        toast.error("Please select an image file.");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const send = (text: string) => {
    const q = text.trim();
    if (!q && !selectedImage) return;
    if (busy) return;

    const all = readDocs().flatMap((d) => d.chunks.map((t) => ({ source: d.name, text: t })));
    const context = retrieve(q || "Describe this image", all, 5);
    clearError();

    const files = selectedImage
      ? [
          {
            type: "file",
            filename: "image.png",
            mediaType: selectedImage.split(";")[0].replace("data:", ""),
            url: selectedImage,
          },
        ]
      : undefined;

    sendMessage(
      {
        text: q || "Describe this image",
        files,
      },
      { body: { context } }
    );

    setInput("");
    setSelectedImage(null);
    if (imageInputRef.current) imageInputRef.current.value = "";
  };

  const onSubmit = (m: PromptInputMessage) => send(m.text || "");

  return (
    <>
      <header className="flex items-center gap-2 border-b border-border px-3 py-2.5 md:px-6">
        <Button variant="ghost" size="icon" className="md:hidden" onClick={onMenu} aria-label="Open menu">
          <Menu />
        </Button>
        <div className="min-w-0 flex-1 text-sm text-muted-foreground">
          {docs.length ? (
            <span className="inline-flex items-center gap-1.5">
              <span className="size-1.5 rounded-full bg-primary" /> Using {docs.length} document{docs.length > 1 ? "s" : ""} as knowledge
            </span>
          ) : (
            "General CSE mode — upload PDFs or images to ground answers"
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          disabled={!messages.length || busy}
          onClick={() => {
            setMessages([]);
            saveMessages(threadId, []);
          }}
        >
          <Eraser /> Clear chat
        </Button>
      </header>

      <Conversation className="flex-1">
        <ConversationContent className="mx-auto w-full max-w-3xl px-4 py-6">
          {messages.length === 0 ? (
            <ConversationEmptyState>
              <img src={logo} alt="" width={72} height={72} className="size-18" />
              <h1 className="font-display text-2xl font-semibold">What are we learning today?</h1>
              <p className="max-w-md text-sm text-muted-foreground">
                Ask about algorithms, data structures, OS, networks, databases or any code.
              </p>
              <div className="mt-4 grid w-full max-w-lg gap-2 sm:grid-cols-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    className="rounded-lg border border-border bg-card px-3 py-2.5 text-left text-sm transition-colors hover:border-primary/60"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </ConversationEmptyState>
          ) : (
            messages.map((m) => (
              <Message from={m.role} key={m.id}>
                <MessageContent className="group-[.is-user]:bg-primary group-[.is-user]:text-primary-foreground">
                  {m.parts.map((p, i) => {
                    if (p.type === "text") {
                      return m.role === "assistant" ? (
                        <MessageResponse key={i}>{p.text}</MessageResponse>
                      ) : (
                        <p key={i} className="whitespace-pre-wrap">{p.text}</p>
                      );
                    }
                    if (p.type === "file" && p.mediaType?.startsWith("image/")) {
                      return (
                        <div key={i} className="mb-2 overflow-hidden rounded-md">
                          <img src={p.url} alt="Uploaded attachment" className="max-h-48 rounded object-cover" />
                        </div>
                      );
                    }
                    return null;
                  })}
                </MessageContent>
              </Message>
            ))
          )}
          {status === "submitted" && (
            <Message from="assistant">
              <MessageContent>
                <Shimmer>Thinking…</Shimmer>
              </MessageContent>
            </Message>
          )}
          {error && (
            <div className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
              <AlertCircle className="mt-0.5 size-4 shrink-0" />
              <span>{readError(error)}</span>
            </div>
          )}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      <div className="mx-auto w-full max-w-3xl px-3 pb-4 md:px-4">
        {selectedImage && (
          <div className="mb-2 flex items-center gap-2 rounded-lg border border-border bg-card p-2 w-fit">
            <img src={selectedImage} alt="Preview" className="size-12 rounded object-cover" />
            <span className="text-xs text-muted-foreground">Image attached</span>
            <button
              type="button"
              onClick={() => {
                setSelectedImage(null);
                if (imageInputRef.current) imageInputRef.current.value = "";
              }}
              className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <X className="size-4" />
            </button>
          </div>
        )}

        <input
          ref={imageInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleImageChange}
        />

        <PromptInput onSubmit={onSubmit}>
          <PromptInputTextarea
            ref={textareaRef}
            autoFocus
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onPaste={(e) => {
              const items = e.clipboardData?.items;
              if (!items) return;
              for (const item of items) {
                if (item.type.startsWith("image/")) {
                  const file = item.getAsFile();
                  if (file) {
                    const reader = new FileReader();
                    reader.onloadend = () => {
                      setSelectedImage(reader.result as string);
                    };
                    reader.readAsDataURL(file);
                    e.preventDefault();
                    break;
                  }
                }
              }
            }}
            placeholder="Ask a CSE question or attach an image…"
          />
          <PromptInputFooter>
            <PromptInputTools>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                onClick={() => imageInputRef.current?.click()}
              >
                <ImageIcon className="size-4" />
                <span>Upload image</span>
              </Button>
            </PromptInputTools>
            <PromptInputSubmit status={status} onStop={stop} disabled={!busy && !input.trim() && !selectedImage} />
          </PromptInputFooter>
        </PromptInput>
      </div>
    </>
  );
}

function readError(e: Error): string {
  try {
    const parsed = JSON.parse(e.message) as { error?: string };
    if (parsed.error) return parsed.error;
  } catch {
    /* not JSON */
  }
  if (/failed to fetch|network/i.test(e.message)) return "Network error — check your connection and try again.";
  return e.message || "Something went wrong.";
}
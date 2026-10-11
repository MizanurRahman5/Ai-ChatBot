import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { createThread, readThreads } from "@/lib/store";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "CodeOwl — CSE & Programming AI Tutor" },
      { name: "description", content: "Ask CSE and programming questions and chat with your PDF study notes." },
      { property: "og:title", content: "CodeOwl — CSE & Programming AI Tutor" },
      { property: "og:description", content: "Ask CSE and programming questions and chat with your PDF study notes." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Index,
});

function Index() {
  const navigate = useNavigate();
  useEffect(() => {
    const existing = readThreads()[0];
    const t = existing ?? createThread();
    navigate({ to: "/chat/$threadId", params: { threadId: t.id }, replace: true });
  }, [navigate]);
  return <div className="min-h-screen bg-background" />;
}

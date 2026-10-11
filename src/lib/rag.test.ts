import { describe, expect, it } from "vitest";
import { chunkText, retrieve } from "./rag";

describe("rag", () => {
  it("returns the chunk matching the question first", () => {
    const chunks = [
      { source: "a.pdf", text: "Dijkstra algorithm finds shortest paths in weighted graphs." },
      { source: "b.pdf", text: "TCP uses a three-way handshake to open connections." },
    ];
    expect(retrieve("How does the TCP handshake work?", chunks)[0]?.source).toBe("b.pdf");
  });
  it("returns nothing when no words match", () => {
    expect(retrieve("quantum banana", [{ source: "a", text: "binary trees" }])).toEqual([]);
  });
  it("splits long text into overlapping chunks", () => {
    expect(chunkText("x ".repeat(3000), 1200, 200).length).toBeGreaterThan(2);
  });
});

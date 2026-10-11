<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Chat history and uploaded PDF text live in browser localStorage (src/lib/store.ts); no backend DB — user chose browser storage.
- RAG is client-side BM25 over PDF chunks (src/lib/rag.ts); top excerpts are sent with each request to /api/chat, which holds the only AI key.

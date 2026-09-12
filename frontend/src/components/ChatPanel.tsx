import { useEffect, useRef, useState } from "react";
import { api, post } from "../api";
import { Button, Label, Pill, inputClass } from "../ui";
import type { Message, Thread } from "../types";

/** One thread, polled every 3s. No websockets: 20 minutes of work and
 *  nothing to reconnect on stage. */
export function ChatPanel({
  threadId,
  onThreadChange,
}: {
  threadId: number;
  onThreadChange?: (t: Thread) => void;
}) {
  const [thread, setThread] = useState<Thread | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);

  const load = async () => {
    const r = await api<{ thread: Thread; messages: Message[] }>(
      `/threads/${threadId}/messages`,
    );
    setThread(r.thread);
    setMessages(r.messages);
    onThreadChange?.(r.thread);
  };

  useEffect(() => {
    load();
    const t = window.setInterval(load, 3000);
    return () => window.clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [threadId]);

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight });
  }, [messages.length]);

  const send = async () => {
    if (!draft.trim()) return;
    setBusy(true);
    try {
      await post(`/threads/${threadId}/messages`, { body: draft.trim() });
      setDraft("");
      await load();
    } finally {
      setBusy(false);
    }
  };

  const share = async () => {
    setBusy(true);
    try {
      await post(`/threads/${threadId}/share-contact`, {});
      await load();
    } finally {
      setBusy(false);
    }
  };

  if (!thread) return <p className="p-4 text-sm text-muted">Loading…</p>;

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-rule px-4 py-2">
        <div>
          <p className="text-sm font-semibold">{thread.counterpart.name}</p>
          <p className="text-xs text-muted">
            {thread.counterpart.category} · listing #{thread.listing_id} ·{" "}
            {thread.listing_purity}% · {thread.listing_city}
          </p>
        </div>
        <span className="ml-auto tnum font-mono text-xs">
          {thread.counterpart.phone}
        </span>
        {thread.contact_shared ? (
          <Pill tone="good">number shared</Pill>
        ) : (
          <Pill tone="neutral">number hidden</Pill>
        )}
      </div>

      <div ref={scroller} className="flex-1 overflow-y-auto px-4 py-3">
        {messages.length === 0 && (
          <p className="text-sm text-muted">
            No messages yet. Introduce yourself and what you need.
          </p>
        )}
        <div className="flex flex-col gap-2">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`max-w-[80%] px-3 py-2 text-sm ${
                m.mine
                  ? "self-end border border-accent bg-accent-soft"
                  : "self-start border border-rule bg-surface-2"
              }`}
            >
              {m.body}
            </div>
          ))}
        </div>
      </div>

      <div className="border-t border-rule px-4 py-3">
        {thread.viewer_is_seller ? (
          thread.contact_shared ? (
            <p className="mb-2 text-xs text-good">
              ✓ Number shared with {thread.counterpart.name}
            </p>
          ) : (
            <div className="mb-2 flex items-center gap-2">
              <Button variant="ghost" onClick={share} disabled={busy}>
                🔓 Share my number with this buyer
              </Button>
              <span className="text-xs text-muted">
                only this buyer, only this listing
              </span>
            </div>
          )
        ) : (
          !thread.contact_shared && (
            <p className="mb-2 text-xs text-muted">
              Ask the seller to share their contact number — they release it
              from their side.
            </p>
          )
        )}
        <div className="flex gap-2">
          <input
            className={`${inputClass} flex-1`}
            placeholder="Write a message…"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
          />
          <Button onClick={send} disabled={busy || !draft.trim()}>
            Send
          </Button>
        </div>
      </div>
    </div>
  );
}

/** Inbox: thread list on the left, the selected conversation on the right. */
export function Messages() {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [active, setActive] = useState<number | null>(null);

  const load = async () => {
    const r = await api<{ threads: Thread[] }>("/threads/mine");
    setThreads(r.threads);
    setActive((a) => a ?? r.threads[0]?.id ?? null);
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="grid gap-4 lg:grid-cols-[20rem_1fr]">
      <div className="border border-rule bg-surface">
        <div className="border-b border-rule px-3 py-2">
          <Label>Conversations</Label>
        </div>
        {threads.length === 0 && (
          <p className="px-3 py-4 text-sm text-muted">
            No conversations yet. Buyers start them from a listing.
          </p>
        )}
        {threads.map((t) => (
          <button
            key={t.id}
            onClick={() => setActive(t.id)}
            className={`block w-full border-b border-rule px-3 py-2 text-left last:border-0 ${
              active === t.id ? "bg-accent-soft" : "hover:bg-surface-2"
            }`}
          >
            <p className="text-sm font-medium">{t.counterpart.name}</p>
            <p className="truncate text-xs text-muted">
              {t.last_message || "No messages yet"}
            </p>
            <p className="mt-0.5 text-[10px] text-muted">
              listing #{t.listing_id} · {t.listing_purity}% ·{" "}
              {t.contact_shared ? "number shared" : "number hidden"}
            </p>
          </button>
        ))}
      </div>

      <div className="min-h-[28rem] border border-rule bg-surface">
        {active ? (
          <ChatPanel threadId={active} onThreadChange={() => void 0} />
        ) : (
          <p className="p-4 text-sm text-muted">Select a conversation.</p>
        )}
      </div>
    </div>
  );
}

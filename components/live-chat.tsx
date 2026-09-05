'use client';
import { useEffect, useRef, useState, type SubmitEvent } from 'react';
type Message = { id: number; name: string; body: string; createdAt: number };
export default function LiveChat() {
  const [messages, setMessages] = useState<Message[]>([]),
    [body, setBody] = useState(''),
    [error, setError] = useState(''),
    [sending, setSending] = useState(false),
    [connected, setConnected] = useState(false);
  const list = useRef<HTMLDivElement>(null),
    nearBottom = useRef(true);
  useEffect(() => {
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;
    const controller = new AbortController();
    const refresh = async () => {
      try {
        const r = await fetch('/api/chat', {
          cache: 'no-store',
          signal: controller.signal,
        });
        if (!r.ok) throw Error();
        const data = (await r.json()) as { messages: Message[] };
        if (!stopped) {
          setMessages(data.messages);
          setConnected(true);
        }
      } catch {
        if (!stopped) setConnected(false);
      } finally {
        if (!stopped) timer = setTimeout(refresh, 3000);
      }
    };
    void refresh();
    return () => {
      stopped = true;
      clearTimeout(timer);
      controller.abort();
    };
  }, []);
  useEffect(() => {
    if (nearBottom.current && list.current)
      list.current.scrollTop = list.current.scrollHeight;
  }, [messages]);
  async function send(e: SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    if (sending || !body.trim()) return;
    setSending(true);
    setError('');
    try {
      const r = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body }),
      });
      const data = (await r.json()) as { error?: string };
      if (!r.ok) throw Error(data.error);
      setBody('');
      nearBottom.current = true;
      const latest = await fetch('/api/chat', { cache: 'no-store' });
      if (latest.ok)
        setMessages(
          ((await latest.json()) as { messages: Message[] }).messages,
        );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Message could not be sent.');
    } finally {
      setSending(false);
    }
  }
  return (
    <section className="live-chat">
      <div className="chat-heading">
        <strong>Along for the ride</strong>
        <span className="pill">{connected ? 'Connected' : 'Connecting…'}</span>
      </div>
      <p className="fine">One road. A little company along the way.</p>
      <div
        className="messages"
        ref={list}
        role="log"
        aria-label="Live chat messages"
        aria-live="polite"
        onScroll={() => {
          const el = list.current;
          if (el)
            nearBottom.current =
              el.scrollHeight - el.scrollTop - el.clientHeight < 60;
        }}
      >
        {messages.length === 0 ? (
          <p className="chat-empty">
            {connected
              ? 'It’s quiet here. Say hello to your fellow travelers.'
              : 'Connecting to the shared chat…'}
          </p>
        ) : (
          messages.map((m) => (
            <article key={m.id} className="message">
              <div>
                <strong>{m.name}</strong>
                <time dateTime={new Date(m.createdAt).toISOString()}>
                  {new Date(m.createdAt).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </time>
              </div>
              <p>{m.body}</p>
            </article>
          ))
        )}
      </div>
      <form onSubmit={send}>
        <label htmlFor="chat-message" className="field-label">
          Message the car
        </label>
        <textarea
          id="chat-message"
          maxLength={300}
          rows={2}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Say hello…"
        />
        <div
          className="row"
          style={{ justifyContent: 'space-between', marginTop: 8 }}
        >
          <span className="fine">{body.length}/300</span>
          <button
            className="btn primary"
            disabled={sending || !connected || !body.trim()}
          >
            {sending ? 'Sending…' : 'Send'}
          </button>
        </div>
        {error && (
          <p role="alert" className="fine">
            {error}
          </p>
        )}
      </form>
    </section>
  );
}

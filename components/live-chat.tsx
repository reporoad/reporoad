'use client';
import { useEffect, useRef, useState, type SubmitEvent } from 'react';
import { Send } from 'lucide-react';
type Message = { id: number; name: string; body: string; createdAt: number };
export default function LiveChat({ online }: { online: number | null }) {
  const [signedIn, setSignedIn] = useState(false);
  const [signInUrl, setSignInUrl] = useState('/signin-with-chatgpt?return_to=%2F');
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
        const data = (await r.json()) as { messages: Message[]; signedIn: boolean; signInUrl: string };
        if (!stopped) {
          setMessages(data.messages);
          setSignedIn(data.signedIn);
          setSignInUrl(data.signInUrl);
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
        <span className="pill" title="Active browsers in the last 90 seconds, including guests">{online === null ? 'Online count unavailable' : `${online} online`}</span>
      </div>
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
      {!signedIn ? <a className="chat-sign-in" href={signInUrl} target="_top">Sign in to say hello…</a> : <form onSubmit={send}>
        <label htmlFor="chat-message" className="sr-only">
          Chat message
        </label>
        <div className="chat-compose">
        <textarea
          id="chat-message"
          maxLength={300}
          rows={1}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Say hello…"
        />
          <button
            className="btn icon"
            aria-label={sending ? 'Sending message' : 'Send message'}
            disabled={sending || !connected || !body.trim()}
          >
            <Send size={20} />
          </button>
        </div>
        <div className="chat-compose-meta"><span>{connected ? 'Along for the ride' : 'Reconnecting…'}</span><span>{body.length}/300</span></div>
        {error && (
          <p role="alert" className="fine">
            {error}
          </p>
        )}
      </form>}
    </section>
  );
}

'use client';
import { ExternalLink } from 'lucide-react';
import { youtubeEmbedUrls, YOUTUBE_WATCH_URL } from '@/lib/youtube';

export function YouTubeStream() {
  const { player } = youtubeEmbedUrls(window.location.hostname);
  return <div className="youtube-view">
    <div className="youtube-player">
      <iframe title="RepoRoad broadcast on YouTube" src={player}
        allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
        allowFullScreen referrerPolicy="strict-origin-when-cross-origin" />
    </div>
    <div className="youtube-view-note">
      <span>Use the player to enable sound. Chicken clicks appear after the stream delay.</span>
      <a href={YOUTUBE_WATCH_URL} target="_blank" rel="noopener noreferrer">Watch on YouTube <ExternalLink size={14}/></a>
    </div>
  </div>;
}

export function YouTubeChat({ online }: { online: number | null }) {
  const { chat } = youtubeEmbedUrls(window.location.hostname);
  return <section className="youtube-chat" aria-label="Shared YouTube chat">
    <div className="chat-heading"><strong>Along for the ride</strong><span className="pill" title="Active website browsers only, including guests; not the YouTube viewer count">{online === null ? 'Connecting…' : `${online} on site`}</span></div>
    <iframe className="youtube-chat-frame" title="YouTube live chat" src={chat} referrerPolicy="strict-origin-when-cross-origin" />
    <p className="youtube-mobile-chat">YouTube does not support embedded chat on mobile web. Join the same conversation on YouTube.</p>
    <div className="youtube-chat-fallback"><a className="btn" href={YOUTUBE_WATCH_URL} target="_blank" rel="noopener noreferrer">Open chat on YouTube <ExternalLink size={14}/></a><p>Use your YouTube account to post. If sign-in or chat is blocked here, open YouTube. Chat is available while the broadcast is live.</p></div>
  </section>;
}

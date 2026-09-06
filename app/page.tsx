'use client';

import dynamic from 'next/dynamic';

const Chilldrive = dynamic(() => import('@/components/chilldrive'), {
  ssr: false,
  loading: () => <div style={{ minHeight: '100vh', background: '#171510', color: '#f6edda', padding: 32, fontFamily: 'sans-serif' }}>
    <strong>RepoRoad · Loading the live world…</strong>
    <p>If this remains visible, the browser source has not finished loading the application.</p>
  </div>,
});

export default function Home() {
  return <Chilldrive />;
}

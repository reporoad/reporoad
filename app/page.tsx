'use client';

import dynamic from 'next/dynamic';

const Chilldrive = dynamic(() => import('@/components/chilldrive'), {
  ssr: false,
});

export default function Home() {
  return <Chilldrive />;
}

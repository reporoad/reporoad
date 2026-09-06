'use client';
import { useState } from 'react';
import { BookOpen } from 'lucide-react';

export default function RepositoryAvatar({ fullName }: { fullName: string }) {
  const owner = fullName.split('/')[0];
  const [failedOwner, setFailedOwner] = useState('');
  return <span className="repository-avatar" title={`${owner} · repository owner`}>
    {failedOwner === owner || !/^[a-z\d](?:[a-z\d-]{0,38})$/i.test(owner)
      ? <BookOpen size={16} aria-hidden="true" />
      : <img src={`https://github.com/${encodeURIComponent(owner)}.png?size=40`}
          alt={`${owner} avatar`} width={20} height={20} decoding="async"
          referrerPolicy="no-referrer" onError={() => setFailedOwner(owner)} />}
  </span>;
}

'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { IconSearch } from '../../components/icons';

export function SearchBox({ initial }: { initial: string }) {
  const router = useRouter();
  const [q, setQ] = useState(initial);
  return (
    <form
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        router.push(`/recherche?q=${encodeURIComponent(q.trim())}`);
      }}
      className="flex gap-2"
    >
      <label htmlFor="site-search" className="sr-only">Rechercher sur Kinshasa Label</label>
      <div className="relative flex-1 min-w-0">
        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-brand-muted"><IconSearch size={18} /></span>
        <input
          id="site-search"
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Un resto, un lieu, une commune, une info…"
          autoFocus={!initial}
          className="w-full h-12 pl-10 pr-3 rounded-full border-2 border-brand-line bg-white text-base text-brand-ink focus:outline-none focus:border-brand-blue"
        />
      </div>
      <button type="submit" className="h-12 px-5 rounded-full bg-brand-red text-white font-bold cursor-pointer hover:bg-brand-red-dark shrink-0">
        Chercher
      </button>
    </form>
  );
}

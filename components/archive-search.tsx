'use client';

import { useState } from 'react';
import Link from 'next/link';
import { BookOpen, ChevronRight, Search, SlidersHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { publicRoute } from '@/lib/archive';

export type SearchItem = { title: string; route: string; detail: string };

export function ArchiveSearch({ items, label }: { items: SearchItem[]; label: string }) {
  const [query, setQuery] = useState('');
  const [regexOpen, setRegexOpen] = useState(false);
  const [regex, setRegex] = useState(false);
  const [flags, setFlags] = useState('i');
  const matcher = (() => {
    if (!query) return null;
    if (!regex) return (value: string) => value.toLocaleLowerCase().includes(query.toLocaleLowerCase());
    try {
      const expression = new RegExp(query, flags);
      return (value: string) => expression.test(value);
    } catch {
      return () => false;
    }
  })();
  const filtered = items.filter((item) => !matcher || matcher(`${item.title} ${item.detail}`));

  return <>
    <search className="archive-search" aria-label={label}>
      <Search aria-hidden="true" />
      <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={label} aria-label={label} />
      <Button type="button" variant="outline" onClick={() => setRegexOpen((value) => !value)} aria-expanded={regexOpen}><SlidersHorizontal /> Regex</Button>
    </search>
    {regexOpen && <section className="regex-panel" aria-label="Regex builder">
      <label className="switch-row"><span>Use regular expression</span><input type="checkbox" checked={regex} onChange={(event) => setRegex(event.target.checked)} /></label>
      <label htmlFor="archive-regex-flags">Flags</label><Input id="archive-regex-flags" value={flags} onChange={(event) => setFlags(event.target.value.replace(/[^dgimsuvy]/g, ''))} aria-label="Regular expression flags" />
      <p>JavaScript regular expressions are evaluated locally. Invalid patterns return no matches.</p>
    </section>}
    <p className="result-count" aria-live="polite">{filtered.length.toLocaleString()} results</p>
    <div className="article-list">
      {filtered.map((item) => <Link className="article-row" href={publicRoute(item.route)} key={item.route}>
        <span className="article-glyph"><BookOpen aria-hidden="true" /></span>
        <span><strong>{item.title}</strong><small>{item.detail}</small></span>
        <ChevronRight aria-hidden="true" />
      </Link>)}
      {filtered.length === 0 && <div className="empty-state"><Search aria-hidden="true" /><strong>No matches</strong><span>Clear the search or adjust the pattern.</span></div>}
    </div>
  </>;
}

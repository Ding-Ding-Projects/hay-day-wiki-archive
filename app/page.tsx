'use client';

import { useMemo, useState } from 'react';
import { BookOpen, ChevronRight, FolderTree, ImageIcon, Info, Leaf, Menu, Search, Settings, ShieldCheck, SlidersHorizontal, Sprout } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const featured = [
  { title: 'Crops', detail: 'Planting, harvest times, and field strategies', icon: Sprout, count: '57 articles' },
  { title: 'Products', detail: 'Production buildings, ingredients, and values', icon: Leaf, count: '312 articles' },
  { title: 'Animals', detail: 'Farm, pet, sanctuary, and visitor guides', icon: BookOpen, count: '86 articles' },
  { title: 'Media library', detail: 'Referenced images, audio, and video sources', icon: ImageIcon, count: '3,699 observed' },
];

const recent = [
  ['Hay Day', 'Overview of the farming simulation game and its systems'],
  ['Crops', 'Complete crop list, unlock levels, and harvest data'],
  ['Production Buildings', 'Machines, products, queues, and mastery'],
  ['Animals', 'Farm animals, pets, sanctuary animals, and rewards'],
  ['Town', 'Visitors, service buildings, reputation, and upgrades'],
];

const nav = [
  { label: 'Discover', icon: Leaf },
  { label: 'All articles', icon: BookOpen },
  { label: 'Categories', icon: FolderTree },
  { label: 'Media', icon: ImageIcon },
  { label: 'Settings', icon: Settings },
];

export default function Home() {
  const [active, setActive] = useState('Discover');
  const [query, setQuery] = useState('');
  const filtered = useMemo(() => recent.filter(([title, detail]) => `${title} ${detail}`.toLowerCase().includes(query.toLowerCase())), [query]);

  return (
    <main className="app-shell">
      <aside className="rail" aria-label="Primary navigation">
        <a className="brand" href="#top" aria-label="Hay Day Wiki Archive home">
          <span className="brand-mark"><Sprout aria-hidden="true" /></span>
          <span><strong>Hay Day</strong><small>Wiki Archive</small></span>
        </a>
        <nav className="rail-nav" aria-label="Archive sections">
          {nav.map(({ label, icon: Icon }) => (
            <button key={label} className={active === label ? 'rail-link active' : 'rail-link'} onClick={() => setActive(label)}>
              <Icon aria-hidden="true" /><span>{label}</span>
            </button>
          ))}
        </nav>
        <div className="rail-note"><ShieldCheck aria-hidden="true" /><p><strong>Read-only snapshot</strong><br />Source revisions and attribution stay attached to every imported article.</p></div>
      </aside>

      <section className="content" id="top">
        <header className="topbar">
          <Button variant="ghost" size="icon-lg" className="mobile-menu" aria-label="Open navigation"><Menu /></Button>
          <search className="top-search">
            <Search aria-hidden="true" />
            <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search articles, categories, and media" aria-label="Search the archive" />
            <Button variant="outline" size="sm" aria-label="Open regex builder"><SlidersHorizontal /> Regex</Button>
          </search>
          <Button variant="outline" className="language-button">English <ChevronRight /></Button>
        </header>

        <div className="page-wrap">
          <section className="hero" aria-labelledby="hero-title">
            <div className="hero-copy">
              <p className="eyebrow"><Leaf aria-hidden="true" /> Unofficial fan reference</p>
              <h1 id="hero-title">The farm knowledge base, replanted for easier reading.</h1>
              <p>Browse a reproducible, attributed snapshot of the reader-facing Hay Day Wiki without ads, trackers, account prompts, or community clutter.</p>
              <div className="hero-actions"><Button size="lg"><Search /> Search the archive</Button><Button size="lg" variant="outline"><FolderTree /> Browse categories</Button></div>
              <dl className="snapshot-stats"><div><dt>Planning audit articles</dt><dd>994</dd></div><div><dt>Planning audit categories</dt><dd>354</dd></div><div><dt>Observed media</dt><dd>3,699</dd></div></dl>
            </div>
            <div className="hero-art" aria-label="Archive snapshot overview">
              <div className="snapshot-card">
                <span className="feature-icon"><Sprout aria-hidden="true" /></span>
                <p className="eyebrow">Snapshot pipeline</p>
                <strong>Reader manifest</strong>
                <span>Import manifest pending</span>
                <div className="manifest-line"><i style={{ width: '82%' }} /><small>Articles</small></div>
                <div className="manifest-line"><i style={{ width: '58%' }} /><small>Categories</small></div>
                <div className="manifest-line"><i style={{ width: '94%' }} /><small>Media ledger</small></div>
              </div>
            </div>
          </section>

          <section className="section-block" aria-labelledby="browse-title">
            <div className="section-heading"><div><p className="eyebrow">Start exploring</p><h2 id="browse-title">Browse the farm</h2></div><Button variant="ghost">View all categories <ChevronRight /></Button></div>
            <div className="feature-grid">
              {featured.map(({ title, detail, icon: Icon, count }) => <article className="feature-card" key={title}><span className="feature-icon"><Icon aria-hidden="true" /></span><p className="feature-count">{count}</p><h3>{title}</h3><p>{detail}</p><Button variant="ghost" className="card-action">Open {title.toLowerCase()} <ChevronRight /></Button></article>)}
            </div>
          </section>

          <section className="section-block recent-block" aria-labelledby="recent-title">
            <div className="section-heading"><div><p className="eyebrow">Reader index</p><h2 id="recent-title">Featured articles</h2></div><span className="result-count" aria-live="polite">{filtered.length} results</span></div>
            <div className="article-list">
              {filtered.map(([title, detail]) => <a href="#article-preview" className="article-row" key={title}><span className="article-glyph"><BookOpen aria-hidden="true" /></span><span><strong>{title}</strong><small>{detail}</small></span><ChevronRight aria-hidden="true" /></a>)}
              {filtered.length === 0 && <div className="empty-state"><Search aria-hidden="true" /><strong>No matching articles</strong><span>Clear the search or try a different phrase.</span></div>}
            </div>
          </section>

          <footer className="archive-footer"><div><Info aria-hidden="true" /><p>This material is unofficial and is not endorsed by Supercell. Imported community text remains attributed to the Hay Day Wiki and licensed under CC BY-SA 3.0 where applicable.</p></div><p className="build-state">Version 0.1.0 preview · Updated-at provenance unavailable until the first release build</p></footer>
        </div>
      </section>
    </main>
  );
}

'use client';

import { useMemo, useState } from 'react';
import { BookOpen, ChevronRight, Download, FolderTree, ImageIcon, Info, Leaf, Menu, Search, Settings, ShieldCheck, SlidersHorizontal, Sprout } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { publicRoute } from '@/lib/archive';

const featured = [
  { title: 'Crops', detail: 'Planting, harvest times, and field strategies', icon: Sprout, count: '57 articles', href: '/all-pages?query=Crops' },
  { title: 'Products', detail: 'Production buildings, ingredients, and values', icon: Leaf, count: '312 articles', href: '/all-pages?query=Products' },
  { title: 'Animals', detail: 'Farm, pet, sanctuary, and visitor guides', icon: BookOpen, count: '86 articles', href: '/all-pages?query=Animals' },
  { title: 'Media library', detail: 'Referenced images, audio, and video sources', icon: ImageIcon, count: '3,708 records', href: '/media' },
];

const recent = [
  ['Hay Day', 'Overview of the farming simulation game and its systems'],
  ['Crops', 'Complete crop list, unlock levels, and harvest data'],
  ['Production Buildings', 'Machines, products, queues, and mastery'],
  ['Animals', 'Farm animals, pets, sanctuary animals, and rewards'],
  ['Town', 'Visitors, service buildings, reputation, and upgrades'],
];

const nav = [
  { label: 'Discover', icon: Leaf, href: '/' },
  { label: 'All articles', icon: BookOpen, href: '/all-pages' },
  { label: 'Categories', icon: FolderTree, href: '/category' },
  { label: 'Media', icon: ImageIcon, href: '/media' },
  { label: 'Settings', icon: Settings, href: '/settings' },
];

const installerUrl = 'https://github.com/Ding-Ding-Projects/hay-day-wiki-archive/releases/download/v0.1.0/Hay-Day-Wiki-Archive-0.1.0-Setup.exe';

export default function Home() {
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
          {nav.map(({ label, icon: Icon, href }) => (
            <Link key={label} href={publicRoute(href)} className={label === 'Discover' ? 'rail-link active' : 'rail-link'}>
              <Icon aria-hidden="true" /><span>{label}</span>
            </Link>
          ))}
        </nav>
        <div className="rail-note"><ShieldCheck aria-hidden="true" /><p><strong>Read-only snapshot</strong><br />Source revisions and attribution stay attached to every imported article.</p></div>
      </aside>

      <section className="content" id="top">
        <header className="topbar">
          <Link href={publicRoute('/all-pages')} className="mobile-menu mobile-nav-link" aria-label="Open article index"><Menu /></Link>
          <search className="top-search">
            <Search aria-hidden="true" />
            <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search articles, categories, and media" aria-label="Search the archive" />
            <Button variant="outline" size="sm" aria-label="Open regex builder"><SlidersHorizontal /> Regex</Button>
          </search>
          <Link href={publicRoute('/settings')} className="language-button home-action outline">English <ChevronRight /></Link>
        </header>

        <div className="page-wrap">
          <section className="hero" aria-labelledby="hero-title">
            <div className="hero-copy">
              <p className="eyebrow"><Leaf aria-hidden="true" /> Unofficial fan reference</p>
              <h1 id="hero-title">The farm knowledge base, replanted for easier reading.</h1>
              <p>Browse a reproducible, attributed snapshot of the reader-facing Hay Day Wiki without ads, trackers, account prompts, or community clutter.</p>
              <div className="hero-actions"><Link className="home-action primary" href={publicRoute('/all-pages')}><Search /> Search the archive</Link><Link className="home-action outline" href={publicRoute('/category')}><FolderTree /> Browse categories</Link><a className="home-action outline" href={installerUrl}><Download /> Download 0.1.0 for Windows</a></div>
              <dl className="snapshot-stats"><div><dt>Reader records</dt><dd>1,362</dd></div><div><dt>Category pages</dt><dd>354</dd></div><div><dt>Media records</dt><dd>3,708</dd></div></dl>
            </div>
            <div className="hero-art" aria-label="Archive snapshot overview">
              <div className="snapshot-card">
                <span className="feature-icon"><Sprout aria-hidden="true" /></span>
                <p className="eyebrow">Snapshot pipeline</p>
                <strong>Reader manifest</strong>
                <span>Exact-revision import complete</span>
                <div className="manifest-line"><i style={{ width: '100%' }} /><small>Articles</small></div>
                <div className="manifest-line"><i style={{ width: '100%' }} /><small>Categories</small></div>
                <div className="manifest-line"><i style={{ width: '100%' }} /><small>Media ledger</small></div>
              </div>
            </div>
          </section>

          <section className="section-block" aria-labelledby="browse-title">
            <div className="section-heading"><div><p className="eyebrow">Start exploring</p><h2 id="browse-title">Browse the farm</h2></div><Link className="home-action ghost" href={publicRoute('/category')}>View all categories <ChevronRight /></Link></div>
            <div className="feature-grid">
              {featured.map(({ title, detail, icon: Icon, count, href }) => <article className="feature-card" key={title}><span className="feature-icon"><Icon aria-hidden="true" /></span><p className="feature-count">{count}</p><h3>{title}</h3><p>{detail}</p><Link className="card-action home-action ghost" href={publicRoute(href)}>Open {title.toLowerCase()} <ChevronRight /></Link></article>)}
            </div>
          </section>

          <section className="section-block recent-block" aria-labelledby="recent-title">
            <div className="section-heading"><div><p className="eyebrow">Reader index</p><h2 id="recent-title">Featured articles</h2></div><span className="result-count" aria-live="polite">{filtered.length} results</span></div>
            <div className="article-list">
              {filtered.map(([title, detail]) => <Link href={publicRoute(`/all-pages?query=${encodeURIComponent(title)}`)} className="article-row" key={title}><span className="article-glyph"><BookOpen aria-hidden="true" /></span><span><strong>{title}</strong><small>{detail}</small></span><ChevronRight aria-hidden="true" /></Link>)}
              {filtered.length === 0 && <div className="empty-state"><Search aria-hidden="true" /><strong>No matching articles</strong><span>Clear the search or try a different phrase.</span></div>}
            </div>
          </section>

          <footer className="archive-footer"><div><Info aria-hidden="true" /><p>This material is unofficial and is not endorsed by Supercell. Imported community text retains the exact CC BY-SA terms captured from its source revision.</p></div><p className="build-state">Version 0.1.0 · Updated September 4, 2026 at 2:03:53 PM EDT from the v0.1.0 release record</p></footer>
        </div>
      </section>
    </main>
  );
}

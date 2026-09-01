import { ArrowLeft, CheckCircle2, Database, FileImage, ShieldCheck } from 'lucide-react';
import Link from 'next/link';

export const metadata = { title: 'Snapshot Status · Hay Day Wiki Archive' };

export default function StatusPage() {
  return (
    <main className="simple-page">
      <Link className="back-link" href="/"><ArrowLeft aria-hidden="true" /> Archive home</Link>
      <header className="simple-hero"><p className="eyebrow"><ShieldCheck aria-hidden="true" /> Honest archive status</p><h1>Snapshot status</h1><p>The exact-revision source import, rights-aware media ledger, reader build, and static route export are complete. Public publication and copied-media transfer remain open.</p></header>
      <section className="status-grid" aria-label="Archive status">
        <article><CheckCircle2 aria-hidden="true" /><span>Reader build</span><strong>Verified</strong><small>Lint, TypeScript, and the production build passed</small></article>
        <article><CheckCircle2 aria-hidden="true" /><span>Source snapshot</span><strong>Complete</strong><small>Content digest 05efa4bafc434ca5…</small></article>
        <article><Database aria-hidden="true" /><span>Reader records</span><strong>1,362</strong><small>1,362 individual article records are present</small></article>
        <article><FileImage aria-hidden="true" /><span>Media ledger</span><strong>3,708</strong><small>3,559 source links · 120 missing upstream · 29 external embeds</small></article>
      </section>
      <section className="evidence-card"><h2>Current evidence boundary</h2><ul><li>The owner-only review build is deployed.</li><li>npm reports zero known vulnerabilities after the compatible package update.</li><li>The static output contains 5,077 routes and is below the GitHub Pages size limit.</li><li>No public GitHub Pages deployment or copied-media bucket has been published yet.</li></ul></section>
    </main>
  );
}

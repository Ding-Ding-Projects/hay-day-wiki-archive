import { ArrowLeft, CheckCircle2, Clock3, Database, FileImage, ShieldCheck } from 'lucide-react';

export const metadata = { title: 'Snapshot Status · Hay Day Wiki Archive' };

export default function StatusPage() {
  return (
    <main className="simple-page">
      <a className="back-link" href="/"><ArrowLeft aria-hidden="true" /> Archive home</a>
      <header className="simple-hero"><p className="eyebrow"><ShieldCheck aria-hidden="true" /> Honest archive status</p><h1>Snapshot status</h1><p>This screen reports only evidence that exists. The reader preview is built; the complete source import and media ledger are still running.</p></header>
      <section className="status-grid" aria-label="Archive status">
        <article><CheckCircle2 aria-hidden="true" /><span>Reader preview</span><strong>Built</strong><small>Commit 3ca875f · local build verified</small></article>
        <article><Clock3 aria-hidden="true" /><span>Source snapshot</span><strong>In progress</strong><small>Execution-time manifest not frozen yet</small></article>
        <article><Database aria-hidden="true" /><span>Reader records</span><strong>Pending manifest</strong><small>Planning audit: 1,362 reader-facing records</small></article>
        <article><FileImage aria-hidden="true" /><span>Media ledger</span><strong>Pending classification</strong><small>Planning audit: 3,699 referenced file titles</small></article>
      </section>
      <section className="evidence-card"><h2>Current evidence boundary</h2><ul><li>Sites owner-only review build is deployed.</li><li>npm reports zero known vulnerabilities after the compatible package update.</li><li>No public GitHub Pages deployment or media bucket has been published.</li><li>Counts remain planning observations until the frozen snapshot manifest replaces them.</li></ul></section>
    </main>
  );
}

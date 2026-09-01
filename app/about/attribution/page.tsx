import { ArrowLeft, ExternalLink, Scale, ShieldCheck } from 'lucide-react';

export const metadata = { title: 'Attribution · Hay Day Wiki Archive' };

export default function AttributionPage() {
  return (
    <main className="simple-page">
      <a className="back-link" href="/"><ArrowLeft aria-hidden="true" /> Archive home</a>
      <header className="simple-hero"><p className="eyebrow"><Scale aria-hidden="true" /> Source and reuse</p><h1>Attribution and content policy</h1><p>The archive separates community text rights from individual media rights. A wiki-wide text license is not treated as permission to copy every uploaded file.</p></header>
      <section className="policy-grid">
        <article><ShieldCheck aria-hidden="true" /><h2>Community text</h2><p>Imported text will retain its original title, revision-pinned source link, source history link, import timestamp, transformation notice, and the exact license captured from the source.</p></article>
        <article><ShieldCheck aria-hidden="true" /><h2>Media</h2><p>Every referenced file receives one final verdict: copied, external embed, source-link-only, or missing upstream. Files with unknown or incompatible rights are never copied by inference.</p></article>
      </section>
      <section className="evidence-card"><h2>Unofficial fan content</h2><p>This material is unofficial and is not endorsed by Supercell. The archive remains non-commercial and uses game media only in factual article context when the file-level evidence permits it.</p><div className="source-links"><a href="https://hayday.fandom.com/wiki/Hay_Day_Wiki" target="_blank" rel="noreferrer">Original wiki <ExternalLink aria-hidden="true" /></a><a href="https://www.fandom.com/licensing" target="_blank" rel="noreferrer">Fandom licensing <ExternalLink aria-hidden="true" /></a><a href="https://supercell.com/en/fan-content-policy/" target="_blank" rel="noreferrer">Supercell Fan Content Policy <ExternalLink aria-hidden="true" /></a></div></section>
    </main>
  );
}

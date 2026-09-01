'use client';

import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Brain, Languages, Search, SlidersHorizontal, Sparkles, Upload, Volume2 } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';

type ReaderSettings = {
  language: 'en' | 'zh-HK' | 'bilingual';
  englishFunny: number;
  cantoneseFunny: number;
  dialogEmoji: boolean;
  focus: boolean;
  lowStimulation: boolean;
  timeAwareness: boolean;
  oneThing: boolean;
  momentum: boolean;
};

const defaults: ReaderSettings = { language: 'en', englishFunny: 5, cantoneseFunny: 5, dialogEmoji: true, focus: false, lowStimulation: false, timeAwareness: false, oneThing: false, momentum: false };

const cards = [
  { id: 'language', title: 'Language and tone', description: 'Choose English, playful Hong Kong Cantonese, or both. Tone controls change style, never source facts.', icon: Languages },
  { id: 'narration', title: 'Narration', description: 'Narration is off by default. Voice enumeration and serialized speech will be enabled in the full reader.', icon: Volume2 },
  { id: 'vocabulary', title: 'Personal vocabulary', description: 'Load a bounded local JSON file. Nothing is uploaded, logged, synchronized, or included in exports.', icon: Upload },
  { id: 'attention', title: 'Attention accommodations', description: 'Independent interface modes that are off by default and never presented as medical advice.', icon: Brain },
];

export default function SettingsPage() {
  const [settings, setSettings] = useState<ReaderSettings>(defaults);
  const [query, setQuery] = useState('');
  const [regexOpen, setRegexOpen] = useState(false);
  const [pattern, setPattern] = useState('');

  useEffect(() => {
    const handle = window.setTimeout(() => {
      try { const saved = localStorage.getItem('hay-day-wiki-reader-settings-v1'); if (saved) setSettings({ ...defaults, ...JSON.parse(saved) }); } catch { /* Keep truthful shipped defaults. */ }
    }, 0);
    return () => window.clearTimeout(handle);
  }, []);
  useEffect(() => { localStorage.setItem('hay-day-wiki-reader-settings-v1', JSON.stringify(settings)); }, [settings]);

  const searchResult = useMemo(() => {
    if (regexOpen && pattern) {
      try { const rx = new RegExp(pattern, 'iu'); return { items: cards.filter((card) => rx.test(`${card.title} ${card.description}`)), error: '' }; }
      catch (error) { return { items: [], error: error instanceof Error ? error.message : 'Invalid regular expression' }; }
    }
    return { items: cards.filter((card) => `${card.title} ${card.description}`.toLowerCase().includes(query.toLowerCase())), error: '' };
  }, [pattern, query, regexOpen]);

  const update = <K extends keyof ReaderSettings>(key: K, value: ReaderSettings[K]) => setSettings((current) => ({ ...current, [key]: value }));

  return (
    <main className="simple-page settings-page">
      <Link className="back-link" href="/"><ArrowLeft aria-hidden="true" /> Archive home</Link>
      <header className="simple-hero"><p className="eyebrow"><Sparkles aria-hidden="true" /> Local reader preferences</p><h1>Settings</h1><p>These controls affect this browser only. They do not edit the imported wiki, contact a server, or change the archive’s stable identity.</p></header>
      <search className="settings-search">
        <Search aria-hidden="true" /><Input value={regexOpen ? pattern : query} onChange={(event) => regexOpen ? setPattern(event.target.value) : setQuery(event.target.value)} placeholder={regexOpen ? 'Regular expression pattern' : 'Search settings'} aria-label={regexOpen ? 'Settings regular expression' : 'Search settings'} />
        <Button variant={regexOpen ? 'default' : 'outline'} onClick={() => setRegexOpen((open) => !open)} aria-expanded={regexOpen}><SlidersHorizontal /> Regex builder</Button>
      </search>
      {regexOpen && <section className="regex-panel" aria-label="Regular expression builder"><strong>JavaScript regular expression</strong><p>Unicode and case-insensitive flags are active. Evaluation is local and bounded to setting labels and descriptions.</p>{searchResult.error && <output className="field-error">{searchResult.error}</output>}</section>}
      <section className="settings-grid" aria-label="Reader settings">
        {searchResult.items.map(({ id, title, description, icon: Icon }) => (
          <article className="setting-card" key={id}><Icon aria-hidden="true" /><div><h2>{title}</h2><p>{description}</p></div>
            {id === 'language' && <div className="setting-controls"><label>Language<select value={settings.language} onChange={(event) => update('language', event.target.value as ReaderSettings['language'])}><option value="en">English</option><option value="zh-HK">Playful Hong Kong Cantonese</option><option value="bilingual">Bilingual</option></select></label><div className="slider-field"><span>English funny level <output>{settings.englishFunny}</output></span><Slider aria-label="English funny level" value={[settings.englishFunny]} min={1} max={5} step={1} onValueChange={(value) => update('englishFunny', typeof value === 'number' ? value : (value[0] ?? 5))} /></div><div className="slider-field"><span>Cantonese funny level <output>{settings.cantoneseFunny}</output></span><Slider aria-label="Cantonese funny level" value={[settings.cantoneseFunny]} min={1} max={5} step={1} onValueChange={(value) => update('cantoneseFunny', typeof value === 'number' ? value : (value[0] ?? 5))} /></div><div className="switch-row"><span>Show emojis in dialogs and message boxes</span><Switch aria-label="Show emojis in dialogs and message boxes" checked={settings.dialogEmoji} onCheckedChange={(value) => update('dialogEmoji', value)} /></div></div>}
            {id === 'narration' && <div className="unavailable-control"><Button disabled>Enable narrator</Button><span>Voice enumeration is not implemented in this preview.</span></div>}
            {id === 'vocabulary' && <div className="setting-controls"><label htmlFor="vocabulary-file">Local JSON file</label><Input id="vocabulary-file" type="file" accept="application/json,.json" aria-describedby="vocabulary-note" /><small id="vocabulary-note">Preview only: the validator is not implemented, so this control does not apply a file yet.</small></div>}
            {id === 'attention' && <div className="setting-controls">{([['focus','Focus'],['lowStimulation','Low stimulation'],['timeAwareness','Time awareness'],['oneThing','One thing at a time'],['momentum','Momentum']] as const).map(([key,label]) => <div className="switch-row" key={key}><span>{label}</span><Switch aria-label={label} checked={settings[key]} onCheckedChange={(value) => update(key, value)} /></div>)}</div>}
          </article>
        ))}
        {searchResult.items.length === 0 && <div className="empty-state"><Search aria-hidden="true" /><strong>No matching settings</strong><span>{searchResult.error || 'Clear the search or try another phrase.'}</span></div>}
      </section>
      <div className="settings-actions"><Button variant="outline" onClick={() => setSettings(defaults)}>Reset reader settings</Button></div>
    </main>
  );
}

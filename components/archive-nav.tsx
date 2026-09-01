import Link from 'next/link';
import { ArrowLeft, Info, Sprout } from 'lucide-react';
import { publicRoute } from '@/lib/archive';

export function ArchiveNav({ back = '/' }: { back?: string }) {
  return <header className="reader-header">
    <Link className="back-link" href={publicRoute(back)}><ArrowLeft aria-hidden="true" /> Back</Link>
    <Link className="reader-brand" href={publicRoute('/')}><Sprout aria-hidden="true" /><span>Hay Day Wiki Archive</span></Link>
    <Link className="reader-info" href={publicRoute('/about/attribution')}><Info aria-hidden="true" /><span>Attribution</span></Link>
  </header>;
}

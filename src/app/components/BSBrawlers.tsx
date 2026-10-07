import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ArrowUpDown, Cog, Flame, Search, SearchX, Star, Trophy, UserRound, Users, Wrench, Zap } from 'lucide-react';
import type { BSBrawlerData, BSEquipment } from '../data/mockStats';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { EmptyState } from '../ui/EmptyState';
import { GameImage } from '../ui/GameImage';
import { Pill } from '../ui/Pill';
import { titleCase } from '../ui/text';
import { getBSTierInfo } from '../utils/bsTiers';
import { BRAWLER_SORTS, brawlerList, type BrawlerSort } from './bsBrawlerList';

const FIELD = 'min-h-11 w-full rounded-card border border-line-input bg-canvas text-sm text-fg';
const n = (value: number) => value.toLocaleString('en-US');
// brawlify serves "regular" art for every item; "borderless" misses newer ones.
const art = (kind: 'gadgets' | 'star-powers', id: number) => [`https://cdn.brawlify.com/${kind}/regular/${id}.png`, `https://cdn.brawlify.com/${kind}/borderless/${id}.png`];

/** Brawl Stars "Brawlers" tab: every unlocked brawler with search and sort. */
export function BSBrawlers({ brawlers }: { brawlers: readonly BSBrawlerData[] }) {
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<BrawlerSort>('trophies');
  const searchRef = useRef<HTMLInputElement>(null);
  const refocus = useRef(false);

  // "Clear search" disappears with the empty state: give focus back to the search box.
  useEffect(() => {
    if (refocus.current) {
      refocus.current = false;
      searchRef.current?.focus();
    }
  });

  if (brawlers.length === 0) {
    return (
      <EmptyState icon={<Users />} title="No brawlers to show">
        The API sent no brawlers for this player.
      </EmptyState>
    );
  }

  const shown = brawlerList(brawlers, query, sort);

  return (
    <div className="space-y-4">
      <Card className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
        <label className="relative block">
          <span className="sr-only">Search brawlers</span>
          <Search aria-hidden="true" className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-fg-subtle" />
          <input ref={searchRef} type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search brawlers" className={`${FIELD} pr-3 pl-9`} />
        </label>
        <label className="relative block">
          <span className="sr-only">Sort brawlers</span>
          <ArrowUpDown aria-hidden="true" className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-fg-subtle" />
          <select value={sort} onChange={(e) => setSort(e.target.value as BrawlerSort)} className={`${FIELD} pr-3 pl-9`}>
            {BRAWLER_SORTS.map(([key, label]) => <option key={key} value={key}>{label}</option>)}
          </select>
        </label>
      </Card>

      <p aria-live="polite" className="text-sm text-fg-muted">
        Showing {shown.length} of {brawlers.length} brawlers
      </p>

      {shown.length === 0 ? (
        <EmptyState
          icon={<SearchX />}
          title="No brawlers match"
          action={<Button onClick={() => { refocus.current = true; setQuery(''); }}>Clear search</Button>}
        >
          No unlocked brawler has “{query.trim()}” in its name.
        </EmptyState>
      ) : (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {shown.map((b) => <BrawlerCard key={b.id} brawler={b} />)}
        </ul>
      )}
    </div>
  );
}

function BrawlerCard({ brawler: b }: { brawler: BSBrawlerData }) {
  const tier = getBSTierInfo(b.trophies);
  const hyper = b.hyperCharges?.[0];
  // The old tab also showed it when only the buffie flag was set.
  const hasHyper = Boolean(hyper) || Boolean(b.buffies?.hyperCharge);
  return (
    <li data-testid="brawler-card" className="flex min-w-0 flex-col gap-3 rounded-card border border-line bg-surface-1 p-4">
      <div className="flex items-start gap-3">
        <GameImage sources={[b.imageUrl]} alt="" width={64} height={64} fallback={<UserRound />} className="size-16 shrink-0 rounded-lg bg-surface-2 object-cover" />
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-base font-semibold text-fg">{titleCase(b.name)}</h3>
          <p className="mt-0.5 flex items-center gap-1.5 text-xs text-fg-subtle">
            <img src={tier.iconPath} alt="" width={16} height={16} loading="lazy" decoding="async" className="size-4 object-contain" />
            Power {b.power} · {tier.name}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="inline-flex items-center gap-1 text-base font-semibold tabular-nums text-fg">
            <Trophy aria-hidden="true" className="size-4 text-accent" />
            {n(b.trophies)}
            <span className="sr-only"> trophies</span>
          </p>
          <p className="text-xs tabular-nums text-fg-subtle">Best {n(b.highestTrophies)}</p>
        </div>
      </div>

      {((b.currentWinStreak ?? 0) > 0 || hasHyper) && (
        <div className="flex flex-wrap gap-1.5">
          {(b.currentWinStreak ?? 0) > 0 && <Pill tone="accent" icon={<Flame />}>Win streak {b.currentWinStreak}</Pill>}
          {hasHyper && (
            <Pill icon={<Zap />}>
              Hypercharge{hyper && <span className="sr-only">: {titleCase(hyper.name)}</span>}
            </Pill>
          )}
        </div>
      )}

      <dl className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-3 gap-y-2 border-t border-line pt-3 text-xs">
        <Items label="Gadgets" items={b.gadgetsList} icon={<Wrench />} sources={(id) => art('gadgets', id)} />
        <Items label="Star powers" items={b.starPowersList} icon={<Star />} sources={(id) => art('star-powers', id)} />
        <Items label="Gears" items={b.gearsList} icon={<Cog />} sources={(id) => [`https://cdn.brawlify.com/gears/regular/${id}.png`]} />
      </dl>
    </li>
  );
}

function Items({ label, items, icon, sources }: { label: string; items: readonly BSEquipment[]; icon: ReactNode; sources: (id: number) => string[] }) {
  return (
    <>
      <dt className="text-fg-subtle">{label}</dt>
      <dd className="flex min-h-7 flex-wrap items-center gap-1.5">
        {items.length === 0 ? (
          <span className="text-fg-subtle">None yet</span>
        ) : (
          items.map((item) => (
            <GameImage
              key={item.id}
              sources={sources(item.id)}
              alt={titleCase(item.name)}
              title={titleCase(item.name)}
              width={28}
              height={28}
              fallback={icon}
              className="size-7 object-contain [&_svg]:size-4"
            />
          ))
        )}
      </dd>
    </>
  );
}

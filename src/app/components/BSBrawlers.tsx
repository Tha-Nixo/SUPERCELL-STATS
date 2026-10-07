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
        <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-3 xl:grid-cols-3">
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
  const streak = b.currentWinStreak ?? 0;
  const counts = [
    { label: 'gadgets', count: b.gadgetsList.length, icon: <Wrench /> },
    { label: 'star powers', count: b.starPowersList.length, icon: <Star /> },
    { label: 'gears', count: b.gearsList.length, icon: <Cog /> },
  ];
  return (
    <li data-testid="brawler-card" className="flex min-w-0 flex-col gap-1.5 rounded-card border border-line bg-surface-1 px-3 py-2.5 sm:gap-3 sm:p-4">
      <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-x-3">
        <GameImage sources={[b.imageUrl]} alt="" width={64} height={64} fallback={<UserRound />} className="col-start-1 row-span-2 row-start-1 size-10 shrink-0 rounded-lg bg-surface-2 object-cover sm:size-16" />
        <h3 className="col-start-2 row-start-1 truncate text-base font-semibold text-fg">{titleCase(b.name)}</h3>
        <div className="col-start-3 row-start-1 text-right">
          <p className="inline-flex items-center gap-1 text-base font-semibold tabular-nums text-fg">
            <Trophy aria-hidden="true" className="size-4 text-accent" />
            {n(b.trophies)}
            <span className="sr-only"> trophies</span>
          </p>
          <p className="hidden text-xs tabular-nums text-fg-subtle sm:block">Best {n(b.highestTrophies)}</p>
        </div>
        <p className="col-span-2 col-start-2 row-start-2 flex min-w-0 items-center gap-1.5 text-xs text-fg-subtle">
          <img src={tier.iconPath} alt="" width={16} height={16} loading="lazy" decoding="async" className="size-4 shrink-0 object-contain" />
          <span className="min-w-0 break-words">Power {b.power} · Rank {b.rank} · {tier.name}</span>
        </p>
      </div>

      <ul className="flex items-center gap-x-3 text-xs text-fg-muted sm:hidden">
        {counts.map((c) => (
          <li key={c.label} className="inline-flex items-center gap-1 tabular-nums [&_svg]:size-3.5">
            <span aria-hidden="true" className="contents">{c.icon}</span>
            {c.count}
            <span className="sr-only"> {c.label}</span>
          </li>
        ))}
        {streak > 0 && (
          <li className="inline-flex items-center gap-1 tabular-nums text-accent [&_svg]:size-3.5">
            <Flame aria-hidden="true" />
            {streak}
            <span className="sr-only"> win streak</span>
          </li>
        )}
        {hasHyper && (
          <li className="inline-flex items-center gap-1 text-fg-muted [&_svg]:size-3.5">
            <Zap aria-hidden="true" />
            <span aria-hidden="true">Hyper</span>
            <span className="sr-only">Hypercharge{hyper && `: ${titleCase(hyper.name)}`}</span>
          </li>
        )}
        <li className="ml-auto tabular-nums text-fg-subtle">Best {n(b.highestTrophies)}</li>
      </ul>

      <div className="hidden flex-col gap-3 sm:flex">
        {(streak > 0 || hasHyper) && (
          <div className="flex flex-wrap gap-1.5">
            {streak > 0 && <Pill tone="accent" icon={<Flame />}>Win streak {streak}</Pill>}
            {hasHyper && (
              <Pill icon={<Zap />}>
                Hypercharge{hyper && <span className="sr-only">: {titleCase(hyper.name)}</span>}
              </Pill>
            )}
          </div>
        )}
        <dl className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-x-3 gap-y-2 border-t border-line pt-3 text-xs">
          <Items label="Gadgets" items={b.gadgetsList} icon={<Wrench />} sources={(id) => art('gadgets', id)} />
          <Items label="Star powers" items={b.starPowersList} icon={<Star />} sources={(id) => art('star-powers', id)} />
          <Items label="Gears" items={b.gearsList} icon={<Cog />} sources={(id) => [`https://cdn.brawlify.com/gears/regular/${id}.png`]} />
        </dl>
      </div>
    </li>
  );
}

function Items({ label, items, icon, sources }: { label: string; items: readonly BSEquipment[]; icon: ReactNode; sources: (id: number) => string[] }) {
  return (
    <>
      <dt className="pt-1 text-fg-subtle">
        {label} <span className="tabular-nums">{items.length}</span>
      </dt>
      <dd className="min-w-0">
        {items.length === 0 ? (
          <span className="inline-flex min-h-7 items-center text-fg-subtle">None yet</span>
        ) : (
          <ul className="flex flex-wrap gap-x-3 gap-y-1">
            {items.map((item) => (
              <li key={item.id} className="inline-flex min-w-0 items-center gap-1.5 text-fg-muted">
                <GameImage sources={sources(item.id)} alt="" width={24} height={24} fallback={icon} className="size-6 shrink-0 object-contain [&_svg]:size-4" />
                <span className="min-w-0 break-words">{titleCase(item.name)}</span>
              </li>
            ))}
          </ul>
        )}
      </dd>
    </>
  );
}

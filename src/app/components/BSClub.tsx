import { Shield, Trophy } from 'lucide-react';
import type { BSClubInfo } from '../data/mockStats';
import { Card } from '../ui/Card';
import { GameImage } from '../ui/GameImage';
import { Row } from '../ui/Row';
import { sentenceCase, stripColorTags } from '../ui/text';

interface BSClubProps {
  club: BSClubInfo;
  /** The viewed player's tag ('#PYLQGRJC'), to mark them in the member list. */
  playerTag: string;
}

const n = (value: number) => value.toLocaleString('en-US');
const MAX_MEMBERS = 30;

/** Brawl Stars "Club" tab: the club's card and its members by trophies. */
export function BSClub({ club, playerTag }: BSClubProps) {
  const description = stripColorTags(club.description).trim();
  return (
    <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-3">
      <Card as="section" aria-label="Club" className="min-w-0">
        <div className="mb-3 flex items-center gap-3">
          <GameImage
            sources={[`https://cdn.brawlify.com/club-badges/regular/${club.badgeId}.png`]}
            alt=""
            width={56}
            height={56}
            fallback={<Shield />}
            className="size-14 shrink-0 object-contain"
          />
          <div className="min-w-0">
            <h3 dir="auto" className="truncate text-xl font-semibold text-fg">{stripColorTags(club.name).trim() || club.tag || 'Club'}</h3>
            <p className="text-xs text-fg-subtle">{club.tag}</p>
          </div>
        </div>
        {description && <p dir="auto" className="mb-2 text-sm whitespace-pre-line text-pretty text-fg-muted">{description}</p>}
        <div className="divide-y divide-line">
          <Row label="Club trophies" value={n(club.trophies)} />
          <Row label="Trophies to join" value={n(club.requiredTrophies)} />
          <Row label="Type" value={sentenceCase(club.type || 'unknown')} />
          <Row label="Members" value={`${club.members.length} of ${MAX_MEMBERS}`} />
        </div>
      </Card>

      <Card as="section" title={`Members (${club.members.length})`} className="min-w-0 lg:col-span-2">
        <ol className="divide-y divide-line">
          {club.members.map((m, i) => {
            const you = m.tag.toUpperCase() === playerTag.toUpperCase();
            return (
              <li key={m.tag} data-testid="club-member" className="flex min-h-14 items-center gap-3 py-2">
                <span className="w-6 shrink-0 text-right text-sm tabular-nums text-fg-subtle">{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <p className="flex min-w-0 items-center gap-2">
                    <span dir="auto" className="truncate text-sm font-medium text-fg">{m.name}</span>
                    {/* Inline tag, not a Pill: a 28px pill would make this row taller than the others. */}
                    {you && <span className="shrink-0 rounded-pill bg-accent-soft px-2 text-xs font-medium text-accent">You</span>}
                  </p>
                  <p className="text-xs text-fg-subtle">{sentenceCase(m.role)}</p>
                </div>
                <span className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold tabular-nums text-fg">
                  <Trophy aria-hidden="true" className="size-4 text-accent" />
                  {n(m.trophies)}
                  <span className="sr-only"> trophies</span>
                </span>
              </li>
            );
          })}
        </ol>
      </Card>
    </div>
  );
}

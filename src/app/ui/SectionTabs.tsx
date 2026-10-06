import { useEffect, useRef, type KeyboardEvent, type ReactNode } from 'react';
import { cx } from './cx';

export interface TabDef {
  id: string;
  label: string;
  icon?: ReactNode;
  /** Short figure after the label ("12/123"); part of the tab's accessible name. */
  count?: string;
}

interface SectionTabsProps {
  tabs: readonly TabDef[];
  active: string;
  /** `via` lets the caller replace history for keyboard moves and push it for clicks. */
  onSelect: (id: string, via: 'pointer' | 'keyboard') => void;
  /** Accessible name of the tablist. */
  label: string;
  /** Prefix for element ids: tabs are `${idPrefix}-tab-<id>`, the panel is `${idPrefix}-panel`. */
  idPrefix: string;
}

/**
 * WAI-ARIA tablist with automatic activation: arrows / Home / End move and
 * select, only the selected tab is in the Tab order. Scrolls sideways on
 * small screens and keeps the selected tab in view.
 */
export function SectionTabs({ tabs, active, onSelect, label, idPrefix }: SectionTabsProps) {
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const list = listRef.current;
    const el = list?.querySelector<HTMLElement>('[aria-selected="true"]');
    if (!list || !el) return;
    // Move only the strip sideways; scrollIntoView could also scroll the page.
    const gap = 16;
    if (el.offsetLeft - gap < list.scrollLeft) list.scrollLeft = el.offsetLeft - gap;
    else if (el.offsetLeft + el.offsetWidth + gap > list.scrollLeft + list.clientWidth) {
      list.scrollLeft = el.offsetLeft + el.offsetWidth + gap - list.clientWidth;
    }
  }, [active]);

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    // Start from the focused tab, not from `active`: a second key press can
    // arrive before the URL change has re-rendered this list.
    const focusedId = (e.target as HTMLElement).id;
    const focused = tabs.findIndex((t) => `${idPrefix}-tab-${t.id}` === focusedId);
    const index = focused >= 0 ? focused : tabs.findIndex((t) => t.id === active);
    const last = tabs.length - 1;
    const next =
      e.key === 'ArrowRight' ? (index === last ? 0 : index + 1)
      : e.key === 'ArrowLeft' ? (index === 0 ? last : index - 1)
      : e.key === 'Home' ? 0
      : e.key === 'End' ? last
      : -1;
    if (next < 0) return;
    e.preventDefault();
    onSelect(tabs[next].id, 'keyboard');
    listRef.current?.querySelector<HTMLElement>(`#${idPrefix}-tab-${tabs[next].id}`)?.focus();
  };

  return (
    <div
      ref={listRef}
      role="tablist"
      aria-label={label}
      onKeyDown={onKeyDown}
      className="no-scrollbar relative -mx-4 flex h-12 items-stretch gap-1 overflow-x-auto px-4 sm:mx-0 sm:px-0"
    >
      {tabs.map((tab) => {
        const selected = tab.id === active;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            id={`${idPrefix}-tab-${tab.id}`}
            aria-selected={selected}
            aria-controls={`${idPrefix}-panel`}
            tabIndex={selected ? 0 : -1}
            onClick={() => onSelect(tab.id, 'pointer')}
            className={cx(
              'relative inline-flex min-h-11 focus-visible:outline-offset-[-2px] shrink-0 items-center gap-2 rounded-lg px-3 text-sm font-medium whitespace-nowrap transition-colors duration-150 [&_svg]:size-4',
              'after:absolute after:inset-x-3 after:-bottom-px after:h-0.5 after:rounded-pill',
              selected ? 'text-fg after:bg-accent' : 'text-fg-muted hover:bg-surface-2 hover:text-fg',
            )}
          >
            {tab.icon && <span aria-hidden="true" className={selected ? 'text-accent' : undefined}>{tab.icon}</span>}
            {tab.label}
            {tab.count && (
              <>
                <span aria-hidden="true" className="text-xs font-normal tabular-nums text-fg-subtle">{tab.count}</span>
                <span className="sr-only">{tab.count.replace('/', ' of ')}</span>
              </>
            )}
          </button>
        );
      })}
    </div>
  );
}

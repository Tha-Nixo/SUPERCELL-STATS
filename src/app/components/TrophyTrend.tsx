import { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { PerformancePoint } from '../data/mockStats';

interface TrophyTrendProps {
  data: PerformancePoint[];
  accentColor: string;
  /** What the y axis counts — "Trophies" for CR/BS. */
  unit?: string;
}

// Ring around the markers: the card surface, so they read as cut out of the line.
const SURFACE = 'var(--surface-1)';
const PAD = { top: 18, right: 60, bottom: 28, left: 52 };
const HEIGHT = 260;

/** Round a span to gridlines humans read: 1 / 2 / 5 × 10ⁿ. */
function niceStep(span: number, target: number): number {
  const raw = span / target;
  const mag = Math.pow(10, Math.floor(Math.log10(raw || 1)));
  const norm = raw / mag;
  const step = norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 5 ? 5 : 10;
  return step * mag;
}

export function TrophyTrend({ data, accentColor, unit = 'Trophies' }: TrophyTrendProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(720);
  const [active, setActive] = useState<number | null>(null);

  // Render at real pixel size: scaling an SVG by viewBox alone would stretch
  // the 2px strokes and the axis text along with the geometry.
  // Layout effect: measure before the first paint, or the 720px default
  // overflows a phone screen for a frame.
  useLayoutEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    ro.observe(el);
    setWidth(el.clientWidth);
    return () => ro.disconnect();
  }, []);

  const geom = useMemo(() => {
    const plotW = Math.max(width - PAD.left - PAD.right, 10);
    const plotH = HEIGHT - PAD.top - PAD.bottom;
    const values = data.map((d) => d.trophies);
    const lo = Math.min(...values);
    const hi = Math.max(...values);
    const step = niceStep(Math.max(hi - lo, 1), 4);
    const yMin = Math.floor(lo / step) * step - (hi === lo ? step : 0);
    const yMax = Math.ceil(hi / step) * step + (hi === lo ? step : 0);
    const span = yMax - yMin || 1;

    const x = (i: number) => PAD.left + (data.length === 1 ? plotW / 2 : (i / (data.length - 1)) * plotW);
    const y = (v: number) => PAD.top + plotH - ((v - yMin) / span) * plotH;

    const ticks: number[] = [];
    for (let t = yMin; t <= yMax + 0.001; t += step) ticks.push(Math.round(t));

    const points = data.map((d, i) => ({ x: x(i), y: y(d.trophies) }));
    const line = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
    const areaBase = PAD.top + plotH;
    const area = `${line} L${points[points.length - 1].x.toFixed(1)},${areaBase} L${points[0].x.toFixed(1)},${areaBase} Z`;

    return { plotW, plotH, points, line, area, ticks, x, y, areaBase };
  }, [data, width]);

  const pick = useCallback(
    (clientX: number) => {
      const el = wrapRef.current;
      if (!el || data.length === 0) return;
      const rect = el.getBoundingClientRect();
      const rel = clientX - rect.left;
      let best = 0;
      let bestDist = Infinity;
      geom.points.forEach((p, i) => {
        const d = Math.abs(p.x - rel);
        if (d < bestDist) { bestDist = d; best = i; }
      });
      setActive(best);
    },
    [geom.points, data.length]
  );

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      e.preventDefault();
      setActive((prev) => {
        const next = (prev ?? -1) + (e.key === 'ArrowRight' ? 1 : -1);
        return Math.max(0, Math.min(data.length - 1, next));
      });
    } else if (e.key === 'Escape') {
      setActive(null);
    }
  };

  if (data.length === 0) return null;

  const last = data[data.length - 1];
  const first = data[0];
  // Sum the deltas rather than subtracting the endpoints: the first point is
  // the standing *after* the oldest battle, so endpoints would omit that battle.
  const net = data.reduce((sum, d) => sum + d.delta, 0);
  const point = active !== null ? data[active] : null;
  const pointPos = active !== null ? geom.points[active] : null;
  const tooltipLeft = pointPos ? Math.min(Math.max(pointPos.x, 90), Math.max(width - 90, 90)) : 0;

  return (
    <div className="rounded-card border border-line bg-surface-1 p-4 shadow-card sm:p-5">
      <div className="flex items-baseline justify-between gap-4 mb-1">
        <h3 className="text-sm font-semibold text-fg">{unit} trend</h3>
        <span className="text-sm text-fg-muted tabular-nums">
          {net >= 0 ? '+' : ''}{net.toLocaleString()} over {data.length} battles
        </span>
      </div>
      <p className="mb-4 text-xs text-fg-subtle">Most recent battles, oldest on the left.</p>

      <div
        ref={wrapRef}
        className="relative w-full rounded-lg"
        tabIndex={0}
        role="img"
        aria-label={`${unit} trend across the last ${data.length} battles: ${first.trophies.toLocaleString()} to ${last.trophies.toLocaleString()}. Use arrow keys to read each battle.`}
        onMouseMove={(e) => pick(e.clientX)}
        onMouseLeave={() => setActive(null)}
        onKeyDown={onKeyDown}
        onBlur={() => setActive(null)}
      >
        <svg width={width} height={HEIGHT} className="block overflow-visible">
          <defs>
            <linearGradient id="trophyFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={accentColor} stopOpacity={0.18} />
              <stop offset="100%" stopColor={accentColor} stopOpacity={0} />
            </linearGradient>
          </defs>

          {/* Gridlines + y ticks — hairline, solid, recessive */}
          {geom.ticks.map((t) => (
            <g key={t}>
              <line
                x1={PAD.left} x2={width - PAD.right} y1={geom.y(t)} y2={geom.y(t)}
                stroke="var(--border)" strokeWidth={1} shapeRendering="crispEdges"
              />
              <text
                x={PAD.left - 10} y={geom.y(t)} textAnchor="end" dominantBaseline="middle"
                className="fill-fg-subtle tabular-nums" style={{ fontSize: 11 }}
              >
                {t.toLocaleString()}
              </text>
            </g>
          ))}

          {/* x labels: first, middle, last only — never one per point */}
          {[0, Math.floor((data.length - 1) / 2), data.length - 1]
            .filter((i, k, arr) => arr.indexOf(i) === k)
            .map((i) => (
              <text
                key={i} x={geom.points[i].x} y={HEIGHT - 8}
                textAnchor={i === 0 ? 'start' : i === data.length - 1 ? 'end' : 'middle'}
                className="fill-fg-subtle" style={{ fontSize: 11 }}
              >
                {data[i].date}
              </text>
            ))}

          <path d={geom.area} fill="url(#trophyFill)" />
          <path
            d={geom.line} fill="none" stroke={accentColor}
            strokeWidth={2} strokeLinejoin="round" strokeLinecap="round"
          />

          {/* Crosshair */}
          {pointPos && (
            <>
              <line
                x1={pointPos.x} x2={pointPos.x} y1={PAD.top} y2={geom.areaBase}
                stroke="var(--border-strong)" strokeWidth={1} shapeRendering="crispEdges"
              />
              <circle cx={pointPos.x} cy={pointPos.y} r={5} fill={accentColor} stroke={SURFACE} strokeWidth={2} />
            </>
          )}

          {/* End marker + direct label — the only value printed on the chart */}
          <circle
            cx={geom.points[geom.points.length - 1].x}
            cy={geom.points[geom.points.length - 1].y}
            r={4} fill={accentColor} stroke={SURFACE} strokeWidth={2}
          />
          <text
            x={geom.points[geom.points.length - 1].x + 10}
            y={geom.points[geom.points.length - 1].y}
            dominantBaseline="middle"
            className="fill-fg font-semibold tabular-nums" style={{ fontSize: 12 }}
          >
            {last.trophies.toLocaleString()}
          </text>
        </svg>

        {point && (
          <div
            className="pointer-events-none absolute z-10 -translate-x-1/2 whitespace-nowrap rounded-lg border border-line-strong bg-surface-2 px-3 py-2 shadow-card"
            style={{ left: tooltipLeft, top: 0 }}
            role="status"
          >
            <div className="flex items-center gap-2">
              <span className="w-3 h-[2px] rounded-full shrink-0" style={{ backgroundColor: accentColor }} />
              <span className="text-sm font-semibold text-fg tabular-nums">{point.trophies.toLocaleString()}</span>
              <span className="text-xs tabular-nums text-fg-muted">
                {point.delta > 0 ? '+' : ''}{point.delta}
              </span>
            </div>
            <div className="mt-0.5 text-xs text-fg-subtle">
              {point.date}{point.mode ? ` · ${point.mode}` : ''}
            </div>
          </div>
        )}
      </div>

      {/* Tooltips enhance, they never gate: every value stays reachable here. */}
      <details className="mt-4">
        <summary className="cursor-pointer py-3 text-sm text-fg-muted transition-colors duration-150 select-none hover:text-fg">
          Show as table
        </summary>
        <div className="mt-2 max-h-56 overflow-y-auto rounded-lg border border-line">
          <table className="w-full text-sm">
            <caption className="sr-only">{unit} after each of the last {data.length} battles</caption>
            <thead className="sticky top-0 bg-surface-2">
              <tr className="text-xs text-fg-subtle">
                <th scope="col" className="text-left font-medium px-3 py-2">Date</th>
                <th scope="col" className="text-left font-medium px-3 py-2">Mode</th>
                <th scope="col" className="text-right font-medium px-3 py-2">Change</th>
                <th scope="col" className="text-right font-medium px-3 py-2">{unit}</th>
              </tr>
            </thead>
            <tbody>
              {data.map((d, i) => (
                <tr key={i} className="border-t border-line">
                  <td className="px-3 py-1.5 text-fg-muted">{d.date}</td>
                  <td className="px-3 py-1.5 text-fg-muted">{d.mode ?? '–'}</td>
                  <td className="px-3 py-1.5 text-right text-fg-muted tabular-nums">
                    {d.delta > 0 ? '+' : ''}{d.delta}
                  </td>
                  <td className="px-3 py-1.5 text-right text-fg tabular-nums">{d.trophies.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}

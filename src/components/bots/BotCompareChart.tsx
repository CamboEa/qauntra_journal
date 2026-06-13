"use client";

import { useMemo } from "react";
import { parseISO } from "date-fns";

import type { BotTrade } from "@/types/bots";

function parseTradeTime(value: string): Date {
  const iso = parseISO(value);
  if (!Number.isNaN(iso.getTime())) return iso;
  return new Date(value.replace(/\./g, "-").replace(" ", "T"));
}

export function BotCompareChart({
  series,
}: {
  series: { botId: string; name: string; color: string; trades: BotTrade[] }[];
}) {
  const dedupedSeries = useMemo(() => {
    const seen = new Set<string>();
    return series.filter((item) => {
      if (seen.has(item.botId)) return false;
      seen.add(item.botId);
      return true;
    });
  }, [series]);

  const paths = useMemo(() => {
    return dedupedSeries
      .map(({ botId, name, color, trades }) => {
        const sorted = [...trades]
          .filter((t) => t.closeTime)
          .sort(
            (a, b) =>
              parseTradeTime(a.closeTime).getTime() -
              parseTradeTime(b.closeTime).getTime(),
          );

        if (sorted.length < 2) return null;

        let sum = 0;
        const points = sorted.map((t) => {
          sum += t.profit;
          return sum;
        });

        return { botId, name, color, points };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);
  }, [dedupedSeries]);

  if (paths.length === 0) {
    return (
      <p className="py-10 text-center text-sm text-q-text-3">
        Select bots with at least 2 trades each to compare equity curves.
      </p>
    );
  }

  const allPoints = paths.flatMap((p) => p.points);
  const W = 800;
  const H = 200;
  const PL = 8;
  const PR = 8;
  const PT = 12;
  const PB = 8;
  const CW = W - PL - PR;
  const CH = H - PT - PB;
  const minVal = Math.min(0, ...allPoints);
  const maxVal = Math.max(0, ...allPoints);
  const range = maxVal - minVal || 1;

  const toX = (i: number, len: number) =>
    PL + (i / Math.max(len - 1, 1)) * CW;
  const toY = (v: number) => PT + CH - ((v - minVal) / range) * CH;
  const zeroY = toY(0);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        {paths.map((p) => (
          <span key={p.botId} className="flex items-center gap-1.5 text-xs text-q-text-2">
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: p.color }}
            />
            {p.name}
          </span>
        ))}
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="h-48 w-full">
        <line
          x1={PL}
          y1={zeroY}
          x2={W - PR}
          y2={zeroY}
          stroke="currentColor"
          strokeOpacity="0"
          strokeDasharray="4 4"
          className="text-q-border"
        >
          <animate
            attributeName="stroke-opacity"
            from="0"
            to="0.12"
            dur="0.5s"
            fill="freeze"
          />
        </line>
        {paths.map((p, seriesIndex) => {
          const d = p.points
            .map(
              (v, i) =>
                `${i === 0 ? "M" : "L"}${toX(i, p.points.length).toFixed(1)},${toY(v).toFixed(1)}`,
            )
            .join(" ");
          const animDelay = `${seriesIndex * 0.15}s`;
          return (
            <path
              key={`${p.botId}-${p.points.length}`}
              d={d}
              fill="none"
              stroke={p.color}
              strokeWidth="2.5"
              strokeLinejoin="round"
              strokeLinecap="round"
              pathLength="1"
              strokeDasharray="1"
              strokeDashoffset="1"
            >
              <animate
                attributeName="stroke-dashoffset"
                from="1"
                to="0"
                dur="1.4s"
                begin={animDelay}
                calcMode="spline"
                keyTimes="0;1"
                keySplines="0.25 0.1 0.25 1"
                fill="freeze"
              />
            </path>
          );
        })}
      </svg>
    </div>
  );
}

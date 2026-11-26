"use client";
import { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";
import { formatNumber, formatPercent } from "@/lib/utils";

type Point = { key: string; label: string; lat: number; lng: number; value: number; topCategory?: string };

/**
 * Proportional-symbol map of Karachi districts. Markers sit at approximate
 * district reference points (not boundaries); radius scales with record count.
 */
export function DistrictMap({ points, total }: { points: Point[]; total: number }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let disposed = false;
    let map: import("leaflet").Map | undefined;
    (async () => {
      const L = (await import("leaflet")).default;
      if (disposed || !ref.current) return;
      map = L.map(ref.current, { scrollWheelZoom: false, attributionControl: true }).setView([24.9, 67.07], 11);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 17,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).addTo(map);
      const max = Math.max(1, ...points.map((p) => p.value));
      const css = getComputedStyle(document.documentElement);
      const primary = css.getPropertyValue("--primary").trim() || "#1d4ed8";
      for (const p of points) {
        const radius = p.value ? 900 + Math.sqrt(p.value / max) * 3600 : 500;
        const circle = L.circle([p.lat, p.lng], {
          radius,
          color: primary,
          weight: 1.5,
          fillColor: primary,
          fillOpacity: p.value ? 0.32 : 0.06,
        }).addTo(map);
        circle.bindTooltip(
          `<div style="font-weight:600">${p.label}</div><div>${formatNumber(p.value)} records · ${formatPercent(p.value, total)}</div>${p.topCategory ? `<div style="opacity:.7">Largest category: ${p.topCategory}</div>` : ""}`,
          { direction: "top", sticky: true },
        );
        L.marker([p.lat, p.lng], {
          icon: L.divIcon({
            className: "",
            html: `<div style="transform:translate(-50%,-50%);white-space:nowrap;font:600 11px/1.2 var(--font-sans);color:var(--foreground);text-shadow:0 0 3px var(--surface),0 0 3px var(--surface);text-align:center">${p.label}<br/><span style="font-weight:500;color:var(--muted)">${formatNumber(p.value)}</span></div>`,
          }),
          interactive: false,
        }).addTo(map);
      }
    })();
    return () => {
      disposed = true;
      map?.remove();
    };
  }, [points, total]);

  return <div ref={ref} className="h-[440px] w-full" role="img" aria-label="Map of vehicle records by Karachi district" />;
}

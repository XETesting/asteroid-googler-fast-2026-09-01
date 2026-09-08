import { Eye, Focus, Globe, Info, Move3d, Pause, Play, RotateCcw, X } from "lucide-react";
import { useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import {
  EVENTS,
  GEO_RADIUS_KM,
  WINDOW_HOURS,
  formatDistance,
  formatSignedHours,
  formatUtc,
  interpolatePath,
  latLonOfDirection,
  earthRotationAt,
} from "@/lib/apophis/orbit";
import { beginFlyby, useSim, type CameraMode } from "@/store/sim";
import { reticleApi } from "./world";

const SPEEDS = [
  { id: "adapt", label: "Adaptive" },
  { id: "1", label: "1 h/s", value: 1 },
  { id: "4", label: "4 h/s", value: 4 },
  { id: "12", label: "12 h/s", value: 12 },
] as const;

const CAMERAS: { id: CameraMode; label: string; icon: typeof Globe }[] = [
  { id: "cinematic", label: "Overview", icon: Globe },
  { id: "chase", label: "Chase", icon: Focus },
  { id: "skywatch", label: "Ground", icon: Eye },
  { id: "free", label: "Free", icon: Move3d },
];

export function Overlay() {
  const introDone = useSim((s) => s.introDone);
  const aboutOpen = useSim((s) => s.aboutOpen);
  const timeHours = useSim((s) => s.timeHours);
  const playing = useSim((s) => s.playing);
  const adaptive = useSim((s) => s.adaptive);
  const speed = useSim((s) => s.speed);
  const cameraMode = useSim((s) => s.cameraMode);
  const trueScale = useSim((s) => s.trueScale);
  const showPath = useSim((s) => s.showPath);
  const showGeo = useSim((s) => s.showGeo);
  const showMoon = useSim((s) => s.showMoon);
  const state = useMemo(() => interpolatePath(timeHours), [timeHours]);
  const sub = useMemo(() => latLonOfDirection(state.position, earthRotationAt(timeHours)), [state.position, timeHours]);
  const progress = (timeHours + WINDOW_HOURS) / (2 * WINDOW_HOURS);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        e.preventDefault();
        if (!useSim.getState().introDone) beginFlyby();
        else useSim.getState().togglePlaying();
      }
      if (e.key === "1") useSim.getState().setCameraMode("cinematic");
      if (e.key === "2") useSim.getState().setCameraMode("chase");
      if (e.key === "3") useSim.getState().setCameraMode("skywatch");
      if (e.key === "4") useSim.getState().setCameraMode("free");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="pointer-events-none absolute inset-0 z-10 text-fg">
      <div ref={(n) => { reticleApi.node = n; }} className="pointer-events-none absolute top-0 left-0 opacity-0" style={{ transform: "translate3d(-100px,-100px,0)" }}>
        <div className="-translate-x-1/2 -translate-y-1/2 font-mono text-2xs text-clay">99942</div>
      </div>
      {!introDone ? (
        <div className="pointer-events-auto absolute inset-0 flex flex-col justify-end bg-bg/40 px-6 pb-16 sm:justify-center">
          <p className="font-mono text-xs tracking-[0.32em] text-clay uppercase">13 April 2029 · 21:46 UTC</p>
          <h1 className="font-display mt-3 text-6xl text-fg">Apophis</h1>
          <p className="mt-4 max-w-md text-muted">A 370-metre near-Earth asteroid passes 31,600 km from Earth — closer than geostationary satellites.</p>
          <div className="mt-8 flex gap-3">
            <Button variant="primary" size="lg" onClick={() => beginFlyby()}>Begin flyby</Button>
            <Button variant="outline" size="lg" onClick={() => { beginFlyby(); useSim.getState().jumpTo(0); useSim.getState().setPlaying(false); }}>Closest approach</Button>
          </div>
        </div>
      ) : (
        <>
          <header className="absolute top-0 right-0 left-0 flex items-start justify-between p-4">
            <div>
              <p className="font-mono text-2xs tracking-[0.28em] text-muted uppercase">NEO 99942</p>
              <h1 className="font-display text-3xl">Apophis</h1>
              <p className="font-mono text-xs text-muted">{formatUtc(timeHours)}</p>
            </div>
            <Button variant="subtle" size="icon" className="pointer-events-auto" onClick={() => useSim.getState().setAboutOpen(true)} aria-label="About"><Info /></Button>
          </header>
          <aside className="pointer-events-none absolute top-24 left-4 hidden w-64 sm:block">
            <div className="panel rounded-xl p-4">
              <p className="font-mono text-2xs text-subtle uppercase">Telemetry</p>
              <p className="mt-2 font-mono text-sm">{formatSignedHours(timeHours)}</p>
              <p className="font-mono text-sm">{formatDistance(state.altitudeKm)}</p>
              <p className="font-mono text-sm">{state.speedKmS.toFixed(2)} km/s</p>
              <p className="font-mono text-sm">{state.earthRadii.toFixed(2)} R⊕</p>
              <p className="mt-2 text-xs text-muted">{state.radiusKm < GEO_RADIUS_KM ? "Inside GEO" : "Beyond GEO"} · {sub.lat.toFixed(1)}°, {sub.lon.toFixed(1)}°</p>
            </div>
          </aside>
          <div className="pointer-events-auto absolute top-24 right-4 hidden w-44 sm:block">
            <div className="panel rounded-xl p-2">
              {CAMERAS.map((cam) => {
                const Icon = cam.icon;
                return (
                  <button key={cam.id} type="button" onClick={() => useSim.getState().setCameraMode(cam.id)} className={cn("flex h-11 w-full items-center gap-3 rounded-md px-3 text-sm", cameraMode === cam.id ? "bg-surface-2" : "text-muted")}>
                    <Icon className="size-4" />{cam.label}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="pointer-events-auto absolute right-0 bottom-0 left-0 p-4">
            <div className="panel mx-auto max-w-4xl rounded-xl p-3">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <Button variant="primary" size="icon" onClick={() => useSim.getState().togglePlaying()}>{playing ? <Pause /> : <Play />}</Button>
                <Button variant="ghost" size="icon" onClick={() => useSim.getState().jumpTo(-WINDOW_HOURS)}><RotateCcw /></Button>
                <p className="mr-auto font-mono text-sm">{formatSignedHours(timeHours)}</p>
                {SPEEDS.map((s) => {
                  const on = s.id === "adapt" ? adaptive : !adaptive && speed === s.value;
                  return (
                    <button key={s.id} type="button" className={cn("h-8 rounded-full px-3 font-mono text-2xs uppercase", on ? "bg-fg text-accent-fg" : "text-muted")} onClick={() => { if (s.id === "adapt") useSim.getState().setAdaptive(true); else useSim.getState().setSpeed(s.value); }}>{s.label}</button>
                  );
                })}
              </div>
              <input className="timeline-range w-full" type="range" min={-WINDOW_HOURS} max={WINDOW_HOURS} step={0.01} value={timeHours} onChange={(e) => useSim.getState().setTimeHours(Number(e.target.value))} />
              <div className="mt-1 h-0.5 rounded-full bg-clay" style={{ width: `${progress * 100}%` }} />
              <div className="mt-3 hidden gap-4 text-xs text-muted sm:flex">
                {EVENTS.map((ev) => (
                  <button key={ev.id} type="button" onClick={() => useSim.getState().jumpTo(ev.t)}>{ev.label}</button>
                ))}
              </div>
              <div className="mt-3 hidden gap-4 text-xs sm:flex">
                <button type="button" onClick={() => useSim.getState().setTrueScale(!trueScale)}>True scale {trueScale ? "on" : "off"}</button>
                <button type="button" onClick={() => useSim.getState().setShowPath(!showPath)}>Path {showPath ? "on" : "off"}</button>
                <button type="button" onClick={() => useSim.getState().setShowGeo(!showGeo)}>GEO {showGeo ? "on" : "off"}</button>
                <button type="button" onClick={() => useSim.getState().setShowMoon(!showMoon)}>Moon {showMoon ? "on" : "off"}</button>
              </div>
            </div>
          </div>
        </>
      )}
      {aboutOpen ? (
        <div className="pointer-events-auto absolute inset-0 z-20 flex items-center justify-center bg-bg/70 p-4">
          <div className="panel max-w-lg rounded-xl p-6">
            <div className="flex justify-between">
              <h2 className="font-display text-3xl">The 2029 flyby</h2>
              <Button variant="ghost" size="icon" onClick={() => useSim.getState().setAboutOpen(false)}><X /></Button>
            </div>
            <p className="mt-4 text-sm text-muted">On 13 April 2029 at 21:46 UTC, 99942 Apophis passes 31,600 km above Earth — inside the geostationary belt. This window covers 24 hours before and after closest approach using published JPL close-approach values.</p>
          </div>
        </div>
      ) : null}
    </div>
  );
}

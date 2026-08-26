import { ArrowLeft, ArrowRight, Compass, X } from "lucide-react";
import { useEffect, useState } from "react";

type View = "stories" | "moments";

const steps: Array<{ target: string; title: string; body: string; view?: View }> = [
  { target: "overview", title: "This is your shared home", body: "Every trip, relationship, or chapter gets its own private space. This is the landing view you return to after signing in." },
  { target: "people", title: "See who is part of it", body: "Open the people list to see each contributor, their role, and the moments they have added. Owners can invite or remove people here." },
  { target: "stories", title: "Start with the stories", body: "Stories turn the photos and context into something worth retelling. Open any format to read, edit, and export its finished canvas.", view: "stories" },
  { target: "moments", title: "Your memory library", body: "Switch here to browse the original photos, videos, voice notes, and documents by date, album, or search.", view: "moments" },
  { target: "create", title: "Add or craft", body: "Add moments as they happen, then craft a story when a group of memories belongs together. These controls stay within easy reach on mobile too." },
  { target: "story", title: "Open a live example", body: "Choose a story style to see the complete journey. From inside, you can edit the canvas, preview social formats, and share the result." , view: "stories" },
];

function visibleTarget(name: string) {
  return [...document.querySelectorAll<HTMLElement>(`[data-interface-tour="${name}"]`)].find((element) => {
    const rect = element.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  });
}

export function InterfaceTour({ spaceId, restartKey, onViewChange }: { spaceId: string; restartKey: number; onViewChange: (view: View) => void }) {
  const storageKey = `zo-moments-interface-tour:${spaceId}`;
  const [open, setOpen] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const step = steps[stepIndex]!;

  useEffect(() => {
    if (restartKey > 0 || window.localStorage.getItem(storageKey) !== "done") {
      setStepIndex(0);
      setOpen(true);
    }
  }, [restartKey, storageKey]);

  useEffect(() => {
    if (!open) return;
    if (step.view) onViewChange(step.view);
    const update = () => {
      const target = visibleTarget(step.target);
      if (!target) return;
      target.scrollIntoView({ block: "center", behavior: "smooth" });
      window.setTimeout(() => setRect(target.getBoundingClientRect()), 180);
    };
    const timeout = window.setTimeout(update, 80);
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.clearTimeout(timeout);
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [open, step, onViewChange]);

  if (!open) return null;
  const tooltipWidth = Math.min(360, window.innerWidth - 32);
  const left = Math.min(Math.max(16, (rect?.left ?? (window.innerWidth - tooltipWidth) / 2) + ((rect?.width ?? tooltipWidth) - tooltipWidth) / 2), window.innerWidth - tooltipWidth - 16);
  const tooltipHeight = 244;
  const below = (rect?.bottom ?? 0) + 18;
  const top = below + tooltipHeight < window.innerHeight - 16 ? below : Math.max(16, (rect?.top ?? window.innerHeight / 2) - tooltipHeight - 18);

  const finish = () => {
    window.localStorage.setItem(storageKey, "done");
    setOpen(false);
  };

  return (
    <div className="pointer-events-none fixed inset-0 z-[70]" aria-live="polite">
      {rect ? <div className="interface-tour-halo" style={{ left: rect.left - 7, top: rect.top - 7, width: rect.width + 14, height: rect.height + 14 }} /> : null}
      <section className="pointer-events-auto fixed overflow-hidden rounded-[24px] border border-[#f0c681]/70 bg-[#20372d] text-[#fffaf2] shadow-[0_24px_70px_rgba(22,32,26,.38)]" style={{ left, top, width: tooltipWidth }} role="dialog" aria-label={`Interface tour, step ${stepIndex + 1} of ${steps.length}`}>
        <div className="flex items-start gap-3 px-5 pb-3 pt-4">
          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[#f0c681] text-[#26372f]"><Compass className="size-4" /></span>
          <div className="min-w-0 flex-1"><p className="text-[9px] font-bold uppercase tracking-[.2em] text-[#f0c681]">Quick interface tour · {String(stepIndex + 1).padStart(2, "0")} / {String(steps.length).padStart(2, "0")}</p><h2 className="mt-1 font-display text-2xl leading-none">{step.title}</h2></div>
          <button type="button" onClick={finish} className="grid size-8 place-items-center rounded-full text-white/55 transition hover:bg-white/10 hover:text-white" aria-label="Skip interface tour"><X className="size-4" /></button>
        </div>
        <p className="px-5 pb-4 text-sm leading-5 text-[#d9e0da]">{step.body}</p>
        <div className="flex items-center justify-between gap-3 border-t border-white/10 bg-black/10 px-4 py-3">
          <button type="button" disabled={stepIndex === 0} onClick={() => setStepIndex((index) => Math.max(0, index - 1))} className="inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-xs font-bold text-white/75 transition hover:bg-white/10 disabled:opacity-30"><ArrowLeft className="size-3.5" />Back</button>
          <div className="flex gap-1" aria-hidden="true">{steps.map((item, index) => <span key={item.target} className={`size-1.5 rounded-full ${index === stepIndex ? "bg-[#f0c681]" : "bg-white/25"}`} />)}</div>
          <button type="button" onClick={() => stepIndex === steps.length - 1 ? finish() : setStepIndex((index) => index + 1)} className="inline-flex h-9 items-center gap-1.5 rounded-full bg-[#f0c681] px-3.5 text-xs font-bold text-[#20372d] transition hover:bg-[#f6d795]">{stepIndex === steps.length - 1 ? "Finish" : "Next"}<ArrowRight className="size-3.5" /></button>
        </div>
      </section>
    </div>
  );
}

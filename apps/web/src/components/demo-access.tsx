import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Eye, Users } from "lucide-react";
import { api, ZoMomentsApiError } from "@zo-moments/sdk";
import { useState } from "react";
import { Spinner } from "./ui";

const personaColours = [
  "bg-[#a95c47] text-white",
  "bg-[#608074] text-white",
  "bg-[#b58b4c] text-white",
];

export function DemoAccess({ tone = "light", showHeader = true }: { tone?: "light" | "dark"; showHeader?: boolean }) {
  const queryClient = useQueryClient();
  const [error, setError] = useState("");
  const demoMode = useQuery({
    queryKey: ["demo-mode"],
    queryFn: () => api.getDemoMode(),
    retry: false,
  });
  const demo = useMutation({
    mutationFn: (personaId: string) => api.demoLogin({ personaId }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["me"] });
    },
    onError: (cause) => setError(cause instanceof ZoMomentsApiError ? cause.message : "Could not start the demo"),
  });

  if (!demoMode.data?.enabled) return null;

  const dark = tone === "dark";

  return (
    <section
      aria-label="Live demo accounts"
      className={dark
        ? "demo-sparkle-border rounded-[24px] border border-[#e8aa90]/35 bg-[#fff8ed]/[.09] p-4 shadow-[0_20px_50px_rgba(0,0,0,.18)] backdrop-blur-xl sm:p-5"
        : "demo-sparkle-border rounded-[24px] border border-[#d8b38f] bg-[#f9ead5] p-4 shadow-[0_14px_40px_rgba(106,71,36,.1)] sm:p-5"}
    >
      {showHeader ? (
        <div className="flex items-start gap-3">
          <span className={dark ? "grid size-10 shrink-0 place-items-center rounded-2xl bg-[#e8aa90] text-[#20342b]" : "grid size-10 shrink-0 place-items-center rounded-2xl bg-[#a8513f] text-white"}>
            <Eye className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className={dark ? "text-sm font-bold text-[#fff8ed]" : "text-sm font-bold text-[#3f382f]"}>Try live demo</p>
              <span className={dark ? "rounded-full bg-[#e8aa90]/15 px-2 py-1 text-[9px] font-bold uppercase tracking-[.16em] text-[#f2bba5]" : "rounded-full bg-[#a8513f]/10 px-2 py-1 text-[9px] font-bold uppercase tracking-[.16em] text-[#914536]"}>No password</span>
            </div>
            <p className={dark ? "mt-1 text-xs leading-5 text-[#c7d3cc]" : "mt-1 text-xs leading-5 text-[#756b5e]"}>
              Three contributors share one travel journal with 18 moments and three finished story styles. Choose a person to enter.
            </p>
          </div>
        </div>
      ) : null}

      <div className={`${showHeader ? "mt-4" : ""} grid grid-cols-3 gap-2`}>
        {demoMode.data.personas.map((persona, index) => (
          <button
            key={persona.id}
            type="button"
            disabled={demo.isPending}
            onClick={() => {
              setError("");
              demo.mutate(persona.id);
            }}
            className={dark
              ? "group min-h-28 rounded-[18px] border border-white/12 bg-[#14281f]/55 p-2.5 text-left transition hover:-translate-y-0.5 hover:border-[#e8aa90]/60 hover:bg-[#14281f]/80 disabled:pointer-events-none disabled:opacity-55 sm:p-3"
              : "group min-h-28 rounded-[18px] border border-[#d5c3aa] bg-[#fffaf2] p-2.5 text-left transition hover:-translate-y-0.5 hover:border-[#aa8359] hover:bg-white disabled:pointer-events-none disabled:opacity-55 sm:p-3"}
          >
            <span className={`grid size-9 shrink-0 place-items-center rounded-full text-[11px] font-bold ${personaColours[index % personaColours.length]}`}>
              {persona.name.split(" ").map((part) => part[0]).join("")}
            </span>
            <span className="mt-2 block min-w-0">
              <strong className={dark ? "block text-xs text-[#fff8ed] sm:text-sm" : "block text-xs text-[#3f382f] sm:text-sm"}>{persona.name}</strong>
              <span className={dark ? "mt-1 block text-[9px] leading-3.5 text-[#aebfb5] sm:text-[10px] sm:leading-4" : "mt-1 block text-[9px] leading-3.5 text-[#817564] sm:text-[10px] sm:leading-4"}>
                {persona.role === "owner" ? "Space owner" : "Contributor"}<span className="hidden min-[480px]:inline"> · {persona.description}</span>
              </span>
            </span>
          </button>
        ))}
      </div>

      {demo.isPending ? (
        <div className={dark ? "mt-3 flex items-center justify-center gap-2 text-xs text-[#c7d3cc]" : "mt-3 flex items-center justify-center gap-2 text-xs text-[#756b5e]"}>
          <Spinner /> Opening the shared story…
        </div>
      ) : null}
      {error ? <p className="mt-3 rounded-xl bg-[#f8e3dd] px-3 py-2 text-xs text-[#8a372b]">{error}</p> : null}
      <p className={dark ? "mt-3 flex items-center justify-center gap-2 text-[10px] font-semibold text-[#9eb0a5]" : "mt-3 flex items-center justify-center gap-2 text-[10px] font-semibold text-[#81796e]"}>
        <Users className="size-3.5" /> All three accounts see and contribute to the same shared space
      </p>
    </section>
  );
}

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, Images, LockKeyhole, Sparkles } from "lucide-react";
import { useState, type FormEvent } from "react";
import { api, ZoMomentsApiError } from "@zo-moments/sdk";
import type { ShareInvitationPreview } from "@zo-moments/types";
import { Button, Field, Input, Spinner } from "./ui";
import { BrandMark } from "./brand-mark";

export function AuthPage({ invitation, initialMode = "register", onBack }: { invitation?: ShareInvitationPreview; initialMode?: "register" | "login"; onBack?: () => void }) {
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<"register" | "login">(initialMode);
  const [error, setError] = useState("");
  const mutation = useMutation({
    mutationFn: (form: { name: string; email: string; password: string }) =>
      mode === "register" ? api.register(form) : api.login(form),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["me"] });
    },
    onError: (cause) => setError(cause instanceof ZoMomentsApiError ? cause.message : "Could not sign you in"),
  });

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const data = new FormData(event.currentTarget);
    mutation.mutate({
      name: String(data.get("name") ?? "New member"),
      email: String(data.get("email") ?? ""),
      password: String(data.get("password") ?? ""),
    });
  }

  return (
    <main className="min-h-screen bg-[#f4ede1] text-[#26372f] lg:grid lg:grid-cols-[1.08fr_.92fr]">
      <section className="relative hidden min-h-screen overflow-hidden p-12 lg:flex lg:flex-col lg:justify-between xl:p-16">
        <div className="absolute inset-0 paper-grid opacity-45" />
        <div className="relative flex items-center gap-3 text-sm font-bold tracking-[0.18em] uppercase">
          <BrandMark className="size-10" />
          Zo Moments
        </div>

        <div className="relative max-w-2xl py-16">
          <p className="mb-6 text-xs font-bold tracking-[0.22em] text-[#7b493d] uppercase">A private place to remember</p>
          <h1 className="font-display text-[clamp(4.5rem,7.5vw,8.5rem)] leading-[0.82] tracking-[-.055em]">
            Life,
            <br />kept
            <br /><span className="italic text-[#a8513f]">together.</span>
          </h1>
          <p className="mt-9 max-w-md text-lg leading-8 text-[#5e665f]">
            One shared digital home for the photos, voices, trips, and tiny moments that make a life yours.
          </p>
        </div>

        <div className="relative grid max-w-xl grid-cols-3 gap-3">
          {[
            { icon: Images, label: "Every memory" },
            { icon: LockKeyhole, label: "Private by design" },
            { icon: Sparkles, label: "Stories that grow" },
          ].map(({ icon: Icon, label }) => (
            <div key={label} className="rounded-[22px] border border-[#d8c9b5] bg-[#fffaf2]/65 p-4 backdrop-blur">
              <Icon className="mb-5 size-5 text-[#8e4b3c]" />
              <p className="text-xs font-semibold text-[#536057]">{label}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="flex min-h-screen items-center justify-center bg-[#fffaf2] px-5 py-10 sm:px-10 lg:rounded-l-[42px] lg:shadow-[-24px_0_70px_rgba(48,39,28,.08)]">
        <div className="w-full max-w-md">
          <div className="mb-12 flex items-center justify-between gap-3 lg:hidden">
            <div className="flex items-center gap-3">
            <BrandMark className="size-10" />
            <span className="text-sm font-bold tracking-[0.18em] uppercase">Zo Moments</span>
            </div>
            {onBack ? <button onClick={onBack} className="rounded-full px-3 py-2 text-sm font-semibold text-[#59665d] hover:bg-[#eee5d8]">Back</button> : null}
          </div>
          {onBack ? <button onClick={onBack} className="mb-8 hidden rounded-full px-3 py-2 text-sm font-semibold text-[#59665d] hover:bg-[#eee5d8] lg:inline-flex">Back to Zo Moments</button> : null}

          <p className="text-xs font-bold tracking-[0.2em] text-[#a8513f] uppercase">{invitation ? "You’re invited" : mode === "register" ? "Start your story" : "Welcome back"}</p>
          <h2 className="mt-3 font-display text-5xl leading-[1.02] tracking-[-.035em] sm:text-6xl">
            {invitation ? `Join ${invitation.spaceName}.` : mode === "register" ? "Make space for what matters." : "Your moments are waiting."}
          </h2>
          <p className="mt-5 leading-7 text-[#746d63]">
            {invitation ? `${invitation.inviterName} invited you to a shared space. Create an account or sign in to continue.` : mode === "register" ? "Create a home, invite someone important, and add your first memory." : "Sign in to return to your shared spaces."}
          </p>

          <div className="mt-8 grid grid-cols-2 rounded-full bg-[#eee5d8] p-1">
            <button className={`h-10 rounded-full text-sm font-semibold transition ${mode === "register" ? "bg-[#fffaf2] shadow-sm" : "text-[#777067]"}`} onClick={() => { setMode("register"); setError(""); }}>Create account</button>
            <button className={`h-10 rounded-full text-sm font-semibold transition ${mode === "login" ? "bg-[#fffaf2] shadow-sm" : "text-[#777067]"}`} onClick={() => { setMode("login"); setError(""); }}>Sign in</button>
          </div>

          <form className="mt-7 grid gap-5" onSubmit={submit}>
            {mode === "register" ? <Field label="Your name"><Input name="name" autoComplete="name" placeholder="How people know you" required minLength={2} /></Field> : <input type="hidden" name="name" value="Member" />}
            <Field label="Email"><Input name="email" type="email" autoComplete="email" placeholder="you@example.com" required /></Field>
            <Field label="Password" hint={mode === "register" ? "Use at least six characters." : undefined}><Input name="password" type="password" autoComplete={mode === "register" ? "new-password" : "current-password"} placeholder="At least 6 characters" required minLength={6} /></Field>
            {error ? <p className="rounded-2xl bg-[#f8e3dd] px-4 py-3 text-sm text-[#8a372b]">{error}</p> : null}
            <Button className="mt-2 w-full" disabled={mutation.isPending}>
              {mutation.isPending ? <Spinner /> : <>{mode === "register" ? "Create my account" : "Sign in"}<ArrowRight className="size-4" /></>}
            </Button>
          </form>
          <p className="mt-7 text-center text-xs leading-5 text-[#8c857b]">Private by design. Only members can see what lives inside a shared space.</p>
        </div>
      </section>
    </main>
  );
}

import { X } from "lucide-react";
import { useEffect, useId, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/utils";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

export function Button({
  className,
  variant = "primary",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }) {
  return (
    <button
      className={cn(
        "inline-flex h-11 items-center justify-center gap-2 rounded-full px-5 text-sm font-semibold transition-[transform,background-color,color,box-shadow] duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#26372f] disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]",
        variant === "primary" && "bg-[#26372f] text-[#fffaf2] shadow-[0_8px_24px_rgba(38,55,47,.18)] hover:bg-[#18251f]",
        variant === "secondary" && "border border-[#d9cdbc] bg-[#fffaf2] text-[#26372f] hover:bg-[#f4ede1]",
        variant === "ghost" && "text-[#526158] hover:bg-[#e9e0d2] hover:text-[#26372f]",
        variant === "danger" && "bg-[#9f3f31] text-white hover:bg-[#823226]",
        className,
      )}
      {...props}
    />
  );
}

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "h-12 min-w-0 w-full rounded-2xl border border-[#d8cdbc] bg-[#fffdf8] px-4 text-[15px] text-[#26372f] outline-none transition focus:border-[#728578] focus:ring-4 focus:ring-[#728578]/10 placeholder:text-[#9b9387] disabled:cursor-not-allowed disabled:bg-[#f1eadf] disabled:text-[#777067]",
        className,
      )}
      {...props}
    />
  );
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string | undefined }) {
  return (
    <label className="grid min-w-0 gap-2 text-sm font-semibold text-[#3a493f]">
      {label}
      {children}
      {hint ? <span className="text-xs font-normal text-[#827b70]">{hint}</span> : null}
    </label>
  );
}

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  size = "md",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  size?: "md" | "lg" | "xl";
}) {
  const titleId = useId();
  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [onClose, open]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 grid place-items-end bg-[#17231e]/45 backdrop-blur-[3px] sm:place-items-center" role="presentation" onMouseDown={onClose}>
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={cn(
          "modal-panel overflow-x-hidden rounded-t-[30px] bg-[#fffaf2] p-5 shadow-2xl animate-in sm:rounded-[30px] sm:p-8",
          size === "md" ? "modal-panel--md" : size === "lg" ? "modal-panel--lg" : "modal-panel--xl",
        )}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="mb-5 flex items-start justify-between gap-4 sm:mb-6">
          <div className="min-w-0">
            <h2 id={titleId} className="font-display text-3xl leading-tight text-[#26372f] sm:text-[2.15rem]">{title}</h2>
            {description ? <p className="mt-2 text-sm leading-6 text-[#766f65]">{description}</p> : null}
          </div>
          <button onClick={onClose} className="grid size-10 shrink-0 place-items-center rounded-full text-[#6e776f] hover:bg-[#eee5d7]" aria-label="Close">
            <X className="size-5" />
          </button>
        </div>
        {children}
      </section>
    </div>
  );
}

export function EmptyState({ icon, title, body, action }: { icon: ReactNode; title: string; body: string; action?: ReactNode }) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-6 py-16 text-center">
      <div className="mb-5 grid size-16 place-items-center rounded-[24px] bg-[#e4d6c1] text-[#495c50]">{icon}</div>
      <h3 className="font-display text-3xl text-[#26372f]">{title}</h3>
      <p className="mt-3 text-sm leading-6 text-[#756e64]">{body}</p>
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}

export function Spinner() {
  return <span className="size-5 animate-spin rounded-full border-2 border-current border-r-transparent" aria-label="Loading" />;
}

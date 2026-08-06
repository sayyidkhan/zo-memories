import type { SVGProps } from "react";

export function BrandMark({ className, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 64 64" fill="none" aria-hidden="true" className={className} {...props}>
      <rect x="8" y="8" width="35" height="35" rx="10" stroke="#26372f" strokeWidth="6" />
      <rect x="21" y="21" width="35" height="35" rx="10" stroke="#a8513f" strokeWidth="6" />
      <path d="M32 25.5c.9 4.2 2.3 5.6 6.5 6.5-4.2.9-5.6 2.3-6.5 6.5-.9-4.2-2.3-5.6-6.5-6.5 4.2-.9 5.6-2.3 6.5-6.5Z" fill="#a8513f" />
    </svg>
  );
}

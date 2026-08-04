import { useEffect, useState } from "react";
import { api } from "@zo-moments/sdk";
import type { User } from "@zo-moments/types";
import { cn, initials } from "@/lib/utils";

type AvatarUser = Pick<User, "id" | "name" | "image">;

export function ProfileAvatar({ user, className, textClassName }: { user: AvatarUser; className?: string; textClassName?: string }) {
  const [failed, setFailed] = useState(false);

  useEffect(() => setFailed(false), [user.image]);

  return (
    <span className={cn("grid shrink-0 place-items-center overflow-hidden rounded-full bg-[#6e8478] font-bold text-white", className)}>
      {user.image && !failed ? (
        <img
          src={api.avatarUrl(user.id, user.image)}
          alt=""
          className="size-full object-cover"
          onError={() => setFailed(true)}
        />
      ) : (
        <span className={textClassName}>{initials(user.name)}</span>
      )}
    </span>
  );
}

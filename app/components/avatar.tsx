"use client";

import { useMemo, useState } from "react";

type AvatarProps = {
  name: string;
  src?: string | null;
  className?: string;
  imgClassName?: string;
};

const getInitials = (value: string) => {
  const parts = value.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
};

export default function Avatar({ name, src, className, imgClassName }: AvatarProps) {
  const [failed, setFailed] = useState(false);
  const cleanedSrc = (src ?? "").trim();
  const showImage = cleanedSrc.length > 0 && !failed;
  const initials = useMemo(() => getInitials(name), [name]);

  return (
    <div
      className={`inline-flex items-center justify-center rounded-full bg-slate-200 text-slate-700 font-semibold ${className ?? "w-8 h-8"}`}
    >
      {showImage ? (
        <img
          src={cleanedSrc}
          alt={`${name} avatar`}
          className={`w-full h-full rounded-full object-cover ${imgClassName ?? ""}`}
          onError={() => setFailed(true)}
        />
      ) : (
        <span className="text-xs">{initials}</span>
      )}
    </div>
  );
}

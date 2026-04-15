/* eslint-disable @next/next/no-img-element */
"use client";

import { useState, type CSSProperties, type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface EntityAvatarProps {
  name: string;
  imageUrl?: string | null;
  fallback: ReactNode;
  className?: string;
  imageClassName?: string;
  style?: CSSProperties;
  imageStyle?: CSSProperties;
}

export function EntityAvatar({
  name,
  imageUrl,
  fallback,
  className,
  imageClassName,
  style,
  imageStyle,
}: EntityAvatarProps) {
  const [failedImageUrl, setFailedImageUrl] = useState<string | null>(null);
  const showImage = Boolean(imageUrl) && failedImageUrl !== imageUrl;

  return (
    <div
      className={cn("overflow-hidden", className)}
      style={style}
      aria-label={`${name} avatar`}
    >
      {showImage ? (
        <img
          src={imageUrl ?? undefined}
          alt={name}
          className={cn("h-full w-full object-cover", imageClassName)}
          style={imageStyle}
          onError={() => setFailedImageUrl(imageUrl ?? null)}
        />
      ) : (
        fallback
      )}
    </div>
  );
}

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
  imageFit?: "cover" | "contain";
  imageInset?: number;
  style?: CSSProperties;
  imageStyle?: CSSProperties;
  imageFrameStyle?: CSSProperties;
}

export function EntityAvatar({
  name,
  imageUrl,
  fallback,
  className,
  imageClassName,
  imageFit = "cover",
  imageInset = 0,
  style,
  imageStyle,
  imageFrameStyle,
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
        <div
          className="h-full w-full"
          style={{
            padding: imageInset,
            ...imageFrameStyle,
          }}
        >
          <img
            src={imageUrl ?? undefined}
            alt={name}
            className={cn(
              "h-full w-full",
              imageFit === "contain" ? "object-contain" : "object-cover",
              imageClassName,
            )}
            style={imageStyle}
            onError={() => setFailedImageUrl(imageUrl ?? null)}
          />
        </div>
      ) : (
        fallback
      )}
    </div>
  );
}

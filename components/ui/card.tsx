import * as React from "react";
import { cn } from "@/lib/utils";

/** Kartu putih dasar: radius besar (24px), bayangan lembut tanpa border (§13). */
export function Card({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("card p-5", className)} {...props} />;
}

/** Judul kartu — serif display untuk sapaan/pertanyaan (§13). */
export function CardTitle({
  className,
  as: Tag = "h3",
  ...props
}: React.HTMLAttributes<HTMLHeadingElement> & {
  as?: "h1" | "h2" | "h3";
}) {
  return (
    <Tag
      className={cn(
        "font-serif text-card-title font-semibold text-ink",
        className,
      )}
      {...props}
    />
  );
}

export function CardMeta({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={cn("text-[12px] font-medium text-ink-subtle", className)}
      {...props}
    />
  );
}

import { cn } from "@/lib/utils";

/** Placeholder skeleton loading — dipakai di semua layar data (§9.5). */
export function Skeleton({
  className,
}: {
  className?: string;
}) {
  return <div className={cn("skeleton", className)} aria-hidden />;
}

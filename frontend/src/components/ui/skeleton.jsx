import { cn } from "@/lib/utils"

function Skeleton({
  className,
  ...props
}) {
  return (<div className={cn("animate-pulse rounded-md border-2 border-foreground bg-muted", className)} {...props} />);
}

export { Skeleton }

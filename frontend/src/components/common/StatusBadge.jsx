import { Badge } from "@/components/ui/badge";
import { useHealthCheck } from "@/hooks/useHealthCheck";
import { Loader2 } from "lucide-react";

export function StatusBadge() {
  const { status, message } = useHealthCheck();

  if (status === 'checking') {
    return (
      <Badge variant="outline" className="flex items-center gap-2">
        <Loader2 className="h-3 w-3 animate-spin" />
        Checking Server...
      </Badge>
    );
  }

  if (status === 'online') {
    return (
      <Badge variant="outline" className="bg-green-500/10 text-green-600 hover:bg-green-500/20 flex items-center gap-2 border-green-200">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
        </span>
        {message}
      </Badge>
    );
  }

  return (
    <Badge variant="outline" className="bg-red-500/10 text-red-600 hover:bg-red-500/20 flex items-center gap-2 border-red-200">
        <span className="relative flex h-2 w-2">
          <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
        </span>
        {message}
    </Badge>
  );
}

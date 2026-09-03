"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Badge } from "@/components/ui/badge";

export function TimeFilter() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const current = searchParams.get("days") || "all";

  const setFilter = (days: string) => {
    router.push(`/analytics?days=${days}`);
  };

  return (
    <div className="flex space-x-2">
      <Badge 
        variant={current === "7" ? "default" : "outline"} 
        className="cursor-pointer" 
        onClick={() => setFilter("7")}
      >
        7 Days
      </Badge>
      <Badge 
        variant={current === "30" ? "default" : "outline"} 
        className="cursor-pointer" 
        onClick={() => setFilter("30")}
      >
        30 Days
      </Badge>
      <Badge 
        variant={current === "all" ? "default" : "outline"} 
        className="cursor-pointer" 
        onClick={() => setFilter("all")}
      >
        All Time
      </Badge>
    </div>
  );
}

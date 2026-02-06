"use client";

import { GraduationCap } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface CoachingInsight {
  recommendation: string;
  count: number;
}

interface CoachingRecommendationsProps {
  recommendations: CoachingInsight[] | undefined;
}

export function CoachingRecommendations({
  recommendations,
}: CoachingRecommendationsProps) {
  const hasData = recommendations && recommendations.length > 0;

  const sortedRecommendations = (recommendations ?? [])
    .slice()
    .sort((a, b) => b.count - a.count);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <GraduationCap className="h-5 w-5" />
          Coaching Recommendations
        </CardTitle>
        <CardDescription>
          AI-generated coaching themes ranked by frequency across calls
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!hasData ? (
          <div className="flex h-[200px] items-center justify-center text-gray-500">
            <div className="text-center">
              <GraduationCap className="mx-auto h-12 w-12 text-gray-300" />
              <p className="mt-4">No coaching recommendations yet</p>
              <p className="text-sm">
                Recommendations will appear as more calls are analyzed
              </p>
            </div>
          </div>
        ) : (
          <ol className="space-y-3">
            {sortedRecommendations.map((item, index) => (
              <li
                key={index}
                className="flex items-start gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/50"
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                  {index + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium leading-relaxed">
                    {item.recommendation}
                  </p>
                </div>
                <Badge variant="secondary" className="shrink-0">
                  {item.count} {item.count === 1 ? "call" : "calls"}
                </Badge>
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}

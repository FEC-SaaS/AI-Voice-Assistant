"use client";

import { ShieldAlert } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

interface ObjectionPattern {
  category: string;
  count: number;
  topObjections: string[];
  suggestedResponse: string | null;
}

interface ObjectionPatternsProps {
  patterns: ObjectionPattern[] | undefined;
}

export function ObjectionPatterns({ patterns }: ObjectionPatternsProps) {
  const sortedPatterns = (patterns ?? [])
    .slice()
    .sort((a, b) => b.count - a.count);

  const hasData = sortedPatterns.length > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldAlert className="h-5 w-5" />
          Objection Patterns
        </CardTitle>
        <CardDescription>
          Common objections detected across calls with suggested responses
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!hasData ? (
          <div className="flex h-[240px] items-center justify-center text-gray-500">
            <div className="text-center">
              <ShieldAlert className="mx-auto h-12 w-12 text-gray-300" />
              <p className="mt-4">No objection patterns detected</p>
              <p className="text-sm">
                Patterns will appear as more calls are analyzed
              </p>
            </div>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Category</TableHead>
                <TableHead className="text-center">Count</TableHead>
                <TableHead>Top Objections</TableHead>
                <TableHead>Suggested Response</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedPatterns.map((pattern) => (
                <TableRow key={pattern.category}>
                  <TableCell className="font-medium">
                    {pattern.category}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="secondary">{pattern.count}</Badge>
                  </TableCell>
                  <TableCell className="max-w-[250px]">
                    <span className="text-sm text-muted-foreground">
                      {pattern.topObjections.join(", ")}
                    </span>
                  </TableCell>
                  <TableCell className="max-w-[300px]">
                    <span className="text-sm">{pattern.suggestedResponse}</span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

"use client";

import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader2, MapPin } from "lucide-react";

interface StateConsent {
  state: string;
  totalContacts: number;
  withConsent: number;
  complianceRate: number;
}

interface ConsentByStateProps {
  data: StateConsent[] | undefined;
  isLoading: boolean;
}

const TWO_PARTY_STATES = [
  "CA",
  "CT",
  "FL",
  "IL",
  "MD",
  "MA",
  "MI",
  "MT",
  "NV",
  "NH",
  "PA",
  "VT",
  "WA",
];

const STATE_NAMES: Record<string, string> = {
  CA: "California",
  CT: "Connecticut",
  FL: "Florida",
  IL: "Illinois",
  MD: "Maryland",
  MA: "Massachusetts",
  MI: "Michigan",
  MT: "Montana",
  NV: "Nevada",
  NH: "New Hampshire",
  PA: "Pennsylvania",
  VT: "Vermont",
  WA: "Washington",
};

function getRateColor(rate: number): string {
  if (rate >= 90) return "bg-green-500";
  if (rate >= 70) return "bg-yellow-500";
  return "bg-red-500";
}

function getRateTextColor(rate: number): string {
  if (rate >= 90) return "text-green-600";
  if (rate >= 70) return "text-yellow-600";
  return "text-red-600";
}

export function ConsentByState({ data, isLoading }: ConsentByStateProps) {
  // Build a map from the data, ensuring all 13 states are represented
  const stateMap = new Map<string, StateConsent>();
  if (data) {
    for (const item of data) {
      stateMap.set(item.state, item);
    }
  }

  const stateRows = TWO_PARTY_STATES.map((state) => {
    const entry = stateMap.get(state);
    return {
      state,
      name: STATE_NAMES[state] || state,
      totalContacts: entry?.totalContacts ?? 0,
      withConsent: entry?.withConsent ?? 0,
      complianceRate: entry?.complianceRate ?? 0,
    };
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          <MapPin className="h-4 w-4 text-muted-foreground" />
          Two-Party Consent States
        </CardTitle>
        <CardDescription>
          Compliance status for states requiring two-party consent
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex h-[300px] items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="max-h-[400px] overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>State</TableHead>
                  <TableHead className="text-right">Total Contacts</TableHead>
                  <TableHead className="text-right">With Consent</TableHead>
                  <TableHead className="w-[200px]">Compliance Rate</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stateRows.map((row) => (
                  <TableRow key={row.state}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{row.state}</span>
                        <span className="text-xs text-muted-foreground">
                          {row.name}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      {row.totalContacts.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">
                      {row.withConsent.toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                          <div
                            className={cn(
                              "h-full rounded-full transition-all duration-500",
                              getRateColor(row.complianceRate)
                            )}
                            style={{
                              width: `${Math.min(row.complianceRate, 100)}%`,
                            }}
                          />
                        </div>
                        <span
                          className={cn(
                            "min-w-[40px] text-right text-xs font-semibold",
                            getRateTextColor(row.complianceRate)
                          )}
                        >
                          {row.complianceRate}%
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

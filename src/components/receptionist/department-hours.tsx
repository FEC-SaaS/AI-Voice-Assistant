"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";

interface DaySchedule {
  start: string;
  end: string;
}

interface BusinessHoursConfig {
  timezone?: string;
  schedule?: Record<string, DaySchedule | null>;
}

interface DepartmentHoursProps {
  value: BusinessHoursConfig;
  onChange: (value: BusinessHoursConfig) => void;
}

const DAYS = [
  { key: "monday", label: "Monday" },
  { key: "tuesday", label: "Tuesday" },
  { key: "wednesday", label: "Wednesday" },
  { key: "thursday", label: "Thursday" },
  { key: "friday", label: "Friday" },
  { key: "saturday", label: "Saturday" },
  { key: "sunday", label: "Sunday" },
];

export function DepartmentHours({ value, onChange }: DepartmentHoursProps) {
  const schedule = value.schedule || {};

  const toggleDay = (day: string) => {
    const current = schedule[day];
    const newSchedule = { ...schedule };
    if (current) {
      newSchedule[day] = null;
    } else {
      newSchedule[day] = { start: "09:00", end: "17:00" };
    }
    onChange({ ...value, schedule: newSchedule });
  };

  const updateTime = (day: string, field: "start" | "end", time: string) => {
    const current = schedule[day] || { start: "09:00", end: "17:00" };
    const newSchedule = { ...schedule, [day]: { ...current, [field]: time } };
    onChange({ ...value, schedule: newSchedule });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <label className="text-sm font-medium text-gray-700">Timezone</label>
        <select
          value={value.timezone || "America/New_York"}
          onChange={(e) => onChange({ ...value, timezone: e.target.value })}
          className="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <option value="America/New_York">Eastern (ET)</option>
          <option value="America/Chicago">Central (CT)</option>
          <option value="America/Denver">Mountain (MT)</option>
          <option value="America/Los_Angeles">Pacific (PT)</option>
          <option value="America/Phoenix">Arizona (AZ)</option>
          <option value="Pacific/Honolulu">Hawaii (HT)</option>
          <option value="America/Anchorage">Alaska (AKT)</option>
        </select>
      </div>
      <div className="space-y-2">
        {DAYS.map(({ key, label }) => {
          const daySchedule = schedule[key];
          const isOpen = daySchedule !== null && daySchedule !== undefined;
          return (
            <div key={key} className="flex items-center gap-3">
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" checked={isOpen} onChange={() => toggleDay(key)} className="sr-only peer" />
                <div className="w-9 h-5 bg-gray-200 rounded-full peer peer-checked:bg-green-500 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border after:rounded-full after:h-4 after:w-4 after:transition-all"></div>
              </label>
              <span className="w-24 text-sm font-medium text-gray-700">{label}</span>
              {isOpen ? (
                <div className="flex items-center gap-2">
                  <Input
                    type="time"
                    value={daySchedule?.start || "09:00"}
                    onChange={(e) => updateTime(key, "start", e.target.value)}
                    className="w-32 h-8 text-sm"
                  />
                  <span className="text-gray-400">to</span>
                  <Input
                    type="time"
                    value={daySchedule?.end || "17:00"}
                    onChange={(e) => updateTime(key, "end", e.target.value)}
                    className="w-32 h-8 text-sm"
                  />
                </div>
              ) : (
                <span className="text-sm text-gray-400">Closed</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

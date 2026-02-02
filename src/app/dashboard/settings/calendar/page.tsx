"use client";

import { useState, useEffect } from "react";
import {
  Calendar, Clock, Video, Phone, MapPin, Save, Loader2,
  Bell, Globe, Settings2,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

const DAYS_OF_WEEK = [
  { value: 0, label: "Sunday", short: "Sun" },
  { value: 1, label: "Monday", short: "Mon" },
  { value: 2, label: "Tuesday", short: "Tue" },
  { value: 3, label: "Wednesday", short: "Wed" },
  { value: 4, label: "Thursday", short: "Thu" },
  { value: 5, label: "Friday", short: "Fri" },
  { value: 6, label: "Saturday", short: "Sat" },
];

const TIMEZONES = [
  { value: "America/New_York", label: "Eastern Time (ET)" },
  { value: "America/Chicago", label: "Central Time (CT)" },
  { value: "America/Denver", label: "Mountain Time (MT)" },
  { value: "America/Los_Angeles", label: "Pacific Time (PT)" },
  { value: "America/Anchorage", label: "Alaska Time (AKT)" },
  { value: "Pacific/Honolulu", label: "Hawaii Time (HT)" },
  { value: "Europe/London", label: "London (GMT/BST)" },
  { value: "Europe/Paris", label: "Paris (CET)" },
  { value: "Europe/Berlin", label: "Berlin (CET)" },
  { value: "Asia/Tokyo", label: "Tokyo (JST)" },
  { value: "Asia/Shanghai", label: "Shanghai (CST)" },
  { value: "Asia/Dubai", label: "Dubai (GST)" },
  { value: "Australia/Sydney", label: "Sydney (AEST)" },
  { value: "Africa/Lagos", label: "Lagos (WAT)" },
  { value: "Africa/Johannesburg", label: "Johannesburg (SAST)" },
];

export default function CalendarSettingsPage() {
  const [isSaving, setIsSaving] = useState(false);
  const [settings, setSettings] = useState({
    timeZone: "America/New_York",
    availableDays: [1, 2, 3, 4, 5] as number[],
    startTime: "09:00",
    endTime: "17:00",
    defaultDuration: 30,
    bufferBefore: 0,
    bufferAfter: 15,
    maxAdvanceBooking: 30,
    minNoticeTime: 24,
    allowPhone: true,
    allowVideo: true,
    allowInPerson: false,
    sendConfirmation: true,
    sendReminder: true,
    reminderHoursBefore: 24,
  });

  const { data: currentSettings, isLoading } = trpc.appointments.getCalendarSettings.useQuery();
  const updateSettings = trpc.appointments.updateCalendarSettings.useMutation({
    onSuccess: () => {
      toast.success("Calendar settings saved");
      setIsSaving(false);
    },
    onError: (error) => {
      toast.error(error.message);
      setIsSaving(false);
    },
  });

  useEffect(() => {
    if (currentSettings) {
      setSettings({
        timeZone: currentSettings.timeZone,
        availableDays: currentSettings.availableDays as number[],
        startTime: currentSettings.startTime,
        endTime: currentSettings.endTime,
        defaultDuration: currentSettings.defaultDuration,
        bufferBefore: currentSettings.bufferBefore,
        bufferAfter: currentSettings.bufferAfter,
        maxAdvanceBooking: currentSettings.maxAdvanceBooking,
        minNoticeTime: currentSettings.minNoticeTime,
        allowPhone: currentSettings.allowPhone,
        allowVideo: currentSettings.allowVideo,
        allowInPerson: currentSettings.allowInPerson,
        sendConfirmation: currentSettings.sendConfirmation,
        sendReminder: currentSettings.sendReminder,
        reminderHoursBefore: currentSettings.reminderHoursBefore,
      });
    }
  }, [currentSettings]);

  const toggleDay = (day: number) => {
    const newDays = settings.availableDays.includes(day)
      ? settings.availableDays.filter((d) => d !== day)
      : [...settings.availableDays, day].sort();
    setSettings({ ...settings, availableDays: newDays });
  };

  const handleSave = () => {
    setIsSaving(true);
    updateSettings.mutate(settings);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Calendar Settings</h1>
          <p className="text-gray-500">Configure your availability and booking preferences</p>
        </div>
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          Save Changes
        </Button>
      </div>

      {/* Time Zone */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Time Zone
          </CardTitle>
          <CardDescription>
            Set your organization&apos;s default time zone for appointments
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="max-w-sm">
            <Select
              value={settings.timeZone}
              onValueChange={(value) => setSettings({ ...settings, timeZone: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIMEZONES.map((tz) => (
                  <SelectItem key={tz.value} value={tz.value}>
                    {tz.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Availability */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Availability
          </CardTitle>
          <CardDescription>
            Set which days and hours you&apos;re available for appointments
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Available Days */}
          <div>
            <Label className="mb-3 block">Available Days</Label>
            <div className="flex flex-wrap gap-2">
              {DAYS_OF_WEEK.map((day) => (
                <Button
                  key={day.value}
                  type="button"
                  variant={settings.availableDays.includes(day.value) ? "default" : "outline"}
                  size="sm"
                  onClick={() => toggleDay(day.value)}
                >
                  {day.short}
                </Button>
              ))}
            </div>
          </div>

          {/* Working Hours */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="startTime">Start Time</Label>
              <Input
                id="startTime"
                type="time"
                value={settings.startTime}
                onChange={(e) => setSettings({ ...settings, startTime: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endTime">End Time</Label>
              <Input
                id="endTime"
                type="time"
                value={settings.endTime}
                onChange={(e) => setSettings({ ...settings, endTime: e.target.value })}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Meeting Defaults */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Meeting Defaults
          </CardTitle>
          <CardDescription>
            Configure default settings for new appointments
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <Label htmlFor="defaultDuration">Default Duration</Label>
              <Select
                value={settings.defaultDuration.toString()}
                onValueChange={(v) => setSettings({ ...settings, defaultDuration: parseInt(v) })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="15">15 minutes</SelectItem>
                  <SelectItem value="30">30 minutes</SelectItem>
                  <SelectItem value="45">45 minutes</SelectItem>
                  <SelectItem value="60">1 hour</SelectItem>
                  <SelectItem value="90">1.5 hours</SelectItem>
                  <SelectItem value="120">2 hours</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="bufferBefore">Buffer Before</Label>
              <Select
                value={settings.bufferBefore.toString()}
                onValueChange={(v) => setSettings({ ...settings, bufferBefore: parseInt(v) })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">No buffer</SelectItem>
                  <SelectItem value="5">5 minutes</SelectItem>
                  <SelectItem value="10">10 minutes</SelectItem>
                  <SelectItem value="15">15 minutes</SelectItem>
                  <SelectItem value="30">30 minutes</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="bufferAfter">Buffer After</Label>
              <Select
                value={settings.bufferAfter.toString()}
                onValueChange={(v) => setSettings({ ...settings, bufferAfter: parseInt(v) })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">No buffer</SelectItem>
                  <SelectItem value="5">5 minutes</SelectItem>
                  <SelectItem value="10">10 minutes</SelectItem>
                  <SelectItem value="15">15 minutes</SelectItem>
                  <SelectItem value="30">30 minutes</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="minNoticeTime">Minimum Notice</Label>
              <Select
                value={settings.minNoticeTime.toString()}
                onValueChange={(v) => setSettings({ ...settings, minNoticeTime: parseInt(v) })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">No minimum</SelectItem>
                  <SelectItem value="1">1 hour</SelectItem>
                  <SelectItem value="2">2 hours</SelectItem>
                  <SelectItem value="4">4 hours</SelectItem>
                  <SelectItem value="24">24 hours</SelectItem>
                  <SelectItem value="48">48 hours</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="maxAdvanceBooking">Maximum Advance Booking</Label>
            <Select
              value={settings.maxAdvanceBooking.toString()}
              onValueChange={(v) => setSettings({ ...settings, maxAdvanceBooking: parseInt(v) })}
            >
              <SelectTrigger className="max-w-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">1 week</SelectItem>
                <SelectItem value="14">2 weeks</SelectItem>
                <SelectItem value="30">1 month</SelectItem>
                <SelectItem value="60">2 months</SelectItem>
                <SelectItem value="90">3 months</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-gray-500">
              How far in advance can appointments be scheduled
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Meeting Types */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings2 className="h-5 w-5" />
            Meeting Types
          </CardTitle>
          <CardDescription>
            Choose which types of meetings you want to offer
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-green-100 p-2">
                <Phone className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="font-medium">Phone Calls</p>
                <p className="text-sm text-gray-500">Schedule phone call appointments</p>
              </div>
            </div>
            <Switch
              checked={settings.allowPhone}
              onCheckedChange={(checked: boolean) => setSettings({ ...settings, allowPhone: checked })}
            />
          </div>

          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-blue-100 p-2">
                <Video className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="font-medium">Video Calls</p>
                <p className="text-sm text-gray-500">Schedule video conferencing meetings</p>
              </div>
            </div>
            <Switch
              checked={settings.allowVideo}
              onCheckedChange={(checked: boolean) => setSettings({ ...settings, allowVideo: checked })}
            />
          </div>

          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-purple-100 p-2">
                <MapPin className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="font-medium">In-Person Meetings</p>
                <p className="text-sm text-gray-500">Schedule face-to-face meetings</p>
              </div>
            </div>
            <Switch
              checked={settings.allowInPerson}
              onCheckedChange={(checked: boolean) => setSettings({ ...settings, allowInPerson: checked })}
            />
          </div>
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notifications
          </CardTitle>
          <CardDescription>
            Configure email notifications for appointments
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <p className="font-medium">Confirmation Emails</p>
              <p className="text-sm text-gray-500">
                Send confirmation email when an appointment is booked
              </p>
            </div>
            <Switch
              checked={settings.sendConfirmation}
              onCheckedChange={(checked: boolean) => setSettings({ ...settings, sendConfirmation: checked })}
            />
          </div>

          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex-1">
              <p className="font-medium">Reminder Emails</p>
              <p className="text-sm text-gray-500">
                Send reminder email before appointments
              </p>
            </div>
            <div className="flex items-center gap-4">
              {settings.sendReminder && (
                <Select
                  value={settings.reminderHoursBefore.toString()}
                  onValueChange={(v) => setSettings({ ...settings, reminderHoursBefore: parseInt(v) })}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 hour</SelectItem>
                    <SelectItem value="2">2 hours</SelectItem>
                    <SelectItem value="4">4 hours</SelectItem>
                    <SelectItem value="24">24 hours</SelectItem>
                    <SelectItem value="48">48 hours</SelectItem>
                  </SelectContent>
                </Select>
              )}
              <Switch
                checked={settings.sendReminder}
                onCheckedChange={(checked: boolean) => setSettings({ ...settings, sendReminder: checked })}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Save Button (mobile) */}
      <div className="sm:hidden">
        <Button className="w-full" onClick={handleSave} disabled={isSaving}>
          {isSaving ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          Save Changes
        </Button>
      </div>
    </div>
  );
}

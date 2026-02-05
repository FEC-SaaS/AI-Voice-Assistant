"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Calendar, Clock, Loader2, XCircle, Phone, Video, MapPin, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface AppointmentData {
  id: string;
  title: string;
  scheduledAt: string;
  duration: number;
  meetingType: string;
  meetingLink?: string;
  location?: string;
  phoneNumber?: string;
  status: string;
  attendeeName?: string;
}

function RescheduleAppointmentContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [loading, setLoading] = useState(true);
  const [rescheduling, setRescheduling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [appointment, setAppointment] = useState<AppointmentData | null>(null);
  const [businessName, setBusinessName] = useState("VoxForge AI");
  const [rescheduled, setRescheduled] = useState(false);
  const [newDate, setNewDate] = useState("");
  const [newTime, setNewTime] = useState("");
  const [previousDate, setPreviousDate] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setError("Missing confirmation token");
      setLoading(false);
      return;
    }

    // Fetch appointment details
    fetch(`/api/appointments/actions?token=${encodeURIComponent(token)}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          setError(data.error);
        } else {
          setAppointment(data.appointment);
          setBusinessName(data.businessName || "VoxForge AI");
          // Set default date/time to current appointment
          const scheduled = new Date(data.appointment.scheduledAt);
          setNewDate(scheduled.toISOString().split("T")[0] || "");
          const hours = scheduled.getHours().toString().padStart(2, "0");
          const minutes = scheduled.getMinutes().toString().padStart(2, "0");
          setNewTime(`${hours}:${minutes}`);
        }
      })
      .catch(() => {
        setError("Failed to load appointment details");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [token]);

  const handleReschedule = async () => {
    if (!token || !newDate || !newTime) {
      setError("Please select a new date and time");
      return;
    }

    // Validate new date is in the future
    const newDateTime = new Date(`${newDate}T${newTime}`);
    if (newDateTime <= new Date()) {
      setError("Please select a future date and time");
      return;
    }

    setRescheduling(true);
    setError(null);
    try {
      const res = await fetch("/api/appointments/actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, action: "reschedule", newDate, newTime }),
      });

      const data = await res.json();
      if (data.error) {
        setError(data.error);
      } else {
        setRescheduled(true);
        setPreviousDate(data.previousDate);
        setAppointment(data.appointment);
      }
    } catch {
      setError("Failed to reschedule appointment");
    } finally {
      setRescheduling(false);
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatTime = (date: string) => {
    return new Date(date).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const getMeetingIcon = (type: string) => {
    switch (type) {
      case "video":
        return <Video className="h-5 w-5" />;
      case "in_person":
        return <MapPin className="h-5 w-5" />;
      default:
        return <Phone className="h-5 w-5" />;
    }
  };

  const getMinDate = () => {
    const today = new Date();
    return today.toISOString().split("T")[0];
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          <p className="mt-4 text-gray-600">Loading appointment...</p>
        </div>
      </div>
    );
  }

  if (error && !appointment) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <XCircle className="h-12 w-12 text-red-500 mx-auto" />
            <h2 className="mt-4 text-xl font-semibold text-gray-900">Error</h2>
            <p className="mt-2 text-gray-600">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (rescheduled && appointment) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <div className="rounded-full bg-blue-100 p-3 w-fit mx-auto">
              <CheckCircle className="h-12 w-12 text-blue-600" />
            </div>
            <h2 className="mt-4 text-xl font-semibold text-gray-900">
              Appointment Rescheduled!
            </h2>
            <p className="mt-2 text-gray-600">
              Your appointment has been rescheduled to a new time.
            </p>

            {previousDate && (
              <div className="mt-4 p-3 bg-red-50 rounded-lg text-left">
                <p className="text-sm text-gray-500 line-through">
                  Previous: {formatDate(previousDate)} at {formatTime(previousDate)}
                </p>
              </div>
            )}

            <div className="mt-4 p-4 bg-green-50 rounded-lg text-left border-l-4 border-green-500">
              <h3 className="font-medium text-gray-900">{appointment.title}</h3>
              <div className="mt-2 space-y-1 text-sm text-gray-600">
                <p className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-green-600" />
                  <span className="text-green-700 font-medium">
                    {formatDate(appointment.scheduledAt)}
                  </span>
                </p>
                <p className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-green-600" />
                  <span className="text-green-700 font-medium">
                    {formatTime(appointment.scheduledAt)} ({appointment.duration} min)
                  </span>
                </p>
              </div>
            </div>

            <p className="mt-6 text-sm text-gray-500">From {businessName}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="rounded-full bg-blue-100 p-3 w-fit mx-auto">
            <Calendar className="h-8 w-8 text-blue-600" />
          </div>
          <CardTitle className="mt-4">Reschedule Appointment</CardTitle>
          <CardDescription>
            Select a new date and time for your appointment
          </CardDescription>
        </CardHeader>

        {appointment && (
          <CardContent className="space-y-4">
            {/* Current Appointment */}
            <div className="p-4 bg-gray-50 rounded-lg space-y-3">
              <p className="text-sm font-medium text-gray-500">Current Appointment</p>
              <div className="flex items-start gap-3">
                <div className="rounded-lg bg-gray-200 p-2">
                  {getMeetingIcon(appointment.meetingType)}
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{appointment.title}</h3>
                  <p className="text-sm text-gray-500">
                    {formatDate(appointment.scheduledAt)} at {formatTime(appointment.scheduledAt)}
                  </p>
                </div>
              </div>
            </div>

            {/* New Date/Time Selection */}
            <div className="border-t pt-4 space-y-4">
              <p className="text-sm font-medium text-gray-900">Select New Date & Time</p>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="newDate">Date</Label>
                  <Input
                    id="newDate"
                    type="date"
                    min={getMinDate()}
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="newTime">Time</Label>
                  <Input
                    id="newTime"
                    type="time"
                    value={newTime}
                    onChange={(e) => setNewTime(e.target.value)}
                  />
                </div>
              </div>

              {error && (
                <p className="text-sm text-red-600">{error}</p>
              )}
            </div>

            <Button
              className="w-full"
              size="lg"
              onClick={handleReschedule}
              disabled={rescheduling || !newDate || !newTime}
            >
              {rescheduling ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Rescheduling...
                </>
              ) : (
                <>
                  <Calendar className="mr-2 h-4 w-4" />
                  Confirm New Time
                </>
              )}
            </Button>

            <p className="text-center text-sm text-gray-500">From {businessName}</p>
          </CardContent>
        )}
      </Card>
    </div>
  );
}

export default function RescheduleAppointmentPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
            <p className="mt-4 text-gray-600">Loading...</p>
          </div>
        </div>
      }
    >
      <RescheduleAppointmentContent />
    </Suspense>
  );
}

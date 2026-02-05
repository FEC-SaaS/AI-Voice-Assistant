"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle, Calendar, Clock, Loader2, XCircle, Phone, Video, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

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

function ConfirmAppointmentContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [appointment, setAppointment] = useState<AppointmentData | null>(null);
  const [businessName, setBusinessName] = useState("VoxForge AI");
  const [confirmed, setConfirmed] = useState(false);

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
          if (data.appointment.status === "confirmed") {
            setConfirmed(true);
          }
        }
      })
      .catch(() => {
        setError("Failed to load appointment details");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [token]);

  const handleConfirm = async () => {
    if (!token) return;

    setConfirming(true);
    try {
      const res = await fetch("/api/appointments/actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, action: "confirm" }),
      });

      const data = await res.json();
      if (data.error) {
        setError(data.error);
      } else {
        setConfirmed(true);
      }
    } catch {
      setError("Failed to confirm appointment");
    } finally {
      setConfirming(false);
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

  if (error) {
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

  if (confirmed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <div className="rounded-full bg-green-100 p-3 w-fit mx-auto">
              <CheckCircle className="h-12 w-12 text-green-600" />
            </div>
            <h2 className="mt-4 text-xl font-semibold text-gray-900">
              Appointment Confirmed!
            </h2>
            <p className="mt-2 text-gray-600">
              Thank you for confirming your appointment. We look forward to seeing you!
            </p>

            {appointment && (
              <div className="mt-6 p-4 bg-gray-50 rounded-lg text-left">
                <h3 className="font-medium text-gray-900">{appointment.title}</h3>
                <div className="mt-2 space-y-1 text-sm text-gray-600">
                  <p className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    {formatDate(appointment.scheduledAt)}
                  </p>
                  <p className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    {formatTime(appointment.scheduledAt)} ({appointment.duration} min)
                  </p>
                </div>
              </div>
            )}

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
            <CheckCircle className="h-8 w-8 text-blue-600" />
          </div>
          <CardTitle className="mt-4">Confirm Your Appointment</CardTitle>
          <CardDescription>
            Please confirm your attendance for the following appointment
          </CardDescription>
        </CardHeader>

        {appointment && (
          <CardContent className="space-y-4">
            <div className="p-4 bg-gray-50 rounded-lg space-y-3">
              <div className="flex items-start gap-3">
                <div className="rounded-lg bg-primary/10 p-2">
                  {getMeetingIcon(appointment.meetingType)}
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{appointment.title}</h3>
                  <p className="text-sm text-gray-500">
                    {appointment.attendeeName || "Customer"}
                  </p>
                </div>
              </div>

              <div className="border-t pt-3 space-y-2">
                <p className="flex items-center gap-2 text-sm text-gray-600">
                  <Calendar className="h-4 w-4" />
                  {formatDate(appointment.scheduledAt)}
                </p>
                <p className="flex items-center gap-2 text-sm text-gray-600">
                  <Clock className="h-4 w-4" />
                  {formatTime(appointment.scheduledAt)} ({appointment.duration} minutes)
                </p>
              </div>
            </div>

            <Button
              className="w-full"
              size="lg"
              onClick={handleConfirm}
              disabled={confirming}
            >
              {confirming ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Confirming...
                </>
              ) : (
                <>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Confirm Attendance
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

export default function ConfirmAppointmentPage() {
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
      <ConfirmAppointmentContent />
    </Suspense>
  );
}

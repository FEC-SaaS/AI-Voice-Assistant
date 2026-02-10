"use client";

import { useState, useMemo } from "react";
import {
  Calendar, Clock, Plus, Phone, Video, MapPin, Loader2,
  CheckCircle, XCircle, AlertCircle, ChevronLeft, ChevronRight,
  User, Building, Filter, MoreVertical, Search, Mail, Edit, Trash2, Send,
  List, MessageSquare,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: typeof CheckCircle }> = {
  scheduled: { label: "Scheduled", color: "bg-blue-500/10 text-blue-400", icon: Clock },
  confirmed: { label: "Confirmed", color: "bg-green-500/10 text-green-400", icon: CheckCircle },
  completed: { label: "Completed", color: "bg-secondary text-foreground/80", icon: CheckCircle },
  cancelled: { label: "Cancelled", color: "bg-red-500/10 text-red-400", icon: XCircle },
  no_show: { label: "No Show", color: "bg-orange-500/10 text-orange-400", icon: AlertCircle },
  rescheduled: { label: "Rescheduled", color: "bg-purple-500/10 text-purple-400", icon: Calendar },
};

const MEETING_TYPE_CONFIG: Record<string, { label: string; icon: typeof Phone }> = {
  phone: { label: "Phone Call", icon: Phone },
  video: { label: "Video Call", icon: Video },
  in_person: { label: "In Person", icon: MapPin },
};

// Type for appointment from API
interface AppointmentData {
  id: string;
  title: string;
  description: string | null;
  scheduledAt: Date | string;
  endAt: Date | string;
  duration: number;
  meetingType: string;
  meetingLink: string | null;
  location: string | null;
  phoneNumber: string | null;
  status: string;
  attendeeName: string | null;
  attendeeEmail: string | null;
  attendeePhone: string | null;
  notes: string | null;
  contact?: {
    firstName?: string | null;
    lastName?: string | null;
    company?: string | null;
  } | null;
}

// Calendar View Component
interface CalendarViewProps {
  appointments: AppointmentData[];
  selectedDate: Date;
  setSelectedDate: (date: Date) => void;
  isLoading: boolean;
  onAppointmentClick: (appointment: AppointmentData) => void;
  onCreateClick: () => void;
}

function CalendarView({
  appointments,
  selectedDate,
  setSelectedDate,
  isLoading,
  onAppointmentClick,
  onCreateClick,
}: CalendarViewProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // Get days in month
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDay = firstDay.getDay();

    const days: (Date | null)[] = [];

    // Add empty slots for days before the first day of the month
    for (let i = 0; i < startingDay; i++) {
      days.push(null);
    }

    // Add all days in the month
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }

    return days;
  };

  const days = getDaysInMonth(currentMonth);

  // Get appointments for a specific day
  const getAppointmentsForDay = (day: Date) => {
    return appointments.filter((apt) => {
      const aptDate = new Date(apt.scheduledAt);
      return (
        aptDate.getFullYear() === day.getFullYear() &&
        aptDate.getMonth() === day.getMonth() &&
        aptDate.getDate() === day.getDate()
      );
    });
  };

  // Navigate months
  const prevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  };

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
  };

  const goToToday = () => {
    setCurrentMonth(new Date());
    setSelectedDate(new Date());
  };

  // Check if a day is today
  const isToday = (day: Date) => {
    const today = new Date();
    return (
      day.getFullYear() === today.getFullYear() &&
      day.getMonth() === today.getMonth() &&
      day.getDate() === today.getDate()
    );
  };

  // Check if a day is selected
  const isSelected = (day: Date) => {
    return (
      day.getFullYear() === selectedDate.getFullYear() &&
      day.getMonth() === selectedDate.getMonth() &&
      day.getDate() === selectedDate.getDate()
    );
  };

  // Format time
  const formatTime = (date: Date | string) => {
    return new Date(date).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  // Get appointments for selected date
  const selectedDayAppointments = getAppointmentsForDay(selectedDate);

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];

  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {/* Calendar */}
      <Card className="lg:col-span-2">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" onClick={prevMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <h2 className="text-lg font-semibold">
              {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
            </h2>
            <Button variant="outline" size="icon" onClick={nextMonth}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <Button variant="outline" size="sm" onClick={goToToday}>
            Today
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground/70" />
            </div>
          ) : (
            <>
              {/* Day headers */}
              <div className="grid grid-cols-7 gap-1 mb-2">
                {dayNames.map((day) => (
                  <div
                    key={day}
                    className="text-center text-sm font-medium text-muted-foreground py-2"
                  >
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar days */}
              <div className="grid grid-cols-7 gap-1">
                {days.map((day, index) => {
                  if (!day) {
                    return <div key={`empty-${index}`} className="p-2 min-h-[80px]" />;
                  }

                  const dayAppointments = getAppointmentsForDay(day);
                  const hasAppointments = dayAppointments.length > 0;

                  return (
                    <button
                      key={day.toISOString()}
                      onClick={() => setSelectedDate(day)}
                      className={`p-2 min-h-[80px] text-left rounded-lg border transition-colors ${
                        isSelected(day)
                          ? "border-primary bg-primary/5"
                          : isToday(day)
                          ? "border-border bg-blue-500/10"
                          : "border-transparent hover:bg-secondary"
                      }`}
                    >
                      <div
                        className={`text-sm font-medium ${
                          isToday(day) ? "text-blue-400" : "text-foreground"
                        }`}
                      >
                        {day.getDate()}
                      </div>
                      {hasAppointments && (
                        <div className="mt-1 space-y-1">
                          {dayAppointments.slice(0, 2).map((apt) => {
                            const statusConfig = STATUS_CONFIG[apt.status];
                            return (
                              <div
                                key={apt.id}
                                className={`text-xs px-1 py-0.5 rounded truncate ${
                                  statusConfig?.color || "bg-blue-500/10 text-blue-400"
                                }`}
                              >
                                {formatTime(apt.scheduledAt)}
                              </div>
                            );
                          })}
                          {dayAppointments.length > 2 && (
                            <div className="text-xs text-muted-foreground px-1">
                              +{dayAppointments.length - 2} more
                            </div>
                          )}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Selected Day Details */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {selectedDate.toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}
          </CardTitle>
          <CardDescription>
            {selectedDayAppointments.length} appointment
            {selectedDayAppointments.length !== 1 ? "s" : ""}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {selectedDayAppointments.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="mx-auto h-10 w-10 text-muted-foreground/70" />
              <p className="mt-2 text-sm text-muted-foreground">No appointments</p>
              <Button size="sm" className="mt-4" onClick={onCreateClick}>
                <Plus className="mr-2 h-4 w-4" />
                Add Appointment
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {selectedDayAppointments
                .sort(
                  (a, b) =>
                    new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()
                )
                .map((apt) => {
                  const statusConfig = STATUS_CONFIG[apt.status] || {
                    label: "Scheduled",
                    color: "bg-blue-500/10 text-blue-400",
                  };
                  const meetingConfig = MEETING_TYPE_CONFIG[apt.meetingType] || {
                    icon: Phone,
                    label: "Phone",
                  };
                  const MeetingIcon = meetingConfig.icon;

                  return (
                    <button
                      key={apt.id}
                      onClick={() => onAppointmentClick(apt)}
                      className="w-full text-left p-3 rounded-lg border hover:border-primary hover:bg-secondary transition-colors"
                    >
                      <div className="flex items-start gap-3">
                        <div className="rounded-md bg-primary/10 p-1.5">
                          <MeetingIcon className="h-4 w-4 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-foreground truncate">
                            {apt.title}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {formatTime(apt.scheduledAt)} - {apt.duration} min
                          </p>
                          {apt.attendeeName && (
                            <p className="text-sm text-muted-foreground truncate">
                              {apt.attendeeName}
                            </p>
                          )}
                          <Badge className={`mt-1 ${statusConfig.color}`}>
                            {statusConfig.label}
                          </Badge>
                        </div>
                      </div>
                    </button>
                  );
                })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function AppointmentsPage() {
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<"list" | "calendar">("list");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [cancelId, setCancelId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState("");

  // Edit dialog state
  const [editAppointment, setEditAppointment] = useState<AppointmentData | null>(null);
  const [editFormData, setEditFormData] = useState({
    title: "",
    attendeeName: "",
    attendeeEmail: "",
    attendeePhone: "",
    notes: "",
  });

  // Form state
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    scheduledAt: "",
    scheduledTime: "09:00",
    duration: 30,
    meetingType: "phone" as "phone" | "video" | "in_person",
    meetingLink: "",
    location: "",
    phoneNumber: "",
    attendeeName: "",
    attendeeEmail: "",
    attendeePhone: "",
    notificationPreference: "both" as "email" | "sms" | "both" | "none",
    notes: "",
  });

  const { data: stats, isLoading: statsLoading } = trpc.appointments.getStats.useQuery();
  const { data: appointmentsData, isLoading } = trpc.appointments.list.useQuery({
    status: statusFilter === "all" ? undefined : statusFilter as "scheduled" | "confirmed" | "completed" | "cancelled" | "no_show" | "rescheduled",
  });
  const { data: calendarSettings } = trpc.appointments.getCalendarSettings.useQuery();
  const utils = trpc.useUtils();

  const createAppointment = trpc.appointments.create.useMutation({
    onSuccess: () => {
      toast.success("Appointment created successfully");
      utils.appointments.list.invalidate();
      utils.appointments.getStats.invalidate();
      setCreateOpen(false);
      resetForm();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const cancelAppointment = trpc.appointments.cancel.useMutation({
    onSuccess: () => {
      toast.success("Appointment cancelled");
      utils.appointments.list.invalidate();
      utils.appointments.getStats.invalidate();
      setCancelId(null);
      setCancelReason("");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const updateStatus = trpc.appointments.update.useMutation({
    onSuccess: () => {
      toast.success("Appointment updated");
      utils.appointments.list.invalidate();
      utils.appointments.getStats.invalidate();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const updateAppointment = trpc.appointments.update.useMutation({
    onSuccess: () => {
      toast.success("Appointment updated successfully");
      utils.appointments.list.invalidate();
      setEditAppointment(null);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const resendConfirmation = trpc.appointments.resendConfirmation.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const resendSms = trpc.appointments.resendSms.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const deleteAppointment = trpc.appointments.delete.useMutation({
    onSuccess: () => {
      toast.success("Appointment deleted");
      utils.appointments.list.invalidate();
      utils.appointments.getStats.invalidate();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const appointments = appointmentsData?.appointments || [];

  const filteredAppointments = appointments.filter((apt) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      apt.title.toLowerCase().includes(query) ||
      apt.attendeeName?.toLowerCase().includes(query) ||
      apt.attendeeEmail?.toLowerCase().includes(query) ||
      apt.contact?.firstName?.toLowerCase().includes(query) ||
      apt.contact?.lastName?.toLowerCase().includes(query) ||
      apt.contact?.company?.toLowerCase().includes(query)
    );
  });

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      scheduledAt: "",
      scheduledTime: "09:00",
      duration: 30,
      meetingType: "phone",
      meetingLink: "",
      location: "",
      phoneNumber: "",
      attendeeName: "",
      attendeeEmail: "",
      attendeePhone: "",
      notificationPreference: "both",
      notes: "",
    });
  };

  const handleCreate = () => {
    if (!formData.title.trim()) {
      toast.error("Please enter a title");
      return;
    }
    if (!formData.scheduledAt) {
      toast.error("Please select a date");
      return;
    }

    const scheduledDateTime = new Date(`${formData.scheduledAt}T${formData.scheduledTime}`);

    createAppointment.mutate({
      title: formData.title,
      description: formData.description || undefined,
      scheduledAt: scheduledDateTime.toISOString(),
      duration: formData.duration,
      meetingType: formData.meetingType,
      meetingLink: formData.meetingLink || undefined,
      location: formData.location || undefined,
      phoneNumber: formData.phoneNumber || undefined,
      attendeeName: formData.attendeeName || undefined,
      attendeeEmail: formData.attendeeEmail || undefined,
      attendeePhone: formData.attendeePhone || undefined,
      notificationPreference: formData.notificationPreference,
      notes: formData.notes || undefined,
    });
  };

  const handleCancel = () => {
    if (!cancelId) return;
    cancelAppointment.mutate({
      id: cancelId,
      reason: cancelReason || undefined,
    });
  };

  const openEditDialog = (appointment: AppointmentData) => {
    setEditAppointment(appointment);
    setEditFormData({
      title: appointment.title,
      attendeeName: appointment.attendeeName || "",
      attendeeEmail: appointment.attendeeEmail || "",
      attendeePhone: appointment.attendeePhone || "",
      notes: appointment.notes || "",
    });
  };

  const handleUpdate = () => {
    if (!editAppointment) return;
    updateAppointment.mutate({
      id: editAppointment.id,
      title: editFormData.title || undefined,
      attendeeName: editFormData.attendeeName || null,
      attendeeEmail: editFormData.attendeeEmail || null,
      attendeePhone: editFormData.attendeePhone || null,
      notes: editFormData.notes || undefined,
    });
  };

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  };

  const formatTime = (date: Date | string) => {
    return new Date(date).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const getMinDate = () => {
    const today = new Date();
    return today.toISOString().split("T")[0];
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Appointments</h1>
          <p className="text-muted-foreground">Manage scheduled meetings and appointments</p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New Appointment
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">{statsLoading ? "-" : stats?.upcoming || 0}</p>
                <p className="text-sm text-muted-foreground">Upcoming (7 days)</p>
              </div>
              <Calendar className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">{statsLoading ? "-" : stats?.confirmed || 0}</p>
                <p className="text-sm text-muted-foreground">Confirmed</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">{statsLoading ? "-" : `${stats?.completionRate || 0}%`}</p>
                <p className="text-sm text-muted-foreground">Completion Rate</p>
              </div>
              <CheckCircle className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">{statsLoading ? "-" : stats?.cancelled || 0}</p>
                <p className="text-sm text-muted-foreground">Cancelled</p>
              </div>
              <XCircle className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/70" />
                <Input
                  placeholder="Search appointments..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 w-64"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40">
                  <Filter className="mr-2 h-4 w-4" />
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="scheduled">Scheduled</SelectItem>
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                  <SelectItem value="no_show">No Show</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant={viewMode === "list" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("list")}
              >
                <List className="mr-2 h-4 w-4" />
                List
              </Button>
              <Button
                variant={viewMode === "calendar" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("calendar")}
              >
                <Calendar className="mr-2 h-4 w-4" />
                Calendar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Appointments List or Calendar */}
      {viewMode === "calendar" ? (
        <CalendarView
          appointments={filteredAppointments}
          selectedDate={selectedDate}
          setSelectedDate={setSelectedDate}
          isLoading={isLoading}
          onAppointmentClick={openEditDialog}
          onCreateClick={() => setCreateOpen(true)}
        />
      ) : (
      <Card>
        <CardHeader>
          <CardTitle>All Appointments</CardTitle>
          <CardDescription>
            {filteredAppointments.length} appointment{filteredAppointments.length !== 1 ? "s" : ""}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground/70" />
            </div>
          ) : filteredAppointments.length === 0 ? (
            <div className="py-12 text-center">
              <Calendar className="mx-auto h-12 w-12 text-muted-foreground/70" />
              <h3 className="mt-4 text-lg font-semibold text-foreground">No appointments</h3>
              <p className="mt-2 text-muted-foreground">
                {statusFilter !== "all" ? "No appointments match your filter" : "Schedule your first appointment to get started"}
              </p>
              <Button className="mt-4" onClick={() => setCreateOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                New Appointment
              </Button>
            </div>
          ) : (
            <div className="divide-y">
              {filteredAppointments.map((appointment) => {
                const statusConfig = STATUS_CONFIG[appointment.status] ?? {
                  label: "Scheduled",
                  color: "bg-blue-500/10 text-blue-400",
                  icon: Clock,
                };
                const StatusIcon = statusConfig.icon;
                const meetingConfig = MEETING_TYPE_CONFIG[appointment.meetingType] ?? {
                  label: "Phone Call",
                  icon: Phone,
                };
                const MeetingIcon = meetingConfig.icon;
                const isPast = new Date(appointment.scheduledAt) < new Date();

                return (
                  <div key={appointment.id} className="flex items-center justify-between py-4">
                    <div className="flex items-center gap-4">
                      <div className={`rounded-lg p-3 ${isPast ? "bg-secondary" : "bg-primary/10"}`}>
                        <MeetingIcon className={`h-5 w-5 ${isPast ? "text-muted-foreground/70" : "text-primary"}`} />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{appointment.title}</p>
                        <div className="flex items-center gap-3 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5" />
                            {formatDate(appointment.scheduledAt)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5" />
                            {formatTime(appointment.scheduledAt)} ({appointment.duration} min)
                          </span>
                        </div>
                        {(appointment.attendeeName || appointment.contact) && (
                          <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                            <User className="h-3.5 w-3.5" />
                            <span>
                              {appointment.attendeeName ||
                                `${appointment.contact?.firstName || ""} ${appointment.contact?.lastName || ""}`.trim()}
                            </span>
                            {appointment.contact?.company && (
                              <>
                                <Building className="h-3.5 w-3.5 ml-2" />
                                <span>{appointment.contact.company}</span>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge className={statusConfig.color}>
                        <StatusIcon className="mr-1 h-3 w-3" />
                        {statusConfig.label}
                      </Badge>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {/* View/Edit */}
                          <DropdownMenuItem onClick={() => openEditDialog(appointment)}>
                            <Edit className="mr-2 h-4 w-4" />
                            View / Edit
                          </DropdownMenuItem>

                          {/* Resend Email */}
                          {appointment.attendeeEmail && appointment.status !== "cancelled" && (
                            <DropdownMenuItem
                              onClick={() => resendConfirmation.mutate({ id: appointment.id })}
                              disabled={resendConfirmation.isPending}
                            >
                              <Send className="mr-2 h-4 w-4" />
                              Resend Confirmation
                            </DropdownMenuItem>
                          )}

                          {/* Resend SMS */}
                          {appointment.attendeePhone && appointment.status !== "cancelled" && (
                            <DropdownMenuItem
                              onClick={() => resendSms.mutate({ id: appointment.id })}
                              disabled={resendSms.isPending}
                            >
                              <MessageSquare className="mr-2 h-4 w-4" />
                              Resend SMS
                            </DropdownMenuItem>
                          )}

                          <DropdownMenuSeparator />

                          {/* Status changes */}
                          {appointment.status === "scheduled" && (
                            <DropdownMenuItem
                              onClick={() => updateStatus.mutate({ id: appointment.id, status: "confirmed" })}
                            >
                              <CheckCircle className="mr-2 h-4 w-4" />
                              Mark Confirmed
                            </DropdownMenuItem>
                          )}
                          {(appointment.status === "scheduled" || appointment.status === "confirmed") && (
                            <>
                              <DropdownMenuItem
                                onClick={() => updateStatus.mutate({ id: appointment.id, status: "completed" })}
                              >
                                <CheckCircle className="mr-2 h-4 w-4" />
                                Mark Completed
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => updateStatus.mutate({ id: appointment.id, status: "no_show" })}
                              >
                                <AlertCircle className="mr-2 h-4 w-4" />
                                Mark No Show
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-red-400"
                                onClick={() => setCancelId(appointment.id)}
                              >
                                <XCircle className="mr-2 h-4 w-4" />
                                Cancel
                              </DropdownMenuItem>
                            </>
                          )}

                          {/* Delete - only for cancelled/completed/no_show */}
                          {(appointment.status === "cancelled" || appointment.status === "completed" || appointment.status === "no_show") && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-red-400"
                                onClick={() => {
                                  if (confirm("Are you sure you want to permanently delete this appointment?")) {
                                    deleteAppointment.mutate({ id: appointment.id });
                                  }
                                }}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
      )}

      {/* Create Appointment Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>New Appointment</DialogTitle>
            <DialogDescription>
              Schedule a new appointment or meeting
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                placeholder="e.g., Sales Demo, Follow-up Call"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="date">Date *</Label>
                <Input
                  id="date"
                  type="date"
                  min={getMinDate()}
                  value={formData.scheduledAt}
                  onChange={(e) => setFormData({ ...formData, scheduledAt: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="time">Time *</Label>
                <Input
                  id="time"
                  type="time"
                  value={formData.scheduledTime}
                  onChange={(e) => setFormData({ ...formData, scheduledTime: e.target.value })}
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="duration">Duration (minutes)</Label>
                <Select
                  value={formData.duration.toString()}
                  onValueChange={(v) => setFormData({ ...formData, duration: parseInt(v) })}
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
                <Label htmlFor="meetingType">Meeting Type</Label>
                <Select
                  value={formData.meetingType}
                  onValueChange={(v) => setFormData({ ...formData, meetingType: v as "phone" | "video" | "in_person" })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="phone">
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4" />
                        Phone Call
                      </div>
                    </SelectItem>
                    <SelectItem value="video">
                      <div className="flex items-center gap-2">
                        <Video className="h-4 w-4" />
                        Video Call
                      </div>
                    </SelectItem>
                    <SelectItem value="in_person">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        In Person
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {formData.meetingType === "video" && (
              <div className="space-y-2">
                <Label htmlFor="meetingLink">Meeting Link</Label>
                <Input
                  id="meetingLink"
                  placeholder="https://zoom.us/j/..."
                  value={formData.meetingLink}
                  onChange={(e) => setFormData({ ...formData, meetingLink: e.target.value })}
                />
              </div>
            )}

            {formData.meetingType === "phone" && (
              <div className="space-y-2">
                <Label htmlFor="phoneNumber">Phone Number</Label>
                <Input
                  id="phoneNumber"
                  placeholder="+1 (555) 000-0000"
                  value={formData.phoneNumber}
                  onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                />
              </div>
            )}

            {formData.meetingType === "in_person" && (
              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  placeholder="123 Main St, City, State"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                />
              </div>
            )}

            <div className="border-t pt-4">
              <h4 className="font-medium mb-3">Attendee Information</h4>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="attendeeName">Name</Label>
                  <Input
                    id="attendeeName"
                    placeholder="John Doe"
                    value={formData.attendeeName}
                    onChange={(e) => setFormData({ ...formData, attendeeName: e.target.value })}
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="attendeeEmail">Email</Label>
                    <Input
                      id="attendeeEmail"
                      type="email"
                      placeholder="john@example.com"
                      value={formData.attendeeEmail}
                      onChange={(e) => setFormData({ ...formData, attendeeEmail: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="attendeePhone">Phone</Label>
                    <Input
                      id="attendeePhone"
                      placeholder="+1 (555) 000-0000"
                      value={formData.attendeePhone}
                      onChange={(e) => setFormData({ ...formData, attendeePhone: e.target.value })}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Notification Preference</Label>
              <Select
                value={formData.notificationPreference}
                onValueChange={(v) => setFormData({ ...formData, notificationPreference: v as "email" | "sms" | "both" | "none" })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="both">Email &amp; SMS</SelectItem>
                  <SelectItem value="email">Email Only</SelectItem>
                  <SelectItem value="sms">SMS Only</SelectItem>
                  <SelectItem value="none">No Notifications</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                placeholder="Any additional notes..."
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={createAppointment.isPending}>
              {createAppointment.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Calendar className="mr-2 h-4 w-4" />
              )}
              Create Appointment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel Confirmation Dialog */}
      <Dialog open={!!cancelId} onOpenChange={() => setCancelId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Appointment</DialogTitle>
            <DialogDescription>
              Are you sure you want to cancel this appointment? The attendee will be notified.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="cancelReason">Reason (optional)</Label>
            <Textarea
              id="cancelReason"
              placeholder="Enter a reason for cancellation..."
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              className="mt-2"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelId(null)}>
              Keep Appointment
            </Button>
            <Button
              variant="destructive"
              onClick={handleCancel}
              disabled={cancelAppointment.isPending}
            >
              {cancelAppointment.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <XCircle className="mr-2 h-4 w-4" />
              )}
              Cancel Appointment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Appointment Dialog */}
      <Dialog open={!!editAppointment} onOpenChange={() => setEditAppointment(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Appointment</DialogTitle>
            <DialogDescription>
              Review and update appointment details. Correct any errors from voice transcription.
            </DialogDescription>
          </DialogHeader>

          {editAppointment && (
            <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
              {/* Appointment Summary */}
              <div className="rounded-lg bg-secondary p-4 space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{formatDate(editAppointment.scheduledAt)}</span>
                  <Clock className="h-4 w-4 text-muted-foreground ml-2" />
                  <span>{formatTime(editAppointment.scheduledAt)}</span>
                  <span className="text-muted-foreground">({editAppointment.duration} min)</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  {editAppointment.meetingType === "phone" && <Phone className="h-4 w-4 text-muted-foreground" />}
                  {editAppointment.meetingType === "video" && <Video className="h-4 w-4 text-muted-foreground" />}
                  {editAppointment.meetingType === "in_person" && <MapPin className="h-4 w-4 text-muted-foreground" />}
                  <span className="text-muted-foreground">
                    {MEETING_TYPE_CONFIG[editAppointment.meetingType]?.label || "Meeting"}
                  </span>
                </div>
                <Badge className={STATUS_CONFIG[editAppointment.status]?.color || "bg-secondary"}>
                  {STATUS_CONFIG[editAppointment.status]?.label || editAppointment.status}
                </Badge>
              </div>

              {/* Editable Fields */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="editTitle">Title</Label>
                  <Input
                    id="editTitle"
                    value={editFormData.title}
                    onChange={(e) => setEditFormData({ ...editFormData, title: e.target.value })}
                  />
                </div>

                <div className="border-t pt-4">
                  <h4 className="font-medium mb-3 flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Attendee Information
                    <span className="text-xs font-normal text-muted-foreground">(correct if AI got it wrong)</span>
                  </h4>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="editAttendeeName">Name</Label>
                      <Input
                        id="editAttendeeName"
                        placeholder="e.g., John Doe"
                        value={editFormData.attendeeName}
                        onChange={(e) => setEditFormData({ ...editFormData, attendeeName: e.target.value })}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="editAttendeeEmail" className="flex items-center gap-2">
                        <Mail className="h-4 w-4" />
                        Email
                        {!editFormData.attendeeEmail && (
                          <span className="text-xs text-orange-400">(required to send confirmation)</span>
                        )}
                      </Label>
                      <Input
                        id="editAttendeeEmail"
                        type="email"
                        placeholder="e.g., john@example.com"
                        value={editFormData.attendeeEmail}
                        onChange={(e) => setEditFormData({ ...editFormData, attendeeEmail: e.target.value })}
                      />
                      {editAppointment.attendeeEmail !== editFormData.attendeeEmail && editFormData.attendeeEmail && (
                        <p className="text-xs text-blue-400">
                          Email changed. Save changes, then use &quot;Resend Confirmation&quot; to send to the new email.
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="editAttendeePhone">Phone</Label>
                      <Input
                        id="editAttendeePhone"
                        placeholder="e.g., +1 555 123 4567"
                        value={editFormData.attendeePhone}
                        onChange={(e) => setEditFormData({ ...editFormData, attendeePhone: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="editNotes">Notes</Label>
                  <Textarea
                    id="editNotes"
                    placeholder="Any additional notes..."
                    value={editFormData.notes}
                    onChange={(e) => setEditFormData({ ...editFormData, notes: e.target.value })}
                    rows={3}
                  />
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="flex-col gap-3">
            {/* Resend actions row */}
            {editAppointment && editAppointment.status !== "cancelled" && (editFormData.attendeeEmail || editFormData.attendeePhone) && (
              <div className="flex flex-wrap gap-2 w-full">
                {editFormData.attendeeEmail && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      // Save first, then resend
                      if (editFormData.attendeeEmail !== editAppointment.attendeeEmail) {
                        updateAppointment.mutate({
                          id: editAppointment.id,
                          attendeeEmail: editFormData.attendeeEmail,
                        }, {
                          onSuccess: () => {
                            resendConfirmation.mutate({ id: editAppointment.id });
                          }
                        });
                      } else {
                        resendConfirmation.mutate({ id: editAppointment.id });
                      }
                    }}
                    disabled={resendConfirmation.isPending || updateAppointment.isPending}
                  >
                    {resendConfirmation.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="mr-2 h-4 w-4" />
                    )}
                    Resend Email
                  </Button>
                )}
                {editFormData.attendeePhone && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      // Save phone first if changed, then resend
                      if (editFormData.attendeePhone !== editAppointment.attendeePhone) {
                        updateAppointment.mutate({
                          id: editAppointment.id,
                          attendeePhone: editFormData.attendeePhone,
                        }, {
                          onSuccess: () => {
                            resendSms.mutate({ id: editAppointment.id });
                          }
                        });
                      } else {
                        resendSms.mutate({ id: editAppointment.id });
                      }
                    }}
                    disabled={resendSms.isPending || updateAppointment.isPending}
                  >
                    {resendSms.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <MessageSquare className="mr-2 h-4 w-4" />
                    )}
                    Resend SMS
                  </Button>
                )}
              </div>
            )}
            {/* Primary actions row */}
            <div className="flex justify-end gap-2 w-full">
              <Button variant="outline" onClick={() => setEditAppointment(null)}>
                Cancel
              </Button>
              <Button onClick={handleUpdate} disabled={updateAppointment.isPending}>
                {updateAppointment.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle className="mr-2 h-4 w-4" />
                )}
                Save Changes
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

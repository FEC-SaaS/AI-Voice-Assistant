"use client";

import { useState } from "react";
import {
  Calendar, Clock, Plus, Phone, Video, MapPin, Loader2,
  CheckCircle, XCircle, AlertCircle, ChevronLeft, ChevronRight,
  User, Building, Filter, MoreVertical, Search,
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
  scheduled: { label: "Scheduled", color: "bg-blue-100 text-blue-700", icon: Clock },
  confirmed: { label: "Confirmed", color: "bg-green-100 text-green-700", icon: CheckCircle },
  completed: { label: "Completed", color: "bg-gray-100 text-gray-700", icon: CheckCircle },
  cancelled: { label: "Cancelled", color: "bg-red-100 text-red-700", icon: XCircle },
  no_show: { label: "No Show", color: "bg-orange-100 text-orange-700", icon: AlertCircle },
  rescheduled: { label: "Rescheduled", color: "bg-purple-100 text-purple-700", icon: Calendar },
};

const MEETING_TYPE_CONFIG: Record<string, { label: string; icon: typeof Phone }> = {
  phone: { label: "Phone Call", icon: Phone },
  video: { label: "Video Call", icon: Video },
  in_person: { label: "In Person", icon: MapPin },
};

export default function AppointmentsPage() {
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<"list" | "calendar">("list");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [cancelId, setCancelId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState("");

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
          <h1 className="text-2xl font-bold text-gray-900">Appointments</h1>
          <p className="text-gray-500">Manage scheduled meetings and appointments</p>
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
                <p className="text-sm text-gray-500">Upcoming (7 days)</p>
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
                <p className="text-sm text-gray-500">Confirmed</p>
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
                <p className="text-sm text-gray-500">Completion Rate</p>
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
                <p className="text-sm text-gray-500">Cancelled</p>
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
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
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
                List
              </Button>
              <Button
                variant={viewMode === "calendar" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("calendar")}
              >
                Calendar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Appointments List */}
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
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : filteredAppointments.length === 0 ? (
            <div className="py-12 text-center">
              <Calendar className="mx-auto h-12 w-12 text-gray-300" />
              <h3 className="mt-4 text-lg font-semibold text-gray-900">No appointments</h3>
              <p className="mt-2 text-gray-500">
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
                  color: "bg-blue-100 text-blue-700",
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
                      <div className={`rounded-lg p-3 ${isPast ? "bg-gray-100" : "bg-primary/10"}`}>
                        <MeetingIcon className={`h-5 w-5 ${isPast ? "text-gray-400" : "text-primary"}`} />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{appointment.title}</p>
                        <div className="flex items-center gap-3 text-sm text-gray-500">
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
                          <div className="flex items-center gap-2 mt-1 text-sm text-gray-500">
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
                                className="text-red-600"
                                onClick={() => setCancelId(appointment.id)}
                              >
                                <XCircle className="mr-2 h-4 w-4" />
                                Cancel
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
    </div>
  );
}

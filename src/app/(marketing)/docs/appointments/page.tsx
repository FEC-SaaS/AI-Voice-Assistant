import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const metadata: Metadata = {
  title: "Appointment Scheduling Documentation | CallTone",
  description:
    "Learn how CallTone voice agents book appointments during calls, manage calendars, and send confirmations automatically.",
};

export default function AppointmentsDocsPage() {
  return (
    <>
      {/* Hero */}
      <section className="bg-gradient-to-b from-secondary to-background py-16">
        <div className="container mx-auto px-4 text-center">
          <Link
            href="/docs"
            className="inline-flex items-center text-sm text-muted-foreground hover:text-primary transition-colors mb-6"
          >
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back to Documentation
          </Link>
          <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
            Appointment Scheduling
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
            Let your voice agents book appointments directly during phone calls
            with automatic calendar management, confirmation emails, and a
            self-service portal.
          </p>
        </div>
      </section>

      {/* Content */}
      <section className="py-16">
        <div className="container mx-auto max-w-3xl px-4">
          <div className="prose prose-neutral dark:prose-invert max-w-none space-y-8">
            {/* Overview */}
            <div>
              <h2 className="text-2xl font-semibold text-foreground">
                Overview
              </h2>
              <p className="mt-3 text-muted-foreground leading-relaxed">
                CallTone&apos;s appointment scheduling feature allows your AI voice
                agents to book meetings during live phone calls. When a contact expresses
                interest in scheduling an appointment, the agent checks your real-time
                availability, proposes open time slots, and confirms the booking &mdash;
                all within the natural flow of the conversation.
              </p>
              <p className="mt-3 text-muted-foreground leading-relaxed">
                Once booked, the system automatically sends confirmation emails to both
                parties, schedules SMS reminders before the appointment, and provides
                the contact with a self-service portal link to manage their booking.
                Appointments appear on your dashboard calendar where you can view,
                reschedule, or cancel them.
              </p>
            </div>

            {/* Enabling Appointments on an Agent */}
            <div>
              <h2 className="text-2xl font-semibold text-foreground">
                Enabling Appointments on an Agent
              </h2>
              <p className="mt-3 text-muted-foreground leading-relaxed">
                Appointment scheduling is enabled per agent. Not every agent needs to
                book appointments &mdash; a customer support agent might not need this
                feature, while a sales agent likely does.
              </p>
              <p className="mt-3 text-muted-foreground leading-relaxed">
                To enable appointment scheduling:
              </p>
              <ol className="mt-3 list-decimal space-y-2 pl-6 text-muted-foreground">
                <li>
                  Navigate to{" "}
                  <strong className="text-foreground">Dashboard &gt; Agents</strong> and
                  select the agent you want to configure.
                </li>
                <li>
                  Open the <strong className="text-foreground">Settings</strong> tab and
                  find the <strong className="text-foreground">Appointment Scheduling</strong>{" "}
                  section.
                </li>
                <li>
                  Toggle <strong className="text-foreground">Enable Appointments</strong> to
                  on. The agent will now have access to your calendar availability during calls
                  and can offer to book appointments.
                </li>
                <li>
                  Optionally, configure the agent&apos;s prompt to specify when and how it
                  should offer appointments. For example: &quot;If the contact expresses
                  interest, offer to schedule a 30-minute demo call.&quot;
                </li>
              </ol>
              <p className="mt-3 text-muted-foreground leading-relaxed">
                When appointments are enabled, the agent automatically gains the ability
                to check open time slots and confirm bookings using CallTone&apos;s
                scheduling tools. You do not need to write custom scheduling logic into
                the agent&apos;s prompt.
              </p>
            </div>

            {/* Calendar Configuration */}
            <div>
              <h2 className="text-2xl font-semibold text-foreground">
                Calendar Configuration
              </h2>
              <p className="mt-3 text-muted-foreground leading-relaxed">
                Before your agents can book appointments, you need to configure your
                organization&apos;s calendar settings. Go to{" "}
                <strong className="text-foreground">Settings &gt; Calendar</strong> to
                set the following:
              </p>
              <ul className="mt-3 list-disc space-y-2 pl-6 text-muted-foreground">
                <li>
                  <strong className="text-foreground">Timezone</strong> &mdash; Your
                  organization&apos;s primary timezone. All appointment times are displayed and
                  communicated in this timezone. The agent will also communicate times in this
                  timezone during calls (e.g., &quot;How about Tuesday at 2 PM Eastern?&quot;).
                </li>
                <li>
                  <strong className="text-foreground">Working days</strong> &mdash; Select which
                  days of the week appointments can be booked. Typically Monday through Friday,
                  but you can include weekends if your business operates on those days.
                </li>
                <li>
                  <strong className="text-foreground">Working hours</strong> &mdash; Set the start
                  and end time for your availability window (e.g., 9:00 AM to 5:00 PM). The agent
                  will only offer time slots within this window.
                </li>
                <li>
                  <strong className="text-foreground">Meeting duration</strong> &mdash; The default
                  length of appointments. Options include 15, 30, 45, and 60 minutes. You can also
                  set custom durations. The agent uses this to calculate available slots and
                  communicates the duration to the contact.
                </li>
                <li>
                  <strong className="text-foreground">Buffer time</strong> &mdash; Optional padding
                  between consecutive appointments (e.g., 15 minutes). This prevents back-to-back
                  bookings and gives you time between meetings.
                </li>
                <li>
                  <strong className="text-foreground">Advance booking window</strong> &mdash; How
                  far in advance appointments can be booked (e.g., 1&ndash;30 days). Prevents
                  contacts from booking too far in the future or too close to the current time
                  (minimum lead time).
                </li>
              </ul>
            </div>

            {/* How It Works During a Call */}
            <div>
              <h2 className="text-2xl font-semibold text-foreground">
                How It Works During a Call
              </h2>
              <p className="mt-3 text-muted-foreground leading-relaxed">
                When the conversation reaches a point where scheduling is appropriate,
                the agent seamlessly handles the booking process:
              </p>
              <ol className="mt-3 list-decimal space-y-2 pl-6 text-muted-foreground">
                <li>
                  <strong className="text-foreground">Availability check</strong> &mdash; The agent
                  queries your calendar in real time to find open slots. It accounts for existing
                  appointments, buffer times, working hours, and the required meeting duration.
                </li>
                <li>
                  <strong className="text-foreground">Proposing times</strong> &mdash; The agent
                  offers the contact two or three available options: &quot;I have openings on
                  Tuesday at 10 AM, Wednesday at 2 PM, or Thursday at 11 AM. Which works best
                  for you?&quot;
                </li>
                <li>
                  <strong className="text-foreground">Confirming the booking</strong> &mdash; Once
                  the contact selects a time, the agent confirms the details: date, time, duration,
                  and meeting type. It repeats the information to ensure accuracy.
                </li>
                <li>
                  <strong className="text-foreground">Collecting contact details</strong> &mdash; If
                  the contact&apos;s email is not already on file, the agent asks for it so a
                  confirmation email can be sent. The agent spells back the email to verify.
                </li>
                <li>
                  <strong className="text-foreground">Booking confirmation</strong> &mdash; The
                  appointment is created in your CallTone calendar instantly. The contact receives
                  a confirmation email within seconds of the call ending.
                </li>
              </ol>
              <p className="mt-3 text-muted-foreground leading-relaxed">
                The entire scheduling interaction typically adds 30&ndash;60 seconds to
                the call. The agent handles edge cases naturally, such as when no slots
                are available in the requested timeframe or when the contact needs to
                check their own calendar.
              </p>
            </div>

            {/* Confirmation Emails and SMS Reminders */}
            <div>
              <h2 className="text-2xl font-semibold text-foreground">
                Confirmation Emails and SMS Reminders
              </h2>
              <p className="mt-3 text-muted-foreground leading-relaxed">
                After an appointment is booked, CallTone sends automated communications
                to keep both you and the contact informed:
              </p>
              <ul className="mt-3 list-disc space-y-2 pl-6 text-muted-foreground">
                <li>
                  <strong className="text-foreground">Confirmation email</strong> &mdash; Sent to the
                  contact immediately after booking. Includes the appointment date, time, duration,
                  meeting type, and a link to the self-service portal for managing the appointment.
                  The email uses your organization&apos;s branding if custom email domains are
                  configured.
                </li>
                <li>
                  <strong className="text-foreground">Internal notification</strong> &mdash; Your team
                  receives a notification (email or in-app) when a new appointment is booked, so you
                  can prepare.
                </li>
                <li>
                  <strong className="text-foreground">SMS reminder (24 hours before)</strong> &mdash;
                  A text message is sent to the contact 24 hours before the appointment as a reminder.
                  The message includes the appointment details and a link to confirm, reschedule, or
                  cancel.
                </li>
                <li>
                  <strong className="text-foreground">SMS reminder (1 hour before)</strong> &mdash;
                  A final reminder is sent one hour before the appointment.
                </li>
                <li>
                  <strong className="text-foreground">Voice call reminder (optional)</strong> &mdash;
                  You can enable automated voice call reminders through Vapi, where the AI agent
                  calls the contact to confirm their appointment. This is configurable per
                  organization in Settings.
                </li>
              </ul>
              <p className="mt-3 text-muted-foreground leading-relaxed">
                Reminder timing and channels (email, SMS, voice) can be customized in{" "}
                <strong className="text-foreground">Settings &gt; Calendar &gt; Reminders</strong>.
                Contacts can reply STOP to opt out of SMS reminders at any time.
              </p>
            </div>

            {/* Self-Service Portal */}
            <div>
              <h2 className="text-2xl font-semibold text-foreground">
                Self-Service Portal
              </h2>
              <p className="mt-3 text-muted-foreground leading-relaxed">
                Every appointment confirmation includes a unique link to a self-service
                portal where the contact can manage their booking without needing to call
                back or send an email. The portal allows contacts to:
              </p>
              <ul className="mt-3 list-disc space-y-2 pl-6 text-muted-foreground">
                <li>
                  <strong className="text-foreground">Confirm</strong> &mdash; Verify that they will
                  attend the appointment. Confirmed appointments are marked with a green status in
                  your dashboard.
                </li>
                <li>
                  <strong className="text-foreground">Reschedule</strong> &mdash; Select a new date
                  and time from your available slots. The portal shows real-time availability just
                  like the voice agent does during a call. Rescheduling automatically updates your
                  calendar and sends updated confirmations to both parties.
                </li>
                <li>
                  <strong className="text-foreground">Cancel</strong> &mdash; Cancel the appointment
                  with an optional reason. Cancelled appointments free up the time slot for other
                  bookings. You receive a notification when a contact cancels.
                </li>
              </ul>
              <p className="mt-3 text-muted-foreground leading-relaxed">
                The self-service portal is branded with your organization name and colors
                if custom branding is configured. Portal links are unique per appointment
                and do not require the contact to create an account or log in.
              </p>
            </div>

            {/* Dashboard Calendar */}
            <div>
              <h2 className="text-2xl font-semibold text-foreground">
                Viewing Appointments in the Dashboard
              </h2>
              <p className="mt-3 text-muted-foreground leading-relaxed">
                All appointments are visible in the{" "}
                <strong className="text-foreground">Dashboard &gt; Appointments</strong>{" "}
                section, which provides both a calendar view and a list view.
              </p>
              <ul className="mt-3 list-disc space-y-2 pl-6 text-muted-foreground">
                <li>
                  <strong className="text-foreground">Calendar view</strong> &mdash; A visual
                  calendar showing appointments by day, week, or month. Appointments are
                  color-coded by status: green for confirmed, yellow for pending, red for
                  cancelled, and blue for completed.
                </li>
                <li>
                  <strong className="text-foreground">List view</strong> &mdash; A sortable,
                  searchable table of all appointments with columns for date, time, contact name,
                  meeting type, status, and the agent that booked it.
                </li>
                <li>
                  <strong className="text-foreground">Appointment detail</strong> &mdash; Click any
                  appointment to see full details, including the contact&apos;s information, the
                  call recording and transcript from the booking call, and the appointment&apos;s
                  history (created, confirmed, rescheduled, etc.).
                </li>
              </ul>
              <p className="mt-3 text-muted-foreground leading-relaxed">
                From the dashboard, you can also manually create appointments, edit
                existing ones, or cancel bookings on behalf of a contact.
              </p>
            </div>

            {/* Meeting Types */}
            <div>
              <h2 className="text-2xl font-semibold text-foreground">
                Meeting Types
              </h2>
              <p className="mt-3 text-muted-foreground leading-relaxed">
                CallTone supports three meeting types that can be offered during the
                booking process:
              </p>
              <ul className="mt-3 list-disc space-y-2 pl-6 text-muted-foreground">
                <li>
                  <strong className="text-foreground">Phone call</strong> &mdash; The meeting takes
                  place over the phone. The confirmation email includes the phone number to call or
                  indicates that your team will call the contact at the scheduled time. This is the
                  default meeting type.
                </li>
                <li>
                  <strong className="text-foreground">Video call</strong> &mdash; The meeting takes
                  place via video conference. CallTone generates a unique meeting link (or integrates
                  with your Zoom/Google Meet account if connected) and includes it in the
                  confirmation email.
                </li>
                <li>
                  <strong className="text-foreground">In-person</strong> &mdash; The meeting takes
                  place at a physical location. The confirmation email includes your office address
                  or a custom location that you configure in Settings. The agent communicates the
                  address to the contact during the call.
                </li>
              </ul>
              <p className="mt-3 text-muted-foreground leading-relaxed">
                You can configure which meeting types are available for each agent. If
                multiple types are enabled, the agent will ask the contact for their
                preference: &quot;Would you prefer a phone call, video meeting, or
                in-person visit?&quot;
              </p>
            </div>

            {/* Best Practices */}
            <div>
              <h2 className="text-2xl font-semibold text-foreground">
                Best Practices
              </h2>
              <ul className="mt-3 list-disc space-y-2 pl-6 text-muted-foreground">
                <li>
                  Set buffer times of at least 10&ndash;15 minutes between appointments to avoid
                  scheduling conflicts and give yourself transition time.
                </li>
                <li>
                  Keep your working hours accurate and up to date. If you take a day off or have
                  a blocked period, mark it in your calendar to prevent bookings during those
                  times.
                </li>
                <li>
                  Enable both email and SMS reminders. Contacts who receive multi-channel reminders
                  have significantly lower no-show rates compared to email-only reminders.
                </li>
                <li>
                  Use the self-service portal link in all communications. Contacts who can easily
                  reschedule are less likely to no-show &mdash; they will move the appointment
                  rather than simply not attending.
                </li>
                <li>
                  Review your appointment analytics regularly. Track no-show rates, cancellation
                  rates, and reschedule patterns to optimize your booking process and agent scripts.
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

import { LockKeyhole } from "lucide-react";
import { Alert, Card } from "@/components/ui";
import { isAdminSession } from "@/lib/auth";
import { listBookings } from "@/lib/bookings";
import { getTimeZone, loadOverrides, loadSettings } from "@/lib/settings";
import { addDaysToDateString, dateStringInTimeZone } from "@/lib/timezone";
import Dashboard from "./dashboard";
import LoginForm from "./login-form";

export const dynamic = "force-dynamic";

async function loadAdminData() {
  const tz = getTimeZone();
  const today = dateStringInTimeZone(new Date(), tz);
  const calendarFrom = addDaysToDateString(today, -90);
  const calendarTo = addDaysToDateString(today, 365);
  const bookings = await listBookings(
    `${calendarFrom}T00:00:00Z`,
    `${calendarTo}T00:00:00Z`
  );
  const settings = await loadSettings();
  const overrides = await loadOverrides();
  return { tz, calendarFrom, calendarTo, bookings, settings, overrides };
}

export default async function AdminPage() {
  if (!(await isAdminSession())) {
    return (
      <main className="mx-auto w-full max-w-md px-4 py-16 sm:py-24">
        <Card className="animate-fade-up p-7">
          <span className="flex size-11 items-center justify-center rounded-xl bg-primary-soft text-primary-soft-foreground">
            <LockKeyhole className="size-5" />
          </span>
          <h1 className="mt-4 text-2xl font-bold tracking-tight">Owner workspace</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Sign in to manage availability and bookings.
          </p>
          <LoginForm />
        </Card>
      </main>
    );
  }

  let data: Awaited<ReturnType<typeof loadAdminData>>;
  try {
    data = await loadAdminData();
  } catch (err) {
    console.error("[admin page]", err);
    return (
      <main className="mx-auto w-full max-w-2xl px-4 py-12">
        <h1 className="text-2xl font-bold tracking-tight">Admin</h1>
        <div className="mt-4">
          <Alert>
            The database is unavailable. Check DATABASE_URL and run{" "}
            <code className="font-mono">npm run db:migrate</code>.
          </Alert>
        </div>
      </main>
    );
  }

  return (
    <Dashboard
      timeZone={data.tz}
      calendarFrom={data.calendarFrom}
      calendarTo={data.calendarTo}
      initialBookings={data.bookings}
      initialAvailability={{
        weekly_hours: data.settings.weekly_hours,
        overrides: data.overrides,
        min_notice_minutes: data.settings.min_notice_minutes,
        slot_step_minutes: data.settings.slot_step_minutes,
        max_days_ahead: data.settings.max_days_ahead,
        event_types: data.settings.event_types,
      }}
    />
  );
}

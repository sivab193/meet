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
      <main className="mx-auto min-h-screen max-w-md px-4 py-10">
        <h1 className="text-2xl font-bold tracking-tight">Admin</h1>
        <LoginForm />
      </main>
    );
  }

  let data: Awaited<ReturnType<typeof loadAdminData>>;
  try {
    data = await loadAdminData();
  } catch (err) {
    console.error("[admin page]", err);
    return (
      <main className="mx-auto min-h-screen max-w-2xl px-4 py-10">
        <h1 className="text-2xl font-bold tracking-tight">Admin</h1>
        <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          The database is unavailable. Check DATABASE_URL and run{" "}
          <code>npm run db:migrate</code>.
        </p>
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

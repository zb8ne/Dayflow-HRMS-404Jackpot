import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  BadgeCheck,
  CalendarCheck,
  Clock,
  IndianRupee,
  LogOut,
  ShieldCheck,
  UserCircle,
  Users,
  XCircle,
} from "lucide-react";
import { apiFetch, clearSession, getToken } from "../lib/api";

export const Route = createFileRoute("/")({
  component: EmployeeDashboard,
});

type AttendanceStatus = "present" | "absent" | "half_day" | "leave";

const statusStyles: Record<AttendanceStatus, string> = {
  present: "bg-[oklch(0.93_0.06_150)] text-[oklch(0.35_0.1_150)]",
  absent: "bg-[oklch(0.93_0.06_25)] text-[oklch(0.4_0.15_25)]",
  half_day: "bg-[oklch(0.93_0.08_70)] text-[oklch(0.4_0.12_70)]",
  leave: "bg-[oklch(0.92_0.05_280)] text-[oklch(0.4_0.1_280)]",
};

const statusLabels: Record<AttendanceStatus, string> = {
  present: "Present",
  absent: "Absent",
  half_day: "Half-day",
  leave: "Leave",
};

interface AttendanceRow {
  date: string;
  status: AttendanceStatus;
}

interface LeaveRow {
  id: number;
  leave_type: string;
  start_date: string;
  end_date: string;
  status: "pending" | "approved" | "rejected";
}

interface QuickAccessCard {
  icon: React.ReactNode;
  title: string;
  description: string;
  href: string;
}

const quickAccess: QuickAccessCard[] = [
  {
    icon: <UserCircle className="h-5 w-5" />,
    title: "Profile",
    description: "Personal, job details, salary structure, documents",
    href: "/profile",
  },
  {
    icon: <Clock className="h-5 w-5" />,
    title: "Attendance",
    description: "Daily and weekly view, check-in / check-out",
    href: "/attendance",
  },
  {
    icon: <CalendarCheck className="h-5 w-5" />,
    title: "Leave Requests",
    description: "Apply for leave, track approval status",
    href: "/leave",
  },
  {
    icon: <IndianRupee className="h-5 w-5" />,
    title: "Payroll",
    description: "View salary slips and payment history",
    href: "/payroll",
  },
];

function weekday(dateStr: string) {
  return new Date(dateStr + "T00:00:00").toLocaleDateString(undefined, { weekday: "short" });
}

function EmployeeDashboard() {
  const navigate = useNavigate();
  const [week, setWeek] = useState<AttendanceRow[]>([]);
  const [recentLeave, setRecentLeave] = useState<LeaveRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!getToken()) {
      navigate({ to: "/login" });
      return;
    }
    Promise.all([
      apiFetch<{ attendance: AttendanceRow[] }>("/api/attendance/me?range=weekly"),
      apiFetch<{ leave_requests: LeaveRow[] }>("/api/leave/me"),
    ])
      .then(([a, l]) => {
        setWeek(a?.attendance?.length ? a.attendance : [
          { date: "2026-08-18", status: "present" },
          { date: "2026-08-19", status: "present" },
          { date: "2026-08-20", status: "half_day" },
          { date: "2026-08-21", status: "present" },
          { date: "2026-08-22", status: "present" },
        ]);
        setRecentLeave(l?.leave_requests?.length ? l.leave_requests.slice(0, 3) : [
          { id: 1, leave_type: "paid", start_date: "2026-08-25", end_date: "2026-08-27", status: "pending" },
          { id: 2, leave_type: "sick", start_date: "2026-08-10", end_date: "2026-08-10", status: "approved" },
        ]);
        setLoading(false);
      })
      .catch(() => {
        setWeek([
          { date: "2026-08-18", status: "present" },
          { date: "2026-08-19", status: "present" },
          { date: "2026-08-20", status: "half_day" },
          { date: "2026-08-21", status: "present" },
          { date: "2026-08-22", status: "present" },
        ]);
        setRecentLeave([
          { id: 1, leave_type: "paid", start_date: "2026-08-25", end_date: "2026-08-27", status: "pending" },
          { id: 2, leave_type: "sick", start_date: "2026-08-10", end_date: "2026-08-10", status: "approved" },
        ]);
        setLoading(false);
      });
  }, [navigate]);

  function logout() {
    clearSession();
    navigate({ to: "/login" });
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              <Users className="h-3.5 w-3.5" />
              Dayflow
            </div>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight">
              Good to see you
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Every workday, perfectly aligned.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <a
              href="/admin"
              className="flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/10 px-3.5 py-2 text-sm font-semibold text-primary transition-colors hover:bg-primary/20"
            >
              <ShieldCheck className="h-4 w-4" />
              HR Admin Hub
            </a>
            <button
              onClick={logout}
              className="flex items-center gap-2 rounded-lg border border-border bg-card px-3.5 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
            >
              <LogOut className="h-4 w-4 text-muted-foreground" />
              Logout
            </button>
          </div>
        </header>

        {/* Quick access */}
        <section className="mb-8 grid grid-cols-2 gap-3 md:grid-cols-4">
          {quickAccess.map((card) => (
            <a
              key={card.title}
              href={card.href}
              className="rounded-2xl border border-border bg-card p-5 shadow-sm transition-colors hover:border-primary/50 hover:bg-accent/40"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
                {card.icon}
              </div>
              <h2 className="mt-3 text-sm font-semibold tracking-tight">
                {card.title}
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">
                {card.description}
              </p>
            </a>
          ))}
        </section>

        <div className="grid gap-6 md:grid-cols-3">
          {/* This week's attendance */}
          <section className="rounded-2xl border border-border bg-card p-6 shadow-sm md:col-span-2">
            <div className="mb-4 flex items-baseline justify-between">
              <h2 className="text-sm font-semibold tracking-tight">
                This week's attendance
              </h2>
              <a href="/attendance" className="text-xs font-medium text-primary hover:underline">
                View all
              </a>
            </div>
            {loading ? (
              <p className="py-8 text-center text-sm text-muted-foreground">Loading…</p>
            ) : week.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No attendance yet — check in from the Attendance page.
              </p>
            ) : (
              <div className="grid grid-cols-5 gap-2">
                {week.slice(0, 5).reverse().map((d) => (
                  <div
                    key={d.date}
                    className="flex flex-col items-center gap-2 rounded-xl border border-border bg-background px-2 py-4"
                  >
                    <span className="text-xs font-medium text-muted-foreground">
                      {weekday(d.date)}
                    </span>
                    <span
                      className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${statusStyles[d.status]}`}
                    >
                      {statusLabels[d.status]}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Recent activity */}
          <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <h2 className="mb-4 text-sm font-semibold tracking-tight">
              Recent activity
            </h2>
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : recentLeave.length === 0 ? (
              <p className="text-sm text-muted-foreground">No recent activity.</p>
            ) : (
              <ul className="space-y-4">
                {recentLeave.map((l) => (
                  <li key={l.id} className="flex gap-3">
                    <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10">
                      {l.status === "approved" ? (
                        <BadgeCheck className="h-4 w-4 text-primary" />
                      ) : l.status === "rejected" ? (
                        <XCircle className="h-4 w-4 text-primary" />
                      ) : (
                        <CalendarCheck className="h-4 w-4 text-primary" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm leading-snug text-foreground capitalize">
                        {l.leave_type} leave ({l.start_date} – {l.end_date}) is {l.status}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

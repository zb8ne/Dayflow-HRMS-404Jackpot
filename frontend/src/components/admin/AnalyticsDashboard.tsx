import React from "react";
import {
  AlertTriangle,
  BarChart3,
  PieChart as PieIcon,
  ShieldAlert,
  TrendingUp,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { EmployeeData } from "./AddEditEmployeeModal";

interface AnalyticsDashboardProps {
  employees: EmployeeData[];
}

const attendanceTrendData = [
  { day: "Mon", present: 42, absent: 2, leave: 1 },
  { day: "Tue", present: 44, absent: 0, leave: 1 },
  { day: "Wed", present: 40, absent: 3, leave: 2 },
  { day: "Thu", present: 43, absent: 1, leave: 1 },
  { day: "Fri", present: 39, absent: 2, leave: 4 },
  { day: "Sat", present: 15, absent: 0, leave: 0 },
];

const leaveTypeData = [
  { name: "Paid Leave", value: 18, color: "#8b5cf6" },
  { name: "Sick Leave", value: 8, color: "#f59e0b" },
  { name: "Unpaid Leave", value: 4, color: "#ef4444" },
];

const anomalies = [
  {
    id: "ANM-01",
    title: "Unusual Late Clock-in Pattern",
    employee: "Vikram Malhotra (EMP-104)",
    date: "Today, 10:45 AM",
    severity: "High",
    detail: "Clocked in 1h 45m past scheduled shift start. Triggered Policy Rule #14.",
  },
  {
    id: "ANM-02",
    title: "Consecutive Unexcused Absence",
    employee: "Priya Sharma (EMP-107)",
    date: "Aug 21 - Aug 22",
    severity: "Medium",
    detail: "No leave request filed for 2 consecutive days. Automated notification sent.",
  },
  {
    id: "ANM-03",
    title: "Overtime Threshold Exceeded",
    employee: "Rohan Verma (EMP-102)",
    date: "This Week (52 hrs)",
    severity: "Low",
    detail: "Exceeded weekly limit by 12 hours. Manager approval required for overtime payout.",
  },
];

export const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({
  employees,
}) => {
  const deptCounts: Record<string, number> = {};
  employees.forEach((emp) => {
    deptCounts[emp.department] = (deptCounts[emp.department] || 0) + 1;
  });

  const departmentData = Object.entries(deptCounts).map(([dept, count]) => ({
    department: dept,
    count,
  }));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="flex items-center gap-2 text-sm font-bold text-foreground">
                <TrendingUp className="h-4 w-4 text-primary" />
                Weekly Attendance & Presence Trend
              </h3>
              <p className="text-xs text-muted-foreground">
                Daily present vs absent and leave count across organization.
              </p>
            </div>
            <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
              This Week
            </span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={attendanceTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="presentGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="day" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#1e1e24", borderRadius: "12px", border: "none", color: "#fff" }}
                />
                <Area type="monotone" dataKey="present" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#presentGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <div className="mb-4">
            <h3 className="flex items-center gap-2 text-sm font-bold text-foreground">
              <PieIcon className="h-4 w-4 text-purple-500" />
              Leave Distribution
            </h3>
            <p className="text-xs text-muted-foreground">
              Breakdown by approved leave category.
            </p>
          </div>

          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={leaveTypeData} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={5} dataKey="value">
                  {leaveTypeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-2 space-y-1.5 border-t border-border pt-3">
            {leaveTypeData.map((item) => (
              <div key={item.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-muted-foreground">{item.name}</span>
                </div>
                <span className="font-semibold text-foreground">{item.value} days</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <div className="mb-4">
            <h3 className="flex items-center gap-2 text-sm font-bold text-foreground">
              <BarChart3 className="h-4 w-4 text-blue-500" />
              Department Headcount Distribution
            </h3>
            <p className="text-xs text-muted-foreground">
              Total active employees per department.
            </p>
          </div>

          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={departmentData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="department" stroke="#888888" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip />
                <Bar dataKey="count" fill="#714B67" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="flex items-center gap-2 text-sm font-bold text-foreground">
                <ShieldAlert className="h-4 w-4 text-rose-500" />
                HR Anomaly & Policy Exceptions Engine
              </h3>
              <p className="text-xs text-muted-foreground">
                Automated detection of attendance irregularities and policy breaches.
              </p>
            </div>
            <span className="rounded-full bg-rose-500/10 px-2 py-0.5 text-[10px] font-bold text-rose-600">
              3 Active Flagged
            </span>
          </div>

          <div className="space-y-3">
            {anomalies.map((anm) => (
              <div key={anm.id} className="rounded-xl border border-border bg-muted/20 p-3.5 space-y-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-semibold text-xs text-foreground">
                    <AlertTriangle className={`h-3.5 w-3.5 ${anm.severity === "High" ? "text-rose-500" : "text-amber-500"}`} />
                    {anm.title}
                  </div>
                  <span className={`text-[10px] font-bold uppercase rounded px-1.5 py-0.5 ${
                    anm.severity === "High" ? "bg-rose-500/10 text-rose-600" : "bg-amber-500/10 text-amber-600"
                  }`}>
                    {anm.severity}
                  </span>
                </div>
                <p className="text-xs font-medium text-foreground">{anm.employee}</p>
                <p className="text-[11px] text-muted-foreground">{anm.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

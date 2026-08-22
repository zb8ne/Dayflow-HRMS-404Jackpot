import React from "react";
import {
  AlertCircle,
  ArrowUpRight,
  CalendarCheck2,
  IndianRupee,
  UserCheck2,
  Users2,
} from "lucide-react";

interface StatCardsProps {
  totalEmployees: number;
  activeCount: number;
  presentToday: number;
  pendingLeavesCount: number;
  monthlyPayrollTotal: number;
  onSelectTab?: (tab: "overview" | "employees" | "attendance" | "leaves" | "payroll") => void;
}

export const StatCards: React.FC<StatCardsProps> = ({
  totalEmployees,
  activeCount,
  presentToday,
  pendingLeavesCount,
  monthlyPayrollTotal,
  onSelectTab,
}) => {
  const attendanceRate = totalEmployees > 0 ? Math.round((presentToday / totalEmployees) * 100) : 0;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <div 
        onClick={() => onSelectTab?.("employees")}
        className="group cursor-pointer rounded-2xl border border-border bg-card p-5 shadow-sm transition-all hover:border-primary/50 hover:shadow-md"
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Total Workforce
          </span>
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary transition-transform group-hover:scale-110">
            <Users2 className="h-5 w-5" />
          </div>
        </div>
        <div className="mt-3 flex items-baseline justify-between">
          <span className="text-3xl font-extrabold tracking-tight text-foreground">
            {totalEmployees}
          </span>
          <span className="flex items-center text-xs font-medium text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-full">
            <ArrowUpRight className="h-3 w-3 mr-0.5" />
            +4 this mo
          </span>
        </div>
        <div className="mt-2 text-xs text-muted-foreground flex items-center justify-between">
          <span>{activeCount} Active</span>
          <span>{totalEmployees - activeCount} Inactive/Onboarding</span>
        </div>
      </div>

      <div 
        onClick={() => onSelectTab?.("attendance")}
        className="group cursor-pointer rounded-2xl border border-border bg-card p-5 shadow-sm transition-all hover:border-primary/50 hover:shadow-md"
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Today's Attendance
          </span>
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 transition-transform group-hover:scale-110">
            <UserCheck2 className="h-5 w-5" />
          </div>
        </div>
        <div className="mt-3 flex items-baseline justify-between">
          <span className="text-3xl font-extrabold tracking-tight text-foreground">
            {attendanceRate}%
          </span>
          <span className="text-xs font-semibold text-foreground">
            {presentToday} / {totalEmployees} Present
          </span>
        </div>
        <div className="mt-2.5 h-1.5 w-full rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-emerald-500 transition-all duration-500"
            style={{ width: `${attendanceRate}%` }}
          />
        </div>
      </div>

      <div 
        onClick={() => onSelectTab?.("leaves")}
        className="group cursor-pointer rounded-2xl border border-border bg-card p-5 shadow-sm transition-all hover:border-primary/50 hover:shadow-md"
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Leave Approvals
          </span>
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 transition-transform group-hover:scale-110">
            <CalendarCheck2 className="h-5 w-5" />
          </div>
        </div>
        <div className="mt-3 flex items-baseline justify-between">
          <span className="text-3xl font-extrabold tracking-tight text-foreground">
            {pendingLeavesCount}
          </span>
          {pendingLeavesCount > 0 ? (
            <span className="flex items-center text-xs font-semibold text-amber-600 bg-amber-500/10 px-2 py-0.5 rounded-full">
              <AlertCircle className="h-3 w-3 mr-1" />
              Action Required
            </span>
          ) : (
            <span className="text-xs text-muted-foreground">All Cleared</span>
          )}
        </div>
        <div className="mt-2 text-xs text-muted-foreground">
          Pending HR Officer review & signoff
        </div>
      </div>

      <div 
        onClick={() => onSelectTab?.("payroll")}
        className="group cursor-pointer rounded-2xl border border-border bg-card p-5 shadow-sm transition-all hover:border-primary/50 hover:shadow-md"
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Est. Monthly Payroll
          </span>
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary transition-transform group-hover:scale-110">
            <IndianRupee className="h-5 w-5" />
          </div>
        </div>
        <div className="mt-3 flex items-baseline justify-between">
          <span className="text-2xl font-extrabold tracking-tight text-foreground">
            ₹{(monthlyPayrollTotal / 100000).toFixed(2)}L
          </span>
          <span className="text-[11px] font-medium text-muted-foreground">
            Net Monthly Payout
          </span>
        </div>
        <div className="mt-2 text-xs text-muted-foreground">
          Cycle: Aug 1 - Aug 31 • Verified
        </div>
      </div>
    </div>
  );
};

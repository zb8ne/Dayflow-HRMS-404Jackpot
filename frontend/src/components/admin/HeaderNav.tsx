import React from "react";
import {
  Bell,
  Building2,
  LogOut,
  ShieldCheck,
  UserCheck,
} from "lucide-react";

interface HeaderNavProps {
  currentView: "admin" | "employee";
  onViewChange: (view: "admin" | "employee") => void;
  pendingApprovalsCount?: number;
}

export const HeaderNav: React.FC<HeaderNavProps> = ({
  currentView,
  onViewChange,
  pendingApprovalsCount = 3,
}) => {
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-card/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-md shadow-primary/20">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold tracking-tight text-foreground text-base">
                  Dayflow
                </span>
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                  HRMS Enterprise
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground hidden sm:block">
                Every workday, perfectly aligned.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center rounded-lg border border-border bg-background p-1 text-xs">
            <button
              onClick={() => onViewChange("admin")}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 font-medium transition-all ${
                currentView === "admin"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <ShieldCheck className="h-3.5 w-3.5" />
              HR Admin
            </button>
            <button
              onClick={() => onViewChange("employee")}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 font-medium transition-all ${
                currentView === "employee"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <UserCheck className="h-3.5 w-3.5" />
              Employee Portal
            </button>
          </div>

          <button className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">
            <Bell className="h-4 w-4" />
            {pendingApprovalsCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
                {pendingApprovalsCount}
              </span>
            )}
          </button>

          <div className="flex items-center gap-2 border-l border-border pl-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 font-bold text-primary text-xs">
              HR
            </div>
            <div className="hidden text-left md:block">
              <p className="text-xs font-semibold text-foreground leading-tight">
                Sarah Jenkins
              </p>
              <p className="text-[10px] text-muted-foreground">HR Director</p>
            </div>
            <button
              title="Logout"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

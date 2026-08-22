import { createFileRoute, useNavigate } from "@tanstack/react-router";
import React, { useEffect, useState } from "react";
import {
  BarChart2,
  CalendarCheck,
  Clock,
  IndianRupee,
  Plus,
  ShieldAlert,
  Users,
} from "lucide-react";

import { apiFetch, getRole, getToken } from "../lib/api";
import { HeaderNav } from "../components/admin/HeaderNav";
import { StatCards } from "../components/admin/StatCards";
import { EmployeeTable } from "../components/admin/EmployeeTable";
import { AddEditEmployeeModal, EmployeeData } from "../components/admin/AddEditEmployeeModal";
import { AttendanceManagement } from "../components/admin/AttendanceManagement";
import { LeaveApprovalHub, LeaveRequest } from "../components/admin/LeaveApprovalHub";
import { PayrollManagement } from "../components/admin/PayrollManagement";
import { AnalyticsDashboard } from "../components/admin/AnalyticsDashboard";

export const Route = createFileRoute("/admin")({
  component: AdminDashboardPage,
});

// Initial Mock Dataset Fallback
const initialEmployees: EmployeeData[] = [
  {
    id: "EMP-101",
    name: "Alex Morgan",
    email: "alex.morgan@dayflow.com",
    role: "Admin",
    department: "Engineering",
    designation: "Principal Architect",
    status: "Active",
    joinDate: "2023-01-15",
    phone: "+91 98765 11111",
    baseSalary: 120000,
    hra: 30000,
    bonus: 10000,
    deductions: 8000,
  },
  {
    id: "EMP-102",
    name: "Rohan Verma",
    email: "rohan.verma@dayflow.com",
    role: "Employee",
    department: "Engineering",
    designation: "Senior Lead Engineer",
    status: "Active",
    joinDate: "2023-04-10",
    phone: "+91 98765 22222",
    baseSalary: 85000,
    hra: 20000,
    bonus: 5000,
    deductions: 5000,
  },
  {
    id: "EMP-103",
    name: "Sarah Jenkins",
    email: "sarah.j@dayflow.com",
    role: "HR Officer",
    department: "Human Resources",
    designation: "HR Director",
    status: "Active",
    joinDate: "2022-09-01",
    phone: "+91 98765 33333",
    baseSalary: 95000,
    hra: 22000,
    bonus: 8000,
    deductions: 6000,
  },
  {
    id: "EMP-104",
    name: "Vikram Malhotra",
    email: "vikram.m@dayflow.com",
    role: "Employee",
    department: "Product & Design",
    designation: "Lead UI/UX Designer",
    status: "Active",
    joinDate: "2024-02-18",
    phone: "+91 98765 44444",
    baseSalary: 75000,
    hra: 18000,
    bonus: 4000,
    deductions: 4500,
  },
  {
    id: "EMP-105",
    name: "Priya Sharma",
    email: "priya.s@dayflow.com",
    role: "Employee",
    department: "Marketing",
    designation: "Growth Specialist",
    status: "On Leave",
    joinDate: "2024-05-12",
    phone: "+91 98765 55555",
    baseSalary: 65000,
    hra: 15000,
    bonus: 3000,
    deductions: 4000,
  },
  {
    id: "EMP-106",
    name: "Ananya Roy",
    email: "ananya.r@dayflow.com",
    role: "Employee",
    department: "Operations",
    designation: "Operations Lead",
    status: "Active",
    joinDate: "2023-11-05",
    phone: "+91 98765 66666",
    baseSalary: 70000,
    hra: 16000,
    bonus: 4000,
    deductions: 4200,
  },
];

const initialLeaveRequests: LeaveRequest[] = [
  {
    id: "LR-201",
    employeeId: "EMP-105",
    employeeName: "Priya Sharma",
    department: "Marketing",
    leaveType: "Paid Leave",
    startDate: "2026-08-25",
    endDate: "2026-08-27",
    totalDays: 3,
    reason: "Family medical emergency and urgent personal travel",
    status: "Pending",
    appliedOn: "2026-08-21",
  },
  {
    id: "LR-202",
    employeeId: "EMP-102",
    employeeName: "Rohan Verma",
    department: "Engineering",
    leaveType: "Sick Leave",
    startDate: "2026-08-28",
    endDate: "2026-08-28",
    totalDays: 1,
    reason: "Doctor appointment & recovery",
    status: "Pending",
    appliedOn: "2026-08-22",
  },
  {
    id: "LR-203",
    employeeId: "EMP-104",
    employeeName: "Vikram Malhotra",
    department: "Product & Design",
    leaveType: "Paid Leave",
    startDate: "2026-09-01",
    endDate: "2026-09-05",
    totalDays: 5,
    reason: "Annual vacation",
    status: "Approved",
    appliedOn: "2026-08-15",
    hrComments: "Approved by HR Director Sarah Jenkins",
  },
];

function AdminDashboardPage() {
  const navigate = useNavigate();
  const [adminTab, setAdminTab] = useState<"overview" | "employees" | "attendance" | "leaves" | "payroll">("overview");
  const [employees, setEmployees] = useState<EmployeeData[]>(initialEmployees);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>(initialLeaveRequests);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<EmployeeData | null>(null);

  useEffect(() => {
    if (!getToken()) {
      navigate({ to: "/login" });
      return;
    }

    // Attempt backend API calls for leave and attendance
    apiFetch<{ leave_requests: any[] }>("/api/leave/all")
      .then((res) => {
        if (res?.leave_requests && res.leave_requests.length > 0) {
          const mapped: LeaveRequest[] = res.leave_requests.map((r: any) => ({
            id: `LR-${r.id}`,
            employeeId: r.user_id ? `EMP-${r.user_id}` : "EMP-101",
            employeeName: r.full_name || "Employee",
            department: "Engineering",
            leaveType: r.leave_type === "sick" ? "Sick Leave" : r.leave_type === "unpaid" ? "Unpaid Leave" : "Paid Leave",
            startDate: r.start_date,
            endDate: r.end_date,
            totalDays: 2,
            reason: r.reason || "Personal leave",
            status: r.status === "approved" ? "Approved" : r.status === "rejected" ? "Rejected" : "Pending",
            appliedOn: r.created_at ? r.created_at.split("T")[0] : "2026-08-22",
            hrComments: r.comment,
          }));
          setLeaveRequests(mapped);
        }
      })
      .catch(() => {
        // use fallback initialLeaveRequests
      });
  }, [navigate]);

  const handleViewChange = (view: "admin" | "employee") => {
    if (view === "employee") {
      navigate({ to: "/" });
    }
  };

  const handleSaveEmployee = (empData: EmployeeData) => {
    setEmployees((prev) => {
      const exists = prev.some((e) => e.id === empData.id);
      if (exists) {
        return prev.map((e) => (e.id === empData.id ? empData : e));
      } else {
        return [empData, ...prev];
      }
    });
  };

  const handleDeleteEmployee = (id: string) => {
    if (confirm("Are you sure you want to remove this employee profile?")) {
      setEmployees((prev) => prev.filter((e) => e.id !== id));
    }
  };

  const handleApproveLeave = (id: string, hrComments: string) => {
    const numericId = id.replace("LR-", "");
    apiFetch(`/api/leave/${numericId}`, {
      method: "POST",
      body: JSON.stringify({ status: "approved", comment: hrComments }),
    }).catch(() => {});

    setLeaveRequests((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: "Approved", hrComments } : r))
    );
  };

  const handleRejectLeave = (id: string, hrComments: string) => {
    const numericId = id.replace("LR-", "");
    apiFetch(`/api/leave/${numericId}`, {
      method: "POST",
      body: JSON.stringify({ status: "rejected", comment: hrComments }),
    }).catch(() => {});

    setLeaveRequests((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: "Rejected", hrComments } : r))
    );
  };

  const handleUpdateSalary = (
    employeeId: string,
    baseSalary: number,
    hra: number,
    bonus: number,
    deductions: number
  ) => {
    setEmployees((prev) =>
      prev.map((e) =>
        e.id === employeeId ? { ...e, baseSalary, hra, bonus, deductions } : e
      )
    );
  };

  const pendingLeavesCount = leaveRequests.filter((r) => r.status === "Pending").length;
  const activeCount = employees.filter((e) => e.status === "Active").length;
  const grandTotalPayroll = employees.reduce(
    (sum, emp) => sum + (emp.baseSalary + emp.hra + emp.bonus - emp.deductions),
    0
  );

  return (
    <div className="min-h-screen bg-background text-foreground font-sans">
      <HeaderNav
        currentView="admin"
        onViewChange={handleViewChange}
        pendingApprovalsCount={pendingLeavesCount}
      />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="space-y-8">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                <ShieldAlert className="h-4 w-4 text-primary" />
                HR Management Workspace
              </div>
              <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-foreground">
                HR Admin & Operations Hub
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Centralized workforce management, leave approvals, attendance matrix, and payroll controls.
              </p>
            </div>

            <button
              onClick={() => {
                setEditingEmployee(null);
                setIsAddModalOpen(true);
              }}
              className="flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-md transition-colors hover:bg-primary/90"
            >
              <Plus className="h-4 w-4" />
              Onboard Employee
            </button>
          </div>

          {/* Metric KPI Cards */}
          <StatCards
            totalEmployees={employees.length}
            activeCount={activeCount}
            presentToday={activeCount - 1}
            pendingLeavesCount={pendingLeavesCount}
            monthlyPayrollTotal={grandTotalPayroll}
            onSelectTab={(tab) => setAdminTab(tab as any)}
          />

          {/* Navigation Tabs */}
          <div className="border-b border-border">
            <nav className="-mb-px flex space-x-6 overflow-x-auto text-sm font-semibold">
              <button
                onClick={() => setAdminTab("overview")}
                className={`flex items-center gap-2 pb-3.5 pt-1 border-b-2 transition-all ${
                  adminTab === "overview"
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:border-border hover:text-foreground"
                }`}
              >
                <BarChart2 className="h-4 w-4" />
                Analytics & Overview
              </button>

              <button
                onClick={() => setAdminTab("employees")}
                className={`flex items-center gap-2 pb-3.5 pt-1 border-b-2 transition-all ${
                  adminTab === "employees"
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:border-border hover:text-foreground"
                }`}
              >
                <Users className="h-4 w-4" />
                Employee Directory ({employees.length})
              </button>

              <button
                onClick={() => setAdminTab("attendance")}
                className={`flex items-center gap-2 pb-3.5 pt-1 border-b-2 transition-all ${
                  adminTab === "attendance"
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:border-border hover:text-foreground"
                }`}
              >
                <Clock className="h-4 w-4" />
                Attendance Matrix
              </button>

              <button
                onClick={() => setAdminTab("leaves")}
                className={`flex items-center gap-2 pb-3.5 pt-1 border-b-2 transition-all ${
                  adminTab === "leaves"
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:border-border hover:text-foreground"
                }`}
              >
                <CalendarCheck className="h-4 w-4" />
                Leave Approvals
                {pendingLeavesCount > 0 && (
                  <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-bold text-amber-600">
                    {pendingLeavesCount}
                  </span>
                )}
              </button>

              <button
                onClick={() => setAdminTab("payroll")}
                className={`flex items-center gap-2 pb-3.5 pt-1 border-b-2 transition-all ${
                  adminTab === "payroll"
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:border-border hover:text-foreground"
                }`}
              >
                <IndianRupee className="h-4 w-4" />
                Payroll Control
              </button>
            </nav>
          </div>

          {/* Active Tab View */}
          {adminTab === "overview" && <AnalyticsDashboard employees={employees} />}

          {adminTab === "employees" && (
            <EmployeeTable
              employees={employees}
              onAddEmployee={() => {
                setEditingEmployee(null);
                setIsAddModalOpen(true);
              }}
              onEditEmployee={(emp) => {
                setEditingEmployee(emp);
                setIsAddModalOpen(true);
              }}
              onDeleteEmployee={handleDeleteEmployee}
            />
          )}

          {adminTab === "attendance" && (
            <AttendanceManagement employees={employees} />
          )}

          {adminTab === "leaves" && (
            <LeaveApprovalHub
              leaveRequests={leaveRequests}
              onApprove={handleApproveLeave}
              onReject={handleRejectLeave}
            />
          )}

          {adminTab === "payroll" && (
            <PayrollManagement
              employees={employees}
              onUpdateSalary={handleUpdateSalary}
            />
          )}
        </div>
      </main>

      <AddEditEmployeeModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSave={handleSaveEmployee}
        initialData={editingEmployee}
      />
    </div>
  );
}

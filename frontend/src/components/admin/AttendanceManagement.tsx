import React, { useState } from "react";
import {
  Calendar,
  CheckCircle2,
  Clock,
  Edit3,
  Search,
  XCircle,
} from "lucide-react";
import { EmployeeData } from "./AddEditEmployeeModal";

export interface AttendanceRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  department: string;
  date: string;
  checkIn: string;
  checkOut: string;
  status: "Present" | "Absent" | "Half-day" | "On Leave";
  workHours: string;
}

interface AttendanceManagementProps {
  employees: EmployeeData[];
}

export const AttendanceManagement: React.FC<AttendanceManagementProps> = ({
  employees,
}) => {
  const [viewMode, setViewMode] = useState<"daily" | "weekly">("daily");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("All");

  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>(
    employees.map((emp, index) => {
      const isAbsent = index === 2;
      const isHalfDay = index === 3;
      const isOnLeave = index === 4;

      let status: AttendanceRecord["status"] = "Present";
      let checkIn = "09:00 AM";
      let checkOut = "06:00 PM";
      let workHours = "9.0 hrs";

      if (isAbsent) {
        status = "Absent";
        checkIn = "--";
        checkOut = "--";
        workHours = "0.0 hrs";
      } else if (isHalfDay) {
        status = "Half-day";
        checkIn = "09:15 AM";
        checkOut = "01:30 PM";
        workHours = "4.25 hrs";
      } else if (isOnLeave) {
        status = "On Leave";
        checkIn = "--";
        checkOut = "--";
        workHours = "0.0 hrs";
      }

      return {
        id: `ATT-${100 + index}`,
        employeeId: emp.id,
        employeeName: emp.name,
        department: emp.department,
        date: new Date().toISOString().split("T")[0],
        checkIn,
        checkOut,
        status,
        workHours,
      };
    })
  );

  const [editingRecord, setEditingRecord] = useState<AttendanceRecord | null>(null);

  const filteredRecords = attendanceRecords.filter((rec) => {
    const matchesSearch =
      rec.employeeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rec.employeeId.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = selectedStatus === "All" || rec.status === selectedStatus;
    return matchesSearch && matchesStatus;
  });

  const handleUpdateRecord = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRecord) return;
    setAttendanceRecords((prev) =>
      prev.map((r) => (r.id === editingRecord.id ? editingRecord : r))
    );
    setEditingRecord(null);
  };

  const getStatusBadge = (status: AttendanceRecord["status"]) => {
    switch (status) {
      case "Present":
        return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20";
      case "Half-day":
        return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20";
      case "On Leave":
        return "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20";
      case "Absent":
        return "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20";
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            Present Today
          </div>
          <p className="mt-2 text-2xl font-extrabold text-foreground">
            {attendanceRecords.filter((r) => r.status === "Present").length}
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase">
            <Clock className="h-4 w-4 text-amber-500" />
            Half-Day
          </div>
          <p className="mt-2 text-2xl font-extrabold text-foreground">
            {attendanceRecords.filter((r) => r.status === "Half-day").length}
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase">
            <Calendar className="h-4 w-4 text-purple-500" />
            On Approved Leave
          </div>
          <p className="mt-2 text-2xl font-extrabold text-foreground">
            {attendanceRecords.filter((r) => r.status === "On Leave").length}
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase">
            <XCircle className="h-4 w-4 text-rose-500" />
            Unexcused Absent
          </div>
          <p className="mt-2 text-2xl font-extrabold text-foreground">
            {attendanceRecords.filter((r) => r.status === "Absent").length}
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
        <div className="flex flex-col gap-4 border-b border-border p-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <div className="relative w-72">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search employee attendance..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded-xl border border-border bg-background pl-9 pr-4 py-2 text-sm text-foreground focus:outline-none"
              />
            </div>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="rounded-xl border border-border bg-background px-3 py-2 text-xs font-semibold text-foreground focus:outline-none"
            >
              <option value="All">All Statuses</option>
              <option value="Present">Present</option>
              <option value="Half-day">Half-day</option>
              <option value="On Leave">On Leave</option>
              <option value="Absent">Absent</option>
            </select>
          </div>

          <div className="flex items-center rounded-xl border border-border bg-background p-1 text-xs">
            <button
              onClick={() => setViewMode("daily")}
              className={`rounded-lg px-3 py-1.5 font-semibold transition-all ${
                viewMode === "daily"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Daily Log
            </button>
            <button
              onClick={() => setViewMode("weekly")}
              className={`rounded-lg px-3 py-1.5 font-semibold transition-all ${
                viewMode === "weekly"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Weekly Matrix
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-muted/40 text-xs font-bold uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-6 py-3.5">Employee</th>
                <th className="px-4 py-3.5">Department</th>
                <th className="px-4 py-3.5">Check In</th>
                <th className="px-4 py-3.5">Check Out</th>
                <th className="px-4 py-3.5">Work Hours</th>
                <th className="px-4 py-3.5">Status</th>
                <th className="px-6 py-3.5 text-right">HR Override</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredRecords.map((rec) => (
                <tr key={rec.id} className="transition-colors hover:bg-muted/30">
                  <td className="px-6 py-4">
                    <div className="font-semibold text-foreground">{rec.employeeName}</div>
                    <div className="text-xs font-mono text-muted-foreground">{rec.employeeId}</div>
                  </td>
                  <td className="px-4 py-4 text-xs text-muted-foreground">{rec.department}</td>
                  <td className="px-4 py-4 font-mono text-xs text-foreground">{rec.checkIn}</td>
                  <td className="px-4 py-4 font-mono text-xs text-foreground">{rec.checkOut}</td>
                  <td className="px-4 py-4 font-mono text-xs font-semibold text-foreground">
                    {rec.workHours}
                  </td>
                  <td className="px-4 py-4">
                    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${getStatusBadge(rec.status)}`}>
                      {rec.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => setEditingRecord(rec)}
                      className="inline-flex items-center gap-1 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-accent"
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                      Adjust
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {editingRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl">
            <h3 className="text-lg font-bold text-foreground mb-1">
              Adjust Attendance Record
            </h3>
            <p className="text-xs text-muted-foreground mb-4">
              HR Officer Manual Override for {editingRecord.employeeName} ({editingRecord.employeeId})
            </p>

            <form onSubmit={handleUpdateRecord} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-foreground uppercase">
                  Attendance Status
                </label>
                <select
                  value={editingRecord.status}
                  onChange={(e) =>
                    setEditingRecord({
                      ...editingRecord,
                      status: e.target.value as any,
                    })
                  }
                  className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm font-semibold text-foreground"
                >
                  <option value="Present">Present</option>
                  <option value="Half-day">Half-day</option>
                  <option value="On Leave">On Leave</option>
                  <option value="Absent">Absent</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-foreground uppercase">
                    Check In Time
                  </label>
                  <input
                    type="text"
                    value={editingRecord.checkIn}
                    onChange={(e) =>
                      setEditingRecord({ ...editingRecord, checkIn: e.target.value })
                    }
                    className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-foreground uppercase">
                    Check Out Time
                  </label>
                  <input
                    type="text"
                    value={editingRecord.checkOut}
                    onChange={(e) =>
                      setEditingRecord({ ...editingRecord, checkOut: e.target.value })
                    }
                    className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
                  />
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-2 border-t border-border pt-4">
                <button
                  type="button"
                  onClick={() => setEditingRecord(null)}
                  className="rounded-lg border border-border bg-background px-4 py-2 text-xs font-semibold text-foreground"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground"
                >
                  Save Override
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

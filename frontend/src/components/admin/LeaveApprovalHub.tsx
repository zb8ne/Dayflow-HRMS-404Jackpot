import React, { useState } from "react";
import {
  CheckCircle,
  Search,
  XCircle,
} from "lucide-react";

export interface LeaveRequest {
  id: string;
  employeeId: string;
  employeeName: string;
  department: string;
  leaveType: "Paid Leave" | "Sick Leave" | "Unpaid Leave";
  startDate: string;
  endDate: string;
  totalDays: number;
  reason: string;
  status: "Pending" | "Approved" | "Rejected";
  appliedOn: string;
  hrComments?: string;
}

interface LeaveApprovalHubProps {
  leaveRequests: LeaveRequest[];
  onApprove: (id: string, hrComments: string) => void;
  onReject: (id: string, hrComments: string) => void;
}

export const LeaveApprovalHub: React.FC<LeaveApprovalHubProps> = ({
  leaveRequests,
  onApprove,
  onReject,
}) => {
  const [selectedStatus, setSelectedStatus] = useState<string>("All");
  const [searchTerm, setSearchTerm] = useState("");
  const [activeRequest, setActiveRequest] = useState<LeaveRequest | null>(null);
  const [actionType, setActionType] = useState<"Approve" | "Reject" | null>(null);
  const [comments, setComments] = useState("");

  const filteredRequests = leaveRequests.filter((req) => {
    const matchesSearch =
      req.employeeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      req.employeeId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      req.leaveType.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = selectedStatus === "All" || req.status === selectedStatus;
    return matchesSearch && matchesStatus;
  });

  const handleConfirmAction = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeRequest || !actionType) return;

    if (actionType === "Approve") {
      onApprove(activeRequest.id, comments);
    } else {
      onReject(activeRequest.id, comments);
    }

    setActiveRequest(null);
    setActionType(null);
    setComments("");
  };

  const getStatusBadge = (status: LeaveRequest["status"]) => {
    switch (status) {
      case "Approved":
        return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20";
      case "Rejected":
        return "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20";
      default:
        return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20";
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="relative w-72">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search leave requests..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded-xl border border-border bg-background pl-9 pr-4 py-2 text-sm text-foreground focus:outline-none"
              />
            </div>
          </div>

          <div className="flex items-center rounded-xl border border-border bg-background p-1 text-xs font-medium">
            {["All", "Pending", "Approved", "Rejected"].map((status) => (
              <button
                key={status}
                onClick={() => setSelectedStatus(status)}
                className={`rounded-lg px-3 py-1.5 transition-all ${
                  selectedStatus === status
                    ? "bg-primary text-primary-foreground shadow-sm font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-muted/40 text-xs font-bold uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-6 py-3.5">Employee</th>
                <th className="px-4 py-3.5">Leave Details</th>
                <th className="px-4 py-3.5">Duration</th>
                <th className="px-4 py-3.5">Reason & Remarks</th>
                <th className="px-4 py-3.5">Status</th>
                <th className="px-6 py-3.5 text-right">HR Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredRequests.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-muted-foreground">
                    No leave requests matching criteria.
                  </td>
                </tr>
              ) : (
                filteredRequests.map((req) => (
                  <tr key={req.id} className="transition-colors hover:bg-muted/30">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-foreground">{req.employeeName}</div>
                      <div className="text-xs text-muted-foreground">
                        {req.employeeId} • {req.department}
                      </div>
                    </td>

                    <td className="px-4 py-4">
                      <span className="font-medium text-foreground text-xs">{req.leaveType}</span>
                      <div className="text-[11px] text-muted-foreground">Applied: {req.appliedOn}</div>
                    </td>

                    <td className="px-4 py-4">
                      <div className="font-mono text-xs font-semibold text-foreground">
                        {req.startDate} → {req.endDate}
                      </div>
                      <div className="text-[11px] font-semibold text-primary">
                        {req.totalDays} Day(s)
                      </div>
                    </td>

                    <td className="px-4 py-4 max-w-xs">
                      <p className="text-xs text-foreground truncate" title={req.reason}>
                        "{req.reason}"
                      </p>
                      {req.hrComments && (
                        <p className="text-[11px] text-muted-foreground mt-0.5 italic">
                          HR: {req.hrComments}
                        </p>
                      )}
                    </td>

                    <td className="px-4 py-4">
                      <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${getStatusBadge(req.status)}`}>
                        {req.status}
                      </span>
                    </td>

                    <td className="px-6 py-4 text-right">
                      {req.status === "Pending" ? (
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => {
                              setActiveRequest(req);
                              setActionType("Approve");
                            }}
                            className="flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700"
                          >
                            <CheckCircle className="h-3.5 w-3.5" />
                            Approve
                          </button>
                          <button
                            onClick={() => {
                              setActiveRequest(req);
                              setActionType("Reject");
                            }}
                            className="flex items-center gap-1 rounded-lg border border-rose-500/20 bg-rose-500/10 px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-500/20"
                          >
                            <XCircle className="h-3.5 w-3.5" />
                            Reject
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground italic">Processed</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {activeRequest && actionType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl">
            <h3 className="text-lg font-bold text-foreground mb-1">
              {actionType} Leave Request
            </h3>
            <p className="text-xs text-muted-foreground mb-4">
              For {activeRequest.employeeName} ({activeRequest.totalDays} Days of {activeRequest.leaveType})
            </p>

            <form onSubmit={handleConfirmAction} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-foreground uppercase">
                  HR Remarks / Reason (Optional)
                </label>
                <textarea
                  rows={3}
                  placeholder={`Provide details for ${actionType.toLowerCase()}ing this request...`}
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-border bg-background p-3 text-xs text-foreground focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 border-t border-border pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setActiveRequest(null);
                    setActionType(null);
                  }}
                  className="rounded-lg border border-border bg-background px-4 py-2 text-xs font-semibold text-foreground"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`rounded-lg px-4 py-2 text-xs font-semibold text-white shadow-md ${
                    actionType === "Approve" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-rose-600 hover:bg-rose-700"
                  }`}
                >
                  Confirm {actionType}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

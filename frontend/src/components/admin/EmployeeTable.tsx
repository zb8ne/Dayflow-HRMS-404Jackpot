import React, { useState } from "react";
import {
  Edit2,
  Filter,
  Plus,
  Search,
  Shield,
  Trash2,
} from "lucide-react";
import { EmployeeData } from "./AddEditEmployeeModal";

interface EmployeeTableProps {
  employees: EmployeeData[];
  onAddEmployee: () => void;
  onEditEmployee: (employee: EmployeeData) => void;
  onDeleteEmployee: (id: string) => void;
}

export const EmployeeTable: React.FC<EmployeeTableProps> = ({
  employees,
  onAddEmployee,
  onEditEmployee,
  onDeleteEmployee,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDept, setSelectedDept] = useState("All");
  const [selectedRole, setSelectedRole] = useState("All");
  const [selectedStatus, setSelectedStatus] = useState("All");

  const filteredEmployees = employees.filter((emp) => {
    const matchesSearch =
      emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.designation.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesDept = selectedDept === "All" || emp.department === selectedDept;
    const matchesRole = selectedRole === "All" || emp.role === selectedRole;
    const matchesStatus = selectedStatus === "All" || emp.status === selectedStatus;

    return matchesSearch && matchesDept && matchesRole && matchesStatus;
  });

  const getRoleBadge = (role: EmployeeData["role"]) => {
    switch (role) {
      case "Admin":
        return "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20";
      case "HR Officer":
        return "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20";
      default:
        return "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20";
    }
  };

  const getStatusBadge = (status: EmployeeData["status"]) => {
    switch (status) {
      case "Active":
        return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20";
      case "On Leave":
        return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20";
      default:
        return "bg-muted text-muted-foreground border-border";
    }
  };

  return (
    <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
      <div className="flex flex-col gap-4 border-b border-border p-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          <div className="relative flex-1 sm:w-80">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by name, ID, role or title..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-xl border border-border bg-background pl-9 pr-4 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground hidden sm:block" />
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="rounded-xl border border-border bg-background px-3 py-2 text-xs font-semibold text-foreground focus:outline-none"
            >
              <option value="All">All Depts</option>
              <option value="Engineering">Engineering</option>
              <option value="Human Resources">HR</option>
              <option value="Marketing">Marketing</option>
              <option value="Operations">Operations</option>
              <option value="Product & Design">Product</option>
            </select>
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="rounded-xl border border-border bg-background px-3 py-2 text-xs font-semibold text-foreground focus:outline-none"
            >
              <option value="All">All Roles</option>
              <option value="Employee">Employee</option>
              <option value="HR Officer">HR Officer</option>
              <option value="Admin">Admin</option>
            </select>
          </div>
        </div>

        <button
          onClick={onAddEmployee}
          className="flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-md transition-colors hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          Onboard Employee
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border bg-muted/40 text-xs font-bold uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-6 py-3.5">Employee</th>
              <th className="px-4 py-3.5">Dept & Title</th>
              <th className="px-4 py-3.5">Role</th>
              <th className="px-4 py-3.5">Status</th>
              <th className="px-4 py-3.5">Monthly Net Salary</th>
              <th className="px-6 py-3.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filteredEmployees.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-10 text-center text-muted-foreground">
                  No matching employees found. Try clearing filters.
                </td>
              </tr>
            ) : (
              filteredEmployees.map((emp) => {
                const netPay = emp.baseSalary + emp.hra + emp.bonus - emp.deductions;
                const initials = emp.name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .toUpperCase();

                return (
                  <tr key={emp.id} className="transition-colors hover:bg-muted/30">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 font-bold text-primary text-xs">
                          {initials}
                        </div>
                        <div>
                          <div className="font-semibold text-foreground flex items-center gap-2">
                            {emp.name}
                            <span className="text-[11px] font-mono text-muted-foreground">
                              ({emp.id})
                            </span>
                          </div>
                          <div className="text-xs text-muted-foreground">{emp.email}</div>
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-4">
                      <div className="font-medium text-foreground text-xs">{emp.designation}</div>
                      <div className="text-[11px] text-muted-foreground">{emp.department}</div>
                    </td>

                    <td className="px-4 py-4">
                      <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${getRoleBadge(emp.role)}`}>
                        <Shield className="h-3 w-3" />
                        {emp.role}
                      </span>
                    </td>

                    <td className="px-4 py-4">
                      <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${getStatusBadge(emp.status)}`}>
                        {emp.status}
                      </span>
                    </td>

                    <td className="px-4 py-4 font-mono font-semibold text-foreground text-xs">
                      ₹{netPay.toLocaleString("en-IN")}
                    </td>

                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => onEditEmployee(emp)}
                          title="Edit Employee"
                          className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => onDeleteEmployee(emp.id)}
                          title="Remove Record"
                          className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

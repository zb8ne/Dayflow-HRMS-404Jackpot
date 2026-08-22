import React, { useState } from "react";
import {
  Download,
  Edit3,
  FileText,
  IndianRupee,
  Search,
  ShieldCheck,
} from "lucide-react";
import { EmployeeData } from "./AddEditEmployeeModal";

interface PayrollManagementProps {
  employees: EmployeeData[];
  onUpdateSalary: (employeeId: string, base: number, hra: number, bonus: number, deductions: number) => void;
}

export const PayrollManagement: React.FC<PayrollManagementProps> = ({
  employees,
  onUpdateSalary,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [editingEmployee, setEditingEmployee] = useState<EmployeeData | null>(null);
  const [viewingPayslip, setViewingPayslip] = useState<EmployeeData | null>(null);

  const [salaryForm, setSalaryForm] = useState({
    baseSalary: 0,
    hra: 0,
    bonus: 0,
    deductions: 0,
  });

  const filteredEmployees = employees.filter((emp) =>
    emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.department.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleOpenSalaryEdit = (emp: EmployeeData) => {
    setEditingEmployee(emp);
    setSalaryForm({
      baseSalary: emp.baseSalary,
      hra: emp.hra,
      bonus: emp.bonus,
      deductions: emp.deductions,
    });
  };

  const handleSaveSalary = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEmployee) return;

    onUpdateSalary(
      editingEmployee.id,
      salaryForm.baseSalary,
      salaryForm.hra,
      salaryForm.bonus,
      salaryForm.deductions
    );

    setEditingEmployee(null);
  };

  const grandTotalPayroll = employees.reduce(
    (sum, emp) => sum + (emp.baseSalary + emp.hra + emp.bonus - emp.deductions),
    0
  );

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <IndianRupee className="h-4 w-4 text-primary" />
            Monthly Organization Payroll Summary
          </div>
          <h2 className="mt-1 text-3xl font-extrabold tracking-tight text-foreground">
            ₹{grandTotalPayroll.toLocaleString("en-IN")} / month
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Calculated across {employees.length} active employee profiles for the current billing cycle.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="rounded-xl border border-border bg-background px-4 py-2 text-center">
            <div className="text-[11px] text-muted-foreground uppercase font-semibold">Status</div>
            <div className="text-xs font-bold text-emerald-600">Verified & Ready</div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
        <div className="border-b border-border p-5">
          <div className="relative w-80">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search employee payroll..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-xl border border-border bg-background pl-9 pr-4 py-2 text-sm text-foreground focus:outline-none"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-muted/40 text-xs font-bold uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-6 py-3.5">Employee</th>
                <th className="px-4 py-3.5">Base Salary</th>
                <th className="px-4 py-3.5">HRA & Allowances</th>
                <th className="px-4 py-3.5">Performance Bonus</th>
                <th className="px-4 py-3.5">PF & Tax Deductions</th>
                <th className="px-4 py-3.5">Net Monthly Payout</th>
                <th className="px-6 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredEmployees.map((emp) => {
                const netPay = emp.baseSalary + emp.hra + emp.bonus - emp.deductions;
                return (
                  <tr key={emp.id} className="transition-colors hover:bg-muted/30">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-foreground">{emp.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {emp.id} • {emp.department}
                      </div>
                    </td>

                    <td className="px-4 py-4 font-mono text-xs text-foreground">
                      ₹{emp.baseSalary.toLocaleString("en-IN")}
                    </td>

                    <td className="px-4 py-4 font-mono text-xs text-foreground">
                      ₹{emp.hra.toLocaleString("en-IN")}
                    </td>

                    <td className="px-4 py-4 font-mono text-xs text-emerald-600 font-medium">
                      +₹{emp.bonus.toLocaleString("en-IN")}
                    </td>

                    <td className="px-4 py-4 font-mono text-xs text-rose-600 font-medium">
                      -₹{emp.deductions.toLocaleString("en-IN")}
                    </td>

                    <td className="px-4 py-4 font-mono text-sm font-bold text-foreground">
                      ₹{netPay.toLocaleString("en-IN")}
                    </td>

                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleOpenSalaryEdit(emp)}
                          className="flex items-center gap-1 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:bg-accent"
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                          Adjust
                        </button>
                        <button
                          onClick={() => setViewingPayslip(emp)}
                          className="flex items-center gap-1 rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/20"
                        >
                          <FileText className="h-3.5 w-3.5" />
                          Payslip
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {editingEmployee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl">
            <h3 className="text-lg font-bold text-foreground mb-1">
              Adjust Salary Structure
            </h3>
            <p className="text-xs text-muted-foreground mb-4">
              For {editingEmployee.name} ({editingEmployee.id})
            </p>

            <form onSubmit={handleSaveSalary} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-foreground uppercase">Base Pay (₹)</label>
                <input
                  type="number"
                  value={salaryForm.baseSalary}
                  onChange={(e) => setSalaryForm({ ...salaryForm, baseSalary: Number(e.target.value) })}
                  className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm font-mono text-foreground"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground uppercase">HRA (₹)</label>
                <input
                  type="number"
                  value={salaryForm.hra}
                  onChange={(e) => setSalaryForm({ ...salaryForm, hra: Number(e.target.value) })}
                  className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm font-mono text-foreground"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground uppercase">Performance Bonus (₹)</label>
                <input
                  type="number"
                  value={salaryForm.bonus}
                  onChange={(e) => setSalaryForm({ ...salaryForm, bonus: Number(e.target.value) })}
                  className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm font-mono text-foreground text-emerald-600"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground uppercase">PF & Tax Deductions (₹)</label>
                <input
                  type="number"
                  value={salaryForm.deductions}
                  onChange={(e) => setSalaryForm({ ...salaryForm, deductions: Number(e.target.value) })}
                  className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm font-mono text-foreground text-rose-600"
                />
              </div>

              <div className="mt-4 rounded-xl bg-muted/40 p-3 flex justify-between items-center text-xs font-semibold">
                <span>Calculated Net Pay:</span>
                <span className="font-mono text-sm text-foreground">
                  ₹{(salaryForm.baseSalary + salaryForm.hra + salaryForm.bonus - salaryForm.deductions).toLocaleString("en-IN")}
                </span>
              </div>

              <div className="flex justify-end gap-2 border-t border-border pt-4 mt-4">
                <button
                  type="button"
                  onClick={() => setEditingEmployee(null)}
                  className="rounded-lg border border-border bg-background px-4 py-2 text-xs font-semibold text-foreground"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-md"
                >
                  Save Salary
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {viewingPayslip && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-2xl">
            <div className="flex justify-between items-start border-b border-border pb-4 mb-4">
              <div>
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-primary" />
                  <span className="font-bold text-base text-foreground">Dayflow HRMS Payslip</span>
                </div>
                <p className="text-xs text-muted-foreground">Pay Period: August 2026</p>
              </div>
              <button
                onClick={() => setViewingPayslip(null)}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Close
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-2 bg-muted/20 p-3 rounded-xl">
                <div>
                  <span className="text-muted-foreground">Employee Name:</span>
                  <p className="font-bold text-foreground">{viewingPayslip.name}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Employee ID:</span>
                  <p className="font-mono font-bold text-foreground">{viewingPayslip.id}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Department:</span>
                  <p className="font-medium text-foreground">{viewingPayslip.department}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Designation:</span>
                  <p className="font-medium text-foreground">{viewingPayslip.designation}</p>
                </div>
              </div>

              <div className="border border-border rounded-xl p-4 space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Basic Salary</span>
                  <span className="font-mono">₹{viewingPayslip.baseSalary.toLocaleString("en-IN")}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">HRA & Allowances</span>
                  <span className="font-mono">₹{viewingPayslip.hra.toLocaleString("en-IN")}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Performance Bonus</span>
                  <span className="font-mono text-emerald-600">+₹{viewingPayslip.bonus.toLocaleString("en-IN")}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">PF & Deductions</span>
                  <span className="font-mono text-rose-600">-₹{viewingPayslip.deductions.toLocaleString("en-IN")}</span>
                </div>
                <div className="border-t border-border pt-2 flex justify-between font-bold text-sm">
                  <span>Net Salary Paid</span>
                  <span className="font-mono text-primary">
                    ₹{(viewingPayslip.baseSalary + viewingPayslip.hra + viewingPayslip.bonus - viewingPayslip.deductions).toLocaleString("en-IN")}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2 border-t border-border pt-4">
              <button
                onClick={() => setViewingPayslip(null)}
                className="rounded-lg border border-border bg-background px-4 py-2 text-xs font-semibold text-foreground"
              >
                Close Preview
              </button>
              <button
                onClick={() => alert(`Downloading payslip for ${viewingPayslip.name}...`)}
                className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-md"
              >
                <Download className="h-3.5 w-3.5" />
                Download PDF
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

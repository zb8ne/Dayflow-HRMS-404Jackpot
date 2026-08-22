import React, { useState, useEffect } from "react";
import { X, Save, UserPlus, Mail, Phone, IndianRupee } from "lucide-react";

export interface EmployeeData {
  id: string;
  name: string;
  email: string;
  role: "Employee" | "HR Officer" | "Admin";
  department: string;
  designation: string;
  status: "Active" | "Inactive" | "On Leave";
  joinDate: string;
  phone: string;
  baseSalary: number;
  hra: number;
  bonus: number;
  deductions: number;
  address?: string;
}

interface AddEditEmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (employee: EmployeeData) => void;
  initialData?: EmployeeData | null;
}

export const AddEditEmployeeModal: React.FC<AddEditEmployeeModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData,
}) => {
  const [formData, setFormData] = useState<EmployeeData>({
    id: "",
    name: "",
    email: "",
    role: "Employee",
    department: "Engineering",
    designation: "Software Engineer",
    status: "Active",
    joinDate: new Date().toISOString().split("T")[0],
    phone: "",
    baseSalary: 60000,
    hra: 15000,
    bonus: 5000,
    deductions: 4000,
    address: "",
  });

  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
    } else {
      setFormData({
        id: `EMP-${Math.floor(100 + Math.random() * 900)}`,
        name: "",
        email: "",
        role: "Employee",
        department: "Engineering",
        designation: "Software Engineer",
        status: "Active",
        joinDate: new Date().toISOString().split("T")[0],
        phone: "",
        baseSalary: 60000,
        hra: 15000,
        bonus: 5000,
        deductions: 4000,
        address: "",
      });
    }
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email) return;
    onSave(formData);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-2xl rounded-2xl border border-border bg-card shadow-2xl transition-all my-8">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <UserPlus className="h-5 w-5" />
            </div>
            <h3 className="text-lg font-bold tracking-tight text-foreground">
              {initialData ? "Edit Employee Profile" : "Onboard New Employee"}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase">
                Employee ID
              </label>
              <input
                type="text"
                disabled
                value={formData.id}
                className="mt-1 w-full rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm text-muted-foreground font-mono"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-foreground uppercase">
                Full Name *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Alex Morgan"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-foreground uppercase">
                Corporate Email *
              </label>
              <div className="relative mt-1">
                <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <input
                  type="email"
                  required
                  placeholder="alex.morgan@company.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full rounded-lg border border-border bg-background pl-9 pr-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-foreground uppercase">
                Phone Number
              </label>
              <div className="relative mt-1">
                <Phone className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <input
                  type="tel"
                  placeholder="+91 98765 43210"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full rounded-lg border border-border bg-background pl-9 pr-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-foreground uppercase">
                Department
              </label>
              <select
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
              >
                <option value="Engineering">Engineering</option>
                <option value="Human Resources">Human Resources</option>
                <option value="Marketing">Marketing</option>
                <option value="Operations">Operations</option>
                <option value="Product & Design">Product & Design</option>
                <option value="Sales">Sales</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-foreground uppercase">
                Access Role
              </label>
              <select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value as any })}
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
              >
                <option value="Employee">Employee</option>
                <option value="HR Officer">HR Officer</option>
                <option value="Admin">System Admin</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-foreground uppercase">
                Job Title
              </label>
              <input
                type="text"
                placeholder="Senior Lead Engineer"
                value={formData.designation}
                onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-foreground uppercase">
                Status
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
              >
                <option value="Active">Active</option>
                <option value="On Leave">On Leave</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
          </div>

          <div className="mt-4 rounded-xl border border-border bg-muted/20 p-4">
            <h4 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
              <IndianRupee className="h-4 w-4" />
              Salary Breakdown Structure
            </h4>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div>
                <label className="text-[11px] font-semibold text-muted-foreground">Base Pay (₹)</label>
                <input
                  type="number"
                  value={formData.baseSalary}
                  onChange={(e) => setFormData({ ...formData, baseSalary: Number(e.target.value) })}
                  className="mt-1 w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-xs text-foreground"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-muted-foreground">HRA (₹)</label>
                <input
                  type="number"
                  value={formData.hra}
                  onChange={(e) => setFormData({ ...formData, hra: Number(e.target.value) })}
                  className="mt-1 w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-xs text-foreground"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-muted-foreground">Bonus (₹)</label>
                <input
                  type="number"
                  value={formData.bonus}
                  onChange={(e) => setFormData({ ...formData, bonus: Number(e.target.value) })}
                  className="mt-1 w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-xs text-foreground"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-muted-foreground">Deductions (₹)</label>
                <input
                  type="number"
                  value={formData.deductions}
                  onChange={(e) => setFormData({ ...formData, deductions: Number(e.target.value) })}
                  className="mt-1 w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-xs text-foreground text-destructive"
                />
              </div>
            </div>
          </div>

          <div className="mt-6 flex items-center justify-end gap-3 border-t border-border pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-border bg-background px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-accent"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center gap-2 rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground shadow-md transition-colors hover:bg-primary/90"
            >
              <Save className="h-4 w-4" />
              {initialData ? "Update Employee" : "Save & Onboard"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

Dayflow — Go Backend

Dayflow is a modular Human Resource Management System (HRMS) built with a Go backend, React/TypeScript frontend, and PostgreSQL database. The system supports employee management, attendance, leave management, payroll visibility, authentication, role-based access control, notifications, and analytics.

Technology Stack
Backend: Go
API: REST
Database: PostgreSQL
Authentication: JWT
Frontend: React + TypeScript
Deployment: Docker / Docker Compose
Database Driver: pgx

Email Delivery
Hosted deployments such as Railway should use the Resend HTTPS API by setting
`EMAIL_PROVIDER=resend`, `RESEND_API_KEY`, and `EMAIL_FROM`. SMTP with STARTTLS
remains available for local development through `EMAIL_PROVIDER=smtp` and the
existing `SMTP_HOST`, `SMTP_PORT`, `SMTP_USERNAME`, `SMTP_PASSWORD`, and
`SMTP_FROM` variables. Provider credentials must remain backend-only secrets.

Core Modules
Auth — authentication, JWT and role-based authorization
Employee — employee profiles and management
Attendance — check-in/check-out and attendance records
Leave — leave requests and approval workflows
Payroll — salary structure and payroll visibility
Policy Engine — evaluates configurable HR rules
Anomaly Engine — identifies suspicious or unusual attendance/activity
Audit Logging — records important system actions

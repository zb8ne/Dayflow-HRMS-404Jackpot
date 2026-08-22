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

Email configuration

Employee onboarding emails use SMTP with STARTTLS. Configure `SMTP_HOST`,
`SMTP_PORT` (normally `587`), `SMTP_USERNAME`, `SMTP_PASSWORD`, and
`SMTP_FROM`. The admin-created employee receives a temporary password; after
the first valid login, a second email supplies the OTP used to set a permanent
password. The API refuses employee creation when email delivery is unavailable.

Core Modules
Auth — authentication, JWT and role-based authorization
Employee — employee profiles and management
Attendance — check-in/check-out and attendance records
Leave — leave requests and approval workflows
Payroll — salary structure and payroll visibility
Policy Engine — evaluates configurable HR rules
Anomaly Engine — identifies suspicious or unusual attendance/activity
Audit Logging — records important system actions

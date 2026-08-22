# Dayflow UI and API Integration Guide

This document is the working agreement between the frontend and backend teams.
It describes the employee and admin experiences, the API endpoints each screen
uses, and the security and data conventions both teams must follow.

Employee invitation and first-login OTP messages use the backend `Mailer`
boundary. Railway deployments use Resend over HTTPS with
`EMAIL_PROVIDER=resend`, `RESEND_API_KEY`, and `EMAIL_FROM`; SMTP remains
available for local development with `EMAIL_PROVIDER=smtp`. Email provider
credentials are backend-only environment variables.

> Status legend
>
> - **Available**: implemented in the current Go backend.
> - **Planned**: must be implemented before the associated UI is considered complete.
> - **Admin**: requires an authenticated user with the `admin` role.
> - **Employee**: available to any authenticated employee, including admins.

## 1. Shared application behavior

### Roles

The initial system has two roles:

- `employee`: can access and update their own permitted information.
- `admin`: can access their own employee features and manage other employees.

Frontend role checks control presentation only. Every admin operation must also
be protected by backend authorization.

### Authentication

Authentication uses a short-lived JWT in an HttpOnly cookie named
`dayflow_access`. Frontend code must never read or store this JWT.

Every frontend API request must include credentials:

```ts
fetch(`${API_BASE}${path}`, {
  ...options,
  credentials: "include",
});
```

The frontend may store the user's role for presentation, but the backend remains
the authority. On initial page load, use `GET /auth/me` to restore the session.

Expected authentication behavior:

- `401 Unauthorized`: clear local presentation state and navigate to `/login`.
- `403 Forbidden`: keep the session and show an access-denied message.
- Logout must call the backend before navigating to `/login`.
- Do not render protected data until `/auth/me` succeeds.

### API location

Local Docker environment:

```text
Frontend: http://localhost:3090
Backend:  http://localhost:8090
```

Frontend environment variable:

```text
VITE_API_URL=http://localhost:8090
```

### Data conventions

- JSON fields use `snake_case`.
- Dates use `YYYY-MM-DD`.
- Timestamps use ISO 8601 UTC, for example `2026-08-22T08:30:00Z`.
- Missing optional values are `null`, not empty strings, in new APIs.
- Money must use decimal strings or integer paise, never JSON floating-point values, in new APIs.
- Existing APIs currently use numeric integer IDs.
- New list endpoints should support `page` and `page_size` when the result can grow.

### UI states required on every data screen

Every screen must deliberately implement:

1. Loading state
2. Successful state
3. Empty state
4. Validation-error state
5. Unauthorized state
6. Forbidden state
7. Unexpected server-error state

Buttons that submit data must prevent duplicate submission while a request is in progress.

## 2. Public authentication UI

### Login page: `/login`

Fields:

- Work email
- Password
- Submit button

Behavior:

1. Submit credentials to `POST /auth/signin`.
2. Store only the returned role for UI presentation.
3. Call `GET /auth/me` or navigate to `/` after success.
4. Display the backend error for invalid credentials or unverified email.

#### `POST /auth/signin` — Available

Request:

```json
{
  "email": "employee@dayflow.com",
  "password": "correct-horse-battery-staple"
}
```

Successful response:

```json
{
  "role": "employee"
}
```

The response also sets the HttpOnly authentication cookie.

### Signup page: `/signup`

Public signup currently creates employee accounts only. It must never allow the
visitor to choose `admin`.

Fields:

- Employee ID
- Work email
- Password
- Confirm password (frontend validation)

#### `POST /auth/signup` — Available

Request:

```json
{
  "employee_id": "EMP-104",
  "email": "employee@dayflow.com",
  "password": "correct-horse-battery-staple"
}
```

After signup, show the verification instructions. In local development the
verification link is written to backend logs because email delivery is not configured.

### Email verification

#### `GET /auth/verify?token={token}` — Available

Show a success page and link to `/login` when verification succeeds. Show an
expired/invalid-link state when it fails.

### Session endpoints

#### `GET /auth/me` — Available, Employee

Response:

```json
{
  "id": 1,
  "employee_id": "EMP-104",
  "email": "employee@dayflow.com",
  "role": "employee"
}
```

#### `POST /auth/logout` — Available, Employee

Returns `204 No Content` and expires the authentication cookie.

## 3. Employee application

### Employee navigation

```text
Dashboard
Profile
Attendance
Leave Requests
Payroll
Notifications (planned)
Logout
```

### Employee dashboard: `/`

The employee dashboard answers: "What do I need to know or do today?"

Required sections:

- Greeting with employee name
- Today's check-in/check-out status
- This week's attendance summary
- Current leave requests and recent decisions
- Latest payroll summary or payslip availability
- Recent notifications
- Quick links to profile, attendance, leave, and payroll

Do not show company-wide employee counts, other employees' salary data, or admin controls.

API calls:

- `GET /auth/me` — Available
- `GET /api/profile/me` — Available
- `GET /api/attendance/me?range=weekly` — Available
- `GET /api/leave/me` — Available
- `GET /api/payroll/me` — Available
- `GET /api/notifications` — Planned

### Employee profile: `/profile`

Read-only fields:

- Employee ID
- Work email
- Role
- Full name
- Job title
- Department

Employee-editable fields:

- Phone
- Address
- Profile picture URL

#### `GET /api/profile/me` — Available, Employee

Example response:

```json
{
  "user_id": 1,
  "employee_id": "EMP-104",
  "email": "employee@dayflow.com",
  "role": "employee",
  "full_name": "Asha Sharma",
  "phone": "+91 9000000000",
  "address": "Bengaluru",
  "job_title": "Software Engineer",
  "department": "Engineering",
  "profile_picture_url": ""
}
```

#### `PATCH /api/profile/me` — Available, Employee

Request may contain any of:

```json
{
  "phone": "+91 9000000000",
  "address": "Bengaluru",
  "profile_picture_url": "https://example.com/avatar.jpg"
}
```

### Attendance: `/attendance`

Required UI:

- Today's state: not checked in, checked in, or checked out
- Check-in/check-out action
- Daily/weekly toggle
- Attendance history
- Status badges for present, absent, half-day, and leave
- Check-in and check-out timestamps

#### `POST /api/attendance/checkin` — Available, Employee

Records today's check-in. Disable the button after success.

#### `POST /api/attendance/checkout` — Available, Employee

Requires an existing check-in for today.

#### `GET /api/attendance/me?range=daily|weekly` — Available, Employee

Response:

```json
{
  "attendance": [
    {
      "date": "2026-08-22",
      "status": "present",
      "check_in": "2026-08-22T03:30:00Z",
      "check_out": null
    }
  ]
}
```

### Leave requests: `/leave`

Employee UI:

- Leave type
- Start and end date
- Reason/remarks
- Submit button
- Request history
- Pending, approved, and rejected status badges
- Admin review comment

#### `POST /api/leave` — Available, Employee

Request:

```json
{
  "leave_type": "paid",
  "start_date": "2026-08-25",
  "end_date": "2026-08-26",
  "remarks": "Family event"
}
```

Allowed leave types currently are `paid`, `sick`, and `unpaid`.

#### `GET /api/leave/me` — Available, Employee

Returns `{ "leave_requests": [...] }`.

#### `GET /api/leave-balances` — Planned, Employee

Should return allocated, used, and remaining leave by type and year.

### Payroll: `/payroll`

Required UI:

- Basic salary
- HRA
- Allowances
- Deductions
- Calculated net pay
- Effective date
- Empty state when no salary structure exists

#### `GET /api/payroll/me` — Available, Employee

Existing response:

```json
{
  "user_id": 1,
  "basic": 50000,
  "hra": 10000,
  "allowances": 5000,
  "deductions": 2500,
  "net_pay": 62500,
  "effective_from": "2026-08-01"
}
```

Future payroll APIs should return monetary values as decimal strings.

### Notifications — Planned

Required UI:

- Notification list ordered newest first
- Unread count
- Mark one notification as read
- Links to the affected leave, payroll, or attendance screen

Planned endpoints:

```text
GET   /api/notifications
PATCH /api/notifications/{notification_id}/read
```

## 4. Admin application

### Admin navigation

```text
Dashboard
Employees
Attendance
Leave Requests
Payroll
Notifications (planned)
Audit Log (planned)
Settings (planned)
Logout
```

Admins may use the same application shell, but the dashboard and management
navigation must be selected from the verified role returned by `/auth/me`.

### Admin dashboard: `/admin`

The admin dashboard answers: "What requires action across the organization?"

#### Summary cards

- Total active employees
- Present today
- Absent/on leave today
- Pending leave requests
- Employees currently checked in
- Employees missing salary structures

#### Attendance overview

- Today's attendance percentage
- Present, absent, half-day, and leave counts
- Employees who have not checked out
- Daily/weekly attendance chart
- Link to full attendance management

#### Pending leave approvals

Table columns:

```text
Employee | Leave type | Dates | Duration | Reason | Approve | Reject
```

#### Employee overview

- Recently created employees
- Unverified accounts
- Employee ID, name, department, job title, and account status
- Primary **Add employee** action

#### Payroll overview

- Employees with salary structures
- Employees missing salary structures
- Current estimated payroll total
- Recent salary changes (planned audit data)

#### Alerts

- Missing check-outs
- Unverified accounts
- Pending leave requests
- Missing salary structures

The first admin dashboard may aggregate existing endpoints. A future dedicated
`GET /api/admin/dashboard` endpoint can reduce round trips.

### Employee management: `/admin/employees`

Required UI:

- Paginated employee table
- Search by name, employee ID, or email
- Filter by department and account state
- Open employee details
- Add employee
- Activate/deactivate account (planned)

#### `GET /api/employees` — Planned, Admin

Query parameters:

```text
page
page_size
search
department
status
```

#### `POST /api/employees` — Planned, Admin

This is the preferred employee onboarding workflow. User and profile creation
must occur in one database transaction.

Request:

```json
{
  "employee_id": "EMP-104",
  "email": "employee@dayflow.com",
  "full_name": "Asha Sharma",
  "phone": "+91 9000000000",
  "job_title": "Software Engineer",
  "department": "Engineering",
  "date_joined": "2026-08-22",
  "role": "employee"
}
```

The backend should issue an activation link or one-time temporary password. It
must never return a stored password or password hash.

#### `GET /api/profile/{user_id}` — Available, Admin

#### `PATCH /api/profile/{user_id}` — Available, Admin

Admin-editable profile fields:

- Full name
- Phone
- Address
- Job title
- Department
- Profile picture URL

#### Account-management endpoints — Planned, Admin

```text
PATCH /api/employees/{user_id}/status
PATCH /api/employees/{user_id}/role
POST  /api/employees/{user_id}/activation
```

Role changes must require explicit confirmation in the UI and authorization in the backend.

### Attendance management: `/admin/attendance`

Required UI:

- Date picker
- Company attendance table
- Employee, date, and status filters
- Link to an employee's attendance history
- Missing-checkout indicators

#### `GET /api/attendance/all?date=YYYY-MM-DD` — Available, Admin

#### `GET /api/attendance/{user_id}?range=daily|weekly` — Available, Admin

Editing attendance is planned:

```text
PATCH /api/attendance/records/{attendance_id}
```

Every manual attendance correction should create an audit event.

### Leave management: `/admin/leave`

Required UI:

- All leave requests
- Status and date filters
- Employee information
- Approve/reject actions
- Admin comment

#### `GET /api/leave/all` — Available, Admin

#### `PATCH /api/leave/{leave_request_id}` — Available, Admin

Request:

```json
{
  "status": "approved",
  "admin_comment": "Approved"
}
```

Allowed review statuses are `approved` and `rejected`.

### Payroll management: `/admin/payroll`

Required UI:

- Employee search
- Current salary structure
- Employees without salary data
- Update salary form
- Clear warning before saving sensitive financial changes

#### `GET /api/payroll/{user_id}` — Available, Admin

#### `PATCH /api/payroll/{user_id}` — Available, Admin

Request:

```json
{
  "basic": 50000,
  "hra": 10000,
  "allowances": 5000,
  "deductions": 2500
}
```

Planned payslip history:

```text
GET  /api/payslips
GET  /api/payslips/{payslip_id}
POST /api/payslips
```

### Audit log: `/admin/audit` — Planned

Record and display:

- Employee creation and status changes
- Role changes
- Leave approvals/rejections
- Attendance corrections
- Salary changes
- Significant authentication events

Never record passwords, password hashes, JWTs, or complete verification tokens.

Planned endpoint:

```text
GET /api/audit-events?page=1&page_size=50
```

## 5. Current endpoint inventory

| Method | Endpoint | Access | Status | Purpose |
|---|---|---|---|---|
| POST | `/auth/signup` | Public | Available | Create employee account |
| GET | `/auth/verify` | Public | Available | Verify email token |
| POST | `/auth/signin` | Public | Available | Start cookie session |
| GET | `/auth/me` | Employee | Available | Restore current session |
| POST | `/auth/logout` | Employee | Available | Expire session cookie |
| GET | `/api/profile/me` | Employee | Available | Read own profile |
| PATCH | `/api/profile/me` | Employee | Available | Edit permitted profile fields |
| GET | `/api/profile/{user_id}` | Admin | Available | Read employee profile |
| PATCH | `/api/profile/{user_id}` | Admin | Available | Edit employee profile |
| POST | `/api/attendance/checkin` | Employee | Available | Check in |
| POST | `/api/attendance/checkout` | Employee | Available | Check out |
| GET | `/api/attendance/me` | Employee | Available | Own attendance history |
| GET | `/api/attendance/all` | Admin | Available | Attendance for a date |
| GET | `/api/attendance/{user_id}` | Admin | Available | Employee attendance history |
| POST | `/api/leave` | Employee | Available | Submit leave request |
| GET | `/api/leave/me` | Employee | Available | Own leave requests |
| GET | `/api/leave/all` | Admin | Available | All leave requests |
| PATCH | `/api/leave/{id}` | Admin | Available | Approve/reject leave |
| GET | `/api/payroll/me` | Employee | Available | Own salary structure |
| GET | `/api/payroll/{user_id}` | Admin | Available | Employee salary structure |
| PATCH | `/api/payroll/{user_id}` | Admin | Available | Update salary structure |

Legacy access-control analytics endpoints also remain in the backend. They are
separate from the initial HRMS UI and require the legacy `gatepoint_events` data.

## 6. Planned endpoint priorities

### Priority 1: required for the admin dashboard

```text
GET  /api/employees
POST /api/employees
GET  /api/admin/dashboard
```

### Priority 2: complete employee workflows

```text
GET   /api/leave-balances
GET   /api/notifications
PATCH /api/notifications/{id}/read
```

### Priority 3: management and accountability

```text
PATCH /api/employees/{id}/status
PATCH /api/employees/{id}/role
PATCH /api/attendance/records/{id}
GET   /api/audit-events
```

### Priority 4: payroll history

```text
GET  /api/payslips
GET  /api/payslips/{id}
POST /api/payslips
```

## 7. Integration checklist

Before either team marks a feature complete, confirm:

- [ ] Endpoint name and HTTP method match this document.
- [ ] Request and response fields are agreed before coding.
- [ ] Employee and admin permissions are enforced by the backend.
- [ ] The frontend sends `credentials: "include"`.
- [ ] The frontend handles 401, 403, 404, 409, 429, and 500 responses.
- [ ] Loading, empty, success, and error states are implemented.
- [ ] Dates and timestamps follow the shared format.
- [ ] Sensitive values are not written to logs or browser storage.
- [ ] New database changes use a new versioned migration.
- [ ] Backend tests cover authentication and authorization.
- [ ] Frontend and backend are tested together through Docker Compose.
- [ ] This document is updated when the contract changes.

## 8. Team workflow

1. Discuss a feature and update this contract first.
2. Backend implements the endpoint and provides example JSON.
3. Frontend develops against the example response or a mock adapter.
4. Integrate using the Docker environment.
5. Test employee and admin behavior separately.
6. Review authorization before merging.

Avoid unrelated endpoint renaming during UI implementation. Any breaking API
change must be communicated to both teams and reflected here in the same PR.

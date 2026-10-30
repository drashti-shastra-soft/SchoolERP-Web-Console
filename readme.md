# SchoolERP

SchoolERP is a responsive ASP.NET web console for complete school management. Admins and staff can manage admissions, students, classes, timetables, attendance, exams, results, fees, staff payroll, transport, and library, and share notices with parents. The system features dashboards, reports, role-based access, and secure login via the SchoolERP Web API. Built as a multi-tenant system, multiple companies/schools can use the same instance with isolated data, company/session management, and AMC tracking. The backend uses a database-first approach with Entity Framework and ADO.NET (Stored Procedures).

## Features

- **Multi-tenant architecture** — multiple companies/schools can use the same system with isolated data, managed by a SuperAdmin.
- **Role-based access** — distinct roles for SuperAdmin, Admin, Teacher, Parent, and Student.
- **Authentication** — secure login via the SchoolERP Web API.
- **Dashboards** — role-specific dashboards showing key metrics (attendance, fees, upcoming exams, notices).
- **Admissions** — manage admission inquiries, applications, and enrollment.
- **Student management** — student records, profiles, documents, and history.
- **Staff management** — teacher and staff records, roles, and assignments.
- **Class & section management** — classes, sections, subjects, and teacher assignments.
- **Timetable management** — create and manage class timetables.
- **Attendance** — daily attendance for students and staff.
- **Exams & results** — schedule exams, record marks, and publish results.
- **Fees management** — fee structures, invoices, payments, and receipts.
- **Staff payroll** — salary structures, payroll processing, and payslips.
- **Transport** — routes, vehicles, drivers, and student transport assignments.
- **Library** — book catalog, issue/return, and fines.
- **Notices & communication** — share notices and announcements with parents and staff.
- **Company & session management** — manage multiple companies/schools, academic sessions, and AMC details.
- **Reports** — academic, financial, attendance, and operational reports.
- **Shared web UI** — Razor views, shared layout, pagination helper, and client-side validation.
- **Responsive design** — mobile-ready layout for staff and parents.

> Feature descriptions are based on the controllers, domain models, services, and views present in this repository. Actual permissions and backend behavior may depend on the connected SchoolERP Web API and the underlying database.

## Technology stack

- C# and .NET Framework 4.8 (or `<your target framework>`)
- ASP.NET MVC with Razor views
- Visual Studio solution (`SchoolERP.sln`)
- Dependency injection configured through Unity
- **Database-first approach** with Entity Framework (EDMX/Code First from Database)
- **ADO.NET** and **Stored Procedures** for complex queries and operations
- HTTP client/service layer for communicating with the SchoolERP Web API
- HTML, CSS, Bootstrap, JavaScript, and jQuery-based MVC views

## Solution structure

```text
V4/
├── SchoolERP.sln
├── SchoolERP/                            # ASP.NET MVC web application
│   ├── Controllers/                      # MVC request handling
│   ├── Views/                            # Razor UI pages
│   ├── App_Start/                        # Routes, filters, Unity setup
│   ├── Config/                           # Environment-specific app settings
│   └── Web.config
├── SchoolERP.Domain/                     # Domain models and list/pagination models

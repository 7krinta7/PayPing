# PayPing — Project Status

Last Updated: June 2026 (Phase 9 — MVP Polish complete)

---

# Project Overview

PayPing is a SaaS platform that helps businesses automatically send payment reminders for invoices.

Current focus:

Build a production-ready MVP with powerful reminder scheduling before introducing payments or premium plans.

---

# Tech Stack

## Frontend

- React (Vite)
- React Router
- Axios
- CSS
- Existing internal design system

## Backend

- Node.js
- Express
- MongoDB
- Mongoose
- JWT Authentication
- Cron Jobs

---

# Core Principles

- Never fabricate business data.
- Never create fake analytics.
- Never invent backend functionality.
- Never invent API endpoints.
- Reuse existing architecture whenever possible.
- Prefer extending existing components over creating duplicates.
- Keep the UI consistent with the existing design system.

---

# Completed Features

## Authentication

✅ Login

✅ Register

✅ JWT Authentication

✅ Protected Routes

---

## Dashboard

✅ Dashboard layout

✅ Navigation

✅ Responsive layout

---

## Clients

✅ Full CRUD

✅ Validation

✅ Responsive UI

---

## Invoices

✅ Full CRUD

✅ Client association

✅ Status management

✅ Invoice Detail page

---

## Reminder Engine

### Legacy Scheduler

✅ Daily overdue reminders

### Rule-Based Scheduler

✅ ReminderRule CRUD

✅ Before due date

✅ On due date

✅ After due date

✅ Scheduler Service

### Reminder History

✅ ReminderHistory model

✅ Delivery history

✅ Invoice timeline

✅ Success/Failure tracking

---

## Reminder Rules UI

✅ Create Rule

✅ Edit Rule

✅ Delete Rule

✅ Enable / Disable

✅ Empty State

✅ Mobile Responsive

---

## Settings

### Profile

✅ Business Name

✅ Email

✅ Save Profile

---

### Password

✅ Change Password

---

### Email Template

✅ Subject + Body editor

✅ Variable sidebar (businessName, clientName, invoiceAmount, dueDate, invoiceDescription)

✅ Live Preview (updates on every keystroke)

✅ Save

✅ Reset to Default

✅ Send Test Email (preview only — no history)

---

### Notification Preferences

✅ Email Toggle

✅ WhatsApp placeholder

---

## Reminder Dashboard

✅ Overview stats (active rules / sent today / failed / pending)

✅ Recent Reminder Activity

✅ Upcoming Reminder Queue (preview only)

✅ Reminder Rules Preview

✅ Dedicated Reminder Rules page

---

## MVP Polish (Phase 9)

✅ Centralised `formatApiError` helper — network / 401 / 403 / 5xx / server message routing

✅ Consistent error messages wired across every fetch path (login, register, clients, invoices, reminders, dashboard, settings, email template, password)

✅ ConfirmDialog — ESC to cancel + auto-focus the safe (cancel) button

✅ Skip-to-main-content link + `<main tabIndex={-1}>` for keyboard users

✅ Sidebar toggle ARIA (`aria-expanded`, `aria-controls`, `aria-label`)

✅ NavLink `aria-current="page"` on every section

✅ Add-Client link in the InvoiceForm client picker points to /clients with helpful helper text

✅ Client-side search on the Clients page (name / email / phone)

✅ Reminder history on InvoiceDetailPage bounded to 25 rows

✅ Settings page input skeletons replace `Loading…` text placeholders

✅ Full-page NotFound (404) card with back-to-dashboard CTA

---

## Production Hardening

✅ Helmet

✅ Rate Limiting

✅ Validation Middleware

✅ Central Error Handler

✅ Logger

✅ Health Endpoint

✅ Environment Validation

✅ Docker Support

---

# Existing Backend APIs

## Authentication

✅ Login

✅ Register

---

## User

✅ GET /api/user/me

✅ PATCH /api/user/profile

✅ PATCH /api/user/password

✅ GET /api/user/notifications

✅ PATCH /api/user/notifications

---

## Clients

✅ CRUD

---

## Invoices

✅ CRUD

---

## Reminder Rules

✅ GET

✅ POST

✅ PATCH

✅ DELETE

---

## Reminder History

✅ List

✅ Invoice Filter

✅ Single Record

✅ Overview counters (dashboard)

✅ Upcoming queue preview (dashboard)

---

## Email Template

✅ GET /api/email-template

✅ PATCH /api/email-template

✅ User-customisable subject + body

✅ Variable substitution in scheduler

✅ Defaults preserved when template is empty

✅ POST /api/email-template/test (preview-only send)

---

## Health

✅ GET /health

---

# Current Architecture

User

↓

Client

↓

Invoice

↓

ReminderRule

↓

ReminderScheduler

↓

Email Sender

↓

Email Template (per user, rendered with variables)

↓

ReminderHistory

↓

Invoice Timeline

---

# Current Phase

Phase 9

MVP Polish

---

# Immediate Roadmap

1. Email Templates ✅
2. Reminder Dashboard ✅
3. Timezone & Business Hours
4. MVP Polish ✅ (this phase)
5. Deploy MVP
6. WhatsApp Integration
7. Billing
8. Advanced Analytics

---

# Deferred Features

These intentionally wait until after MVP deployment.

- Billing
- Payments
- Subscription Plans
- Premium Features
- Advanced Analytics
- Repeat Reminders

---

# Known Technical Debt

- Snapshot ReminderRule fields into ReminderHistory
- Redis-backed Rate Limiter
- CI/CD Pipeline
- Automated Test Suite
- Production Email Provider
- Request Correlation IDs

---

# Current Goal

Ship the MVP.

Focus on features users interact with.

Avoid adding monetization until real users are using the product.
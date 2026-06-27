# PayPing AI Context

Read this file before making any code changes.

---

# Development Philosophy

This project follows an incremental development approach.

Prefer extending existing functionality over rewriting working code.

Avoid architectural changes unless they are clearly justified.

---

# Coding Rules

Never fabricate data.

Never create placeholder business records.

Never invent backend APIs.

Never invent MongoDB models.

Never create fake statistics.

Never create fake analytics.

Never fake reminder history.

Only expose information that actually exists.

---

# UI Rules

Reuse the existing design system.

Reuse:

- typography
- spacing
- colors
- shadows
- border radius
- buttons
- cards
- badges
- tables
- loading skeletons
- alerts

Do not introduce a new design language.

---

# Backend Rules

Reuse existing:

- Models
- Routes
- Services
- Middleware
- Validation
- Error handling

Avoid duplicate logic.

Keep Reminder Scheduler centralized.

ReminderRule defines scheduling.

ReminderHistory records execution.

Invoice stores business state.

---

# Frontend Rules

Reuse existing API services.

Keep components focused.

Prefer composition over duplication.

Keep CSS scoped.

Avoid unnecessary dependencies.

---

# Reminder System Rules

ReminderRule

Defines:

- offset
- channel
- enabled

ReminderScheduler

Decides when reminders should be sent.

ReminderHistory

Stores what actually happened.

Do not duplicate scheduler logic.

Do not duplicate ReminderHistory logic.

---

# Verification Rules

Verify only code changed in the current phase.

Do not rerun full-project verification.

Do not rerun production hardening.

Do not rerun scheduler verification.

Assume previously verified functionality remains correct unless affected by the current change.

If verification becomes blocked by local machine issues:

Stop.

Report the issue.

Do not spend time debugging the user's operating system.

If the backend is already running and reachable, reuse it.

Do not kill or restart the server unless your code changes require a restart.

Do not debug shell quoting issues, Windows process management, or local machine configuration.

If verification is blocked by the local environment rather than application code, stop and report the issue.
---

# Development Workflow

Before coding:

1. Read PROJECT_STATUS.md
2. Inspect existing code
3. Reuse architecture

After coding:

1. Build affected project(s)
2. Verify only affected functionality
3. Update PROJECT_STATUS.md
4. Summarize changes

---

# Current Product Direction

Current priority:

Deliver a production-ready MVP.

Current priorities:

- Reminder Dashboard
- Email Templates
- Deployment
- User Experience

Not currently prioritised:

- Billing
- Payments
- Premium Plans

These will be implemented after real users begin using PayPing.

---

# General Principles

Keep implementations simple.

Prefer maintainability over cleverness.

Do not over-engineer.

Avoid premature optimization.

Follow existing project conventions.

Preserve backward compatibility whenever possible.

## Verification Philosophy

Verification should be proportional to the size of the change.

For UI-only changes:
- Build frontend.
- Verify affected page.
- Stop.

For backend endpoints:
- Test new endpoints.
- Verify affected logic.
- Stop.

For scheduler changes:
- Verify only scheduler behaviour.

Do not build extensive custom verification scripts unless explicitly requested.

Prefer code inspection over writing large verification harnesses.

Target verification time:
- Small feature: under 5 minutes
- Medium feature: under 10 minutes
- Large feature: under 15 minutes

If verification exceeds these targets because of tooling or environment issues, stop and report the issue.
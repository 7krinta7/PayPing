# PayPing API reference

Base URL: `http://<host>:<port>/api`

All authenticated routes require a `Authorization: Bearer <jwt>` header. The JWT is issued by `/api/auth/login` or `/api/auth/register` and expires 24h after issue.

## Conventions

- **Content type**: `application/json` for all request bodies.
- **Dates**: ISO 8601 (`2025-01-31T00:00:00.000Z`). The create-invoice endpoint accepts `YYYY-MM-DD`.
- **Errors**: Non-2xx responses are `{ "message": "<reason>" }`. 5xx responses additionally include `"requestId"` for support tickets.
- **Rate limits**:
  - `/api/auth/*` — 10 requests / 15 min / IP.
  - `PATCH /api/user/password` — 5 requests / 15 min / IP.
  - All `/api/*` — 300 requests / min / IP (defensive ceiling).
- **ObjectId path params**: any malformed id returns `400 { "message": "<field> must be a valid id" }`.

---

## Health

### `GET /health`
Liveness probe. No auth, no DB dependency.

Response `200`:
```json
{ "status": "ok", "uptime": 1234.5, "timestamp": "2025-01-31T10:00:00.000Z" }
```

---

## Auth (`/api/auth`)

### `POST /api/auth/register`
Create a new account and receive a JWT.

Request body:
```json
{ "email": "user@example.com", "password": "minimum-8-chars" }
```

Response `201`:
```json
{ "token": "<jwt>" }
```

Errors:
- `400` — email/password missing, malformed email, password < 8 chars.
- `409` — email already registered.

### `POST /api/auth/login`
Exchange credentials for a JWT.

Request body:
```json
{ "email": "user@example.com", "password": "plain-text-password" }
```

Response `200`:
```json
{ "token": "<jwt>" }
```

Errors:
- `400` — missing fields.
- `401` — invalid credentials (same message for unknown email and bad password).

---

## User (`/api/user`) — authenticated

### `GET /api/user/me`
Fetch the current user's safe profile fields.

Response `200`:
```json
{
  "email": "user@example.com",
  "businessName": "Acme Inc.",
  "entitlements": { "emailReminders": true, "whatsappReminders": false },
  "notificationPreferences": { "email": true, "whatsapp": false }
}
```

### `PATCH /api/user/profile`
Update editable profile fields. Currently only `businessName`.

Request body:
```json
{ "businessName": "Acme Inc." }
```

Response `200`:
```json
{ "message": "Profile updated", "email": "...", "businessName": "Acme Inc." }
```

Errors:
- `400` — `businessName` not a string or longer than 120 chars.
- `400` — request includes `email` or `password` (rejected explicitly).

### `PATCH /api/user/password`
Change the authenticated user's password.

Request body:
```json
{ "currentPassword": "old-password", "newPassword": "new-password-8+" }
```

Response `200`:
```json
{ "message": "Password updated" }
```

Errors:
- `400` — `currentPassword` or `newPassword` missing/blank or `newPassword` < 8 chars.
- `400` — `currentPassword` does not match.

### `PATCH /api/user/notifications`
Toggle notification preferences. Only `email` is editable today.

Request body:
```json
{ "email": true }
```

Response `200`:
```json
{
  "message": "Notification preferences updated",
  "notificationPreferences": { "email": true, "whatsapp": false }
}
```

Errors:
- `400` — `email` not a boolean.
- `403` — user is not entitled to email reminders.

---

## Clients (`/api/clients`) — authenticated

### `POST /api/clients`
Create a client.

Request body:
```json
{ "name": "Acme Corp", "email": "billing@acme.com", "phone": "+91-9999999999" }
```

- `name`: required string, max 120 chars.
- `email`: optional, must be a valid email if present, max 254 chars.
- `phone`: optional string, max 32 chars.

Response `201`: the created client document.

### `GET /api/clients`
List the current user's clients. Response `200`: client array.

### `PATCH /api/clients/:id`
Partial update. All fields optional; same validation as POST. Response `200`: `{ message, client }`.

### `DELETE /api/clients/:id`
Delete a client. Response `200`: `{ message: "Client deleted" }`. Returns `404` if not found or not owned by the user.

---

## Invoices (`/api/invoices`) — authenticated

### `POST /api/invoices`
Create an invoice.

Request body:
```json
{
  "client": "<clientId>",
  "amount": 1999.50,
  "dueDate": "2025-02-15",
  "description": "Web design services — January 2025"
}
```

- `client`: required ObjectId of an existing client owned by the user.
- `amount`: required number > 0.
- `dueDate`: required ISO 8601 date (YYYY-MM-DD accepted).
- `description`: optional string, max 1000 chars.

Response `201`: the created invoice document.

### `GET /api/invoices`
List all invoices for the current user, with `client` populated (`name`, `email`).

### `GET /api/invoices/pending`
List only `status: "pending"` invoices, with `client` populated.

### `PATCH /api/invoices/:id`
Partial update. `amount` if present must be > 0. Editing a paid invoice returns `400`.

### `PATCH /api/invoices/:id/pay`
Mark an invoice paid. Sets `status: "paid"` and `paidAt: <now>`. Idempotent — returns the same envelope for already-paid invoices.

### `DELETE /api/invoices/:id`
Delete an invoice. Returns `404` if not found or not owned by the user.

---

## Reminder rules (`/api/reminder-rules`) — authenticated

Rules define when a reminder fires relative to an invoice's due date. Email rules are active today; WhatsApp rules are recorded as `failed` until WhatsApp is enabled.

### `POST /api/reminder-rules`
Create a rule.

Request body:
```json
{
  "name": "3 days before due",
  "offsetDays": -3,
  "channel": "email",
  "enabled": true,
  "repeat": false,
  "repeatIntervalDays": 7
}
```

- `name`: optional string, max 120 chars.
- `offsetDays`: required integer, `[-365, 365]`.
- `channel`: optional, one of `email`, `whatsapp`. Defaults to `email`.
- `enabled`: optional boolean, default `true`.
- `repeat`: optional boolean. Reserved for future phases.
- `repeatIntervalDays`: optional integer `[1, 365]` or `null`. Reserved for future phases.

Response `201`: the created rule document.

### `GET /api/reminder-rules`
List the current user's rules, sorted by `offsetDays ASC, createdAt ASC`.

### `PATCH /api/reminder-rules/:id`
Partial update. Any subset of the fields above; user-supplied values pass through the same validators as POST.

### `DELETE /api/reminder-rules/:id`
Delete a rule. Response `200`: `{ message: "Reminder rule deleted" }`.

---

## Reminder history (`/api/reminder-history`) — authenticated

Append-only audit log of reminder delivery attempts (sent / failed).

### `GET /api/reminder-history?invoice=<id>&limit=<n>`
List history for the current user.

- `invoice` (optional): scope to a single invoice.
- `limit` (optional): default 200, capped at 500.

Response `200`: array of history records sorted by `sentAt DESC, createdAt DESC`.

### `GET /api/reminder-history/:id`
Retrieve a single record.

Response `200`: the record. `404` if not found or not owned by the user.

---

## Dashboard (`/api/dashboard`) — authenticated

### `GET /api/dashboard/stats`
Aggregate counts and totals for the current user's workspace.

Response `200`:
```json
{
  "totalClients": 12,
  "pendingInvoices": 7,
  "overdueInvoices": 3,
  "outstandingAmount": 45600.50
}
```

---

## Misc

### `GET /api/protected`
Sanity-check route used during early development to verify JWT middleware. Returns `{ message, userId }` for any authenticated caller.

### `GET /`
Plain-text banner: `"PayPing server running"`. Useful for browser-based liveness checks.
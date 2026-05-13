# Taxi Platform Web Admin

React + TypeScript + Vite admin panel for a taxi platform.

## Stack

- React, TypeScript, Vite
- React Router
- TanStack Query
- Axios
- Zustand
- Tailwind CSS
- React Hook Form + Zod
- WebSocket client

## Run

```bash
npm install
npm run dev
```

Default URL: `http://localhost:5173`.

## Environment

Copy `.env.example` if custom values are needed.

```env
VITE_API_BASE_URL=http://localhost:8080/api/v1
VITE_WS_URL=ws://localhost:8080/ws
VITE_USE_MOCK_API=true
```

`VITE_USE_MOCK_API=true` lets the frontend run without backend. Use any code on `/verify-code` in mock mode.

Set `VITE_USE_MOCK_API=false` to use the real Go API.

## Implemented Areas

- JWT admin auth flow
- Protected routes
- RBAC menu and route guards
- Admin layout with sidebar and header
- Light/dark theme toggle
- Orders table, order card, dispatcher order creation
- Driver assignment to order
- Drivers table, driver card, document moderation
- Cars, passengers, taxi parks tables
- Tariff management form
- Flexible platform commission settings
- Finance operations and payouts
- Audit logs
- WebSocket service for order, driver status and notification updates
- Mock API layer with typed domain fixtures

## Commission Rules

Default global platform commission is `1%` (`100` basis points).

Priority:

1. driver
2. taxi park
3. tariff
4. city
5. global

The UI stores percent values for admins and sends integer basis points to API-compatible services.

## Quality Checks

```bash
npm run lint
npm run build
```

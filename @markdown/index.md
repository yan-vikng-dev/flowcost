## Flowcost docs index (LLM quick reference)
This file will usually be attached at the beginning of the conversation.
you may choose to read any files mentioned here, depending on the task.
you should always read the core reference.

### Core reference
- **Project context**: ./CONTEXT.md
- **Conventions and rules**: ./RULES.md
- **css/tailwind/shadcn Styleguide**: ./STYLEGUIDE.md

### Frontend (apps/webapp)
- **Features**
  - **Budgets**: ./webapp/budgets.md
  - **Connections**: ./webapp/connections.md
- **UI kit (shadcn)**
  - **Badge**: ./webapp/shadcn/badge.md
  - **Card**: ./webapp/shadcn/card.md
  - **Charts**: ./webapp/shadcn/charts/chart.md, ./webapp/shadcn/charts/bar-chart-3.md, ./webapp/shadcn/charts/bar-chart-7.md, ./webapp/shadcn/charts/pie-chart-3.md, ./webapp/shadcn/charts/pie-chart-9.md
  - **Table**: ./webapp/shadcn/table.md
  - **Date picker**: ./webapp/shadcn/date-picker.md
  - **Combo box**: ./webapp/shadcn/combo-box.md
  - **Progress**: ./webapp/shadcn/progress.md
  - **Forms**: ./webapp/shadcn/forms/field.md, ./webapp/shadcn/forms/tanstack-form.md
  - **Toast/Popover**: ./webapp/shadcn/toast.md, ./webapp/shadcn/popover-in-dialog.md
- **TanStack server functions**: ./webapp/tanstack/tanstack-server-functions.md

### Backend (apps/backend-service)
- **HTTP handlers**: `apps/backend-service/src/handlers/`
- **WhatsApp**: `apps/backend-service/src/handlers/whatsapp/`
- **Hono app**: `apps/backend-service/src/hono/app.ts`
- **Workflows**: `apps/backend-service/src/workflows/`

### Shared packages
- **Database & schemas**: `packages/data-ops/src/drizzle/schemas/`
- **Auth & DB setup**: `packages/data-ops/src/auth/`, `packages/data-ops/src/database/`
- **Shared constants & crypto**: `packages/shared-config/src/`

### Build & deploy
- **Monorepo**: `turbo.json`, `pnpm-workspace.yaml`
- **Webapp deploy**: `apps/webapp/wrangler.jsonc`
- **Backend deploy**: `apps/backend-service/wrangler.jsonc`

### Usage
- **Prompting tip**: Quote only the most relevant bullets/files above for your task.



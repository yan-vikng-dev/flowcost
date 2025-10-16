import { createFileRoute } from '@tanstack/react-router'
import { EntriesForm } from './-components/entriesForm'
import { MonthlyEntriesTable } from './-components/entriesTable/index.js'

export const Route = createFileRoute('/_auth/app/')({
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <div className="space-y-4">
      <EntriesForm />
      <MonthlyEntriesTable />
    </div>
  )
}

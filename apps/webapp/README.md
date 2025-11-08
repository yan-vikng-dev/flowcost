# Webapp

## Design principles
- the majority of the data is current-month centric. budgets, entries, dashboards, everything is fetched for the current month
- entries are keyed to a date string (YYYY-MM-DD), independent of exact time. user timezone is used on creation and fetching for that purpose.
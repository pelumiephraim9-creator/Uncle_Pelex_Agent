# Pelex Business Agent — Locked Architecture

Status: approved by the product owner on 11 November 2026. This is the acceptance standard for every supported Business Agent business type.

## 1. Non-negotiable data boundary

A business project is one independent business. A workspace owner may create multiple projects, including different business types in the same account. Every project owns its:
- business type and enabled modules;
- reporting currency, startup capital, setup profile and reporting cycle;
- ledger transactions, uploads, operational records and agreements;
- customers, suppliers, products, schedules, reports, calculations and dashboard metrics.

No transaction, upload, agreement, operational record, metric, chart or assistant context may cross project boundaries. Every write and read must be scoped by both workspace ID and project ID. Database composite foreign keys and server-side checks enforce this boundary; the frontend selection alone is not a security boundary.

A portfolio view may show projects side by side. It must not combine incompatible currencies or business measures into one misleading total.

## 2. Product navigation and responsibilities

### Projects
Projects is the only place to create and configure a business. Create one project per business. Editing an existing project updates that project ID; it must not silently create a duplicate. Once records exist, changing the business type or currency is blocked; create a separate project instead.

### Data Entry
Data Entry is the common monthly transaction and operational-record workspace. Every entry must have a selected project, date, module/category and project currency. The project-specific modules and agreement workflow appear only when enabled by that project's business type. Upload confirmation must keep every imported row attached to the project selected at upload time.

### Dashboard
The dashboard summarizes one selected project. Month selection filters monthly financial and operational reporting. Year views and monthly drill-downs remain within the same project. A request to analyse multiple projects without a selected project must ask the user to choose one.

### Business Agent
The assistant receives only the selected project's data, business-type configuration and selected reporting period. It must not use sibling-project, workspace-wide or unassigned records as a fallback. It must distinguish lifetime totals from selected-month figures and avoid double-counting the same event entered in both the ledger and an operational module.

## 3. Business-type-aware modules

The enabled modules are read from `public.business_types`; they are the source of truth for what a project may record. The supported selections currently include:
- General business
- Loans and microfinance
- Savings, contributions and cooperatives
- Retail and local store
- Supermarket and large retail
- Wholesale and distribution
- Manufacturing and production
- Restaurant and food service
- Pharmacy and clinic supplies
- Hotel, rentals and short-let
- Property and rent management
- Transport and logistics
- Professional services and agencies
- Schools and training centres
- Online store / e-commerce
- Farming and agriculture
- Construction and building
- Fashion and clothing retail

The UI offers only modules enabled for the selected type. The database write function validates both the module and its allowed record types. Each type gets its enabled module breakdown; specialized metrics are calculated only when the required source records exist. Unknown costs must remain unknown, not silently become zero.

Examples:
- Lending: principal disbursed and repaid, interest income, agreement schedules, overdue amounts, receivables and customer savings. Principal disbursement is not operating expense or profit.
- Supermarket/retail: POS sales, refunds, inventory in/out/waste, stock-on-hand quantity/value and recorded cost of goods. Gross profit is not claimed unless cost data is recorded.
- Restaurant: sales, recorded food cost, stock and operating expenses.
- Other types: their enabled operational modules are reported separately by module and record type, rather than forced into a generic lending or retail workflow.

## 4. Database and backend invariants

- `business_projects` is the business/project root.
- `ledger_entries`, `uploads`, `agreements` and `business_project_records` carry project and workspace ownership.
- Composite foreign keys prevent a project ID from being paired with another workspace ID.
- Project update RPCs preserve the existing project ID and lock type/currency after records exist.
- Project dashboard summaries validate workspace membership and project ownership. File fingerprints are unique within a project, not across the workspace, so the same source file may legitimately be used by two different businesses; folder-sync memory and duplicate checks are project-specific. Storage object paths include both workspace and project IDs, and the workspace upload bucket's read/write/delete policies validate that project path against the business project and upload metadata.
- Business Agent context filters ledger, operational records, uploads, agreements and schedules by the selected project.
- Selected month is validated as `YYYY-MM`; monthly data is filtered by date range.
- Existing RLS policies, account records and unrelated agent data must not be weakened or modified to implement this architecture.

## 5. Acceptance tests before declaring the work complete

1. Create two projects in one workspace with different business types and currencies.
2. Create a transaction, upload and operational record in Project A; verify none appears in Project B.
3. Create an agreement in a lending project; verify it cannot appear in another lending or non-lending project.
4. Change the selected project and verify Data Entry, modules, Dashboard and Business Agent context all change to that project.
5. Change the reporting month; verify ledger rows, operational records and monthly metrics use the selected month only.
6. Verify year summaries are project-scoped and do not combine different project currencies.
7. Verify a project edit updates the same project ID; a used project's business type or currency cannot be changed.
8. Verify every business type exposes only its enabled modules and invalid module/record-type combinations are rejected by the database.
9. Verify the portfolio never sums incompatible business-specific metrics.
10. Run end-to-end tests with real authenticated workspace membership before marking production deployment complete.

This document is the durable product and engineering reference for continuing the Business Agent in a new conversation.

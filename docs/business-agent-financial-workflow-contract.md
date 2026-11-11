# Business Agent financial workflow contract

This document is the shared acceptance contract for the Business Agent frontend and its Supabase-backed financial workflows. It is not a substitute for a live database migration or an end-to-end test.

## Product scope
The Business Agent serves general businesses. Lending is an optional module, not the assumed business type. Business types and enabled modules must come from the workspace configuration rather than a small hardcoded list.

## Financial definitions
- Startup capital / owner contribution: funding, not operating revenue.
- Cash balance: opening cash plus actual cash inflows less actual cash outflows.
- Operating profit: recognized operating revenue less recognized operating expenses.
- Loan principal disbursed: cash outflow and receivable/asset movement, not operating expense.
- Principal repayment: cash inflow and receivable reduction, not revenue.
- Interest received: income when actually earned/recorded.
- Customer savings/deposits held: liability, not income.
- Transfers between own accounts: neither revenue nor expense.
- Receivables, payables, inventory/assets and liabilities must not be collapsed into profit.

## Frontend workflow requirements

### Setup
- Capture business name, business type, configured reporting currency and optional startup/funding details.
- Do not force loan setup or a fixed interest rate.
- Clearly distinguish opening capital, current cash and net profit.
- Preserve existing project setup and agreement features during migration.

### Data entry
- Provide a chronological transaction register with date, project, category, transaction class, party, amount, currency, status and source/attachment.
- Support sales, other income, expenses, owner capital, transfers, receivables/payables, and optional financing/savings movements.
- Validate amount, date, currency and classification before saving.
- Ambiguous documents and imports must remain in review until the user confirms the detected fields and direction.
- Show duplicate warnings and do not silently import the same source twice.
- CSV parsing must support quoted commas, escaped quotes and embedded newlines; date and amount parsing must not silently reinterpret locale-specific values.

### Monthly analysis
Show separate figures for opening cash, owner contributions, operating revenue, operating expenses, net operating profit, financing principal movements, savings/deposits held, other cash movements and closing cash. Show currency and reporting period on every summary. Never calculate profit by subtracting every cash outflow from every cash inflow.

### Yearly project management
- Keep each business project isolated.
- Show monthly trend summaries and annual totals.
- Separate profit, cash, receivables, payables, liabilities and funding.
- Explain incomplete data and never invent values.

### Loans (optional module)
- Each agreement controls its own principal, rate, method, rate basis, cycle, term, dates and savings treatment.
- Principal and interest must be accounted for separately.
- Require confirmation before creating an agreement, recording a repayment or releasing savings.
- Prevent duplicate payment recording and verify schedule totals after each operation.

## Backend contract
- All reads and writes are scoped to the authenticated workspace and selected project.
- Viewers are read-only; owners/editors can record data according to workspace roles.
- Financial writes are idempotent and auditable.
- Journal entries balance; posted entries are not silently overwritten or deleted.
- Original transaction currency is retained. Currency conversion requires an explicit rate, date and reporting currency.
- Historical records are not automatically reclassified during migration.
- Existing ledger and agreement tables remain intact during the compatibility period.

## Release gates
1. Unit tests for accounting classification and calculations.
2. Database tests for workspace isolation, role permissions, idempotency and balanced journal entries.
3. Frontend tests for validation, confirmation, responsive layout and error visibility.
4. End-to-end tests covering setup, data entry, monthly analysis, yearly project view and optional loan flows.
5. Verify deployed frontend, backend and database migration separately; a commit is not proof of deployment.


## Approved multi-project architecture (2026-11-11)

This section supersedes any older wording that treats one workspace as one business setup.

- A workspace is the owner's account boundary. It may contain multiple independent business projects.
- A business project is the unit of business setup, configuration, currency, reporting cycle, ledger, operational records, agreements, uploads, dashboard and reporting.
- The selected row in `business_types` determines the project's enabled modules and setup fields. The frontend must load this catalogue dynamically; it must not hardcode only lending and retail.
- The project stores its own `business_type`, `currency`, `reporting_cycle` and `profile`. Workspace settings are account/workspace compatibility defaults only and must not drive project-level calculations.
- Data Entry is a transaction workflow. Each new transaction requires a project ID. A month/year is a reporting filter within the selected project, never a business project.
- Project-level operational data is stored in `business_project_records`, scoped by both `workspace_id` and `project_id`, and writes are allowed only for modules enabled by that project's business type.
- Uploads, loan agreements, POS devices, pairing codes and all generated ledger entries must retain the same project ID end to end.
- Project IDs and workspace IDs are validated together by composite foreign keys. New ledger entries, uploads, agreements, devices and pairing codes cannot be saved without a project.
- Legacy workspace-wide summaries must fail safely when more than one project makes the intended business ambiguous. Portfolio views may list projects, but must not combine incompatible financial measures or currencies.
- Lending-specific agreements, repayments, principal, interest and savings remain tied to the lending project. Supermarket, retail, hospitality, education, logistics, property, production and other modules must use the modules enabled for their selected business type.
- Deleting or renaming a project must never silently reassign its transactions or operational records to another project.

## New isolation release gates

1. Create two projects of different types under one workspace and confirm both configurations remain distinct after refresh and sign-in.
2. Save transactions and uploads to each project; verify project A never returns project B's rows, summaries or files.
3. Attempt to submit a transaction, upload confirmation, agreement, device or pairing code with a missing or foreign project ID; the database must reject it.
4. Verify a module write succeeds only when its module is enabled for the selected business type.
5. Verify month/year summaries and all report queries include the selected project ID.
6. Verify lending repayment and savings-release ledger entries use the agreement's project ID.
7. Verify the 17 business-type catalogue rows remain available and are loaded dynamically.
8. Run frontend JavaScript tests, database isolation tests, and end-to-end tests before declaring the Business Agent release complete.

# Pelex No-Regression Change Control

This is a mandatory engineering rule for every future change to the General Agent and its add-ons.

## 1. Freeze the working baseline first
- Identify the exact repository, branch, current commit, affected files, and the feature being changed.
- Read the current implementation and its tests before editing. Do not work from an old screenshot or remembered snippet alone.
- Record adjacent features, API routes, database objects, storage buckets, and links that must remain unchanged.

## 2. Make the smallest isolated change
- Change only the code needed for the requested task.
- Do not replace whole files or copy an older add-on wholesale when the live application already contains newer implementations.
- Keep the General Agent, Business Agent, project dashboard, and other agents separate unless a shared change is explicitly required.
- Do not change existing backend URLs, webhook URLs, schedule links, source links, image URLs, model routes, or connector endpoints without explicit approval.
- Do not migrate data, delete records, reset tables, alter RLS, or change retention rules as a side effect of a frontend fix.
- Never use global fetch interception, fake HTTP success responses, or blanket error suppression to hide failed operations.

## 3. Preserve project and user boundaries
- Every business-specific read, write, approval, knowledge item, slip, report, and attachment must be scoped to the selected project as well as its workspace and authenticated owner where applicable.
- Never silently select the first project in a workspace when a project is required.
- Private chat attachments must remain in the private storage bucket and use owner-scoped paths and policies.
- Preserve existing links and service integrations exactly unless the requested change explicitly requires a verified migration.

## 4. Persistence requirements
- Await authentication readiness before attempting authenticated writes.
- Persist the user's message before requesting the assistant response.
- Keep a stable message ID across retries and verify uncertain writes before retrying.
- Capture the chat ID and user ID for the turn; never let a conversation switch redirect an in-flight save.
- Keep failed writes in a durable local retry queue and show honest status; never report a failed write as successful.
- Store image attachments privately and persist their storage paths with the message. Recreate signed URLs when a chat is reopened.
- Refresh/reopen tests must verify both user and assistant messages, including image attachments.

## 5. Required regression audit before merge
Run the focused tests and inspect the diff for:
- the requested feature;
- message send, image send, refresh, chat reopen, and history persistence;
- authentication, RLS, storage policies, and owner isolation;
- project switching, selected-project filtering, and separate currencies;
- schedules, connectors, webhooks, source links, and existing backend routes;
- mobile, tablet, and desktop layouts;
- accessibility, duplicate IDs, label associations, console errors, and failed network requests.

Do not mark a task complete while any required test is failing. Add a regression test for every bug fixed.

## 6. Deployment and rollback
- Verify the exact commit and successful CI checks.
- Verify the hosting provider has published that commit before claiming the live application is fixed.
- If a regression appears, stop unrelated work, identify the last known-good commit, and roll back or repair only the affected change.
- Report separately what is committed, what passed tests, what is deployed, and what still depends on an external service.

**Default rule:** a new feature is not complete if it breaks an existing feature. Preserve first; extend second.

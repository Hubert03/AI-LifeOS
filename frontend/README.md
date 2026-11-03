# Frontend

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 22.2.2.

## Development server

To start a local development server, run:

```bash
ng serve
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Building

To build the project run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

The `public/web.config` file is copied into the production output. Keep it when
deploying to IIS/MonsterASP.NET: it rewrites client-side Angular routes (such as
`/goals`) to `index.html` while leaving real files and directories untouched.
Without this server fallback, refreshing a nested route returns an IIS 404.
For Angular's application builder, deploy the **contents** of
`dist/frontend/browser` to the site's document root, including `index.html` and
`web.config`; do not deploy the parent `dist/frontend` directory as the site
root. The IIS URL Rewrite module must be enabled on the host. Session storage
does not fix this: the server must return `index.html` for a direct request to a
client-side route before Angular can restore the page.

## Running unit tests

To execute unit tests with the [Vitest](https://vitest.dev/) test runner, use the following command:

```bash
ng test
```

## Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## AI planning, Notes, and workspace history

For safe production database upgrades, use the forward-only procedure in
[`database/DEPLOYMENT.md`](../database/DEPLOYMENT.md). Do not restore a local
database backup over a live database that contains unique user data.

The AI planner sends the user's prompt to OpenRouter through the ASP.NET API. Its URL, model, and DPAPI-encrypted API key are stored in the local `AiLifeOS` database. Signed-in users can view and update this shared provider configuration in Settings; the API key is never returned to the browser or written to Angular files or source control. The API key is encrypted with Windows DPAPI for the current Windows user.

The authenticated `/copilot` screen builds a daily plan from the signed-in user's bounded set of open tasks, active goals, scheduled reminders, and recent or pinned notes. The API validates every cited source against that user's records. Suggested tasks are proposals only: they are created through the existing task API only after the user selects and approves them. No database migration is required. The selected context and optional focus are sent to the configured AI provider; avoid including sensitive information you do not want processed by that provider.

From the workspace folder (`C:\Users\80130\Angular`), apply the additive SQL Server LocalDB update:

```powershell
& 'C:\Program Files\Microsoft SQL Server\Client SDK\ODBC\170\Tools\Binn\SQLCMD.EXE' `
  -S '(localdb)\MSSQLLocalDB' -E -b `
  -i '.\AI-LifeOS\database\004_AddNotesActivityAndTrash.sql'
```

Apply the AI settings table update from `C:\Users\80130\Angular`:

```powershell
& 'C:\Program Files\Microsoft SQL Server\Client SDK\ODBC\170\Tools\Binn\SQLCMD.EXE' `
  -S '(localdb)\MSSQLLocalDB' -E -b `
  -i '.\AI-LifeOS\database\005_AddAiProviderSettings.sql'
```

Apply the app-data stored procedure update after scripts 001 through 005:

```powershell
& 'C:\Program Files\Microsoft SQL Server\Client SDK\ODBC\170\Tools\Binn\SQLCMD.EXE' `
  -S '(localdb)\MSSQLLocalDB' -E -b `
  -i '.\AI-LifeOS\database\006_AppDataStoredProcedures.sql'
```

For account administration and team chat, apply the additive update only after
scripts 001 through 006. It adds administrator/account flags, invitation storage,
chat tables, and the corresponding write procedures:

```powershell
& 'C:\Program Files\Microsoft SQL Server\Client SDK\ODBC\170\Tools\Binn\SQLCMD.EXE' `
  -S '(localdb)\MSSQLLocalDB' -E -b `
  -i '.\AI-LifeOS\database\007_AddTeamAccountsAndChat.sql'
```

Apply the admin access-log and role/team updates after script 007 and before
deploying the updated API:

```powershell
& 'C:\Program Files\Microsoft SQL Server\Client SDK\ODBC\170\Tools\Binn\SQLCMD.EXE' `
  -S '(localdb)\MSSQLLocalDB' -E -b `
  -i '.\AI-LifeOS\database\008_AdminAccessLogSchema.sql'

& 'C:\Program Files\Microsoft SQL Server\Client SDK\ODBC\170\Tools\Binn\SQLCMD.EXE' `
  -S '(localdb)\MSSQLLocalDB' -E -b `
  -i '.\AI-LifeOS\database\009_AddTeamsAndAccessRoles.sql'

& 'C:\Program Files\Microsoft SQL Server\Client SDK\ODBC\170\Tools\Binn\SQLCMD.EXE' `
  -S '(localdb)\MSSQLLocalDB' -E -b `
  -i '.\AI-LifeOS\database\010_AddTeamWorkspace.sql'

& 'C:\Program Files\Microsoft SQL Server\Client SDK\ODBC\170\Tools\Binn\SQLCMD.EXE' `
  -S '(localdb)\MSSQLLocalDB' -E -b `
  -i '.\AI-LifeOS\database\011_AddLoginHistory.sql'

& 'C:\Program Files\Microsoft SQL Server\Client SDK\ODBC\170\Tools\Binn\SQLCMD.EXE' `
  -S '(localdb)\MSSQLLocalDB' -E -b `
  -i '.\AI-LifeOS\database\012_AddChatRepliesMentionsAndDeletion.sql'
```

Script 009 adds the Super Admin, Admin, Manager, Team Lead, and User roles,
creates separate organization teams, and upgrades existing administrator
accounts to Super Admin. Script 010 creates shared team tasks, goals and notes;
personal workspace records remain private. Users can edit only team records they
created, while Managers and Team Leads can manage all records in their team.
Script 011 records successful and failed login attempts for known accounts and
adds the administrator login-history view. Back up the production database
before applying scripts 009 through 012 in order.

Script 012 adds message replies, group-member mentions, and soft deletion with
deleted-message placeholders. Authors can delete their own messages; organization
administrators can moderate messages in groups they belong to, and Managers can
moderate messages by members of their own team in groups they belong to.

## Reminders and browser push notifications

Before deploying the reminder-enabled API, back up the database and apply scripts
013 and 014 after scripts 001 through 012, in order:

```powershell
& 'C:\Program Files\Microsoft SQL Server\Client SDK\ODBC\170\Tools\Binn\SQLCMD.EXE' `
  -S '(localdb)\MSSQLLocalDB' -E -b `
  -i '.\AI-LifeOS\database\013_AddRemindersAndPushSubscriptions.sql'
```

```powershell
& 'C:\Program Files\Microsoft SQL Server\Client SDK\ODBC\170\Tools\Binn\SQLCMD.EXE' `
  -S '(localdb)\MSSQLLocalDB' -E -b `
  -i '.\AI-LifeOS\database\014_AddReminderPushDeliveries.sql'
```

The API dispatches due reminders to each subscribed browser using Web Push. Set
`Vapid:Subject`, `Vapid:PublicKey`, and `Vapid:PrivateKey` in the API's secret
configuration (never commit the private key). The subject must be an absolute
`mailto:` or HTTPS URI. `/api/reminders/push-config` reports enabled only when
all three settings are valid. Subscribed browsers can receive notifications
while the site is closed, subject to browser, operating-system, and push-service
delivery policies. Transient delivery failures are retried with backoff.

Do not expose the API until the database update has been applied. Public
self-registration is disabled. Bootstrap the first administrator from the
workspace folder, using the interactive password prompt (do not put a password
in command-line arguments):

```powershell
dotnet run --project '.\backend\AiLifeOS.Api\AiLifeOS.Api.csproj' -- --bootstrap-admin admin@example.com
```

This command creates the initial account when the email is new, or promotes the
existing account with that email. It refuses to run once an administrator
already exists. Administrators can then create accounts with one-time temporary
passwords or send single-use invitations from Team administration.
Open Team administration from the signed-in sidebar (or directly at `/admin`).
That screen contains account creation/invitations, account role and access
controls, team creation/member assignment, chat-group creation, and group
membership management. At least one active administrator is always required.

Workspace records are owned by the authenticated account. Task, goal, note,
activity, and trash API queries scope reads and writes to the signed-in user;
clients cannot choose another account's owner ID. Administrators see an
organization dashboard at Overview with account and work totals, task-status
and weekly-activity charts, and account setup/access indicators. To inspect
individual work, an administrator selects an account; its tasks, goals, and
notes are returned by separate administrator-only, paginated endpoints.
Administrative workspace reads are written to the API logger. Notes and
deleted tasks/goals are included in the selected account's view.

SMTP delivery is configured outside source control using environment variables:
`Email__SmtpHost`, `Email__SmtpPort`, `Email__SmtpUser`,
`Email__SmtpPassword`, `Email__FromAddress`, `Email__EnableSsl`, and
`Email__PublicBaseUrl`. The public base URL must be an absolute HTTP or HTTPS
URL, and should use HTTPS when deployed. Invitations expire after 48 hours;
their tokens are hashed in the database and consumed atomically on acceptance.

Settings can be configured from the signed-in app under Settings. The existing one-time console prompt remains available; stop the API and run it from the workspace folder:

```powershell
dotnet run --project '.\backend\AiLifeOS.Api\AiLifeOS.Api.csproj' -- --configure-openrouter
```

Enter the URL and model or press Enter to accept the defaults, then enter the API key at the hidden prompt. The key is encrypted with Windows DPAPI for the current Windows user before it is saved to SQL Server LocalDB. Run the normal `dotnet run` command afterward. The API must run under the same Windows user that configured the key; moving the database to another Windows account requires configuring the key again. For production, use a managed secret store rather than this local setup flow.

The AI planner only returns a suggested draft; it does not write records until the user reviews and confirms them. It accepts prompts up to 4,000 characters, and limits drafts to 12 tasks and 8 goal milestones so complex requests remain manageable. Plans created from Tasks, Goals, and Notes are saved to their matching sections; Overview can save selected tasks and a goal.

The Notes page includes a personal knowledge assistant. It searches only the signed-in user's existing notes, sends a bounded set of relevant excerpts to the configured OpenRouter model, and returns source buttons that open the cited notes. It does not persist questions or answers and cannot edit notes. Retrieval currently uses keyword matching rather than embeddings; a future semantic-search upgrade can add vector indexing once hosting and provider costs are selected. Prompts and selected note excerpts are sent to OpenRouter, so users should not include sensitive information. Without an API key, notes continue to work, while AI features report that the provider is not configured.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.

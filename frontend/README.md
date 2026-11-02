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

The AI planner sends the user's prompt to OpenRouter through the ASP.NET API. Its URL, model, and DPAPI-encrypted API key are stored in the local `AiLifeOS` database. Signed-in users can view and update this shared provider configuration in Settings; the API key is never returned to the browser or written to Angular files or source control. The API key is encrypted with Windows DPAPI for the current Windows user.

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

Before deploying the reminder-enabled API, back up the database and apply script
013 after scripts 001 through 012:

```powershell
& 'C:\Program Files\Microsoft SQL Server\Client SDK\ODBC\170\Tools\Binn\SQLCMD.EXE' `
  -S '(localdb)\MSSQLLocalDB' -E -b `
  -i '.\AI-LifeOS\database\013_AddRemindersAndPushSubscriptions.sql'
```

Reminders work in the signed-in app without push. To deliver notifications while
the app is closed, configure Web Push VAPID credentials on the API using the
environment variables `Vapid__PublicKey`, `Vapid__PrivateKey`, and optionally
`Vapid__Subject` (an absolute `mailto:` or HTTPS contact URI). Keep the private
key in the host's secret/configuration store; do not commit it. The public key
is returned to the browser by the API. Users must allow notifications in their
browser, and the site must use HTTPS. iOS generally requires the web app to be
installed to the home screen.

The API's reminder worker checks due reminders every 30 seconds. Closed-app
delivery therefore depends on the production host keeping the API process
running and allowing outbound HTTPS requests to browser push services. Verify
those capabilities with the host; a web app cannot reliably create native
Windows or mobile Clock alarms.

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

The AI planner only returns a suggested draft; it does not write records until the user reviews and confirms them. Plans created from Tasks, Goals, and Notes are saved to their matching sections; Overview can save selected tasks and a goal. Prompts are sent to OpenRouter and its selected model provider, so users should not include sensitive information. Without an API key, Notes and workspace history continue to work, but the planner reports that AI is not configured.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.

# Production database updates

The live database contains data that may not exist in a local backup. **Do not
restore a local database backup over the live database to deploy code changes.**
Use forward-only SQL scripts to add or update schema objects while preserving
the current live rows.

## Before applying a script

1. Take a fresh backup of the **live** database using the hosting provider's
   database tools. Keep that backup separate from local backups.
2. If the host allows it, restore that live backup to a separate test database
   and apply the update there first.
3. Inspect the live schema and compare it with the script's prerequisites and
   existence checks. This project does not yet have a migration-history table,
   so do not infer which updates ran from the app version alone.
4. Apply only the missing updates, in numeric order, using the provider's SQL
   tool or an authenticated SQL Server client connection. Never put database
   passwords in source files or command history.

For an existing installation, do **not** run the initial-schema scripts
001-004 blindly: they intentionally stop if their base tables or columns
already exist. Script 006 updates stored procedure definitions and requires
the schema from 001-005. Scripts 007-014 add/verify later team, chat, login,
and reminder schema and update the procedures that belong to those features.
Review each script before reapplying it; the guarded table/column additions
are designed to avoid recreating existing objects, but a pre-existing schema
that differs from the expected one still needs investigation.

## Current feature updates

Apply the relevant scripts only if their objects/definitions are missing or
outdated:

| Script | Adds or updates |
|---|---|
| 006 | Core activity/task/goal/note/provider stored procedures |
| 007 | Team accounts, invitations, chat tables, and account/chat procedures |
| 008 | Administrator access audit log |
| 009 | Teams, access roles, and invitation/admin procedures |
| 010 | Team tasks, goals, milestones, and notes |
| 011 | Login history |
| 012 | Chat replies, mentions, deletion fields, and message procedure |
| 013 | Personal reminders and push subscriptions |
| 014 | Persistent reminder push-delivery outbox |

The Notes Knowledge Assistant searches the existing user's Notes table and
does not add database tables or columns. Its feature therefore needs an API and
frontend deployment, but no database migration.

## Post-update checks

Run read-only checks against the live database before deploying the matching
API. This sample checks the latest reminder feature objects; expand it for any
older feature updates still pending:

```sql
SELECT name
FROM sys.tables
WHERE schema_id = SCHEMA_ID(N'dbo')
  AND name IN
  (
      N'Reminders',
      N'PushSubscriptions',
      N'ReminderPushDeliveries',
      N'Teams',
      N'TeamTasks',
      N'TeamGoals',
      N'TeamNotes',
      N'LoginHistory',
      N'ChatMessageMentions'
  )
ORDER BY name;

SELECT OBJECT_SCHEMA_NAME(object_id) AS SchemaName, name AS ProcedureName
FROM sys.procedures
WHERE name IN
(
    N'ChatMessage_Create',
    N'UserInvitation_Create',
    N'UserInvitation_Consume',
    N'UserAdmin_SetAccess',
    N'Task_Create',
    N'Goal_Create',
    N'Goal_Update',
    N'Note_Create'
)
ORDER BY name;
```

After confirming the database schema, deploy the matching API, restart it, and
verify login plus the features changed by that release. Keep the live backup
until those checks pass. For future releases, add a numbered, forward-only SQL
script and record its application in a migration ledger instead of restoring a
local database snapshot.

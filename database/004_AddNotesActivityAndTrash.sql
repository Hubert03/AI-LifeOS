USE [AiLifeOS];
GO

SET XACT_ABORT ON;
GO

BEGIN TRANSACTION;

IF OBJECT_ID(N'dbo.Tasks', N'U') IS NULL
    THROW 50005, 'dbo.Tasks is missing; apply the initial schema before this migration.', 1;

IF OBJECT_ID(N'dbo.Goals', N'U') IS NULL
    THROW 50006, 'dbo.Goals is missing; apply the Goals schema before this migration.', 1;

IF OBJECT_ID(N'dbo.Notes', N'U') IS NOT NULL
    THROW 50007, 'dbo.Notes already exists; inspect the schema before rerunning this script.', 1;

IF OBJECT_ID(N'dbo.ActivityLog', N'U') IS NOT NULL
    THROW 50008, 'dbo.ActivityLog already exists; inspect the schema before rerunning this script.', 1;

IF COL_LENGTH(N'dbo.Tasks', N'IsDeleted') IS NOT NULL
   OR COL_LENGTH(N'dbo.Tasks', N'DeletedAtUtc') IS NOT NULL
    THROW 50009, 'Task soft-delete columns already exist; inspect the schema before rerunning this script.', 1;

IF COL_LENGTH(N'dbo.Goals', N'IsDeleted') IS NOT NULL
   OR COL_LENGTH(N'dbo.Goals', N'DeletedAtUtc') IS NOT NULL
    THROW 50010, 'Goal soft-delete columns already exist; inspect the schema before rerunning this script.', 1;

ALTER TABLE dbo.Tasks
    ADD IsDeleted bit NOT NULL
        CONSTRAINT DF_Tasks_IsDeleted DEFAULT 0,
        DeletedAtUtc datetime2(0) NULL;

ALTER TABLE dbo.Goals
    ADD IsDeleted bit NOT NULL
        CONSTRAINT DF_Goals_IsDeleted DEFAULT 0,
        DeletedAtUtc datetime2(0) NULL;

CREATE TABLE dbo.Notes
(
    NoteId uniqueidentifier NOT NULL
        CONSTRAINT DF_Notes_NoteId DEFAULT NEWSEQUENTIALID(),
    UserId uniqueidentifier NOT NULL,
    Title nvarchar(200) NOT NULL,
    Content nvarchar(max) NOT NULL,
    Color nvarchar(20) NOT NULL
        CONSTRAINT DF_Notes_Color DEFAULT N'#f3f4f6',
    IsPinned bit NOT NULL
        CONSTRAINT DF_Notes_IsPinned DEFAULT 0,
    CreatedAtUtc datetime2(0) NOT NULL
        CONSTRAINT DF_Notes_CreatedAtUtc DEFAULT SYSUTCDATETIME(),
    UpdatedAtUtc datetime2(0) NULL,
    CONSTRAINT PK_Notes PRIMARY KEY (NoteId),
    CONSTRAINT FK_Notes_Users FOREIGN KEY (UserId)
        REFERENCES dbo.Users (UserId) ON DELETE CASCADE,
    CONSTRAINT CK_Notes_Title_NotEmpty CHECK (LEN(LTRIM(RTRIM(Title))) > 0),
    CONSTRAINT CK_Notes_Color_Hex CHECK
        (Color LIKE N'#[0-9A-Fa-f][0-9A-Fa-f][0-9A-Fa-f][0-9A-Fa-f][0-9A-Fa-f][0-9A-Fa-f]')
);

CREATE TABLE dbo.ActivityLog
(
    ActivityLogId uniqueidentifier NOT NULL
        CONSTRAINT DF_ActivityLog_ActivityLogId DEFAULT NEWSEQUENTIALID(),
    UserId uniqueidentifier NOT NULL,
    EntityType nvarchar(20) NOT NULL,
    EntityId uniqueidentifier NOT NULL,
    Action nvarchar(20) NOT NULL,
    Title nvarchar(500) NOT NULL,
    CreatedAtUtc datetime2(0) NOT NULL
        CONSTRAINT DF_ActivityLog_CreatedAtUtc DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_ActivityLog PRIMARY KEY (ActivityLogId),
    CONSTRAINT FK_ActivityLog_Users FOREIGN KEY (UserId)
        REFERENCES dbo.Users (UserId) ON DELETE CASCADE,
    CONSTRAINT CK_ActivityLog_EntityType CHECK (EntityType IN (N'task', N'goal', N'note')),
    CONSTRAINT CK_ActivityLog_Action CHECK
        (Action IN (N'created', N'updated', N'completed', N'deleted', N'restored'))
);

CREATE INDEX IX_Tasks_UserId_IsDeleted_DeletedAtUtc
    ON dbo.Tasks (UserId, IsDeleted, DeletedAtUtc);

CREATE INDEX IX_Goals_UserId_IsDeleted_DeletedAtUtc
    ON dbo.Goals (UserId, IsDeleted, DeletedAtUtc);

CREATE INDEX IX_Notes_UserId_IsPinned_UpdatedAtUtc
    ON dbo.Notes (UserId, IsPinned, UpdatedAtUtc);

CREATE INDEX IX_ActivityLog_UserId_CreatedAtUtc
    ON dbo.ActivityLog (UserId, CreatedAtUtc DESC);

COMMIT TRANSACTION;
GO

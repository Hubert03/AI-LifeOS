USE [AiLifeOS];
GO

SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
SET XACT_ABORT ON;
GO

IF OBJECT_ID(N'dbo.Users', N'U') IS NULL
   OR OBJECT_ID(N'dbo.Tasks', N'U') IS NULL
    THROW 50071, 'Apply database scripts 001 through 006 before this script.', 1;
GO

BEGIN TRANSACTION;

IF OBJECT_ID(N'dbo.Reminders', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Reminders
    (
        ReminderId uniqueidentifier NOT NULL
            CONSTRAINT DF_Reminders_Id DEFAULT NEWSEQUENTIALID(),
        UserId uniqueidentifier NOT NULL,
        TaskId uniqueidentifier NULL,
        Title nvarchar(200) NOT NULL,
        DueAtUtc datetime2(0) NOT NULL,
        Status nvarchar(16) NOT NULL
            CONSTRAINT DF_Reminders_Status DEFAULT N'Scheduled',
        TriggeredAtUtc datetime2(0) NULL,
        CreatedAtUtc datetime2(0) NOT NULL
            CONSTRAINT DF_Reminders_CreatedAtUtc DEFAULT SYSUTCDATETIME(),
        UpdatedAtUtc datetime2(0) NULL,
        CONSTRAINT PK_Reminders PRIMARY KEY (ReminderId),
        CONSTRAINT FK_Reminders_Users FOREIGN KEY (UserId)
            REFERENCES dbo.Users(UserId) ON DELETE CASCADE,
        CONSTRAINT FK_Reminders_Tasks FOREIGN KEY (TaskId)
            REFERENCES dbo.Tasks(TaskId),
        CONSTRAINT CK_Reminders_Title_NotEmpty CHECK (LEN(LTRIM(RTRIM(Title))) > 0),
        CONSTRAINT CK_Reminders_Status CHECK (Status IN (N'Scheduled', N'Triggered', N'Dismissed'))
    );

    CREATE INDEX IX_Reminders_Status_DueAtUtc
        ON dbo.Reminders(Status, DueAtUtc);
    CREATE INDEX IX_Reminders_UserId_Status_DueAtUtc
        ON dbo.Reminders(UserId, Status, DueAtUtc);
END;

IF OBJECT_ID(N'dbo.PushSubscriptions', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.PushSubscriptions
    (
        PushSubscriptionId uniqueidentifier NOT NULL
            CONSTRAINT DF_PushSubscriptions_Id DEFAULT NEWSEQUENTIALID(),
        UserId uniqueidentifier NOT NULL,
        Endpoint nvarchar(2048) NOT NULL,
        EndpointHash AS CONVERT(binary(32), HASHBYTES('SHA2_256', CONVERT(varbinary(4096), Endpoint))) PERSISTED,
        P256dh nvarchar(256) NOT NULL,
        Auth nvarchar(256) NOT NULL,
        CreatedAtUtc datetime2(0) NOT NULL
            CONSTRAINT DF_PushSubscriptions_CreatedAtUtc DEFAULT SYSUTCDATETIME(),
        CONSTRAINT PK_PushSubscriptions PRIMARY KEY (PushSubscriptionId),
        CONSTRAINT FK_PushSubscriptions_Users FOREIGN KEY (UserId)
            REFERENCES dbo.Users(UserId) ON DELETE CASCADE
    );

    CREATE UNIQUE INDEX UX_PushSubscriptions_EndpointHash
        ON dbo.PushSubscriptions(EndpointHash);
    CREATE INDEX IX_PushSubscriptions_UserId
        ON dbo.PushSubscriptions(UserId);
END;

COMMIT TRANSACTION;
GO

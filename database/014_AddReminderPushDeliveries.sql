USE [AiLifeOS];
GO

SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
SET XACT_ABORT ON;
GO

IF OBJECT_ID(N'dbo.Reminders', N'U') IS NULL
   OR OBJECT_ID(N'dbo.PushSubscriptions', N'U') IS NULL
    THROW 50081, 'Apply database script 013 before this script.', 1;
GO

BEGIN TRANSACTION;

IF OBJECT_ID(N'dbo.ReminderPushDeliveries', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.ReminderPushDeliveries
    (
        ReminderPushDeliveryId uniqueidentifier NOT NULL
            CONSTRAINT DF_ReminderPushDeliveries_Id DEFAULT NEWSEQUENTIALID(),
        ReminderId uniqueidentifier NOT NULL,
        PushSubscriptionId uniqueidentifier NOT NULL,
        DueAtUtc datetime2(0) NOT NULL,
        Status nvarchar(16) NOT NULL
            CONSTRAINT DF_ReminderPushDeliveries_Status DEFAULT N'Pending',
        AttemptCount int NOT NULL
            CONSTRAINT DF_ReminderPushDeliveries_AttemptCount DEFAULT 0,
        NextAttemptAtUtc datetime2(0) NOT NULL
            CONSTRAINT DF_ReminderPushDeliveries_NextAttemptAtUtc DEFAULT SYSUTCDATETIME(),
        LastAttemptAtUtc datetime2(0) NULL,
        LeaseUntilUtc datetime2(0) NULL,
        SentAtUtc datetime2(0) NULL,
        LastError nvarchar(1000) NULL,
        CreatedAtUtc datetime2(0) NOT NULL
            CONSTRAINT DF_ReminderPushDeliveries_CreatedAtUtc DEFAULT SYSUTCDATETIME(),
        CONSTRAINT PK_ReminderPushDeliveries PRIMARY KEY (ReminderPushDeliveryId),
        CONSTRAINT FK_ReminderPushDeliveries_Reminders FOREIGN KEY (ReminderId)
            REFERENCES dbo.Reminders(ReminderId) ON DELETE CASCADE,
        CONSTRAINT FK_ReminderPushDeliveries_Subscriptions FOREIGN KEY (PushSubscriptionId)
            REFERENCES dbo.PushSubscriptions(PushSubscriptionId) ON DELETE NO ACTION,
        CONSTRAINT CK_ReminderPushDeliveries_Status
            CHECK (Status IN (N'Pending', N'Sending', N'Sent', N'Failed')),
        CONSTRAINT CK_ReminderPushDeliveries_AttemptCount CHECK (AttemptCount >= 0)
    );

    CREATE UNIQUE INDEX UX_ReminderPushDeliveries_Reminder_Subscription_DueAtUtc
        ON dbo.ReminderPushDeliveries(ReminderId, PushSubscriptionId, DueAtUtc);
    CREATE INDEX IX_ReminderPushDeliveries_Status_NextAttemptAtUtc
        ON dbo.ReminderPushDeliveries(Status, NextAttemptAtUtc);
    CREATE INDEX IX_ReminderPushDeliveries_Status_LeaseUntilUtc
        ON dbo.ReminderPushDeliveries(Status, LeaseUntilUtc);
END;

COMMIT TRANSACTION;
GO

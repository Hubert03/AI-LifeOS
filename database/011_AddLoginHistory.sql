USE [AiLifeOS];
GO

SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
SET XACT_ABORT ON;
GO

IF OBJECT_ID(N'dbo.AspNetUsers', N'U') IS NULL
    THROW 50051, 'Apply the identity and team database scripts before this script.', 1;
GO

BEGIN TRANSACTION;

IF OBJECT_ID(N'dbo.LoginHistory', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.LoginHistory
    (
        LoginHistoryId uniqueidentifier NOT NULL
            CONSTRAINT DF_LoginHistory_Id DEFAULT NEWSEQUENTIALID(),
        UserId uniqueidentifier NOT NULL,
        Succeeded bit NOT NULL,
        AttemptedAtUtc datetime2(0) NOT NULL
            CONSTRAINT DF_LoginHistory_AttemptedAtUtc DEFAULT SYSUTCDATETIME(),
        CONSTRAINT PK_LoginHistory PRIMARY KEY (LoginHistoryId),
        CONSTRAINT FK_LoginHistory_AspNetUsers FOREIGN KEY (UserId)
            REFERENCES dbo.AspNetUsers(Id) ON DELETE CASCADE
    );

    CREATE INDEX IX_LoginHistory_UserId_AttemptedAtUtc
        ON dbo.LoginHistory(UserId, AttemptedAtUtc DESC);
    CREATE INDEX IX_LoginHistory_AttemptedAtUtc
        ON dbo.LoginHistory(AttemptedAtUtc DESC);
END;

COMMIT TRANSACTION;
GO

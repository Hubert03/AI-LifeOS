USE [AiLifeOS];
GO

SET XACT_ABORT ON;
GO

BEGIN TRANSACTION;

IF OBJECT_ID(N'dbo.Users', N'U') IS NOT NULL
    THROW 50001, 'dbo.Users already exists; inspect the schema before rerunning this script.', 1;

IF OBJECT_ID(N'dbo.Tasks', N'U') IS NOT NULL
    THROW 50002, 'dbo.Tasks already exists; inspect the schema before rerunning this script.', 1;

CREATE TABLE dbo.Users
(
    UserId uniqueidentifier NOT NULL
        CONSTRAINT DF_Users_UserId DEFAULT NEWSEQUENTIALID(),
    Email nvarchar(320) NOT NULL,
    DisplayName nvarchar(100) NOT NULL,
    CreatedAtUtc datetime2(0) NOT NULL
        CONSTRAINT DF_Users_CreatedAtUtc DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_Users PRIMARY KEY (UserId),
    CONSTRAINT UQ_Users_Email UNIQUE (Email),
    CONSTRAINT CK_Users_Email_NotEmpty CHECK (LEN(LTRIM(RTRIM(Email))) > 0),
    CONSTRAINT CK_Users_DisplayName_NotEmpty CHECK (LEN(LTRIM(RTRIM(DisplayName))) > 0)
);

CREATE TABLE dbo.Tasks
(
    TaskId uniqueidentifier NOT NULL
        CONSTRAINT DF_Tasks_TaskId DEFAULT NEWSEQUENTIALID(),
    UserId uniqueidentifier NOT NULL,
    Title nvarchar(200) NOT NULL,
    Description nvarchar(2000) NULL,
    Status nvarchar(20) NOT NULL
        CONSTRAINT DF_Tasks_Status DEFAULT N'Pending',
    Priority tinyint NOT NULL
        CONSTRAINT DF_Tasks_Priority DEFAULT 2,
    DueAtUtc datetime2(0) NULL,
    CreatedAtUtc datetime2(0) NOT NULL
        CONSTRAINT DF_Tasks_CreatedAtUtc DEFAULT SYSUTCDATETIME(),
    UpdatedAtUtc datetime2(0) NULL,
    CONSTRAINT PK_Tasks PRIMARY KEY (TaskId),
    CONSTRAINT FK_Tasks_Users FOREIGN KEY (UserId)
        REFERENCES dbo.Users (UserId) ON DELETE CASCADE,
    CONSTRAINT CK_Tasks_Title_NotEmpty CHECK (LEN(LTRIM(RTRIM(Title))) > 0),
    CONSTRAINT CK_Tasks_Status CHECK (Status IN (N'Pending', N'InProgress', N'Completed', N'Cancelled')),
    CONSTRAINT CK_Tasks_Priority CHECK (Priority BETWEEN 1 AND 4)
);

CREATE INDEX IX_Tasks_UserId_Status_DueAtUtc
    ON dbo.Tasks (UserId, Status, DueAtUtc);

COMMIT TRANSACTION;
GO

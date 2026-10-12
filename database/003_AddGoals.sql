USE [AiLifeOS];
GO

SET XACT_ABORT ON;
GO

BEGIN TRANSACTION;

IF OBJECT_ID(N'dbo.Goals', N'U') IS NOT NULL
    THROW 50003, 'dbo.Goals already exists; inspect the schema before rerunning this script.', 1;

IF OBJECT_ID(N'dbo.GoalMilestones', N'U') IS NOT NULL
    THROW 50004, 'dbo.GoalMilestones already exists; inspect the schema before rerunning this script.', 1;

CREATE TABLE dbo.Goals
(
    GoalId uniqueidentifier NOT NULL
        CONSTRAINT DF_Goals_GoalId DEFAULT NEWSEQUENTIALID(),
    UserId uniqueidentifier NOT NULL,
    Title nvarchar(200) NOT NULL,
    Description nvarchar(2000) NULL,
    Status nvarchar(20) NOT NULL
        CONSTRAINT DF_Goals_Status DEFAULT N'Active',
    Progress tinyint NOT NULL
        CONSTRAINT DF_Goals_Progress DEFAULT 0,
    TargetDate date NULL,
    CreatedAtUtc datetime2(0) NOT NULL
        CONSTRAINT DF_Goals_CreatedAtUtc DEFAULT SYSUTCDATETIME(),
    UpdatedAtUtc datetime2(0) NULL,
    CONSTRAINT PK_Goals PRIMARY KEY (GoalId),
    CONSTRAINT FK_Goals_Users FOREIGN KEY (UserId)
        REFERENCES dbo.Users (UserId) ON DELETE CASCADE,
    CONSTRAINT CK_Goals_Title_NotEmpty CHECK (LEN(LTRIM(RTRIM(Title))) > 0),
    CONSTRAINT CK_Goals_Status CHECK (Status IN (N'Active', N'Paused', N'Completed')),
    CONSTRAINT CK_Goals_Progress CHECK (Progress BETWEEN 0 AND 100)
);

CREATE TABLE dbo.GoalMilestones
(
    GoalMilestoneId uniqueidentifier NOT NULL
        CONSTRAINT DF_GoalMilestones_GoalMilestoneId DEFAULT NEWSEQUENTIALID(),
    GoalId uniqueidentifier NOT NULL,
    Title nvarchar(200) NOT NULL,
    IsCompleted bit NOT NULL
        CONSTRAINT DF_GoalMilestones_IsCompleted DEFAULT 0,
    SortOrder smallint NOT NULL
        CONSTRAINT DF_GoalMilestones_SortOrder DEFAULT 0,
    CONSTRAINT PK_GoalMilestones PRIMARY KEY (GoalMilestoneId),
    CONSTRAINT FK_GoalMilestones_Goals FOREIGN KEY (GoalId)
        REFERENCES dbo.Goals (GoalId) ON DELETE CASCADE,
    CONSTRAINT CK_GoalMilestones_Title_NotEmpty CHECK (LEN(LTRIM(RTRIM(Title))) > 0)
);

CREATE INDEX IX_Goals_UserId_Status_TargetDate
    ON dbo.Goals (UserId, Status, TargetDate);

CREATE INDEX IX_GoalMilestones_GoalId_SortOrder
    ON dbo.GoalMilestones (GoalId, SortOrder);

COMMIT TRANSACTION;
GO

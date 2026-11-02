USE [AiLifeOS];
GO

SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
SET XACT_ABORT ON;
GO

IF OBJECT_ID(N'dbo.Teams', N'U') IS NULL
   OR OBJECT_ID(N'dbo.AspNetUsers', N'U') IS NULL
    THROW 50041, 'Apply database script 009 before this script.', 1;
GO

BEGIN TRANSACTION;

IF OBJECT_ID(N'dbo.TeamTasks', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.TeamTasks
    (
        TaskId uniqueidentifier NOT NULL
            CONSTRAINT DF_TeamTasks_TaskId DEFAULT NEWSEQUENTIALID(),
        TeamId uniqueidentifier NOT NULL,
        CreatedByUserId uniqueidentifier NOT NULL,
        AssignedToUserId uniqueidentifier NULL,
        Title nvarchar(200) NOT NULL,
        Description nvarchar(2000) NULL,
        Status nvarchar(20) NOT NULL
            CONSTRAINT DF_TeamTasks_Status DEFAULT N'Pending',
        Priority tinyint NOT NULL
            CONSTRAINT DF_TeamTasks_Priority DEFAULT 2,
        DueAtUtc datetime2(0) NULL,
        CreatedAtUtc datetime2(0) NOT NULL
            CONSTRAINT DF_TeamTasks_CreatedAtUtc DEFAULT SYSUTCDATETIME(),
        UpdatedAtUtc datetime2(0) NULL,
        IsDeleted bit NOT NULL
            CONSTRAINT DF_TeamTasks_IsDeleted DEFAULT 0,
        DeletedAtUtc datetime2(0) NULL,
        CONSTRAINT PK_TeamTasks PRIMARY KEY (TaskId),
        CONSTRAINT FK_TeamTasks_Teams FOREIGN KEY (TeamId) REFERENCES dbo.Teams(TeamId),
        CONSTRAINT FK_TeamTasks_Creator FOREIGN KEY (CreatedByUserId) REFERENCES dbo.AspNetUsers(Id),
        CONSTRAINT FK_TeamTasks_Assignee FOREIGN KEY (AssignedToUserId) REFERENCES dbo.AspNetUsers(Id),
        CONSTRAINT CK_TeamTasks_Title_NotEmpty CHECK (LEN(LTRIM(RTRIM(Title))) > 0),
        CONSTRAINT CK_TeamTasks_Status CHECK (Status IN (N'Pending', N'InProgress', N'Completed', N'Cancelled')),
        CONSTRAINT CK_TeamTasks_Priority CHECK (Priority BETWEEN 1 AND 4)
    );

    CREATE INDEX IX_TeamTasks_TeamId_IsDeleted_DueAtUtc
        ON dbo.TeamTasks(TeamId, IsDeleted, DueAtUtc);
END;

IF OBJECT_ID(N'dbo.TeamGoals', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.TeamGoals
    (
        GoalId uniqueidentifier NOT NULL
            CONSTRAINT DF_TeamGoals_GoalId DEFAULT NEWSEQUENTIALID(),
        TeamId uniqueidentifier NOT NULL,
        CreatedByUserId uniqueidentifier NOT NULL,
        Title nvarchar(200) NOT NULL,
        Description nvarchar(2000) NULL,
        Status nvarchar(20) NOT NULL
            CONSTRAINT DF_TeamGoals_Status DEFAULT N'Active',
        Progress tinyint NOT NULL
            CONSTRAINT DF_TeamGoals_Progress DEFAULT 0,
        TargetDate date NULL,
        CreatedAtUtc datetime2(0) NOT NULL
            CONSTRAINT DF_TeamGoals_CreatedAtUtc DEFAULT SYSUTCDATETIME(),
        UpdatedAtUtc datetime2(0) NULL,
        IsDeleted bit NOT NULL
            CONSTRAINT DF_TeamGoals_IsDeleted DEFAULT 0,
        DeletedAtUtc datetime2(0) NULL,
        CONSTRAINT PK_TeamGoals PRIMARY KEY (GoalId),
        CONSTRAINT FK_TeamGoals_Teams FOREIGN KEY (TeamId) REFERENCES dbo.Teams(TeamId),
        CONSTRAINT FK_TeamGoals_Creator FOREIGN KEY (CreatedByUserId) REFERENCES dbo.AspNetUsers(Id),
        CONSTRAINT CK_TeamGoals_Title_NotEmpty CHECK (LEN(LTRIM(RTRIM(Title))) > 0),
        CONSTRAINT CK_TeamGoals_Status CHECK (Status IN (N'Active', N'Paused', N'Completed')),
        CONSTRAINT CK_TeamGoals_Progress CHECK (Progress BETWEEN 0 AND 100)
    );

    CREATE INDEX IX_TeamGoals_TeamId_IsDeleted_TargetDate
        ON dbo.TeamGoals(TeamId, IsDeleted, TargetDate);
END;

IF OBJECT_ID(N'dbo.TeamGoalMilestones', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.TeamGoalMilestones
    (
        GoalMilestoneId uniqueidentifier NOT NULL
            CONSTRAINT DF_TeamGoalMilestones_GoalMilestoneId DEFAULT NEWSEQUENTIALID(),
        GoalId uniqueidentifier NOT NULL,
        Title nvarchar(200) NOT NULL,
        IsCompleted bit NOT NULL
            CONSTRAINT DF_TeamGoalMilestones_IsCompleted DEFAULT 0,
        SortOrder smallint NOT NULL
            CONSTRAINT DF_TeamGoalMilestones_SortOrder DEFAULT 0,
        CONSTRAINT PK_TeamGoalMilestones PRIMARY KEY (GoalMilestoneId),
        CONSTRAINT FK_TeamGoalMilestones_Goals FOREIGN KEY (GoalId)
            REFERENCES dbo.TeamGoals(GoalId) ON DELETE CASCADE,
        CONSTRAINT CK_TeamGoalMilestones_Title_NotEmpty CHECK (LEN(LTRIM(RTRIM(Title))) > 0)
    );

    CREATE INDEX IX_TeamGoalMilestones_GoalId_SortOrder
        ON dbo.TeamGoalMilestones(GoalId, SortOrder);
END;

IF OBJECT_ID(N'dbo.TeamNotes', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.TeamNotes
    (
        NoteId uniqueidentifier NOT NULL
            CONSTRAINT DF_TeamNotes_NoteId DEFAULT NEWSEQUENTIALID(),
        TeamId uniqueidentifier NOT NULL,
        CreatedByUserId uniqueidentifier NOT NULL,
        Title nvarchar(200) NOT NULL,
        Content nvarchar(max) NOT NULL,
        Color nvarchar(7) NOT NULL
            CONSTRAINT DF_TeamNotes_Color DEFAULT N'#f3f4f6',
        CreatedAtUtc datetime2(0) NOT NULL
            CONSTRAINT DF_TeamNotes_CreatedAtUtc DEFAULT SYSUTCDATETIME(),
        UpdatedAtUtc datetime2(0) NULL,
        IsDeleted bit NOT NULL
            CONSTRAINT DF_TeamNotes_IsDeleted DEFAULT 0,
        DeletedAtUtc datetime2(0) NULL,
        CONSTRAINT PK_TeamNotes PRIMARY KEY (NoteId),
        CONSTRAINT FK_TeamNotes_Teams FOREIGN KEY (TeamId) REFERENCES dbo.Teams(TeamId),
        CONSTRAINT FK_TeamNotes_Creator FOREIGN KEY (CreatedByUserId) REFERENCES dbo.AspNetUsers(Id),
        CONSTRAINT CK_TeamNotes_Title_NotEmpty CHECK (LEN(LTRIM(RTRIM(Title))) > 0),
        CONSTRAINT CK_TeamNotes_Color_Hex CHECK
            (Color LIKE N'#[0-9A-Fa-f][0-9A-Fa-f][0-9A-Fa-f][0-9A-Fa-f][0-9A-Fa-f][0-9A-Fa-f]')
    );

    CREATE INDEX IX_TeamNotes_TeamId_IsDeleted_CreatedAtUtc
        ON dbo.TeamNotes(TeamId, IsDeleted, CreatedAtUtc DESC);
END;

COMMIT TRANSACTION;
GO

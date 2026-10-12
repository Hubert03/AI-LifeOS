USE [AiLifeOS];
GO

SET XACT_ABORT ON;
GO

IF OBJECT_ID(N'dbo.Tasks', N'U') IS NULL
   OR OBJECT_ID(N'dbo.Goals', N'U') IS NULL
   OR OBJECT_ID(N'dbo.GoalMilestones', N'U') IS NULL
   OR OBJECT_ID(N'dbo.Notes', N'U') IS NULL
   OR OBJECT_ID(N'dbo.ActivityLog', N'U') IS NULL
   OR OBJECT_ID(N'dbo.Users', N'U') IS NULL
   OR OBJECT_ID(N'dbo.AiProviderSettings', N'U') IS NULL
    THROW 50011, 'Apply database scripts 001 through 005 before this script.', 1;
GO

CREATE OR ALTER PROCEDURE dbo.ActivityLog_Insert
    @UserId uniqueidentifier,
    @EntityType nvarchar(20),
    @EntityId uniqueidentifier,
    @Action nvarchar(20),
    @Title nvarchar(500)
AS
BEGIN
    SET NOCOUNT ON;

    INSERT dbo.ActivityLog (UserId, EntityType, EntityId, Action, Title)
    VALUES (@UserId, @EntityType, @EntityId, @Action, @Title);
END;
GO

CREATE OR ALTER PROCEDURE dbo.Task_Create
    @TaskId uniqueidentifier,
    @UserId uniqueidentifier,
    @Title nvarchar(200),
    @Description nvarchar(2000) = NULL,
    @Status nvarchar(20),
    @Priority tinyint,
    @DueAtUtc datetime2(0) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    BEGIN TRY
        BEGIN TRANSACTION;

        INSERT dbo.Tasks (TaskId, UserId, Title, Description, Status, Priority, DueAtUtc)
        VALUES (@TaskId, @UserId, @Title, @Description, @Status, @Priority, @DueAtUtc);

        INSERT dbo.ActivityLog (UserId, EntityType, EntityId, Action, Title)
        VALUES (@UserId, N'task', @TaskId, N'created', @Title);

        IF @Status = N'Completed'
            INSERT dbo.ActivityLog (UserId, EntityType, EntityId, Action, Title)
            VALUES (@UserId, N'task', @TaskId, N'completed', @Title);

        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        IF XACT_STATE() <> 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH;
END;
GO

CREATE OR ALTER PROCEDURE dbo.Goal_Create
    @GoalId uniqueidentifier,
    @UserId uniqueidentifier,
    @Title nvarchar(200),
    @Description nvarchar(2000) = NULL,
    @Status nvarchar(20),
    @Progress tinyint,
    @TargetDate date = NULL,
    @MilestonesJson nvarchar(max)
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    IF ISJSON(@MilestonesJson) <> 1
        THROW 50012, 'Milestones must be valid JSON.', 1;

    BEGIN TRY
        BEGIN TRANSACTION;

        INSERT dbo.Goals (GoalId, UserId, Title, Description, Status, Progress, TargetDate)
        VALUES (@GoalId, @UserId, @Title, @Description, @Status, @Progress, @TargetDate);

        INSERT dbo.GoalMilestones (GoalId, Title, IsCompleted, SortOrder)
        SELECT @GoalId, milestones.Title, milestones.IsCompleted, milestones.SortOrder
        FROM OPENJSON(@MilestonesJson)
        WITH
        (
            Title nvarchar(200) '$.title',
            IsCompleted bit '$.isCompleted',
            SortOrder smallint '$.sortOrder'
        ) AS milestones;

        INSERT dbo.ActivityLog (UserId, EntityType, EntityId, Action, Title)
        VALUES (@UserId, N'goal', @GoalId, N'created', @Title);

        IF @Status = N'Completed'
            INSERT dbo.ActivityLog (UserId, EntityType, EntityId, Action, Title)
            VALUES (@UserId, N'goal', @GoalId, N'completed', @Title);

        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        IF XACT_STATE() <> 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH;
END;
GO

CREATE OR ALTER PROCEDURE dbo.Goal_Update
    @GoalId uniqueidentifier,
    @UserId uniqueidentifier,
    @Title nvarchar(200),
    @Description nvarchar(2000) = NULL,
    @Status nvarchar(20),
    @Progress tinyint,
    @TargetDate date = NULL,
    @UpdatedAtUtc datetime2(0),
    @MilestonesJson nvarchar(max)
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    IF ISJSON(@MilestonesJson) <> 1
        THROW 50013, 'Milestones must be valid JSON.', 1;

    BEGIN TRY
        BEGIN TRANSACTION;

        DECLARE @WasCompleted bit;
        SELECT @WasCompleted = CASE WHEN Status = N'Completed' THEN 1 ELSE 0 END
        FROM dbo.Goals WITH (UPDLOCK, HOLDLOCK)
        WHERE GoalId = @GoalId AND UserId = @UserId AND IsDeleted = 0;

        IF @WasCompleted IS NULL
            THROW 50014, 'The goal could not be found for this user.', 1;

        UPDATE dbo.Goals
        SET Title = @Title,
            Description = @Description,
            Status = @Status,
            Progress = @Progress,
            TargetDate = @TargetDate,
            UpdatedAtUtc = @UpdatedAtUtc
        WHERE GoalId = @GoalId AND UserId = @UserId AND IsDeleted = 0;

        DELETE dbo.GoalMilestones WHERE GoalId = @GoalId;

        INSERT dbo.GoalMilestones (GoalId, Title, IsCompleted, SortOrder)
        SELECT @GoalId, milestones.Title, milestones.IsCompleted, milestones.SortOrder
        FROM OPENJSON(@MilestonesJson)
        WITH
        (
            Title nvarchar(200) '$.title',
            IsCompleted bit '$.isCompleted',
            SortOrder smallint '$.sortOrder'
        ) AS milestones;

        INSERT dbo.ActivityLog (UserId, EntityType, EntityId, Action, Title)
        VALUES (@UserId, N'goal', @GoalId, N'updated', @Title);

        IF @WasCompleted = 0 AND @Status = N'Completed'
            INSERT dbo.ActivityLog (UserId, EntityType, EntityId, Action, Title)
            VALUES (@UserId, N'goal', @GoalId, N'completed', @Title);

        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        IF XACT_STATE() <> 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH;
END;
GO

CREATE OR ALTER PROCEDURE dbo.Note_Create
    @NoteId uniqueidentifier,
    @UserId uniqueidentifier,
    @Title nvarchar(200),
    @Content nvarchar(max),
    @Color nvarchar(20),
    @IsPinned bit
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    BEGIN TRY
        BEGIN TRANSACTION;

        INSERT dbo.Notes (NoteId, UserId, Title, Content, Color, IsPinned)
        VALUES (@NoteId, @UserId, @Title, @Content, @Color, @IsPinned);

        INSERT dbo.ActivityLog (UserId, EntityType, EntityId, Action, Title)
        VALUES (@UserId, N'note', @NoteId, N'created', @Title);

        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        IF XACT_STATE() <> 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH;
END;
GO

CREATE OR ALTER PROCEDURE dbo.UserProfile_Upsert
    @UserId uniqueidentifier,
    @Email nvarchar(320),
    @DisplayName nvarchar(100),
    @CreatedAtUtc datetime2(0)
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    BEGIN TRY
        BEGIN TRANSACTION;

        UPDATE dbo.Users WITH (UPDLOCK, SERIALIZABLE)
        SET Email = @Email,
            DisplayName = @DisplayName
        WHERE UserId = @UserId;

        IF @@ROWCOUNT = 0
            INSERT dbo.Users (UserId, Email, DisplayName, CreatedAtUtc)
            VALUES (@UserId, @Email, @DisplayName, @CreatedAtUtc);

        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        IF XACT_STATE() <> 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH;
END;
GO

CREATE OR ALTER PROCEDURE dbo.AiProviderSettings_Upsert
    @ApiUrl nvarchar(500),
    @Model nvarchar(100),
    @EncryptedApiKey varbinary(max),
    @UpdatedAtUtc datetime2(0)
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    BEGIN TRY
        BEGIN TRANSACTION;

        UPDATE dbo.AiProviderSettings WITH (UPDLOCK, SERIALIZABLE)
        SET ApiUrl = @ApiUrl,
            Model = @Model,
            EncryptedApiKey = @EncryptedApiKey,
            UpdatedAtUtc = @UpdatedAtUtc
        WHERE SettingsId = 1;

        IF @@ROWCOUNT = 0
            INSERT dbo.AiProviderSettings
                (SettingsId, ApiUrl, Model, EncryptedApiKey, UpdatedAtUtc)
            VALUES
                (1, @ApiUrl, @Model, @EncryptedApiKey, @UpdatedAtUtc);

        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        IF XACT_STATE() <> 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH;
END;
GO

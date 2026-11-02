USE [AiLifeOS];
GO

SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
SET XACT_ABORT ON;
GO

IF OBJECT_ID(N'dbo.AspNetUsers', N'U') IS NULL
   OR OBJECT_ID(N'dbo.UserInvitations', N'U') IS NULL
    THROW 50031, 'Apply database scripts 001 through 008 before this script.', 1;
GO

BEGIN TRANSACTION;

IF COL_LENGTH(N'dbo.AspNetUsers', N'AccessRole') IS NULL
    ALTER TABLE dbo.AspNetUsers
        ADD AccessRole nvarchar(24) NOT NULL
            CONSTRAINT DF_AspNetUsers_AccessRole DEFAULT N'User' WITH VALUES;

IF COL_LENGTH(N'dbo.AspNetUsers', N'TeamId') IS NULL
    ALTER TABLE dbo.AspNetUsers
        ADD TeamId uniqueidentifier NULL;

IF COL_LENGTH(N'dbo.UserInvitations', N'AccessRole') IS NULL
    ALTER TABLE dbo.UserInvitations
        ADD AccessRole nvarchar(24) NOT NULL
            CONSTRAINT DF_UserInvitations_AccessRole DEFAULT N'User' WITH VALUES;

IF COL_LENGTH(N'dbo.UserInvitations', N'TeamId') IS NULL
    ALTER TABLE dbo.UserInvitations
        ADD TeamId uniqueidentifier NULL;

IF OBJECT_ID(N'dbo.Teams', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Teams
    (
        TeamId uniqueidentifier NOT NULL
            CONSTRAINT DF_Teams_TeamId DEFAULT NEWSEQUENTIALID(),
        Name nvarchar(100) NOT NULL,
        ManagerUserId uniqueidentifier NULL,
        CreatedByUserId uniqueidentifier NOT NULL,
        CreatedAtUtc datetime2(0) NOT NULL
            CONSTRAINT DF_Teams_CreatedAtUtc DEFAULT SYSUTCDATETIME(),
        CONSTRAINT PK_Teams PRIMARY KEY (TeamId),
        CONSTRAINT FK_Teams_Manager FOREIGN KEY (ManagerUserId)
            REFERENCES dbo.AspNetUsers(Id),
        CONSTRAINT FK_Teams_CreatedBy FOREIGN KEY (CreatedByUserId)
            REFERENCES dbo.AspNetUsers(Id),
        CONSTRAINT CK_Teams_Name_NotEmpty CHECK (LEN(LTRIM(RTRIM(Name))) > 0)
    );

    CREATE UNIQUE INDEX UX_Teams_Name ON dbo.Teams(Name);
    CREATE UNIQUE INDEX UX_Teams_ManagerUserId
        ON dbo.Teams(ManagerUserId)
        WHERE ManagerUserId IS NOT NULL;
END;

IF NOT EXISTS
(
    SELECT 1 FROM sys.foreign_keys
    WHERE name = N'FK_AspNetUsers_Teams_TeamId'
)
    ALTER TABLE dbo.AspNetUsers
        ADD CONSTRAINT FK_AspNetUsers_Teams_TeamId
            FOREIGN KEY (TeamId) REFERENCES dbo.Teams(TeamId);

IF NOT EXISTS
(
    SELECT 1 FROM sys.foreign_keys
    WHERE name = N'FK_UserInvitations_Teams_TeamId'
)
    ALTER TABLE dbo.UserInvitations
        ADD CONSTRAINT FK_UserInvitations_Teams_TeamId
            FOREIGN KEY (TeamId) REFERENCES dbo.Teams(TeamId);

IF NOT EXISTS
(
    SELECT 1 FROM sys.check_constraints
    WHERE name = N'CK_AspNetUsers_AccessRole'
)
    EXEC(N'ALTER TABLE dbo.AspNetUsers
        ADD CONSTRAINT CK_AspNetUsers_AccessRole CHECK
        (AccessRole IN (N''SuperAdmin'', N''Admin'', N''Manager'', N''TeamLead'', N''User''));');

IF NOT EXISTS
(
    SELECT 1 FROM sys.check_constraints
    WHERE name = N'CK_UserInvitations_AccessRole'
)
    EXEC(N'ALTER TABLE dbo.UserInvitations
        ADD CONSTRAINT CK_UserInvitations_AccessRole CHECK
        (AccessRole IN (N''SuperAdmin'', N''Admin'', N''Manager'', N''TeamLead'', N''User''));');

EXEC(N'UPDATE dbo.AspNetUsers
    SET AccessRole = N''SuperAdmin''
    WHERE IsAdmin = 1 AND AccessRole = N''User'';');

COMMIT TRANSACTION;
GO

CREATE OR ALTER PROCEDURE dbo.UserInvitation_Create
    @Email nvarchar(320),
    @DisplayName nvarchar(100),
    @TokenHash varbinary(32),
    @CreatedByUserId uniqueidentifier,
    @ExpiresAtUtc datetime2(0),
    @AccessRole nvarchar(24),
    @TeamId uniqueidentifier = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    BEGIN TRY
        BEGIN TRANSACTION;

        UPDATE dbo.UserInvitations WITH (UPDLOCK, SERIALIZABLE)
        SET AcceptedAtUtc = SYSUTCDATETIME()
        WHERE Email = @Email AND AcceptedAtUtc IS NULL AND ExpiresAtUtc > SYSUTCDATETIME();

        INSERT dbo.UserInvitations
            (Email, DisplayName, TokenHash, CreatedByUserId, ExpiresAtUtc, AccessRole, TeamId)
        VALUES
            (@Email, @DisplayName, @TokenHash, @CreatedByUserId, @ExpiresAtUtc, @AccessRole, @TeamId);

        SELECT CONVERT(bigint, SCOPE_IDENTITY()) AS InvitationId;
        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        IF XACT_STATE() <> 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH;
END;
GO

CREATE OR ALTER PROCEDURE dbo.UserInvitation_Consume
    @TokenHash varbinary(32)
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    DECLARE @Consumed TABLE
    (
        Email nvarchar(320),
        DisplayName nvarchar(100),
        AccessRole nvarchar(24),
        TeamId uniqueidentifier
    );

    UPDATE dbo.UserInvitations WITH (UPDLOCK, ROWLOCK)
    SET AcceptedAtUtc = SYSUTCDATETIME()
    OUTPUT inserted.Email, inserted.DisplayName, inserted.AccessRole, inserted.TeamId
        INTO @Consumed
    WHERE TokenHash = @TokenHash
      AND AcceptedAtUtc IS NULL
      AND ExpiresAtUtc > SYSUTCDATETIME();

    IF @@ROWCOUNT <> 1
        THROW 50022, 'The invitation is invalid, expired, or already used.', 1;

    SELECT Email, DisplayName, AccessRole, TeamId FROM @Consumed;
END;
GO

CREATE OR ALTER PROCEDURE dbo.UserAdmin_SetAccess
    @UserId uniqueidentifier,
    @AccessRole nvarchar(24),
    @IsActive bit,
    @MustChangePassword bit,
    @TeamId uniqueidentifier = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    IF @AccessRole NOT IN (N'SuperAdmin', N'Admin', N'Manager', N'TeamLead', N'User')
        THROW 50032, 'The access role is invalid.', 1;

    BEGIN TRY
        BEGIN TRANSACTION;

        DECLARE @LockResult int;
        EXEC @LockResult = sys.sp_getapplock
            @Resource = N'AiLifeOS_AdminAccess',
            @LockMode = N'Exclusive',
            @LockOwner = N'Transaction',
            @LockTimeout = 10000;

        IF @LockResult < 0
            THROW 50028, 'Administrator access could not be safely updated. Try again.', 1;

        DECLARE @CurrentRole nvarchar(24);
        SELECT @CurrentRole = AccessRole
        FROM dbo.AspNetUsers
        WHERE Id = @UserId;

        IF @CurrentRole IS NULL
            THROW 50027, 'The account could not be found.', 1;

        IF @AccessRole IN (N'SuperAdmin', N'Admin') AND @TeamId IS NOT NULL
            THROW 50035, 'Organization administrators cannot be assigned to a team.', 1;

        IF EXISTS
           (
               SELECT 1 FROM dbo.Teams
               WHERE ManagerUserId = @UserId
                 AND
                 (
                     @AccessRole <> N'Manager'
                     OR @TeamId IS NULL
                     OR TeamId <> @TeamId
                 )
           )
            THROW 50036, 'Reassign the team manager before changing this account role.', 1;

        IF @AccessRole = N'Manager' AND @TeamId IS NOT NULL AND NOT EXISTS
           (SELECT 1 FROM dbo.Teams WHERE TeamId = @TeamId AND ManagerUserId = @UserId)
            THROW 50037, 'A Manager can only be assigned to their own team.', 1;

        IF @CurrentRole = N'SuperAdmin' AND
           (@AccessRole <> N'SuperAdmin' OR @IsActive = 0) AND
           NOT EXISTS
           (
               SELECT 1 FROM dbo.AspNetUsers
               WHERE Id <> @UserId AND AccessRole = N'SuperAdmin' AND IsActive = 1
           )
            THROW 50034, 'At least one active Super Admin must remain.', 1;

        IF NOT EXISTS
           (SELECT 1 FROM dbo.AspNetUsers WHERE Id <> @UserId AND IsAdmin = 1 AND IsActive = 1)
           AND NOT (@AccessRole IN (N'SuperAdmin', N'Admin') AND @IsActive = 1)
            THROW 50029, 'At least one active administrator must remain.', 1;

        UPDATE dbo.AspNetUsers
        SET AccessRole = @AccessRole,
            TeamId = @TeamId,
            IsAdmin = CASE WHEN @AccessRole IN (N'SuperAdmin', N'Admin') THEN 1 ELSE 0 END,
            IsActive = @IsActive,
            MustChangePassword = @MustChangePassword,
            SecurityStamp = CONVERT(nvarchar(36), NEWID()),
            ConcurrencyStamp = CONVERT(nvarchar(36), NEWID())
        WHERE Id = @UserId;

        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        IF XACT_STATE() <> 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH;
END;
GO

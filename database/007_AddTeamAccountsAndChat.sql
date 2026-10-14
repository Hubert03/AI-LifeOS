USE [AiLifeOS];
GO

SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
SET XACT_ABORT ON;
GO

IF OBJECT_ID(N'dbo.AspNetUsers', N'U') IS NULL
   OR OBJECT_ID(N'dbo.Users', N'U') IS NULL
    THROW 50021, 'Apply database scripts 001 through 006 before this script.', 1;
GO

IF COL_LENGTH(N'dbo.AspNetUsers', N'IsAdmin') IS NULL
    ALTER TABLE dbo.AspNetUsers
        ADD IsAdmin bit NOT NULL CONSTRAINT DF_AspNetUsers_IsAdmin DEFAULT 0 WITH VALUES;
GO

IF COL_LENGTH(N'dbo.AspNetUsers', N'IsActive') IS NULL
    ALTER TABLE dbo.AspNetUsers
        ADD IsActive bit NOT NULL CONSTRAINT DF_AspNetUsers_IsActive DEFAULT 1 WITH VALUES;
GO

IF COL_LENGTH(N'dbo.AspNetUsers', N'MustChangePassword') IS NULL
    ALTER TABLE dbo.AspNetUsers
        ADD MustChangePassword bit NOT NULL CONSTRAINT DF_AspNetUsers_MustChangePassword DEFAULT 0 WITH VALUES;
GO

IF NOT EXISTS
(
    SELECT 1
    FROM sys.indexes
    WHERE object_id = OBJECT_ID(N'dbo.AspNetUsers')
      AND name = N'IX_AspNetUsers_IsAdmin'
)
    CREATE INDEX IX_AspNetUsers_IsAdmin ON dbo.AspNetUsers(IsAdmin) WHERE IsAdmin = 1;
GO

IF OBJECT_ID(N'dbo.UserInvitations', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.UserInvitations
    (
        InvitationId bigint IDENTITY(1,1) NOT NULL
            CONSTRAINT PK_UserInvitations PRIMARY KEY,
        Email nvarchar(320) NOT NULL,
        DisplayName nvarchar(100) NOT NULL,
        TokenHash varbinary(32) NOT NULL,
        CreatedByUserId uniqueidentifier NOT NULL,
        ExpiresAtUtc datetime2(0) NOT NULL,
        CreatedAtUtc datetime2(0) NOT NULL
            CONSTRAINT DF_UserInvitations_CreatedAtUtc DEFAULT SYSUTCDATETIME(),
        AcceptedAtUtc datetime2(0) NULL,
        CONSTRAINT FK_UserInvitations_CreatedBy
            FOREIGN KEY (CreatedByUserId) REFERENCES dbo.Users(UserId)
    );

    CREATE UNIQUE INDEX UX_UserInvitations_TokenHash
        ON dbo.UserInvitations(TokenHash);
    CREATE INDEX IX_UserInvitations_Email_AcceptedAtUtc
        ON dbo.UserInvitations(Email, AcceptedAtUtc);
END;
GO

IF OBJECT_ID(N'dbo.ChatGroups', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.ChatGroups
    (
        GroupId uniqueidentifier NOT NULL
            CONSTRAINT DF_ChatGroups_GroupId DEFAULT NEWSEQUENTIALID(),
        Name nvarchar(100) NOT NULL,
        CreatedByUserId uniqueidentifier NOT NULL,
        CreatedAtUtc datetime2(0) NOT NULL
            CONSTRAINT DF_ChatGroups_CreatedAtUtc DEFAULT SYSUTCDATETIME(),
        IsArchived bit NOT NULL
            CONSTRAINT DF_ChatGroups_IsArchived DEFAULT 0,
        CONSTRAINT PK_ChatGroups PRIMARY KEY (GroupId),
        CONSTRAINT FK_ChatGroups_Creator
            FOREIGN KEY (CreatedByUserId) REFERENCES dbo.Users(UserId),
        CONSTRAINT CK_ChatGroups_Name_NotEmpty
            CHECK (LEN(LTRIM(RTRIM(Name))) > 0)
    );

    CREATE INDEX IX_ChatGroups_IsArchived_Name
        ON dbo.ChatGroups(IsArchived, Name);
END;
GO

IF OBJECT_ID(N'dbo.ChatGroupMembers', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.ChatGroupMembers
    (
        GroupId uniqueidentifier NOT NULL,
        UserId uniqueidentifier NOT NULL,
        AddedAtUtc datetime2(0) NOT NULL
            CONSTRAINT DF_ChatGroupMembers_AddedAtUtc DEFAULT SYSUTCDATETIME(),
        CONSTRAINT PK_ChatGroupMembers PRIMARY KEY (GroupId, UserId),
        CONSTRAINT FK_ChatGroupMembers_Groups
            FOREIGN KEY (GroupId) REFERENCES dbo.ChatGroups(GroupId) ON DELETE CASCADE,
        CONSTRAINT FK_ChatGroupMembers_Users
            FOREIGN KEY (UserId) REFERENCES dbo.Users(UserId) ON DELETE CASCADE
    );

    CREATE INDEX IX_ChatGroupMembers_UserId_GroupId
        ON dbo.ChatGroupMembers(UserId, GroupId);
END;
GO

IF OBJECT_ID(N'dbo.ChatMessages', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.ChatMessages
    (
        MessageId uniqueidentifier NOT NULL
            CONSTRAINT DF_ChatMessages_MessageId DEFAULT NEWSEQUENTIALID(),
        GroupId uniqueidentifier NOT NULL,
        UserId uniqueidentifier NOT NULL,
        DisplayName nvarchar(100) NOT NULL,
        Content nvarchar(2000) NOT NULL,
        CreatedAtUtc datetime2(0) NOT NULL
            CONSTRAINT DF_ChatMessages_CreatedAtUtc DEFAULT SYSUTCDATETIME(),
        CONSTRAINT PK_ChatMessages PRIMARY KEY (MessageId),
        CONSTRAINT FK_ChatMessages_Groups
            FOREIGN KEY (GroupId) REFERENCES dbo.ChatGroups(GroupId) ON DELETE CASCADE,
        CONSTRAINT FK_ChatMessages_Users
            FOREIGN KEY (UserId) REFERENCES dbo.Users(UserId) ON DELETE CASCADE,
        CONSTRAINT CK_ChatMessages_Content_NotEmpty
            CHECK (LEN(LTRIM(RTRIM(Content))) > 0)
    );

    CREATE INDEX IX_ChatMessages_GroupId_CreatedAtUtc
        ON dbo.ChatMessages(GroupId, CreatedAtUtc);
END;
GO

CREATE OR ALTER PROCEDURE dbo.UserInvitation_Create
    @Email nvarchar(320),
    @DisplayName nvarchar(100),
    @TokenHash varbinary(32),
    @CreatedByUserId uniqueidentifier,
    @ExpiresAtUtc datetime2(0)
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
            (Email, DisplayName, TokenHash, CreatedByUserId, ExpiresAtUtc)
        VALUES
            (@Email, @DisplayName, @TokenHash, @CreatedByUserId, @ExpiresAtUtc);

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

    DECLARE @Consumed TABLE (Email nvarchar(320), DisplayName nvarchar(100));

    UPDATE dbo.UserInvitations WITH (UPDLOCK, ROWLOCK)
    SET AcceptedAtUtc = SYSUTCDATETIME()
    OUTPUT inserted.Email, inserted.DisplayName INTO @Consumed
    WHERE TokenHash = @TokenHash
      AND AcceptedAtUtc IS NULL
      AND ExpiresAtUtc > SYSUTCDATETIME();

    IF @@ROWCOUNT <> 1
        THROW 50022, 'The invitation is invalid, expired, or already used.', 1;

    SELECT Email, DisplayName FROM @Consumed;
END;
GO

CREATE OR ALTER PROCEDURE dbo.UserInvitation_Revoke
    @TokenHash varbinary(32)
AS
BEGIN
    SET NOCOUNT ON;

    UPDATE dbo.UserInvitations
    SET AcceptedAtUtc = SYSUTCDATETIME()
    WHERE TokenHash = @TokenHash
      AND AcceptedAtUtc IS NULL;
END;
GO

CREATE OR ALTER PROCEDURE dbo.UserAdmin_SetAccess
    @UserId uniqueidentifier,
    @IsAdmin bit,
    @IsActive bit,
    @MustChangePassword bit
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

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

        IF NOT EXISTS (SELECT 1 FROM dbo.AspNetUsers WHERE Id = @UserId)
            THROW 50027, 'The account could not be found.', 1;

        DECLARE @OtherActiveAdmins int;
        SELECT @OtherActiveAdmins = COUNT(*)
        FROM dbo.AspNetUsers
        WHERE Id <> @UserId AND IsAdmin = 1 AND IsActive = 1;

        IF @IsAdmin = 1 AND @IsActive = 1
            SET @OtherActiveAdmins += 1;

        IF @OtherActiveAdmins = 0
            THROW 50029, 'At least one active administrator must remain.', 1;

        UPDATE dbo.AspNetUsers
        SET IsAdmin = @IsAdmin,
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

CREATE OR ALTER PROCEDURE dbo.ChatGroup_Create
    @GroupId uniqueidentifier,
    @Name nvarchar(100),
    @CreatedByUserId uniqueidentifier
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    BEGIN TRY
        BEGIN TRANSACTION;

        IF NOT EXISTS
        (
            SELECT 1 FROM dbo.Users AS u
            JOIN dbo.AspNetUsers AS a ON a.Id = u.UserId
            WHERE u.UserId = @CreatedByUserId AND a.IsActive = 1
        )
            THROW 50023, 'The group creator is not an active user.', 1;

        INSERT dbo.ChatGroups (GroupId, Name, CreatedByUserId)
        VALUES (@GroupId, @Name, @CreatedByUserId);

        INSERT dbo.ChatGroupMembers (GroupId, UserId)
        VALUES (@GroupId, @CreatedByUserId);

        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        IF XACT_STATE() <> 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH;
END;
GO

CREATE OR ALTER PROCEDURE dbo.ChatGroupMember_Add
    @GroupId uniqueidentifier,
    @UserId uniqueidentifier
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    IF NOT EXISTS
    (
        SELECT 1 FROM dbo.Users AS u
        JOIN dbo.AspNetUsers AS a ON a.Id = u.UserId
        WHERE u.UserId = @UserId AND a.IsActive = 1
    )
        THROW 50024, 'Only active users can be added to a group.', 1;

    IF NOT EXISTS (SELECT 1 FROM dbo.ChatGroups WHERE GroupId = @GroupId AND IsArchived = 0)
        THROW 50025, 'The chat group was not found or is archived.', 1;

    IF NOT EXISTS (SELECT 1 FROM dbo.ChatGroupMembers WHERE GroupId = @GroupId AND UserId = @UserId)
        INSERT dbo.ChatGroupMembers (GroupId, UserId) VALUES (@GroupId, @UserId);
END;
GO

CREATE OR ALTER PROCEDURE dbo.ChatGroupMember_Remove
    @GroupId uniqueidentifier,
    @UserId uniqueidentifier
AS
BEGIN
    SET NOCOUNT ON;

    DELETE dbo.ChatGroupMembers
    WHERE GroupId = @GroupId AND UserId = @UserId;
END;
GO

CREATE OR ALTER PROCEDURE dbo.ChatGroup_Archive
    @GroupId uniqueidentifier
AS
BEGIN
    SET NOCOUNT ON;

    UPDATE dbo.ChatGroups
    SET IsArchived = 1
    WHERE GroupId = @GroupId AND IsArchived = 0;
END;
GO

CREATE OR ALTER PROCEDURE dbo.ChatMessage_Create
    @MessageId uniqueidentifier,
    @GroupId uniqueidentifier,
    @UserId uniqueidentifier,
    @DisplayName nvarchar(100),
    @Content nvarchar(2000)
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    IF NOT EXISTS
    (
        SELECT 1 FROM dbo.ChatGroupMembers AS m
        JOIN dbo.ChatGroups AS g ON g.GroupId = m.GroupId
        JOIN dbo.AspNetUsers AS u ON u.Id = m.UserId
        WHERE m.GroupId = @GroupId AND m.UserId = @UserId
          AND g.IsArchived = 0 AND u.IsActive = 1
    )
        THROW 50026, 'Only active group members can send messages.', 1;

    INSERT dbo.ChatMessages (MessageId, GroupId, UserId, DisplayName, Content)
    VALUES (@MessageId, @GroupId, @UserId, @DisplayName, @Content);
END;
GO

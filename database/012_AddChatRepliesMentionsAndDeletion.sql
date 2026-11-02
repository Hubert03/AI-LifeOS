USE [AiLifeOS];
GO

SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
SET XACT_ABORT ON;
GO

IF OBJECT_ID(N'dbo.ChatMessages', N'U') IS NULL
   OR OBJECT_ID(N'dbo.Users', N'U') IS NULL
    THROW 50061, 'Apply database script 007 before this script.', 1;
GO

BEGIN TRANSACTION;

IF COL_LENGTH(N'dbo.ChatMessages', N'IsDeleted') IS NULL
    ALTER TABLE dbo.ChatMessages
        ADD IsDeleted bit NOT NULL
            CONSTRAINT DF_ChatMessages_IsDeleted DEFAULT 0 WITH VALUES;

IF COL_LENGTH(N'dbo.ChatMessages', N'DeletedByUserId') IS NULL
    ALTER TABLE dbo.ChatMessages ADD DeletedByUserId uniqueidentifier NULL;

IF COL_LENGTH(N'dbo.ChatMessages', N'ReplyToMessageId') IS NULL
    ALTER TABLE dbo.ChatMessages ADD ReplyToMessageId uniqueidentifier NULL;

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_ChatMessages_DeletedBy')
    ALTER TABLE dbo.ChatMessages
        ADD CONSTRAINT FK_ChatMessages_DeletedBy FOREIGN KEY (DeletedByUserId)
            REFERENCES dbo.Users(UserId);

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_ChatMessages_ReplyTo')
    ALTER TABLE dbo.ChatMessages
        ADD CONSTRAINT FK_ChatMessages_ReplyTo FOREIGN KEY (ReplyToMessageId)
            REFERENCES dbo.ChatMessages(MessageId);

IF OBJECT_ID(N'dbo.ChatMessageMentions', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.ChatMessageMentions
    (
        MessageId uniqueidentifier NOT NULL,
        MentionedUserId uniqueidentifier NOT NULL,
        DisplayName nvarchar(100) NOT NULL,
        CONSTRAINT PK_ChatMessageMentions PRIMARY KEY (MessageId, MentionedUserId),
        CONSTRAINT FK_ChatMessageMentions_Messages FOREIGN KEY (MessageId)
            REFERENCES dbo.ChatMessages(MessageId) ON DELETE CASCADE,
        CONSTRAINT FK_ChatMessageMentions_Users FOREIGN KEY (MentionedUserId)
            REFERENCES dbo.Users(UserId)
    );

    CREATE INDEX IX_ChatMessageMentions_MentionedUserId
        ON dbo.ChatMessageMentions(MentionedUserId, MessageId);
END;

COMMIT TRANSACTION;
GO

CREATE OR ALTER PROCEDURE dbo.ChatMessage_Create
    @MessageId uniqueidentifier,
    @GroupId uniqueidentifier,
    @UserId uniqueidentifier,
    @DisplayName nvarchar(100),
    @Content nvarchar(2000),
    @ReplyToMessageId uniqueidentifier = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    IF NOT EXISTS
    (
        SELECT 1
        FROM dbo.ChatGroupMembers AS member
        JOIN dbo.ChatGroups AS chatGroup ON chatGroup.GroupId = member.GroupId
        JOIN dbo.AspNetUsers AS appUser ON appUser.Id = member.UserId
        WHERE member.GroupId = @GroupId
          AND member.UserId = @UserId
          AND chatGroup.IsArchived = 0
          AND appUser.IsActive = 1
    )
        THROW 50026, 'Only active group members can send messages.', 1;

    IF @ReplyToMessageId IS NOT NULL AND NOT EXISTS
    (
        SELECT 1 FROM dbo.ChatMessages
        WHERE MessageId = @ReplyToMessageId AND GroupId = @GroupId
    )
        THROW 50062, 'The reply target must be a message in this group.', 1;

    INSERT dbo.ChatMessages
        (MessageId, GroupId, UserId, DisplayName, Content, ReplyToMessageId)
    VALUES
        (@MessageId, @GroupId, @UserId, @DisplayName, @Content, @ReplyToMessageId);
END;
GO

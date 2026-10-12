USE [AiLifeOS];
GO

SET XACT_ABORT ON;
GO

BEGIN TRANSACTION;

IF OBJECT_ID(N'dbo.AiProviderSettings', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.AiProviderSettings
    (
        SettingsId tinyint NOT NULL,
        ApiUrl nvarchar(500) NOT NULL,
        Model nvarchar(100) NOT NULL,
        EncryptedApiKey varbinary(max) NOT NULL,
        UpdatedAtUtc datetime2(0) NOT NULL
            CONSTRAINT DF_AiProviderSettings_UpdatedAtUtc DEFAULT SYSUTCDATETIME(),
        CONSTRAINT PK_AiProviderSettings PRIMARY KEY (SettingsId),
        CONSTRAINT CK_AiProviderSettings_SingleRow CHECK (SettingsId = 1)
    );
END;

COMMIT TRANSACTION;
GO

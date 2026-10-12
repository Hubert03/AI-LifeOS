USE [AiLifeOS];
GO

SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
SET XACT_ABORT ON;
GO

BEGIN TRANSACTION;

IF OBJECT_ID(N'dbo.AspNetUsers', N'U') IS NOT NULL
    THROW 50003, 'dbo.AspNetUsers already exists; inspect the schema before rerunning this script.', 1;

CREATE TABLE dbo.AspNetUsers
(
    Id uniqueidentifier NOT NULL,
    AccessFailedCount int NOT NULL,
    ConcurrencyStamp nvarchar(max) NULL,
    Email nvarchar(256) NULL,
    EmailConfirmed bit NOT NULL,
    LockoutEnabled bit NOT NULL,
    LockoutEnd datetimeoffset NULL,
    NormalizedEmail nvarchar(256) NULL,
    NormalizedUserName nvarchar(256) NULL,
    PasswordHash nvarchar(max) NULL,
    PhoneNumber nvarchar(max) NULL,
    PhoneNumberConfirmed bit NOT NULL,
    SecurityStamp nvarchar(max) NULL,
    TwoFactorEnabled bit NOT NULL,
    UserName nvarchar(256) NULL,
    DisplayName nvarchar(100) NOT NULL,
    CreatedAtUtc datetime2(0) NOT NULL
        CONSTRAINT DF_AspNetUsers_CreatedAtUtc DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_AspNetUsers PRIMARY KEY (Id)
);

CREATE UNIQUE INDEX UserNameIndex
    ON dbo.AspNetUsers (NormalizedUserName)
    WHERE NormalizedUserName IS NOT NULL;

CREATE UNIQUE INDEX EmailIndex
    ON dbo.AspNetUsers (NormalizedEmail)
    WHERE NormalizedEmail IS NOT NULL;

CREATE TABLE dbo.AspNetUserClaims
(
    Id int IDENTITY(1,1) NOT NULL,
    UserId uniqueidentifier NOT NULL,
    ClaimType nvarchar(max) NULL,
    ClaimValue nvarchar(max) NULL,
    CONSTRAINT PK_AspNetUserClaims PRIMARY KEY (Id),
    CONSTRAINT FK_AspNetUserClaims_AspNetUsers_UserId
        FOREIGN KEY (UserId) REFERENCES dbo.AspNetUsers (Id) ON DELETE CASCADE
);

CREATE INDEX IX_AspNetUserClaims_UserId
    ON dbo.AspNetUserClaims (UserId);

CREATE TABLE dbo.AspNetUserLogins
(
    LoginProvider nvarchar(128) NOT NULL,
    ProviderKey nvarchar(128) NOT NULL,
    ProviderDisplayName nvarchar(max) NULL,
    UserId uniqueidentifier NOT NULL,
    CONSTRAINT PK_AspNetUserLogins PRIMARY KEY (LoginProvider, ProviderKey),
    CONSTRAINT FK_AspNetUserLogins_AspNetUsers_UserId
        FOREIGN KEY (UserId) REFERENCES dbo.AspNetUsers (Id) ON DELETE CASCADE
);

CREATE INDEX IX_AspNetUserLogins_UserId
    ON dbo.AspNetUserLogins (UserId);

CREATE TABLE dbo.AspNetUserTokens
(
    UserId uniqueidentifier NOT NULL,
    LoginProvider nvarchar(128) NOT NULL,
    Name nvarchar(128) NOT NULL,
    Value nvarchar(max) NULL,
    CONSTRAINT PK_AspNetUserTokens PRIMARY KEY (UserId, LoginProvider, Name),
    CONSTRAINT FK_AspNetUserTokens_AspNetUsers_UserId
        FOREIGN KEY (UserId) REFERENCES dbo.AspNetUsers (Id) ON DELETE CASCADE
);

ALTER TABLE dbo.Users
    ADD CONSTRAINT FK_Users_AspNetUsers_UserId
    FOREIGN KEY (UserId) REFERENCES dbo.AspNetUsers (Id) ON DELETE CASCADE;

COMMIT TRANSACTION;
GO

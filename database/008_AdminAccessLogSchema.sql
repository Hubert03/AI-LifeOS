IF OBJECT_ID(N'dbo.AdminAccessLog', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.AdminAccessLog (
        AdminAccessLogId  uniqueidentifier NOT NULL
            CONSTRAINT DF_AdminAccessLog_Id DEFAULT NEWSEQUENTIALID(),
        AdminUserId       uniqueidentifier NOT NULL,
        AdminDisplayName  nvarchar(100)    NOT NULL,
        TargetUserId      uniqueidentifier NOT NULL,
        TargetDisplayName nvarchar(100)    NOT NULL,
        Resource          nvarchar(20)     NOT NULL,
        CreatedAtUtc      datetime2(0)     NOT NULL
            CONSTRAINT DF_AdminAccessLog_CreatedAtUtc DEFAULT SYSUTCDATETIME(),
        CONSTRAINT PK_AdminAccessLog PRIMARY KEY (AdminAccessLogId),
        CONSTRAINT CK_AdminAccessLog_Resource CHECK (Resource IN (N'tasks', N'goals', N'notes'))
    );

    CREATE INDEX IX_AdminAccessLog_CreatedAtUtc
        ON dbo.AdminAccessLog (CreatedAtUtc DESC);
    CREATE INDEX IX_AdminAccessLog_Dedup
        ON dbo.AdminAccessLog (AdminUserId, TargetUserId, Resource, CreatedAtUtc DESC);
END

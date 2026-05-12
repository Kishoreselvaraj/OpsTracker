Create Database EOD
 
USE EOD

GO

drop table Users

CREATE TABLE Users

(

    UserId INT PRIMARY KEY IDENTITY(1,1),
 
    EmployeeCode NVARCHAR(50) UNIQUE NOT NULL,
 
    FirstName NVARCHAR(100) NOT NULL,

    LastName NVARCHAR(100),
 
    Email NVARCHAR(200) UNIQUE NOT NULL,

    PasswordHash NVARCHAR(MAX) NOT NULL,

	PasswordSalt NVARCHAR(MAX) NOT NULL,

    MobileNo NVARCHAR(20),
 
    Role NVARCHAR(50) NOT NULL DEFAULT 'MEMBER',
 
    Designation NVARCHAR(100),
 
    ProfileImage NVARCHAR(500),
 
    IsActive BIT NOT NULL DEFAULT 1,

	CreatedBY INT,
 
    CreatedAt DATETIME2 DEFAULT GETDATE(),

    UpdatedAt DATETIME2 NULL

)

DROP TABLE Users

CREATE TABLE Departments

(

    DepartmentId INT PRIMARY KEY IDENTITY(1,1),
 
    DepartmentCode NVARCHAR(50) UNIQUE NOT NULL,
 
    DepartmentName NVARCHAR(150) NOT NULL,
 
    Description NVARCHAR(500),
 
    CreatedBy INT,
 
    CreatedAt DATETIME2 DEFAULT GETDATE(),
 
    IsActive BIT DEFAULT 1

)

drop table UserDepartments 

CREATE TABLE UserDepartments

(

    UserDepartmentId INT PRIMARY KEY IDENTITY(1,1),
 
    UserId INT NOT NULL,
 
    DepartmentId INT NOT NULL,
 
    IsPrimaryDepartment BIT DEFAULT 0,
 
    AssignedBy INT,
 
    AssignedAt DATETIME2 DEFAULT GETDATE(),
 
    IsActive BIT DEFAULT 1,
 
    CONSTRAINT FK_UserDepartments_Users

    FOREIGN KEY (UserId)

    REFERENCES Users(UserId),
 
    CONSTRAINT FK_UserDepartments_Departments

    FOREIGN KEY (DepartmentId)

    REFERENCES Departments(DepartmentId),
 
    CONSTRAINT UQ_UserDepartment

    UNIQUE(UserId, DepartmentId)

)

CREATE TABLE TaskGroups

(

    GroupId INT PRIMARY KEY IDENTITY(1,1),
 
    DepartmentId INT NOT NULL,
 
    AssignedTeamLeadId INT NULL,
 
    CategoryName NVARCHAR(150) NOT NULL,
 
    Description NVARCHAR(500),
 
    CreatedBy INT,
 
    CreatedAt DATETIME2 DEFAULT GETDATE(),
 
    IsActive BIT DEFAULT 1,
 
    CONSTRAINT FK_Categories_Departments

    FOREIGN KEY (DepartmentId)

    REFERENCES Departments(DepartmentId),
 
    CONSTRAINT FK_Categories_Users

    FOREIGN KEY (AssignedTeamLeadId)

    REFERENCES Users(UserId)

)

CREATE TABLE Teams

(

    TeamId INT PRIMARY KEY IDENTITY(1,1),
 
    CategoryId INT NOT NULL,
 
    TeamLeadId INT NULL,
 
    TeamCode NVARCHAR(50),
 
    TeamName NVARCHAR(150) NOT NULL,
 
    Description NVARCHAR(500),

	CreatedBY INT,
 
    CreatedAt DATETIME2 DEFAULT GETDATE(),
 
    IsActive BIT DEFAULT 1,
 
    CONSTRAINT FK_Teams_Categories

    FOREIGN KEY (CategoryId)

    REFERENCES Categories(CategoryId),
 
    CONSTRAINT FK_Teams_Users

    FOREIGN KEY (TeamLeadId)

    REFERENCES Users(UserId)

)

CREATE TABLE UserTeams

(

    UserTeamId INT PRIMARY KEY IDENTITY(1,1),
 
    UserId INT NOT NULL,
 
    TeamId INT NOT NULL,
 
    JoinedDate DATE DEFAULT GETDATE(),
 
    IsActive BIT DEFAULT 1,
 
    CONSTRAINT FK_UserTeams_Users

    FOREIGN KEY (UserId)

    REFERENCES Users(UserId),
 
    CONSTRAINT FK_UserTeams_Teams

    FOREIGN KEY (TeamId)

    REFERENCES Teams(TeamId),
 
    CONSTRAINT UQ_UserTeam

    UNIQUE(UserId, TeamId)

)

CREATE TABLE TaskSubGroups

(

    SubGroupsId INT PRIMARY KEY IDENTITY(1,1),
 
    TeamId INT NOT NULL,
 
    SubCategoryName NVARCHAR(150) NOT NULL,
 
    Description NVARCHAR(500),
 
    CreatedAt DATETIME2 DEFAULT GETDATE(),
 
    IsActive BIT DEFAULT 1,
 
    CONSTRAINT FK_SubCategories_Teams

    FOREIGN KEY (TeamId)

    REFERENCES Teams(TeamId)

)

drop table TaskGroups

CREATE TABLE TaskSubGroupsUsers

(

  TaskSubGroupsUsers PRIMARY KEY IDENTITY(1,1),
 
    SubCategoryId INT NOT NULL,
 
    UserId INT NOT NULL,
 
    AssignedBy INT,
 
    AssignedAt DATETIME2 DEFAULT GETDATE(),
 
    IsActive BIT DEFAULT 1,
 
    CONSTRAINT FK_SubCategoryUsers_SubCategories

    FOREIGN KEY (SubCategoryId)

    REFERENCES SubCategories(SubCategoryId),
 
    CONSTRAINT FK_SubCategoryUsers_Users

    FOREIGN KEY (UserId)

    REFERENCES Users(UserId),
 
    CONSTRAINT UQ_SubCategoryUser

    UNIQUE(SubCategoryId, UserId)

)

drop table WorkLogs

CREATE TABLE WorkLogs

(

    WorkLogId INT PRIMARY KEY IDENTITY(1,1),
 
    UserId INT NOT NULL,
 
    CategoryId INT NOT NULL,
 
    SubCategoryId INT NULL,
 
    WorkDate DATE NOT NULL,
 
    StartTime TIME,
 
    EndTime TIME,
 
    HoursWorked DECIMAL(5,2),
 
    WorkDescription VARCHAR(MAX),
 
    ApprovalStatus VARCHAR(50) DEFAULT 'PENDING',
 
    ApprovalBy VARCHAR(50) DEFAULT NULL,
 
    ReasonForReject VARCHAR(MAX),
 
    SubmittedAt DATETIME2 DEFAULT GETDATE(),
 
    IsExtraHours BIT DEFAULT 0,
 
    ExtraHoursReason VARCHAR(500),
 
    CONSTRAINT FK_WorkLogs_Users

    FOREIGN KEY (UserId)

    REFERENCES Users(UserId),
 
    CONSTRAINT FK_WorkLogs_Categories

    FOREIGN KEY (CategoryId)

    REFERENCES TaskGroups(CategoryId),
 
    CONSTRAINT FK_WorkLogs_SubCategories

    FOREIGN KEY (SubCategoryId)

    REFERENCES TaskSubGroups(SubCategoryId),
 
    CONSTRAINT UQ_WorkLog

    UNIQUE(UserId, WorkDate)

)

CREATE TABLE Notifications

(

    NotificationId INT PRIMARY KEY IDENTITY(1,1),
 
    SenderUserId INT,
 
    ReceiverUserId INT,
 
    Title VARCHAR(300),
 
    Message VARCHAR(MAX),
 
    IsRead BIT DEFAULT 0,
 
    CreatedAt DATETIME2 DEFAULT GETDATE(),
 
    CONSTRAINT FK_Notifications_Sender

    FOREIGN KEY (SenderUserId)

    REFERENCES Users(UserId),
 
    CONSTRAINT FK_Notifications_Receiver

    FOREIGN KEY (ReceiverUserId)

    REFERENCES Users(UserId)

)
 
CREATE TABLE AuditLogs

(

    AuditId INT PRIMARY KEY IDENTITY(1,1),
 
    TableName VARCHAR(100),
 
    RecordId INT,
 
    ActionType VARCHAR(50),
 
    OldData NVARCHAR(MAX),
 
    NewData NVARCHAR(MAX),
 
    ActionBy INT,
 
    ActionAt DATETIME2 DEFAULT GETDATE(),
 
    IPAddress VARCHAR(100)

)
 
EXEC sp_rename 'Categories', 'TaskGroups';
 
EXEC sp_rename 'SubCategories', 'TaskSubGroups';
 
CREATE TABLE UserActivityLogs

(

    ActivityLogId INT PRIMARY KEY IDENTITY(1,1),

    UserId INT,

    Activity VARCHAR(500),

    IPAddress VARCHAR(100),

    CreatedAt DATETIME2 DEFAULT GETDATE()

)
 
CREATE TABLE AuditLogs

(

    AuditId INT PRIMARY KEY IDENTITY(1,1),

    TableName VARCHAR(100),

    RecordId INT,

    ActionType VARCHAR(50),

    OldData NVARCHAR(MAX),

    NewData NVARCHAR(MAX),

    ActionBy INT,

    ActionAt DATETIME2 DEFAULT GETDATE(),

    IPAddress VARCHAR(100)

)
 
CREATE TABLE ExceptionLogs

(

    ExceptionLogId INT PRIMARY KEY IDENTITY(1,1),

    UserId INT,

    ControllerName VARCHAR(100),

    ActionName VARCHAR(100),

    ExceptionMessage NVARCHAR(MAX),

    StackTrace NVARCHAR(MAX),

    RequestData NVARCHAR(MAX),

    CreatedAt DATETIME2 DEFAULT GETDATE()

) 
 
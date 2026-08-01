[Setup]
; NOTE: The value of AppId uniquely identifies this application.
; Do not use the same AppId value in installers for other applications.
AppId={{8B1B6B38-6D6D-4B73-8C21-6A72809A4D35}
AppName=Hotel Management System
AppVersion=1.0.0
AppPublisher=Farooq Hotel
AppPublisherURL=
AppSupportURL=
AppUpdatesURL=
DefaultDirName={autopf}\Hotel Management System
DisableProgramGroupPage=yes
; Output directory for the installer
OutputDir=.\dist
OutputBaseFilename=HotelManagementSystem_Setup
Compression=lzma
SolidCompression=yes
WizardStyle=modern
SetupIconFile=.\hms-desktop\icon.png
UninstallDisplayIcon={app}\Hotel Management System.exe

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"; Flags: unchecked

[Files]
; The main executable
Source: ".\hms-desktop\dist\win-unpacked\Hotel Management System.exe"; DestDir: "{app}"; Flags: ignoreversion
; All other files in the win-unpacked directory
Source: ".\hms-desktop\dist\win-unpacked\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs

[Icons]
Name: "{autoprograms}\Hotel Management System"; Filename: "{app}\Hotel Management System.exe"
Name: "{autodesktop}\Hotel Management System"; Filename: "{app}\Hotel Management System.exe"; Tasks: desktopicon

[Run]
Filename: "{app}\Hotel Management System.exe"; Description: "{cm:LaunchProgram,Hotel Management System}"; Flags: nowait postinstall skipifsilent

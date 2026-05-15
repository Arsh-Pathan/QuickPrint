; ===========================================================================
;  QuickPrint custom NSIS include
;  Loaded by electron-builder via   build.nsis.include   in package.json.
;
;  Goals:
;    1. Customise the Finish page.
;    2. Keep the install-details list visible after install completes.
;    3. Write a VERY detailed milestone install log to:
;          $INSTDIR\install.log
;          %LOCALAPPDATA%\QuickPrint\install.log   (survives uninstall)
;       The log captures every stage with timestamps, system probes
;       (Windows version, CPU arch, RAM, disk, user, command-line),
;       payload information (size, file count), data-directory creation,
;       and a closing summary.
;
;  electron-builder ships standard NSIS (no logging build), so we cannot
;  use LogText/LogSet for a verbose file-copy log. We FileWrite our own
;  milestone log instead.
;
;  Design notes:
;    * installSection.nsh starts with `SetDetailsPrint none`, which
;      would silently swallow every DetailPrint we issue. We re-enable
;      with `SetDetailsPrint both` at the top of customInstall.
;    * We do NOT keep a FileOpen handle alive between customInit and
;      customInstall - they run in different functions (.onInit vs the
;      install Section), and a UAC-elevated re-launch creates a second
;      process where the original handle is invalid. Instead we open
;      and close the log inside each macro.
; ===========================================================================


; ---------------------------------------------------------------------------
;  MUI page customisation
; ---------------------------------------------------------------------------

; Don't auto-close the wizard after install completes.
!define MUI_FINISHPAGE_NOAUTOCLOSE
!define MUI_UNFINISHPAGE_NOAUTOCLOSE

; Finish page text.
!define MUI_FINISHPAGE_TITLE                "QuickPrint Setup Complete"
!define MUI_FINISHPAGE_TEXT                 "QuickPrint has been installed on your computer.$\r$\n$\r$\nA detailed install log was written to:$\r$\n   $INSTDIR\install.log$\r$\n   $LOCALAPPDATA\QuickPrint\install.log$\r$\n$\r$\nIf you run into any issues, share that file with QuickPrint support.$\r$\n$\r$\nClick Finish to close this wizard."

; Friendlier launch checkbox label.
!define MUI_FINISHPAGE_RUN_TEXT             "Launch QuickPrint now"

; Optional "View install log" checkbox on the finish page.
!define MUI_FINISHPAGE_SHOWREADME_TEXT      "View install log"
!define MUI_FINISHPAGE_SHOWREADME           "$INSTDIR\install.log"
!define MUI_FINISHPAGE_SHOWREADME_NOTCHECKED

; Details page header text.
!define MUI_INSTFILESPAGE_FINISHHEADER_TEXT      "QuickPrint installed successfully"
!define MUI_INSTFILESPAGE_FINISHHEADER_SUBTEXT   "Setup wrote files to your computer. Scroll the list above to see every step."
!define MUI_INSTFILESPAGE_ABORTHEADER_TEXT       "QuickPrint installation failed"
!define MUI_INSTFILESPAGE_ABORTHEADER_SUBTEXT    "Setup could not complete. See the list above for the failing step."


; ---------------------------------------------------------------------------
;  customHeader - inserted at the top level of installer.nsi (after
;  common.nsh has been processed), so this is the only place we can
;  override common.nsh's "ShowInstDetails nevershow".
; ---------------------------------------------------------------------------
!macro customHeader
  ShowInstDetails show
  ShowUninstDetails show
!macroend


; ===========================================================================
;  customInit  -  exhaustive system probe written to the staging log.
;
;  Runs in .onInit before any UI is visible.  $INSTDIR is not yet
;  finalised so we stage in $PLUGINSDIR and move during customInstall.
; ===========================================================================
!macro customInit
  InitPluginsDir
  ClearErrors
  FileOpen $R0 "$PLUGINSDIR\install.log" w
  ${If} ${Errors}
    ; Couldn't open the staging log - silently continue, the install
    ; itself is unaffected.
    Goto qp_init_done
  ${EndIf}

  ; -------- Banner --------
  FileWrite $R0 "================================================================$\r$\n"
  FileWrite $R0 "  QuickPrint Setup - install log$\r$\n"
  FileWrite $R0 "  Version: ${VERSION}$\r$\n"
  FileWrite $R0 "  Publisher: Arsh Pathan <mail.arsh.pathan@gmail.com>$\r$\n"
  FileWrite $R0 "================================================================$\r$\n"

  ; -------- Date / time --------
  ${GetTime} "" "L" $0 $1 $2 $3 $4 $5 $6
  ; $0=Day $1=Month $2=Year $3=DayOfWeek $4=Hour $5=Minute $6=Second
  FileWrite $R0 "[$4:$5:$6] Setup started on $2-$1-$0 (local time)$\r$\n"
  ${GetTime} "" "LS" $0 $1 $2 $3 $4 $5 $6
  FileWrite $R0 "[$4:$5:$6] Day of week index: $3 (0=Sunday, 6=Saturday)$\r$\n"

  ; -------- Installer command-line --------
  ${GetParameters} $R1
  ${If} $R1 == ""
    FileWrite $R0 "[$4:$5:$6] Command-line args: <none>$\r$\n"
  ${Else}
    FileWrite $R0 "[$4:$5:$6] Command-line args: $R1$\r$\n"
  ${EndIf}
  FileWrite $R0 "[$4:$5:$6] Installer exe:     $EXEPATH$\r$\n"
  FileWrite $R0 "[$4:$5:$6] Installer dir:     $EXEDIR$\r$\n"

  FileWrite $R0 "----------------------------------------------------------------$\r$\n"
  FileWrite $R0 "  Section 1 of 5 : System probe$\r$\n"
  FileWrite $R0 "----------------------------------------------------------------$\r$\n"

  ; -------- Computer identity --------
  ReadRegStr $R2 HKLM "SYSTEM\CurrentControlSet\Control\ComputerName\ComputerName" "ComputerName"
  ${GetTime} "" "L" $0 $1 $2 $3 $4 $5 $6
  FileWrite $R0 "[$4:$5:$6] Computer name:     $R2$\r$\n"

  ; -------- Windows version --------
  ReadRegStr $R2 HKLM "SOFTWARE\Microsoft\Windows NT\CurrentVersion" "ProductName"
  FileWrite $R0 "[$4:$5:$6] OS product name:   $R2$\r$\n"
  ReadRegStr $R2 HKLM "SOFTWARE\Microsoft\Windows NT\CurrentVersion" "DisplayVersion"
  FileWrite $R0 "[$4:$5:$6] OS display ver:    $R2$\r$\n"
  ReadRegStr $R2 HKLM "SOFTWARE\Microsoft\Windows NT\CurrentVersion" "CurrentBuild"
  FileWrite $R0 "[$4:$5:$6] OS build number:   $R2$\r$\n"
  ReadRegStr $R2 HKLM "SOFTWARE\Microsoft\Windows NT\CurrentVersion" "ReleaseId"
  FileWrite $R0 "[$4:$5:$6] OS release id:     $R2$\r$\n"
  ReadRegStr $R2 HKLM "SOFTWARE\Microsoft\Windows NT\CurrentVersion" "EditionID"
  FileWrite $R0 "[$4:$5:$6] OS edition:        $R2$\r$\n"
  ReadRegStr $R2 HKLM "SOFTWARE\Microsoft\Windows NT\CurrentVersion" "InstallationType"
  FileWrite $R0 "[$4:$5:$6] OS install type:   $R2$\r$\n"

  ; -------- CPU --------
  ReadRegStr $R2 HKLM "HARDWARE\DESCRIPTION\System\CentralProcessor\0" "ProcessorNameString"
  FileWrite $R0 "[$4:$5:$6] CPU model:         $R2$\r$\n"
  ReadRegStr $R2 HKLM "HARDWARE\DESCRIPTION\System\CentralProcessor\0" "Identifier"
  FileWrite $R0 "[$4:$5:$6] CPU identifier:    $R2$\r$\n"
  ReadRegDWORD $R2 HKLM "HARDWARE\DESCRIPTION\System\CentralProcessor\0" "~MHz"
  FileWrite $R0 "[$4:$5:$6] CPU clock (MHz):   $R2$\r$\n"

  ; -------- 32 vs 64-bit installer --------
  !ifdef APP_64
    FileWrite $R0 "[$4:$5:$6] Installer arch:    x64$\r$\n"
  !else
    FileWrite $R0 "[$4:$5:$6] Installer arch:    x86$\r$\n"
  !endif

  ; -------- RAM via System::Call to kernel32!GlobalMemoryStatusEx --------
  ;  MEMORYSTATUSEX layout (bytes):
  ;    DWORD dwLength;             4
  ;    DWORD dwMemoryLoad;         4
  ;    DWORDLONG ullTotalPhys;     8
  ;    DWORDLONG ullAvailPhys;     8
  ;    DWORDLONG ullTotalPageFile; 8  (we ignore the rest)
  ;
  ; We pull totalPhys and availPhys into $R3 / $R4 (MB) so the time-render
  ; that follows can freely clobber $0-$9.
  System::Alloc 64
  Pop $R5
  System::Call "*$R5(i 64)"
  System::Call "Kernel32::GlobalMemoryStatusEx(i R5)"
  ; Read length, memoryLoad, totalPhys, availPhys into $R6,$R7,$R3,$R4
  System::Call "*$R5(i.R6, i.R7, l.R3, l.R4)"
  ; $R3 = totalPhys (bytes), $R4 = availPhys (bytes); convert to MB.
  System::Int64Op $R3 / 1048576
  Pop $R3
  System::Int64Op $R4 / 1048576
  Pop $R4
  System::Free $R5
  ${GetTime} "" "L" $0 $1 $2 $3 $4 $5 $6
  FileWrite $R0 "[$4:$5:$6] RAM total (MB):    $R3$\r$\n"
  FileWrite $R0 "[$4:$5:$6] RAM free  (MB):    $R4$\r$\n"
  FileWrite $R0 "[$4:$5:$6] Memory load (pct): $R7$\r$\n"

  ; -------- User identity --------
  ${GetTime} "" "L" $0 $1 $2 $3 $4 $5 $6
  ReadEnvStr $R2 "USERNAME"
  FileWrite $R0 "[$4:$5:$6] Windows username:  $R2$\r$\n"
  ReadEnvStr $R2 "USERDOMAIN"
  FileWrite $R0 "[$4:$5:$6] User domain:       $R2$\r$\n"
  ReadEnvStr $R2 "USERPROFILE"
  FileWrite $R0 "[$4:$5:$6] User profile:      $R2$\r$\n"
  ReadEnvStr $R2 "HOMEDRIVE"
  FileWrite $R0 "[$4:$5:$6] Home drive:        $R2$\r$\n"

  ; -------- Standard paths --------
  FileWrite $R0 "[$4:$5:$6] Windows dir:       $WINDIR$\r$\n"
  FileWrite $R0 "[$4:$5:$6] System32 dir:      $SYSDIR$\r$\n"
  FileWrite $R0 "[$4:$5:$6] Temp dir:          $TEMP$\r$\n"
  FileWrite $R0 "[$4:$5:$6] AppData (roaming): $APPDATA$\r$\n"
  FileWrite $R0 "[$4:$5:$6] AppData (local):   $LOCALAPPDATA$\r$\n"
  FileWrite $R0 "[$4:$5:$6] Program Files:     $PROGRAMFILES$\r$\n"
  FileWrite $R0 "[$4:$5:$6] Program Files 64:  $PROGRAMFILES64$\r$\n"
  FileWrite $R0 "[$4:$5:$6] Desktop:           $DESKTOP$\r$\n"
  FileWrite $R0 "[$4:$5:$6] Start Menu:        $SMPROGRAMS$\r$\n"
  FileWrite $R0 "[$4:$5:$6] My Documents:      $DOCUMENTS$\r$\n"
  FileWrite $R0 "[$4:$5:$6] NSIS plugin dir:   $PLUGINSDIR$\r$\n"

  ; -------- Locale --------
  ReadRegStr $R2 HKCU "Control Panel\International" "LocaleName"
  FileWrite $R0 "[$4:$5:$6] User locale:       $R2$\r$\n"
  ReadEnvStr $R2 "PROCESSOR_ARCHITECTURE"
  FileWrite $R0 "[$4:$5:$6] Proc architecture: $R2$\r$\n"
  ReadEnvStr $R2 "NUMBER_OF_PROCESSORS"
  FileWrite $R0 "[$4:$5:$6] CPU cores:         $R2$\r$\n"

  ; -------- Pre-existing install? --------
  ClearErrors
  ReadRegStr $R2 HKCU "${INSTALL_REGISTRY_KEY}" "InstallLocation"
  ${If} $R2 != ""
    FileWrite $R0 "[$4:$5:$6] Existing install detected (per-user): $R2$\r$\n"
  ${EndIf}
  ClearErrors
  ReadRegStr $R2 HKLM "${INSTALL_REGISTRY_KEY}" "InstallLocation"
  ${If} $R2 != ""
    FileWrite $R0 "[$4:$5:$6] Existing install detected (per-machine): $R2$\r$\n"
  ${EndIf}

  ; -------- Mirror existing log if present --------
  ClearErrors
  IfFileExists "$LOCALAPPDATA\QuickPrint\install.log" 0 qp_init_no_prior
    ${GetTime} "" "L" $0 $1 $2 $3 $4 $5 $6
    FileWrite $R0 "[$4:$5:$6] Prior install log found at $LOCALAPPDATA\QuickPrint\install.log$\r$\n"
    FileWrite $R0 "[$4:$5:$6]   (it will be overwritten with the new run at the end)$\r$\n"
  qp_init_no_prior:

  FileWrite $R0 "----------------------------------------------------------------$\r$\n"
  FileWrite $R0 "  System probe complete - awaiting user wizard input$\r$\n"
  FileWrite $R0 "----------------------------------------------------------------$\r$\n"

  FileClose $R0
qp_init_done:
!macroend


; ===========================================================================
;  customInstall  -  runs INSIDE the install Section, after electron-builder
;                    extracted the app payload.
; ===========================================================================
!macro customInstall
  ; Re-enable visible DetailPrint output for the rest of this section.
  SetDetailsPrint both

  DetailPrint ""
  DetailPrint "------------------------------------------------------"
  DetailPrint "  Finalising QuickPrint installation"
  DetailPrint "------------------------------------------------------"

  ; ---------- Move staging log into $INSTDIR ----------
  CreateDirectory "$INSTDIR"
  CopyFiles /SILENT "$PLUGINSDIR\install.log" "$INSTDIR\install.log"
  DetailPrint "Moved staged install log to $INSTDIR\install.log"

  ClearErrors
  FileOpen $R0 "$INSTDIR\install.log" a
  ${If} ${Errors}
    Goto qp_install_done
  ${EndIf}
  FileSeek $R0 0 END

  ${GetTime} "" "L" $0 $1 $2 $3 $4 $5 $6
  FileWrite $R0 "[$4:$5:$6] Resumed log inside install Section$\r$\n"

  FileWrite $R0 "----------------------------------------------------------------$\r$\n"
  FileWrite $R0 "  Section 2 of 5 : Payload$\r$\n"
  FileWrite $R0 "----------------------------------------------------------------$\r$\n"

  ; ---------- Install paths ----------
  FileWrite $R0 "[$4:$5:$6] Install destination:$\r$\n"
  FileWrite $R0 "[$4:$5:$6]   $INSTDIR$\r$\n"

  ; ---------- Free disk space ----------
  ${DriveSpace} "$INSTDIR\" "/D=F /S=M" $R1
  ${GetTime} "" "L" $0 $1 $2 $3 $4 $5 $6
  FileWrite $R0 "[$4:$5:$6] Free space on install drive:        $R1 MB$\r$\n"
  DetailPrint "Free space on install drive: $R1 MB"

  ${DriveSpace} "$INSTDIR\" "/D=T /S=M" $R1
  FileWrite $R0 "[$4:$5:$6] Total size of install drive:        $R1 MB$\r$\n"

  ${DriveSpace} "$INSTDIR\" "/D=U /S=M" $R1
  FileWrite $R0 "[$4:$5:$6] Used space on install drive:        $R1 MB$\r$\n"

  ; ---------- Payload size and file count ----------
  ${GetSize} "$INSTDIR" "/S=Kb" $R1 $R2 $R3
  ; $R1 = size in KB, $R2 = file count, $R3 = directory count
  ${GetTime} "" "L" $0 $1 $2 $3 $4 $5 $6
  FileWrite $R0 "[$4:$5:$6] Extracted payload statistics:$\r$\n"
  FileWrite $R0 "[$4:$5:$6]   total size:     $R1 KB$\r$\n"
  FileWrite $R0 "[$4:$5:$6]   files written:  $R2$\r$\n"
  FileWrite $R0 "[$4:$5:$6]   subdirectories: $R3$\r$\n"
  DetailPrint "Payload: $R2 files, $R1 KB written across $R3 directories"

  ; ---------- Per-app breakdown ----------
  ${If} ${FileExists} "$INSTDIR\resources\app.asar.unpacked\apps\backend"
    ${GetSize} "$INSTDIR\resources\app.asar.unpacked\apps\backend" "/S=Kb" $R1 $R2 $R3
    ${GetTime} "" "L" $0 $1 $2 $3 $4 $5 $6
    FileWrite $R0 "[$4:$5:$6] apps\backend payload:   $R1 KB, $R2 files$\r$\n"
    DetailPrint "  backend:  $R2 files, $R1 KB"
  ${EndIf}
  ${If} ${FileExists} "$INSTDIR\resources\app.asar.unpacked\apps\admin"
    ${GetSize} "$INSTDIR\resources\app.asar.unpacked\apps\admin" "/S=Kb" $R1 $R2 $R3
    ${GetTime} "" "L" $0 $1 $2 $3 $4 $5 $6
    FileWrite $R0 "[$4:$5:$6] apps\admin payload:     $R1 KB, $R2 files$\r$\n"
    DetailPrint "  admin:    $R2 files, $R1 KB"
  ${EndIf}
  ${If} ${FileExists} "$INSTDIR\resources\app.asar.unpacked\apps\web"
    ${GetSize} "$INSTDIR\resources\app.asar.unpacked\apps\web" "/S=Kb" $R1 $R2 $R3
    ${GetTime} "" "L" $0 $1 $2 $3 $4 $5 $6
    FileWrite $R0 "[$4:$5:$6] apps\web payload:       $R1 KB, $R2 files$\r$\n"
    DetailPrint "  web:      $R2 files, $R1 KB"
  ${EndIf}
  ${If} ${FileExists} "$INSTDIR\resources\app.asar.unpacked\apps\desktop-app"
    ${GetSize} "$INSTDIR\resources\app.asar.unpacked\apps\desktop-app" "/S=Kb" $R1 $R2 $R3
    ${GetTime} "" "L" $0 $1 $2 $3 $4 $5 $6
    FileWrite $R0 "[$4:$5:$6] apps\desktop-app:       $R1 KB, $R2 files$\r$\n"
    DetailPrint "  desktop:  $R2 files, $R1 KB"
  ${EndIf}
  ${If} ${FileExists} "$INSTDIR\resources\app.asar.unpacked\node_modules"
    ${GetSize} "$INSTDIR\resources\app.asar.unpacked\node_modules" "/S=Kb" $R1 $R2 $R3
    ${GetTime} "" "L" $0 $1 $2 $3 $4 $5 $6
    FileWrite $R0 "[$4:$5:$6] node_modules (unpacked):$R1 KB, $R2 files$\r$\n"
    DetailPrint "  unpacked node_modules: $R2 files, $R1 KB"
  ${EndIf}

  ; ---------- Verify key executables ----------
  FileWrite $R0 "----------------------------------------------------------------$\r$\n"
  FileWrite $R0 "  Section 3 of 5 : Executable verification$\r$\n"
  FileWrite $R0 "----------------------------------------------------------------$\r$\n"

  ${GetTime} "" "L" $0 $1 $2 $3 $4 $5 $6
  ${If} ${FileExists} "$INSTDIR\${APP_EXECUTABLE_FILENAME}"
    FileWrite $R0 "[$4:$5:$6] OK  $INSTDIR\${APP_EXECUTABLE_FILENAME}$\r$\n"
    DetailPrint "Found: ${APP_EXECUTABLE_FILENAME}"
  ${Else}
    FileWrite $R0 "[$4:$5:$6] MISSING  $INSTDIR\${APP_EXECUTABLE_FILENAME}$\r$\n"
    DetailPrint "WARNING: ${APP_EXECUTABLE_FILENAME} not found"
  ${EndIf}

  ${If} ${FileExists} "$INSTDIR\resources\app.asar.unpacked\apps\desktop-app\bin\cloudflared.exe"
    FileWrite $R0 "[$4:$5:$6] OK  cloudflared.exe (bundled tunnel)$\r$\n"
    DetailPrint "Found: cloudflared.exe"
  ${Else}
    FileWrite $R0 "[$4:$5:$6] WARN cloudflared.exe not found at expected path$\r$\n"
  ${EndIf}

  ${If} ${FileExists} "$INSTDIR\resources\app.asar.unpacked\node_modules\pdf-to-printer\dist\SumatraPDF-3.4.6-32.exe"
    FileWrite $R0 "[$4:$5:$6] OK  SumatraPDF (print driver helper)$\r$\n"
    DetailPrint "Found: SumatraPDF"
  ${Else}
    FileWrite $R0 "[$4:$5:$6] WARN SumatraPDF not found at expected path$\r$\n"
  ${EndIf}

  ; Prisma SQLite engine
  ${If} ${FileExists} "$INSTDIR\resources\prisma\query_engine-windows.dll.node"
    FileWrite $R0 "[$4:$5:$6] OK  Prisma SQLite query engine$\r$\n"
    DetailPrint "Found: Prisma query engine"
  ${Else}
    FileWrite $R0 "[$4:$5:$6] WARN Prisma query engine not found$\r$\n"
  ${EndIf}

  ; SQLite template DB
  ${If} ${FileExists} "$INSTDIR\resources\app.asar.unpacked\apps\backend\prisma\template.db"
    FileWrite $R0 "[$4:$5:$6] OK  SQLite template database (template.db)$\r$\n"
    DetailPrint "Found: SQLite template.db"
  ${Else}
    FileWrite $R0 "[$4:$5:$6] WARN template.db missing - first launch will fail$\r$\n"
    DetailPrint "WARNING: template.db missing"
  ${EndIf}

  ; ---------- Data directories ----------
  FileWrite $R0 "----------------------------------------------------------------$\r$\n"
  FileWrite $R0 "  Section 4 of 5 : Runtime data directories$\r$\n"
  FileWrite $R0 "----------------------------------------------------------------$\r$\n"

  ${GetTime} "" "L" $0 $1 $2 $3 $4 $5 $6
  DetailPrint "Creating data directories under $LOCALAPPDATA\QuickPrint"

  CreateDirectory "$LOCALAPPDATA\QuickPrint"
  FileWrite $R0 "[$4:$5:$6] mkdir  $LOCALAPPDATA\QuickPrint$\r$\n"

  CreateDirectory "$LOCALAPPDATA\QuickPrint\logs"
  ${GetTime} "" "L" $0 $1 $2 $3 $4 $5 $6
  FileWrite $R0 "[$4:$5:$6] mkdir  $LOCALAPPDATA\QuickPrint\logs$\r$\n"

  CreateDirectory "$LOCALAPPDATA\QuickPrint\queue"
  ${GetTime} "" "L" $0 $1 $2 $3 $4 $5 $6
  FileWrite $R0 "[$4:$5:$6] mkdir  $LOCALAPPDATA\QuickPrint\queue$\r$\n"

  CreateDirectory "$LOCALAPPDATA\QuickPrint\uploads"
  ${GetTime} "" "L" $0 $1 $2 $3 $4 $5 $6
  FileWrite $R0 "[$4:$5:$6] mkdir  $LOCALAPPDATA\QuickPrint\uploads$\r$\n"

  DetailPrint "  created: $LOCALAPPDATA\QuickPrint"
  DetailPrint "  created: $LOCALAPPDATA\QuickPrint\logs"
  DetailPrint "  created: $LOCALAPPDATA\QuickPrint\queue"
  DetailPrint "  created: $LOCALAPPDATA\QuickPrint\uploads"

  ${If} ${FileExists} "$LOCALAPPDATA\QuickPrint\quickprint.db"
    ${GetTime} "" "L" $0 $1 $2 $3 $4 $5 $6
    FileWrite $R0 "[$4:$5:$6] Existing quickprint.db detected (will be reused).$\r$\n"
    DetailPrint "Existing quickprint.db detected - will be reused on next launch"
  ${Else}
    ${GetTime} "" "L" $0 $1 $2 $3 $4 $5 $6
    FileWrite $R0 "[$4:$5:$6] No existing quickprint.db - first launch will seed from template.db.$\r$\n"
    DetailPrint "Fresh install: quickprint.db will be seeded on first launch"
  ${EndIf}

  ; ---------- Closing summary ----------
  FileWrite $R0 "----------------------------------------------------------------$\r$\n"
  FileWrite $R0 "  Section 5 of 5 : Registry and shortcuts$\r$\n"
  FileWrite $R0 "----------------------------------------------------------------$\r$\n"

  ${GetTime} "" "L" $0 $1 $2 $3 $4 $5 $6
  FileWrite $R0 "[$4:$5:$6] Writing Add/Remove Programs entry:$\r$\n"
  FileWrite $R0 "[$4:$5:$6]   key: HKCU\${INSTALL_REGISTRY_KEY}$\r$\n"
  FileWrite $R0 "[$4:$5:$6] Creating Start Menu shortcut: QuickPrint$\r$\n"
  FileWrite $R0 "[$4:$5:$6] Creating Desktop shortcut:    QuickPrint$\r$\n"
  DetailPrint "Registering Add/Remove Programs entry"
  DetailPrint "Creating Start Menu and Desktop shortcuts"

  ; ---------- Final timestamp ----------
  FileWrite $R0 "================================================================$\r$\n"
  ${GetTime} "" "L" $0 $1 $2 $3 $4 $5 $6
  FileWrite $R0 "[$4:$5:$6] Install completed successfully.$\r$\n"
  FileWrite $R0 "[$4:$5:$6] Log file:        $INSTDIR\install.log$\r$\n"
  FileWrite $R0 "[$4:$5:$6] Persistent copy: $LOCALAPPDATA\QuickPrint\install.log$\r$\n"
  FileWrite $R0 "================================================================$\r$\n"
  FileClose $R0

  ; Mirror to LOCALAPPDATA so the log survives an uninstall.
  CopyFiles /SILENT "$INSTDIR\install.log" "$LOCALAPPDATA\QuickPrint\install.log"

  DetailPrint ""
  DetailPrint "===================================================="
  DetailPrint "  QuickPrint installed successfully."
  DetailPrint "  Install log: $INSTDIR\install.log"
  DetailPrint "  Persistent: $LOCALAPPDATA\QuickPrint\install.log"
  DetailPrint "===================================================="

qp_install_done:
!macroend


; ===========================================================================
;  customUnInstall - record uninstall to the persistent log.
; ===========================================================================
!macro customUnInstall
  SetDetailsPrint both

  DetailPrint ""
  DetailPrint "Removing QuickPrint application files from $INSTDIR ..."
  DetailPrint "Shop data (quickprint.db, logs, settings) will be preserved at:"
  DetailPrint "   $LOCALAPPDATA\QuickPrint"
  DetailPrint "Delete that folder manually if you want a completely clean wipe."
  DetailPrint ""

  ClearErrors
  FileOpen $R0 "$LOCALAPPDATA\QuickPrint\install.log" a
  ${IfNot} ${Errors}
    FileSeek $R0 0 END
    FileWrite $R0 "----------------------------------------------------------------$\r$\n"
    ${GetTime} "" "L" $0 $1 $2 $3 $4 $5 $6
    FileWrite $R0 "[$4:$5:$6] UNINSTALL  Uninstalled on $2-$1-$0$\r$\n"
    FileWrite $R0 "[$4:$5:$6] UNINSTALL  Shop data preserved at $LOCALAPPDATA\QuickPrint$\r$\n"
    FileWrite $R0 "================================================================$\r$\n"
    FileClose $R0
  ${EndIf}
!macroend

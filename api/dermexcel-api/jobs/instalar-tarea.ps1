param(
  [string]$ApiPath = 'C:\xampp\htdocs\dermexcel-api',
  [string]$PhpPath = 'C:\xampp\php\php.exe',
  [Parameter(Mandatory=$true)][string]$PythonPath
)
$ErrorActionPreference = 'Stop'
if (!(Test-Path -LiteralPath $PhpPath) -or !(Test-Path -LiteralPath $PythonPath)) { throw 'No se encontró PHP o Python.' }
& $PythonPath -c 'import reportlab'
if ($LASTEXITCODE -ne 0) { throw 'Instala reportlab en el Python seleccionado.' }
if ((Get-TimeZone).Id -ne 'Central Standard Time (Mexico)') { throw 'Esta tarea local requiere zona horaria Central Standard Time (Mexico).' }
$TaskScript = Join-Path $ApiPath 'jobs\reportes_diarios.php'
if (!(Test-Path -LiteralPath $TaskScript)) { throw 'Falta jobs/reportes_diarios.php.' }
$PythonPhpPath = $PythonPath.Replace('\','/').Replace("'","\'")
Set-Content -LiteralPath (Join-Path $ApiPath 'reportes_runtime.php') -Encoding ascii -Value "<?php return ['python' => '$PythonPhpPath'];"
$Action = New-ScheduledTaskAction -Execute $PhpPath -Argument ('"'+$TaskScript+'"') -WorkingDirectory $ApiPath
$Triggers = @((New-ScheduledTaskTrigger -Daily -At '23:00'),(New-ScheduledTaskTrigger -Daily -At '00:05'),(New-ScheduledTaskTrigger -AtLogOn -User ([System.Security.Principal.WindowsIdentity]::GetCurrent().Name)))
$Settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -WakeToRun -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 10) -ExecutionTimeLimit (New-TimeSpan -Hours 2) -MultipleInstances IgnoreNew
$Principal = New-ScheduledTaskPrincipal -UserId ([System.Security.Principal.WindowsIdentity]::GetCurrent().Name) -LogonType Interactive -RunLevel Limited
Register-ScheduledTask -TaskName 'FiadOS-Reportes-Diarios' -Action $Action -Trigger $Triggers -Settings $Settings -Principal $Principal -Description 'Reportes por negocio a las 23:00; cierre por fecha a las 00:05; recuperación de fechas pendientes al iniciar sesión. Requiere MySQL disponible.' -Force

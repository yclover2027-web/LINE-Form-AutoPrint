$path = "C:\Users\edge\Desktop\monitor_drive.ps1"
$content = Get-Content $path -Encoding UTF8
Set-Content $path -Value $content -Encoding UTF8

$WScriptShell = New-Object -ComObject WScript.Shell
$ShortcutPath = "C:\Users\edge\Desktop\Print_Start.lnk"
$Shortcut = $WScriptShell.CreateShortcut($ShortcutPath)
$Shortcut.TargetPath = "powershell.exe"
# WindowStyle Minimized を追加
$Shortcut.Arguments = "-ExecutionPolicy Bypass -NoExit -WindowStyle Minimized -File `"C:\Users\edge\Desktop\monitor_drive.ps1`""
$Shortcut.WorkingDirectory = "C:\Users\edge\Desktop"
$Shortcut.Save()

# スタートアップフォルダへのコピー
$StartupPath = "$env:APPDATA\Microsoft\Windows\Start Menu\Programs\Startup\Print_Start.lnk"
Copy-Item -Path $ShortcutPath -Destination $StartupPath -Force

$WScriptShell = New-Object -ComObject WScript.Shell
$Shortcut = $WScriptShell.CreateShortcut("C:\Users\edge\Desktop\処方せん自動印刷（ここから起動）.lnk")
$Shortcut.TargetPath = "powershell.exe"
$Shortcut.Arguments = "-ExecutionPolicy Bypass -NoExit -File `"C:\Users\edge\Desktop\monitor_drive.ps1`""
$Shortcut.WorkingDirectory = "C:\Users\edge\Desktop"
$Shortcut.Save()

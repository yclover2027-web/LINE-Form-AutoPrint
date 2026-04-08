# ===============================================
# 処方せん・アンケート自動印刷プログラム（本店用 最新安定版）
# ===============================================

# 💡【設定】見張るフォルダのリスト
$watchFolders = @(
    "G:\.shortcut-targets-by-id\1sl0R1Q2rbR1P3DNRFzMuNgXW7xh5mGVu\処方せん受信トレイ",
    "G:\.shortcut-targets-by-id\1830wThmRTlpZdZaCK9mVbXGMiUj8pF2A\アンケート本店"
)

Write-Host "==============================================="
Write-Host "  クローバー調剤薬局 本店さま専用"
Write-Host "  自動印刷プログラム 稼働中...（最新安定版 - ペイント印刷方式）"
Write-Host "==============================================="
Write-Host ""
Write-Host "👀 Google ドライブの 📁処方せん と 📁アンケート を見張っています..."
Write-Host "※この画面を「×」で閉じると、印刷が停止します。"
Write-Host ""

while ($true) {
    foreach ($watchFolder in $watchFolders) {
        # フォルダが存在するか確認
        if (-not (Test-Path $watchFolder)) { continue }
        
        $printedFolder = Join-Path $watchFolder "印刷済み"
        if (-not (Test-Path $printedFolder)) {
            New-Item -ItemType Directory -Path $printedFolder | Out-Null
        }
        
        # JPG, PNG, PDF を探す
        $files = Get-ChildItem -Path $watchFolder -File | Where-Object { $_.Extension -match '\.(jpg|png|jpeg|pdf)$' }
        
        foreach ($file in $files) {
            Write-Host ("🔔 新しいファイルを発見しました: " + $file.Name)
            
            $targetPath = Join-Path $printedFolder $file.Name
            
            try {
                # 印刷済みフォルダへ移動
                Move-Item -Path $file.FullName -Destination $targetPath -ErrorAction Stop
                Write-Host "🚚 「印刷済み」フォルダに移動しました。"
                
                if ($file.Extension -match '\.pdf$') {
                    Write-Host "🖨️ PDFを印刷しています..."
                    Start-Sleep -Seconds 1 # ファイルの安定待ち
                    
                    # 複合機エラー(F46F)対策：ファイル名に絵文字があると落ちるため、一時的に安全な名前に変えて印刷します
                    $tempPdfPath = Join-Path $printedFolder "temp_print_file.pdf"
                    if (Test-Path $tempPdfPath) { Remove-Item $tempPdfPath -Force }
                    Copy-Item $targetPath $tempPdfPath
                    
                    Start-Process -FilePath $tempPdfPath -Verb Print -Wait
                    
                    Start-Sleep -Seconds 2 # 印刷指示が飛ぶのを待つ
                    Remove-Item $tempPdfPath -Force
                } else {
                    Write-Host "🔄 画像をペイント経由で印刷しています..."
                    Start-Sleep -Seconds 1 # ファイルの安定待ち
                    
                    # 💡複合機エラー(F46F)対策：C#のPrintDocumentを使わず、Windows標準のmspaintに印刷を丸投げします
                    # mspaint /pt "ファイルパス" で既定のプリンタに印刷されます
                    $pinfo = New-Object System.Diagnostics.ProcessStartInfo
                    $pinfo.FileName = "mspaint.exe"
                    $pinfo.Arguments = "/pt `"$targetPath`""
                    $pinfo.WindowStyle = [System.Diagnostics.ProcessWindowStyle]::Hidden
                    $p = [System.Diagnostics.Process]::Start($pinfo)
                    $p.WaitForExit(10000) # 10秒待機
                    
                    Start-Sleep -Seconds 2 # プリンタにジョブが送られるのを待つ
                }
                
                Write-Host "✨ 印刷指示が完了しました！"
                Write-Host ""
            } catch {
                Write-Warning "⚠️ ダウンロード中、または印刷エラーのため待機します"
                Write-Host "⏳ 5秒後に再試行します..."
                Write-Host ""
            }
        }
    }
    
    Start-Sleep -Seconds 5
}

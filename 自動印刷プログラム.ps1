# ===============================================
# 処方せん・アンケート自動印刷プログラム（本店用 最新安定版）
# ===============================================

Add-Type -AssemblyName System.Drawing

# 💡【設定】見張るフォルダのリスト
$watchFolders = @(
    "G:\.shortcut-targets-by-id\1sl0R1Q2rbR1P3DNRFzMuNgXW7xh5mGVu\処方せん受信トレイ",
    "G:\.shortcut-targets-by-id\1830wThmRTlpZdZaCK9mVbXGMiUj8pF2A\アンケート本店"
)

# 🖨️ 写真印刷用の関数（ペイントを使わず用紙にピッタリ合わせる）
function Print-Image {
    param([string]$ImagePath)
    
    $doc = New-Object System.Drawing.Printing.PrintDocument
    # 複合機エラー(F46F)対策：印刷ジョブ名を安全な英数字に固定します
    $doc.DocumentName = "LINE_Print_Job"
    # 縦向きに強制
    $doc.DefaultPageSettings.Landscape = $false
    
    $script:PrintImagePath = $ImagePath
    
    $action = {
        param($sender, $e)
        
        $img = [System.Drawing.Image]::FromFile($script:PrintImagePath)
        
        # 1. スマホ写真などの回転情報（EXIF）を読み取って正しい向きに補正
        if ($img.PropertyIdList -contains 0x0112) {
            $prop = $img.GetPropertyItem(0x0112)
            $orient = [BitConverter]::ToUInt16($prop.Value, 0)
            if ($orient -eq 3) { $img.RotateFlip('Rotate180FlipNone') }
            elseif ($orient -eq 6) { $img.RotateFlip('Rotate90FlipNone') }
            elseif ($orient -eq 8) { $img.RotateFlip('Rotate270FlipNone') }
        }
        
        # 2. にっさい店での知見：横長の写真は強制的に縦向き（90度回転）にする
        if ($img.Width -gt $img.Height) {
            $img.RotateFlip('Rotate90FlipNone')
        }
        
        # 用紙の余白内枠（MarginBounds）を取得
        $rect = $e.MarginBounds
        
        # 用紙にピッタリ収まるようにサイズを計算
        $ratioX = $rect.Width / $img.Width
        $ratioY = $rect.Height / $img.Height
        $ratio = [Math]::Min($ratioX, $ratioY)
        
        $w = [int]($img.Width * $ratio)
        $h = [int]($img.Height * $ratio)
        
        # 用紙の中央に配置
        $x = $rect.Left + ($rect.Width - $w) / 2
        $y = $rect.Top + ($rect.Height - $h) / 2
        
        # 画像を描画して印刷
        $e.Graphics.DrawImage($img, $x, $y, $w, $h)
        $img.Dispose()
    }
    
    $doc.add_PrintPage($action)
    $doc.Print()
    $doc.Dispose()
}

Write-Host "==============================================="
Write-Host "  クローバー調剤薬局 本店さま専用"
Write-Host "  自動印刷プログラム 稼働中...（最新安定版）"
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
                
                # ペイント(mspaint)は使わず、ファイル形式で処理を分岐
                if ($file.Extension -match '\.pdf$') {
                    Write-Host "🖨️ PDFコマンドで印刷しています..."
                    Start-Sleep -Seconds 1 # ファイルの安定待ち
                    
                    # 複合機エラー(F46F)対策：ファイル名に絵文字があると落ちるため、一時的に安全な名前に変えて印刷します
                    $tempPdfPath = Join-Path $printedFolder "temp_print_file.pdf"
                    if (Test-Path $tempPdfPath) { Remove-Item $tempPdfPath -Force }
                    Copy-Item $targetPath $tempPdfPath
                    
                    Start-Process -FilePath $tempPdfPath -Verb Print -Wait
                    
                    Start-Sleep -Seconds 2 # 印刷指示が飛ぶのを待つ
                    Remove-Item $tempPdfPath -Force
                } else {
                    Write-Host "🔄 画像の向きとサイズを自動調整して印刷しています..."
                    Start-Sleep -Seconds 1 # ファイルの安定待ち
                    Print-Image -ImagePath $targetPath
                }
                
                Write-Host "✨ 印刷完了！"
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

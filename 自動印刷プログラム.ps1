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
                    Write-Host "🔄 画像の向きを調整してペイント経由で印刷しています..."
                    Start-Sleep -Seconds 1 # ファイルの安定待ち
                    
                    # C#の画像ライブラリを読み込み
                    Add-Type -AssemblyName System.Drawing
                    $tempImgPath = Join-Path $printedFolder "temp_print_img.bmp" 
                    
                    try {
                        # 画像を読み込み
                        $img = [System.Drawing.Image]::FromFile($targetPath)
                        
                        # 💡スマホ特有の「Exif回転情報」を読み取って正しい向きに直す
                        if ($img.PropertyIdList -contains 274) {
                            $orientation = [BitConverter]::ToInt16($img.GetPropertyItem(274).Value, 0)
                            switch ($orientation) {
                                3 { $img.RotateFlip([System.Drawing.RotateFlipType]::Rotate180FlipNone) }
                                6 { $img.RotateFlip([System.Drawing.RotateFlipType]::Rotate90FlipNone) }
                                8 { $img.RotateFlip([System.Drawing.RotateFlipType]::Rotate270FlipNone) }
                            }
                        }
                        
                        # 💡それでも横長（幅が高さより大きい）の場合は90度回転させて縦にする
                        if ($img.Width -gt $img.Height) {
                            Write-Host "📐 横長の写真を検知しました。縦向きに強制回転させます。"
                            $img.RotateFlip([System.Drawing.RotateFlipType]::Rotate90FlipNone)
                        }

                        # 💡最強の安定化（F46Fエラー防止ワクチン）
                        # 複合機がパンク(F46F)する原因はスマホの超高画質データをそのままプリンタに送るためです。
                        # ここでA4用紙に必要十分なサイズ（長辺1750px程度）に縮小し、メタデータを完全剥離した新品の画像を作ります。
                        $ratio = $img.Width / $img.Height
                        $newHeight = 1750
                        $newWidth = 1750 * $ratio
                        
                        $cleanBmp = New-Object System.Drawing.Bitmap([int]$newWidth, [int]$newHeight)
                        $g = [System.Drawing.Graphics]::FromImage($cleanBmp)
                        $g.Clear([System.Drawing.Color]::White)
                        $g.DrawImage($img, 0, 0, [int]$newWidth, [int]$newHeight)
                        $g.Dispose()

                        # 最も安定して処理できるBMP形式で一時保存
                        $cleanBmp.Save($tempImgPath, [System.Drawing.Imaging.ImageFormat]::Bmp)
                        
                        # メモリ解放
                        $cleanBmp.Dispose()
                        $img.Dispose()
                        
                        $printTarget = $tempImgPath
                    } catch {
                        Write-Warning "画像の前処理に失敗しました。元の画像をそのまま印刷します。"
                        $printTarget = $targetPath
                    }
                    
                    # 💡Windows 11でのペイントアプリの仕様変更などに対抗するため、外部アプリに頼らず、
                    # プログラム内部の印刷機能（PrintDocument）を使い、強制的に「絶対に縦長で印刷しろ」と命令します。
                    Write-Host "🖨️ 専用印刷エンジンを利用して印刷しています..."
                    
                    try {
                        $pd = New-Object System.Drawing.Printing.PrintDocument
                        # 強制的に「縦向き(Landscape=false)」を指定
                        $pd.DefaultPageSettings.Landscape = $false
                        # 余白を極限までゼロにする
                        $pd.DefaultPageSettings.Margins = New-Object System.Drawing.Printing.Margins(0, 0, 0, 0)

                        # 印刷する瞬間の処理を定義
                        $pd.add_PrintPage({
                            param($sender, $e)
                            $imgToPrint = [System.Drawing.Image]::FromFile($printTarget)
                            # 用紙のサイズいっぱいに画像を配置する
                            $e.Graphics.DrawImage($imgToPrint, $e.PageBounds)
                            $imgToPrint.Dispose()
                        })

                        # 印刷実行
                        $pd.Print()
                        $pd.Dispose()
                        
                        Start-Sleep -Seconds 2
                        
                        # 一時ファイルを削除
                        if (Test-Path $printTarget) { Remove-Item $printTarget -ErrorAction SilentlyContinue }
                        
                    } catch {
                        Write-Warning "印刷中にエラーが発生しました: $_"
                    }
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

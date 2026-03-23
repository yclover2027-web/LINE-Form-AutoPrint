# ===============================================
# 処方せん自動印刷プログラム（監視用 小人さん）
# ===============================================

# 💡【設定】見張るフォルダの場所
$watchFolder = "G:\.shortcut-targets-by-id\1sl0R1Q2rbR1P3DNRFzMuNgXW7xh5mGVu\処方せん受信トレイ"
$printedFolder = Join-Path $watchFolder "印刷済み"

# 「印刷済み」フォルダがなければ作成
if (-not (Test-Path $printedFolder)) {
    New-Item -ItemType Directory -Path $printedFolder | Out-Null
}

Write-Host "==============================================="
Write-Host "  クローバー調剤薬局さま専用"
Write-Host "  処方せん自動印刷プログラム（監視用 小人さん）"
Write-Host "==============================================="
Write-Host ""
Write-Host "👀 新しい処方せんが Google ドライブ に届くのを見張っています..."
Write-Host "※この画面を「×」で閉じると、印刷が停止します。"
Write-Host ""

# 監視ループ
while ($true) {
    # フォルダ内のJPGとPNGを探す
    $files = Get-ChildItem -Path $watchFolder -Include *.jpg, *.png -File
    
    foreach ($file in $files) {
        Write-Host ("🔔 新しい処方せんを発見しました: " + $file.Name)
        
        $targetPath = Join-Path $printedFolder $file.Name
        
        try {
            # 写真を「印刷済み」フォルダへ移動（移動できない場合はダウンロード中と判断）
            Move-Item -Path $file.FullName -Destination $targetPath -ErrorAction Stop
            
            Write-Host "🖨️ Windowsの「ペイント」を使って印刷をお願いしています..."
            # ペイントを起動して印刷を実行 (/p オプション)
            Start-Process mspaint.exe -ArgumentList "/p", "`"$targetPath`"" -Wait
            
            Write-Host "✅ 印刷が完了しました！"
            Write-Host ""
        } catch {
            Write-Host "⏳ まだインターネットからダウンロード中のため、数秒待ちます..."
            Write-Host ""
        }
    }
    
    # 5秒待機
    Start-Sleep -Seconds 5
}

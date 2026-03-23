// ============================================
// Googleドライブに写真を保存＋薬局へLINE通知を送る小人さん（GASプログラム）
// ============================================

// ============================================================
// 🔑 設定エリア
// ============================================================

// LINEのBot（クローバー薬局Bot）のチャネルアクセストークン
// これはプログラムがBotになりきってメッセージを送るための「許可証」です
const LINE_CHANNEL_ACCESS_TOKEN = 'FZi49uBEagts6XA1ewmpt5NBsmHiVi9firJ8q8/tLnqFXJ7d2h9qsk9SwTIKp2hN/nm4p0QwkvwmY23KbRh9AEnJMbdGXPOv/PEWPUjijZfF3iN6X104vF2jF6jEIQ9/HwODqKz+9YOBmKtNimsyEwdB04t89/1O/w1cDnyilFU=';

// ============================================================
// Web画面から「これ保存して！」とデータが送られてきた時に動く口（doPost）
// ============================================================
function doPost(e) {
  try {
    // 1. 送られてきた情報を読み解きます
    var data = JSON.parse(e.postData.contents);
    var images   = data.images;   // 写真のリスト
    var userName = data.userName || '患者様'; // 送信した人のLINE表示名（例：「鈴木 一郎」）
    var userId   = data.userId   || '';       // 送信した人のLINEユーザーID（返信用）

    // 2. Googleドライブの保存先フォルダを探す（なければ作る）
    var folderName = "処方せん受信トレイ";
    var folders = DriveApp.getFoldersByName(folderName);
    var targetFolder;
    if (folders.hasNext()) {
      targetFolder = folders.next();
    } else {
      targetFolder = DriveApp.createFolder(folderName);
    }

    // 3. ファイル名に時間とお名前を入れます
    // 例：20260323_221500_鈴木一郎_1枚目.jpg
    var now = new Date();
    var timeString = Utilities.formatDate(now, "Asia/Tokyo", "yyyyMMdd_HHmmss");
    // お名前をファイル名に使える形に整えます（スペースはアンダーバーに変換）
    var safeUserName = userName.replace(/\s+/g, '_');

    // 4. 送られてきた写真を順番にドライブへ保存します
    var savedFileNames = [];
    for (var i = 0; i < images.length; i++) {
      var imageInfo = images[i];
      var byteCharacters = Utilities.base64Decode(imageInfo.base64Data);
      var fileName = timeString + "_" + safeUserName + "_" + (i + 1) + "枚目" + getExtension(imageInfo.mimeType);
      var blob = Utilities.newBlob(byteCharacters, imageInfo.mimeType, fileName);
      targetFolder.createFile(blob);
      savedFileNames.push(fileName);
    }

    // 5. 薬局のBotからユーザーへ「受付完了」の返信を送ります
    // ※ userId が取得できた時だけ送ります
    if (userId) {
      sendLineReply(userId, userName, images.length);
    }

    // 6. 完了報告を返します
    return ContentService.createTextOutput(JSON.stringify({
      "status":  "success",
      "message": images.length + "枚の写真を保存しました！",
      "files":   savedFileNames
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      "status":  "error",
      "message": error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}


// ============================================================
// 💬 LINE Messaging API を使って患者さんへ返信を送る関数
// ============================================================
// 「プッシュメッセージ」とは、BotからLINEユーザーに能動的にメッセージを送る機能です
function sendLineReply(userId, userName, imageCount) {
  try {
    var message = userName + '様、処方せん（' + imageCount + '枚）を受け付けました！\n' +
                  'お薬の準備ができましたら、またご連絡いたします。\n' +
                  'しばらくお待ちください🌿';

    // LINEのサーバーに「このユーザーにメッセージを送ってください」とお願いします
    var options = {
      method:  'post',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': 'Bearer ' + LINE_CHANNEL_ACCESS_TOKEN
      },
      payload: JSON.stringify({
        to:       userId,   // 送り先のユーザーID
        messages: [{ type: 'text', text: message }]
      }),
      muteHttpExceptions: true // エラーでもプログラムを止めないようにします
    };

    // LINEのAPIエンドポイント（お届け先の住所みたいなもの）
    UrlFetchApp.fetch('https://api.line.me/v2/bot/message/push', options);

  } catch (err) {
    // 返信に失敗しても、写真保存のメインの処理には影響を与えません
    Logger.log('LINE返信に失敗しました: ' + err.toString());
  }
}


// ============================================================
// ファイルの種類から拡張子（.jpgなど）を返す関数
// ============================================================
function getExtension(mimeType) {
  if (mimeType.indexOf("jpeg") !== -1 || mimeType.indexOf("jpg") !== -1) return ".jpg";
  if (mimeType.indexOf("png")  !== -1) return ".png";
  if (mimeType.indexOf("heic") !== -1) return ".jpg";
  return ".jpg";
}

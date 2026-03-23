// ============================================
// Googleドライブに写真を保存する小人さん（GASプログラム）です
// ============================================

// Web画面から「これ保存して！」とデータが送られてきた時に動く特別な口（doPost）です
function doPost(e) {
  try {
    // 1. 送られてきた情報を読み解きます
    var data = JSON.parse(e.postData.contents);
    var images = data.images; // 送られてきた写真のリストです
    
    // 2. Googleドライブの中に保存先となる「専用の箱（フォルダ）」を作る（または探す）
    var folderName = "処方せん受信トレイ"; // ←この名前のフォルダが一番上の階層に作られます
    var folders = DriveApp.getFoldersByName(folderName);
    var targetFolder;
    
    if (folders.hasNext()) {
      targetFolder = folders.next(); // 既に「処方せん受信トレイ」があったらそれを使います
    } else {
      targetFolder = DriveApp.createFolder(folderName); // なければ新しくフォルダを作ります
    }
    
    // 3. ファイルの名前に「送られた時間」をつけるための準備
    var now = new Date();
    // 例：20260321_123045 のような「年・月・日_時分秒」という名前を作ります
    var timeString = Utilities.formatDate(now, "Asia/Tokyo", "yyyyMMdd_HHmmss");
    
    // 4. 送られてきた写真を順番にドライブへ保存していきます
    var savedUrls = []; // 保存した結果をメモする用のリスト
    
    for (var i = 0; i < images.length; i++) {
      var imageInfo = images[i]; // i番目の写真
      
      // インターネットを通るために「Base64」という文字の羅列の暗号になっていたものを、元の写真データによみがえらせる魔法
      var byteCharacters = Utilities.base64Decode(imageInfo.base64Data);
      
      // 画像として名前をつけて組み立て直す
      // （例： 20260321_123045_1枚目.jpg という名前になります）
      var fileName = timeString + "_" + (i + 1) + "枚目" + getExtension(imageInfo.mimeType);
      var blob = Utilities.newBlob(byteCharacters, imageInfo.mimeType, fileName);
      
      // ドライブの「処方せん受信トレイ」の中に、画像ファイルを作ります！
      var file = targetFolder.createFile(blob);
      savedUrls.push(file.getUrl()); // 保存したという印をメモ
    }
    
    // 5. Web画面の方へ「成功したよ！保存したよ！」とお返事を返します
    return ContentService.createTextOutput(JSON.stringify({
      "status": "success",
      "message": images.length + "枚の写真を保存しました！",
      "urls": savedUrls
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    // 失敗した時（エラー）は「失敗しちゃったよ」とお返事します
    return ContentService.createTextOutput(JSON.stringify({
      "status": "error",
      "message": error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

// ファイルの種類（MIMEタイプ）から、最後につける名前「.jpg」や「.png」などを当てるおまじない
function getExtension(mimeType) {
  if (mimeType.indexOf("jpeg") !== -1 || mimeType.indexOf("jpg") !== -1) return ".jpg";
  if (mimeType.indexOf("png") !== -1) return ".png";
  if (mimeType.indexOf("heic") !== -1) return ".jpg"; // iPhoneの特殊な写真は、とりあえずjpgにしておきます
  return ".jpg"; // よくわからなければ、一番代表的なjpgにします
}

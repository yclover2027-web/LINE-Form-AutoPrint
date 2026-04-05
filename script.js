// --- このファイルはWebページの「動き」をつくる脳みその役割を果たします ---

// ============================================================
// 🔑 設定エリア（ここを変えると動きが変わります）
// ============================================================

// LIFFのID（LINEの管理画面で発行したもの）
// LIFFとは「Line Front-end Framework」の略で、LINEの中でWebページを動かす仕組みです
const LIFF_ID = '2009547237-ehwp3yLY';

// GAS（Googleの小人さん）のURL
const GAS_URL = 'https://script.google.com/macros/s/AKfycbwxzxzgA_blzzbe6-Vl-YV--8Nqw-hOl1mnUGGnfn961OsI8Nj1Sz2PslcGR3OtRNWJ2A/exec';

// ============================================================
// 📦 グローバル変数（プログラム全体で使う情報を入れておく箱）
// ============================================================

// 送信した人のLINE表示名（後でLIFFが取得して入れます）
let lineUserName = '患者様';
// 送信した人のLINEユーザーID（薬局からのメッセージ返信に使います）
let lineUserId = '';

// カメラで撮影した写真を一時的に保管する箱（1〜5番目のスロット）
// ※ file input に直接セットできない場合があるため、ここに保管します
let cameraFiles = [null, null, null, null, null];

// 現在カメラを開いている対象のスロット番号（1〜5）
let currentCameraSlot = 0;

// カメラの映像ストリーム（カメラを止める時に使います）
let currentStream = null;


// ============================================================
// 🚀 LIFF初期化（ページが開いた時に一番最初に動きます）
// ============================================================
async function initLiff() {
    try {
        // LIFFを起動します（LINE側との接続を開始します）
        await liff.init({ liffId: LIFF_ID });

        if (liff.isLoggedIn()) {
            // LINEにログイン済みの場合、プロフィール（名前など）を取得します
            const profile = await liff.getProfile();
            lineUserName = profile.displayName; // 例：「鈴木 一郎」
            lineUserId   = profile.userId;       // 例：「Uabc123...」

            // 画面に「〇〇様、ようこそ！」と表示します
            document.getElementById('userName').textContent = lineUserName;
            document.getElementById('welcomeMessage').style.display = 'block';

        } else {
            // ログインしていない場合はLINEのログイン画面へ飛ばします
            liff.login();
        }

    } catch (err) {
        // LINEアプリ以外（パソコンのブラウザなど）で開かれた場合
        console.warn('LIFF初期化エラー（LINEアプリ以外から開かれた可能性あり）:', err);
        // 「LINEアプリから開いてください」という案内を表示します
        document.getElementById('notLiffMessage').style.display = 'block';
    }
}

// ページが読み込まれた時にLIFFを起動します
initLiff();


// ============================================================
// 📱 スマホの種類（OS）を判定してボタンを切り替えるお仕事
// ============================================================
// iPhone（iOS）からのアクセスかどうかをチェックします（判定をより確実にします）
const isIOS = /iP(hone|od|ad)/.test(navigator.userAgent) || 
              (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1); // iPad OS 対策

function switchButtonsByOS() {
    // 全てのアップロードスロット（1〜5）について処理します
    for (let i = 1; i <= 5; i++) {
        const androidBtns = document.getElementById('android-btns-' + i);
        const iosBtns = document.getElementById('ios-btns-' + i);
        
        if (isIOS) {
            // iPhoneならiPhone用ボタン（1つのボタン）だけを見せます
            if (androidBtns) androidBtns.style.display = 'none';
            if (iosBtns) iosBtns.style.display = 'flex';
        } else {
            // AndroidやパソコンならAndroid用ボタン（2つのボタン）を見せます
            if (androidBtns) androidBtns.style.display = 'flex';
            if (iosBtns) iosBtns.style.display = 'none';
        }
    }
}
// ページを開いた時と、LIFF初期化後に念のため実行します
switchButtonsByOS();

// ============================================================
// 🖼️ プレビュー（確認画面）を表示するお仕事
// ============================================================
function showPreview(file, slotNumber) {
    // iPhoneの場合はプレビューを出さずに終わり（標準カメラアプリで確認できるため）
    if (isIOS) return;

    const previewArea = document.getElementById('previewArea' + slotNumber);
    const previewImg = document.getElementById('previewImg' + slotNumber);
    const androidBtns = document.getElementById('android-btns-' + slotNumber);

    // 画像ファイルを読み込んで画面に表示するための準備
    const reader = new FileReader();
    reader.onload = function(e) {
        previewImg.src = e.target.result; // 画像データをセット
        previewArea.style.display = 'block'; // プレビュー画面を表示
        if (androidBtns) androidBtns.style.display = 'none'; // ボタンは隠す
    };
    reader.readAsDataURL(file); // 画像の読み込みスタート
}

// ============================================================
// ❌ 選び直す（リセット）のお仕事
// ============================================================
function resetSlot(slotNumber) {
    // ファイルの中身を空っぽにする
    const fileInput = document.getElementById('file' + slotNumber);
    fileInput.value = ''; 
    cameraFiles[slotNumber - 1] = null; // カメラの箱も空に
    
    // 名前やプレビューを消す
    document.getElementById('fileName' + slotNumber).textContent = '';
    document.getElementById('previewArea' + slotNumber).style.display = 'none';
    document.getElementById('previewImg' + slotNumber).src = '';
    
    // ボタンをまた見えるようにする
    if (!isIOS) {
        document.getElementById('android-btns-' + slotNumber).style.display = 'flex';
    }
}

// ============================================================
// 1. 写真が選ばれたら、ファイルの名前を画面に表示するお仕事
// ============================================================
function setupFileChange(inputId, fileNameId, slotIndex) {
    const fileInput = document.getElementById(inputId);
    const fileNameDisplay = document.getElementById(fileNameId);

    fileInput.addEventListener('change', function() {
        if (fileInput.files.length > 0) {
            const selectedFile = fileInput.files[0];
            fileNameDisplay.textContent = '選んだ写真：' + selectedFile.name;
            fileNameDisplay.style.color = '#0056b3';
            // アルバムから写真を選び直した場合、カメラの写真は上書きされるのでクリア
            cameraFiles[slotIndex] = null;

            // ★Android用にプレビューを表示します
            showPreview(selectedFile, slotIndex + 1);
        } else {
            fileNameDisplay.textContent = '';
        }
    });
}

// 5つのボタンそれぞれに設定します（3番目の引数はスロット番号 0〜4）
setupFileChange('file1', 'fileName1', 0);
setupFileChange('file2', 'fileName2', 1);
setupFileChange('file3', 'fileName3', 2);
setupFileChange('file4', 'fileName4', 3);
setupFileChange('file5', 'fileName5', 4);


// ============================================================
// 📸 カメラ機能（getUserMedia APIを使った独自カメラ）
// ============================================================

// カメラを開く（slotNumber = 1〜5）
async function openCamera(slotNumber) {
    currentCameraSlot = slotNumber;

    try {
        // カメラの使用許可を求め、背面カメラで映像を取得します
        const stream = await navigator.mediaDevices.getUserMedia({
            video: {
                facingMode: 'environment',  // 背面カメラ（書類撮影用）
                width:  { ideal: 1920 },    // できれば高解像度で
                height: { ideal: 1080 }
            },
            audio: false // 音声は不要です
        });

        currentStream = stream;

        // カメラ映像を <video> タグに流し込みます
        const video = document.getElementById('cameraVideo');
        video.srcObject = stream;

        // カメラオーバーレイを表示します（全画面でカメラが映ります）
        document.getElementById('cameraOverlay').style.display = 'flex';

    } catch (err) {
        console.error('カメラの起動に失敗しました:', err);
        alert('カメラを起動できませんでした。\nカメラの使用を許可してから、もう一度お試しください。');
    }
}

// カメラを閉じる
function closeCamera() {
    // カメラの映像ストリームを停止します
    if (currentStream) {
        currentStream.getTracks().forEach(track => track.stop());
        currentStream = null;
    }

    // video要素をクリアします
    const video = document.getElementById('cameraVideo');
    video.srcObject = null;

    // カメラオーバーレイを非表示にします
    document.getElementById('cameraOverlay').style.display = 'none';
}

// 写真を撮影する
function takePhoto() {
    const video  = document.getElementById('cameraVideo');
    const canvas = document.getElementById('cameraCanvas');

    // 映像の実際の解像度に合わせてキャンバスのサイズを設定
    canvas.width  = video.videoWidth;
    canvas.height = video.videoHeight;

    // 映像の1フレームをキャンバスに描画（＝スクリーンショットを撮る）
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // キャンバスの画像をJPEGデータ（Blob）に変換します
    canvas.toBlob(function(blob) {
        if (!blob) {
            alert('撮影に失敗しました。もう一度お試しください。');
            return;
        }

        // BlobをFileオブジェクトに変換（名前と日時をつけます）
        const now = new Date();
        const fileName = '撮影_' + now.getFullYear()
            + ('0' + (now.getMonth()+1)).slice(-2)
            + ('0' + now.getDate()).slice(-2)
            + '_' + ('0' + now.getHours()).slice(-2)
            + ('0' + now.getMinutes()).slice(-2)
            + ('0' + now.getSeconds()).slice(-2)
            + '.jpg';

        const file = new File([blob], fileName, { type: 'image/jpeg' });

        // カメラ写真を保管箱にセット（スロット番号は 0始まり なので -1 します）
        cameraFiles[currentCameraSlot - 1] = file;

        // 画面に「撮影した写真：〇〇.jpg」と表示します
        const fileNameDisplay = document.getElementById('fileName' + currentCameraSlot);
        fileNameDisplay.textContent = '📷 撮影した写真：' + fileName;
        fileNameDisplay.style.color = '#e6a23c';

        // ★Android用にプレビューを表示します
        showPreview(file, currentCameraSlot);

        // カメラを閉じます
        closeCamera();

    }, 'image/jpeg', 0.85); // JPEG品質 85%（ファイルサイズと画質のバランス）
}


// ============================================================
// 2. 「送信する」ボタンが押された時のお仕事
// ============================================================
const uploadForm = document.getElementById('uploadForm');

uploadForm.addEventListener('submit', async function(event) {
    // ボタンを押した時の「画面が変わってしまう」のをストップさせます
    event.preventDefault();

    // 写真をかき集めます
    // ※ 各スロットについて「カメラで撮った写真」か「アルバムから選んだ写真」を採用
    const filesArray = [];
    for (let i = 0; i < 5; i++) {
        const fileInput = document.getElementById('file' + (i + 1));
        if (cameraFiles[i]) {
            // カメラで撮影した写真がある場合はそちらを優先
            filesArray.push(cameraFiles[i]);
        } else if (fileInput.files.length > 0) {
            // アルバムから選んだ写真がある場合
            filesArray.push(fileInput.files[0]);
        }
    }

    // 1枚も選ばれていなかったらストップします
    if (filesArray.length === 0) {
        alert('処方せんの画像は必ず1枚以上は選んでください！');
        return;
    }

    // 送信ボタンを隠して「送信中...」表示に切り替えます
    document.getElementById('submitBtn').style.display = 'none';
    document.getElementById('loadingMessage').style.display = 'block';

    try {
        // 画像を「暗号文（Base64）」に変換して箱に詰めます
        const imagesData = [];
        for (let i = 0; i < filesArray.length; i++) {
            const file = filesArray[i];
            // ここで写真が「100%純粋なJPEG」に生まれ変わります
            const base64String = await convertFileToBase64(file);
            const base64Data = base64String.split(',')[1];
            imagesData.push({
                mimeType: 'image/jpeg', // どんなファイルから作られても中身は必ずJPEGになります
                base64Data: base64Data
            });
        }

        // GAS（小人さん）に送るための「手紙セット」を作ります
        // ここにLINEの表示名（名前）とユーザーIDも一緒に入れます！
        const payload = {
            images:   imagesData,
            userName: lineUserName, // 例：「鈴木 一郎」
            userId:   lineUserId    // 例：「Uabc123...」（薬局からの返信に使います）
        };

        // ── Step① LINEのトーク画面に「送信しました！」と自動で書き込みます ──────
        // ※これをすることで、薬剤師さんのスマホに「ピコン！」と通知が届きます。
        // ※GASの処理（保存等）より前に実行することで、順番を確実にします。
        if (liff.isInClient()) {
            try {
                await liff.sendMessages([
                    {
                        type: 'text',
                        text: `【処方せん送信完了】`
                    }
                ]);
            } catch (msgErr) {
                // sendMessagesが失敗してもメインの送信は完了させます
                console.warn('LINEへの自動投稿に失敗しました:', msgErr);
            }
        }

        // ── Step② GAS（小人さん）にデータを送ります ─────────────────────
        // ここでGoogleドライブへの保存と、Botからの返信（プッシュメッセージ）が行われます
        await fetch(GAS_URL, {
            method: 'POST',
            mode:   'no-cors', // CORSエラーを回避するための設定です
            body:   JSON.stringify(payload)
        });


        // ── Step③ 送信完了メッセージをポップアップで表示します ──────────────────
        alert('薬局への処方せん送信が完了しました！ 公式LINEにてお返事します！');

        // フォームをリセットして空っぽに戻します
        uploadForm.reset();
        for (let i = 1; i <= 5; i++) {
            document.getElementById('fileName' + i).textContent = '';
            // ★プレビュー表示も元に戻します
            document.getElementById('previewArea' + i).style.display = 'none';
            document.getElementById('previewImg' + i).src = '';
            if (!isIOS) {
                const androidBtns = document.getElementById('android-btns-' + i);
                if (androidBtns) androidBtns.style.display = 'flex';
            }
        }
        // カメラ写真の保管箱もクリアします
        cameraFiles = [null, null, null, null, null];

    } catch (error) {
        // 通信エラー時の処理
        console.error('通信エラー:', error);
        alert('通信エラーが起きました。電波の良いところで再度お試しください。');

    } finally {
        // 成功しても失敗しても、ボタンを元に戻します
        document.getElementById('submitBtn').style.display = 'block';
        document.getElementById('loadingMessage').style.display = 'none';
    }
});


// ============================================================
// 写真を「100%純粋なJPEG形式」の文字（Base64）に生まれ変わらせる関数
// ============================================================
function convertFileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = function(event) {
            const img = new Image();
            img.onload = function() {
                // 見えない画用紙（Canvas）を作ります
                const canvas = document.createElement('canvas');
                
                // 【2026-04-05 改善】複合機のメモリエラー対策
                // LINEから保存した高解像度写真（4000px超など）が送信されると、
                // 複合機のメモリが処理しきれずエラーになることがあったため、
                // 最大サイズを1600px、JPEG品質を80%に抑えました。
                // A4用紙への印刷では1600pxで十分きれいに文字が読めます。
                let width = img.width;
                let height = img.height;
                const MAX_SIZE = 1600; // 複合機でも安定して印刷できるサイズ（A4印刷に十分）
                
                if (width > MAX_SIZE || height > MAX_SIZE) {
                    if (width > height) {
                        height = Math.round((height * MAX_SIZE) / width);
                        width = MAX_SIZE;
                    } else {
                        width = Math.round((width * MAX_SIZE) / height);
                        height = MAX_SIZE;
                    }
                }

                canvas.width = width;
                canvas.height = height;
                
                const ctx = canvas.getContext('2d');
                
                // 透明な部分（PNG画像など）が印刷時に真っ黒にならないよう、背景を真っ白に塗ります
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, width, height);
                
                // 画用紙に画像を貼り付けます
                ctx.drawImage(img, 0, 0, width, height);
                
                // 画用紙に貼った絵を、標準の「JPEG形式（画質80%）」にして取り出します。
                // 品質80%でも処方箋の文字は十分読めます。複合機に優しいデータサイズになります。
                const dataUrl = canvas.toDataURL('image/jpeg', 0.80);
                resolve(dataUrl);
            };
            img.onerror = () => reject(new Error("画像の読み込みに失敗しました"));
            img.src = event.target.result;
        };
        reader.onerror = error => reject(error);
        reader.readAsDataURL(file);
    });
}


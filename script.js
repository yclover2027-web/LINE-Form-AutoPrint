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
// 1. 写真が選ばれたら、ファイルの名前を画面に表示するお仕事
// ============================================================
function setupFileChange(inputId, fileNameId) {
    const fileInput = document.getElementById(inputId);
    const fileNameDisplay = document.getElementById(fileNameId);

    fileInput.addEventListener('change', function() {
        if (fileInput.files.length > 0) {
            fileNameDisplay.textContent = '選んだ写真：' + fileInput.files[0].name;
            fileNameDisplay.style.color = '#0056b3';
        } else {
            fileNameDisplay.textContent = '';
        }
    });
}

// 5つのボタンそれぞれに設定します
setupFileChange('file1', 'fileName1');
setupFileChange('file2', 'fileName2');
setupFileChange('file3', 'fileName3');
setupFileChange('file4', 'fileName4');
setupFileChange('file5', 'fileName5');


// ============================================================
// 2. 「送信する」ボタンが押された時のお仕事
// ============================================================
const uploadForm = document.getElementById('uploadForm');

uploadForm.addEventListener('submit', async function(event) {
    // ボタンを押した時の「画面が変わってしまう」のをストップさせます
    event.preventDefault();

    // 写真をかき集めます
    const filesArray = [
        document.getElementById('file1').files[0],
        document.getElementById('file2').files[0],
        document.getElementById('file3').files[0],
        document.getElementById('file4').files[0],
        document.getElementById('file5').files[0]
    ].filter(file => file !== undefined); // 空の枠は除外します

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
            const base64String = await convertFileToBase64(file);
            const base64Data = base64String.split(',')[1];
            imagesData.push({
                mimeType: file.type,
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


        // ── Step② 送信完了メッセージをポップアップで表示します ──────────────────
        alert('薬局への処方せん送信が完了しました！ 公式LINEにてお返事します！');

        // フォームをリセットして空っぽに戻します
        uploadForm.reset();
        for (let i = 1; i <= 5; i++) {
            document.getElementById('fileName' + i).textContent = '';
        }

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
// ファイルを「文字（Base64）」に変換する裏方の関数
// ============================================================
function convertFileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload  = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });
}

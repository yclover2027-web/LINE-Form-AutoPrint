// --- このファイルはWebページの「動き」をつくる脳みその役割を果たします ---

/* 
 * 1. 写真が選ばれたら、ファイルの名前を画面に表示するお仕事 
 * （アップロードボタンの下に「〇〇.jpg」などと表示する機能です）
 */
function setupFileChange(inputId, fileNameId) {
    // 画面の中から、指定されたボタン（inputId）を探して持ってきます
    const fileInput = document.getElementById(inputId);
    // 画面の中から、名前を表示する場所（fileNameId）を探して持ってきます
    const fileNameDisplay = document.getElementById(fileNameId);

    // ボタンに変化があった時（写真が選ばれた時）に動く命令です
    fileInput.addEventListener('change', function() {
        // もし写真が1枚以上選ばれていたら
        if (fileInput.files.length > 0) {
            // そのファイルの名前を取り出して、画面に表示します
            fileNameDisplay.textContent = '選んだ写真：' + fileInput.files[0].name;
            fileNameDisplay.style.color = '#0056b3'; // 文字を青色にして目立つようにします
        } else {
            // 選ばれていない時（キャンセルした時）は、文字を消します
            fileNameDisplay.textContent = '';
        }
    });
}

// 5つのボタンそれぞれに、上記の「ファイルの名前を表示するお仕事」をお願いします
setupFileChange('file1', 'fileName1'); // 画像1のボタン用
setupFileChange('file2', 'fileName2'); // 画像2のボタン用
setupFileChange('file3', 'fileName3'); // 画像3のボタン用
setupFileChange('file4', 'fileName4'); // 画像4のボタン用
setupFileChange('file5', 'fileName5'); // 画像5のボタン用

/* 
 * 2. 「送信する」ボタンが押された時のお仕事
 * （あとでGoogleドライブへ送るための準備です）
 */
const uploadForm = document.getElementById('uploadForm');

// 💡 ここに、後でGASで発行したURLを貼り付けます！
const GAS_URL = 'https://script.google.com/macros/s/AKfycbyEZyf4kBHgVPWyvUpJ-MP2l0FXxcVNKhjErV3Z_kkDNHbc726JNqNPJ2ZLeI3K9mhBLA/exec'; 

uploadForm.addEventListener('submit', async function(event) {
    // ボタンを押すと画面が変わってしまう（元のルール）のをストップさせます
    event.preventDefault();

    // 写真の枠（file1〜file5）から、選ばれた写真をかき集めます
    const filesArray = [
        document.getElementById('file1').files[0],
        document.getElementById('file2').files[0],
        document.getElementById('file3').files[0],
        document.getElementById('file4').files[0],
        document.getElementById('file5').files[0]
    ].filter(file => file !== undefined); // カラっぽの枠は除外します

    // 1枚も選ばれていなかったらストップします
    if (filesArray.length === 0) {
        alert('処方せんの画像は必ず1枚以上は選んでください！');
        return; 
    }

    // もしGAS_URLがまだ設定されていなかったら、ここで「おためし」としてストップ
    if (GAS_URL === 'GASのURLをここに入れます') {
        alert('準備完了まであと一歩！\n（裏側の設定がまだ終わっていないので、安全のためここでストップします）\n\n・選んだ画像の枚数: ' + filesArray.length + '枚');
        return;
    }

    // 送信ボタンを消して、「送信中...」というメッセージに切り替えます
    document.getElementById('submitBtn').style.display = 'none';
    document.getElementById('loadingMessage').style.display = 'block';

    try {
        // 画像を「暗号文（Base64）」に変換して箱に詰めます
        const imagesData = [];
        for (let i = 0; i < filesArray.length; i++) {
            const file = filesArray[i];
            const base64String = await convertFileToBase64(file);
            
            // パソコン用のくっついているタグ "data:image/jpeg;base64,....." という形から、純粋な暗号部分 "....." だけを取り出します
            const base64Data = base64String.split(',')[1]; 
            
            imagesData.push({
                mimeType: file.type, // image/jpeg など
                base64Data: base64Data // 暗号の本体
            });
        }

        // ガス（GAS）の小人さんに送るための「手紙セット」を作ります
        const payload = {
            images: imagesData
        };

        // GASのURLに手紙（データ）を投げ落とします
        await fetch(GAS_URL, {
            method: 'POST',
            mode: 'no-cors', // 💡追加：パソコンのファイルから直接通信する際のエラー（CORS）を回避する裏技です
            body: JSON.stringify(payload)
        });

        // 💡no-corsを指定した場合、セキュリティの都合でGASからの「成功しました！」というお返事を受け取れません。
        // なので、エラーにならずにこの行まで来た ＝ 「無事にインターネットに飛んで行った！」と判断して完了させます。
        alert('薬局への処方せん送信が完了しました！\n印刷・ご準備ができ次第ご連絡いたします。');
        
        uploadForm.reset(); // フォームを空っぽにします
        // 画面の「選んだ写真：〇〇」という文字も消します
        for(let i=1; i<=5; i++) {
            document.getElementById('fileName'+i).textContent = '';
        }

    } catch (error) {
        // インターネットが繋がっていなかったり、飛んでる最中に途切れた時のエラー
        console.error('通信エラー:', error);
        alert('通信エラーが起きました。電波の良いところで再度お試しください。');
    } finally {
        // 成功しても失敗しても、ボタンを出して画面を元の状態に戻します
        document.getElementById('submitBtn').style.display = 'block';
        document.getElementById('loadingMessage').style.display = 'none';
    }
});

// ファイルを「文字（Base64という暗号）」に変換する魔法の関数（裏方の作業員）です
function convertFileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader(); // ファイルを読み込む機械
        reader.readAsDataURL(file); // 文字にして読み込むスイッチ
        reader.onload = () => resolve(reader.result); // 終わったら報告
        reader.onerror = error => reject(error); // しくじったら報告
    });
}

// 新規アイテム作成用の変数
let pendingItem = null;
let editingItemId = null;

// タッチデバイス用のダブルタップ処理
let lastTouchTime = 0;
let touchCount = 0;

// テキストボックスでの新規アイテム作成機能
function startNewItemCreation(clickTime) {
    // 開始時間を15分単位に調整
    const startTime = new Date(clickTime);
    const snapStart = Math.round(startTime.getTime() / (15 * 60 * 1000)) * (15 * 60 * 1000);
    const snappedStartTime = new Date(snapStart);
    
    // 開始時間から1時間後を終了時間に設定
    const endTime = new Date(snappedStartTime.getTime() + 60 * 60 * 1000);
    
    // 保留中のアイテム情報を保存
    pendingItem = {
        start: snappedStartTime.toISOString(),
        end: endTime.toISOString()
    };
    
    // テキストボックスを有効化してフォーカス
    const input = document.getElementById('newItemInput');
    const addBtn = document.getElementById('addItemBtn');
    const cancelBtn = document.getElementById('cancelBtn');
    
    input.disabled = false;
    input.placeholder = "アイテム名を入力してください";
    input.value = "";
    
    addBtn.textContent = "追加";
    addBtn.disabled = false;
    cancelBtn.disabled = false;
    
    // 編集IDをクリア
    editingItemId = null;
    
    focusInputForMobile(input);
    
    console.log('新規アイテム作成開始:', pendingItem);
}

// アイテム編集を開始する関数
function startItemEditing(itemId) {
    const item = items.get(itemId);
    if (!item) return;
    
    // 編集中のアイテムIDを保存
    editingItemId = itemId;
    
    // テキストボックスを編集モードに変更
    const input = document.getElementById('newItemInput');
    const addBtn = document.getElementById('addItemBtn');
    const cancelBtn = document.getElementById('cancelBtn');
    
    input.disabled = false;
    input.placeholder = "アイテム名を変更してください";
    input.value = item.content;
    
    addBtn.textContent = "更新";
    addBtn.disabled = false;
    cancelBtn.disabled = false;
    
    // 新規作成データをクリア
    pendingItem = null;
    
    focusInputForMobile(input);
    
    console.log('アイテム編集開始:', item);
}

// モバイルデバイス用のフォーカス処理
function focusInputForMobile(input) {
    setTimeout(() => {
        input.focus();
        
        // iOSでの追加処理
        if (/iPad|iPhone|iPod/.test(navigator.userAgent)) {
            input.click();
        }
        
        // 編集時は全選択
        if (editingItemId && input.value) {
            input.select();
        }
    }, 100);
}

function createNewItem() {
    const input = document.getElementById('newItemInput');
    const name = input.value.trim();
    
    if (!name) {
        alert('アイテム名を入力してください');
        input.focus();
        return;
    }
    
    if (editingItemId) {
        // 編集モードの場合
        items.update({ id: editingItemId, content: name });
        saveItem(items.get(editingItemId));
        console.log('アイテムを更新しました:', editingItemId);
    } else if (pendingItem) {
        // 新規作成モードの場合
        const newItem = {
            id: Date.now(),
            content: name,
            start: pendingItem.start,
            end: pendingItem.end,
            editable: true
        };
        
        items.add(newItem);
        saveItem(newItem);
        console.log('新しいアイテムを作成しました:', newItem);
    }
    
    // リセット
    resetNewItemForm();
}

function cancelNewItem() {
    resetNewItemForm();
}

function resetNewItemForm() {
    const input = document.getElementById('newItemInput');
    const addBtn = document.getElementById('addItemBtn');
    const cancelBtn = document.getElementById('cancelBtn');
    
    input.disabled = true;
    input.placeholder = "アイテム名を入力してください（タイムライン上をダブルクリックしてください）";
    input.value = "";
    
    addBtn.textContent = "追加";
    addBtn.disabled = true;
    cancelBtn.disabled = true;
    
    pendingItem = null;
    editingItemId = null;
}

// Enterキーで追加、Escapeキーでキャンセル
document.addEventListener('DOMContentLoaded', function() {
    const input = document.getElementById('newItemInput');
    input.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' && !this.disabled) {
            // IMEによる変換中の場合は処理しない
            if (e.isComposing || e.keyCode === 229) {
                return;
            }
            createNewItem();
        } else if (e.key === 'Escape' && !this.disabled) {
            cancelNewItem();
        }
    });
});

// 固定のダミー日付（どの日でもOK。時間だけ使う）
const baseDate = "1970-01-01";

// データベース初期化
function openDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('timelineDB', 1);
        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains('items')) {
                db.createObjectStore('items', { keyPath: 'id' });
            }
        };
        request.onsuccess = (event) => resolve(event.target.result);
        request.onerror = (event) => reject(event.target.error);
    });
}

// 保存
async function saveItem(item) {
    try {
        const db = await openDB();
        const tx = db.transaction('items', 'readwrite');
        const store = tx.objectStore('items');
        store.put(item);
        await new Promise((resolve, reject) => {
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        });
        console.log('アイテムを保存しました:', item);
    } catch (error) {
        console.error('保存に失敗しました:', error);
    }
}

// 削除
async function deleteItem(id) {
    try {
        const db = await openDB();
        const tx = db.transaction('items', 'readwrite');
        const store = tx.objectStore('items');
        store.delete(id);
        await new Promise((resolve, reject) => {
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        });
        console.log('アイテムを削除しました:', id);
    } catch (error) {
        console.error('削除に失敗しました:', error);
    }
}

// 取得
async function loadItems() {
    try {
        const db = await openDB();
        const tx = db.transaction('items', 'readonly');
        const store = tx.objectStore('items');
        return new Promise((resolve, reject) => {
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    } catch (error) {
        console.error('読み込みに失敗しました:', error);
        return [];
    }
}

// 初期ダミー
const defaultItems = [
    { id: 1, content: '朝のルーチン', start: `${baseDate}T06:00:00`, end: `${baseDate}T07:00:00`, editable: true },
    { id: 2, content: '執筆', start: `${baseDate}T09:00:00`, end: `${baseDate}T11:00:00`, editable: true },
    { id: 3, content: '昼休憩', start: `${baseDate}T12:00:00`, end: `${baseDate}T13:00:00`, editable: true }
];

// 画面サイズに応じてタイムラインの設定を調整
function getTimelineOptions() {
    const isMobile = window.innerWidth <= 480;
    
    return {
        editable: {
            add: false,
            remove: true,
            updateTime: true,
            updateGroup: false,
            overrideItems: false
        },
        margin: { item: 10 },
        
        min: `${baseDate}T00:00:00`,
        max: `${baseDate}T24:00:00`,
        start: isMobile ? `${baseDate}T08:00:00` : `${baseDate}T06:00:00`,
        end: isMobile ? `${baseDate}T16:00:00` : `${baseDate}T18:00:00`,
        
        orientation: 'top',
        stack: false,
        moveable: true,
        zoomable: true,
        
        zoomMin: 1000 * 60 * 60,
        zoomMax: 1000 * 60 * 60 * 24,
        
        snap: function (date, scale, step) {
            return Math.round(date / (15 * 60 * 1000)) * (15 * 60 * 1000);
        },
        
        format: {
            minorLabels: {
                hour: isMobile ? 'H' : 'H時'
            },
            majorLabels: {
                hour: isMobile ? 'H' : 'H時'
            }
        },
        
        onUpdate: function (item, callback) {
            callback(item);
            saveItem(item);
        },
        onRemove: function (item, callback) {
            callback(item);
            deleteItem(item.id);
        }
    };
}

// 現在時刻を表す縦線を追加する関数
function addCurrentTimeLine() {
    const now = new Date();
    const currentTime = new Date(`${baseDate}T${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:00`);
    
    timeline.addCustomTime(currentTime, 'currentTime');
    timeline.setCustomTimeTitle('現在時刻', 'currentTime');
    
    // ドラッグを無効化
    timeline.on('timechange', function(event) {
        if (event.id === 'currentTime') {
            const now = new Date();
            const correctTime = new Date(`${baseDate}T${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:00`);
            timeline.setCustomTime(correctTime, 'currentTime');
        }
    });
}

// 画面サイズに応じて表示範囲を動的調整
function adjustTimelineRange() {
    const container = document.getElementById('timeline');
    const containerWidth = container.offsetWidth;
    
    const minPixelsPerHour = 60;
    const maxDisplayableHours = Math.floor(containerWidth / minPixelsPerHour);
    
    if (maxDisplayableHours < 12) {
        const startHour = 6;
        const endHour = Math.min(startHour + maxDisplayableHours, 24);
        
        timeline.setWindow(
            `${baseDate}T${startHour.toString().padStart(2, '0')}:00:00`,
            `${baseDate}T${endHour.toString().padStart(2, '0')}:00:00`
        );
    }
}

let items, timeline;

// 初期化関数
async function initializeApp() {
    try {
        const savedItems = await loadItems();
        console.log('IndexedDBから読み込んだデータ:', savedItems);
        
        if (savedItems && savedItems.length > 0) {
            items.add(savedItems);
            console.log('保存されたデータを読み込みました');
        } else {
            items.add(defaultItems);
            for (const item of defaultItems) {
                await saveItem(item);
            }
            console.log('デフォルトデータを設定しました');
        }
        
        // 現在時刻の縦線を追加
        addCurrentTimeLine();
        
    } catch (error) {
        console.error('初期化に失敗しました:', error);
        items.add(defaultItems);
    }
}

// ダブルクリック処理を共通化
function handleDoubleClick(props) {
    if (props.item) {
        startItemEditing(props.item);
    } else if (props.time) {
        startNewItemCreation(props.time);
    }
}

// アプリケーション初期化
window.addEventListener('load', function() {
    console.log('ページ読み込み完了');
    console.log('vis:', typeof vis);
    
    // タイムラインの作成
    const options = getTimelineOptions();
    items = new vis.DataSet([]);
    const container = document.getElementById('timeline');
    timeline = new vis.Timeline(container, items, options);
    
    // イベントハンドラーの設定
    timeline.on('doubleClick', handleDoubleClick);
    
    // タッチデバイス用のダブルタップ処理
    timeline.on('click', function(props) {
        if ('ontouchstart' in window) {
            const currentTime = Date.now();
            touchCount++;
            
            if (touchCount === 1) {
                lastTouchTime = currentTime;
                setTimeout(() => {
                    touchCount = 0;
                }, 300);
            } else if (touchCount === 2 && (currentTime - lastTouchTime) < 300) {
                touchCount = 0;
                handleDoubleClick(props);
            }
        }
    });
    
    // 初期化実行
    initializeApp();
    
    // 1分ごとに現在時刻ラインを更新
    setInterval(() => {
        const now = new Date();
        const currentTime = new Date(`${baseDate}T${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:00`);
        timeline.setCustomTime(currentTime, 'currentTime');
    }, 60000);
    
    // 画面サイズ変更時の調整
    window.addEventListener('resize', adjustTimelineRange);
    setTimeout(adjustTimelineRange, 200);
});

// デバッグ用：現在のアイテム一覧を表示
function showCurrentItems() {
    console.log('現在のアイテム一覧:', items.get());
}

// グローバルに公開（デバッグ用）
window.showCurrentItems = showCurrentItems;
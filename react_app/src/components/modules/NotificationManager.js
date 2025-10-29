import React, { useEffect, useState } from 'react';
import { ref, onValue, update, remove } from 'firebase/database';
import { database } from '../../firebase';
import { Camera, CreditCard, Trash, Check } from 'lucide-react';

export default function NotificationManager() {
    const [notifications, setNotifications] = useState([]);
    const [filter, setFilter] = useState('all'); // all | unpurchased | purchased
    const [loading, setLoading] = useState(true);
    const [query, setQuery] = useState('');

    useEffect(() => {
        const notificationsRef = ref(database, 'notifications');
        const unsub = onValue(notificationsRef, (snapshot) => {
            setLoading(false);
            if (!snapshot.exists()) {
                setNotifications([]);
                return;
            }
            const data = snapshot.val();
            const list = Object.entries(data).map(([id, value]) => ({ id, ...value }))
                .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
            setNotifications(list);
        }, (err) => {
            console.error('notification fetch error', err);
            setLoading(false);
        });

        return () => unsub();
    }, []);

    // Toggle purchase status (purchased)
    const handleToggle = async (id, current) => {
        // 購入済みから未購入に戻す場合のみ確認ダイアログを表示
        if (current) {
            if (!window.confirm('この通知を「未購入」に戻しますか？')) {
                return;
            }
        }

        try {
            const r = ref(database, `notifications/${id}`);
            await update(r, { purchased: !current });
        } catch (e) {
            console.error('toggle error', e);
            alert('購入ステータスの更新に失敗しました');
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('この通知を削除しますか？')) return;
        try {
            const r = ref(database, `notifications/${id}`);
            await remove(r);
        } catch (e) {
            console.error('delete error', e);
            alert('削除に失敗しました');
        }
    };

    const filtered = notifications.filter(n => {
        if (filter === 'all') return true;
        if (filter === 'purchased') return !!n.purchased;
        return !n.purchased;
    }).filter(n => {
        if (!query) return true;
        const q = String(query).trim();
        // If query length is 4, also allow matching the last 4 chars of the ID
        if (q.length === 4) {
            const idTail = String(n.id || '').slice(-4);
            if (idTail === q) return true;
        }
        return String(n.folderName || '').includes(q) || String(n.id || '').includes(q);
    });

    // current revenue from purchased notifications
    const revenue = notifications
        .filter(n => n.purchased)
        .reduce((sum, n) => sum + ((n.photoCount || 0) * 100), 0);

    return (
        <div className="p-6">
            <div className="mb-4">
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-4">
                        <h2 className="text-2xl font-bold">通知管理</h2>
                        <div className="text-sm text-gray-600">総数: <span className="font-medium">{notifications.length}</span></div>
                        <div className="text-sm text-green-600">購入済: <span className="font-medium">{notifications.filter(n => n.purchased).length}</span></div>
                        <div className="text-sm text-red-600">未購入: <span className="font-medium">{notifications.filter(n => !n.purchased).length}</span></div>
                        <div className="text-sm text-indigo-700">売上: <span className="font-medium">¥{revenue.toLocaleString('ja-JP')}</span></div>
                    </div>
                    <div className="flex items-center gap-2">
                        <input
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="フォルダ番号またはID下4桁で検索"
                            className="px-3 py-2 border rounded-lg text-sm w-56"
                        />
                    </div>
                </div>

                <div className="flex gap-2">
                    <button onClick={() => setFilter('all')} className={`px-3 py-1 rounded ${filter === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>すべて</button>
                    <button onClick={() => setFilter('unpurchased')} className={`px-3 py-1 rounded ${filter === 'unpurchased' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>未購入</button>
                    <button onClick={() => setFilter('purchased')} className={`px-3 py-1 rounded ${filter === 'purchased' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>購入済み</button>
                </div>
            </div>

            {loading ? (
                <p>読み込み中...</p>
            ) : (
                <div className="space-y-3">
                    {filtered.length === 0 ? (
                        <p className="text-gray-500">通知がありません</p>
                    ) : (
                        filtered.map(n => (
                            <div key={n.id} className={`border p-4 rounded-lg ${n.purchased ? 'bg-gray-50' : 'bg-white'} shadow-sm hover:shadow-lg transition-transform hover:-translate-y-1`}>
                                <div className="flex justify-between items-start gap-4">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-2">
                                            <div className={`text-lg font-semibold ${n.purchased ? 'text-gray-500 line-through' : ''}`}>番号: {n.folderName}</div>
                                        </div>
                                        <div className="flex gap-4 items-center text-sm text-gray-600 mb-2">
                                            <div>人数: <span className="font-medium">{n.photoCount}</span>人</div>
                                            <div>印刷枚数: <span className="font-medium">{Math.ceil(n.photoCount / 2)}</span>枚</div>
                                        </div>
                                        <div className="flex items-center gap-3">

                                            <span className={`inline-block px-3 py-1 rounded text-sm font-medium ${n.completed ? 'bg-green-200 text-green-900' : 'bg-gray-200 text-gray-800'}`}>
                                                {n.completed ? <><Check className="inline mr-1" size={14} /> AIチェキ: 作成済み</> : 'AIチェキ: 未作成'}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-end gap-2">
                                        <div className="text-right">
                                            <div className="text-2xl font-extrabold text-red-600 flex items-center gap-2"><CreditCard size={18} /> ¥{n.photoCount * 100}</div>
                                        </div>
                                        <button onClick={() => handleToggle(n.id, n.purchased)} className={`px-3 py-1 rounded ${n.purchased ? 'bg-yellow-500 text-white' : 'bg-green-600 text-white'}`}>
                                            {n.purchased ? '未購入にする' : '購入済みにする'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    );
}

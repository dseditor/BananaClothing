/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState, useEffect, useMemo, useRef, ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getAllPortfolioItems, deletePortfolioItems, PortfolioItem, clearAllPortfolioItems, addMultiplePortfolioItems, getPortfolioSize, addPortfolioItem } from './services/dbService';
import ImageCard from './components/PolaroidCard';
import { cn, getTimestamp } from './lib/utils';
import { createZipAndDownload } from './lib/zipUtils';
import { t } from './lib/i18n';
import { HomepageMode } from './HomepageImageManager';

const MotionDiv = motion.div as any;

const primaryButtonClasses = "text-lg text-center text-white bg-[#E07A5F] py-3 px-8 rounded-lg transition-colors duration-200 hover:bg-[#D46A4D] shadow-sm disabled:opacity-50 disabled:cursor-not-allowed";
const secondaryButtonClasses = "text-lg text-center text-[#3D405B] bg-transparent border-2 border-[#BDB5AD] py-3 px-8 rounded-lg transition-colors duration-200 hover:bg-black/5 hover:border-[#3D405B] disabled:opacity-50";
const tertiaryButtonClasses = "text-sm text-center text-white/80 bg-transparent border border-white/30 py-2 px-4 rounded-md transition-colors duration-200 hover:bg-white/10 disabled:opacity-50";
const dangerButtonClasses = "text-sm text-center text-red-600 bg-red-100 border border-red-200 py-2 px-4 rounded-md transition-colors duration-200 hover:bg-red-200 disabled:opacity-50";

const formatPortfolioPrompt = (prompt: string): string => {
    if (!prompt) return '';
    if (prompt === '跳過') {
        return '完成圖';
    }
    if (prompt.includes('參考圖')) {
        return '由參考圖生成';
    }
    return prompt;
};

const DetailModal = ({ item, onClose, onDelete, onSendTo }: { item: PortfolioItem; onClose: () => void; onDelete: (id: string) => void; onSendTo: (item: PortfolioItem, target: HomepageMode) => void; }) => {
    return (
        <MotionDiv
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
            onClick={onClose}
        >
            <MotionDiv
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-[#F8F5F2] rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col md:flex-row overflow-hidden"
            >
                <div className="md:w-3/5 p-4 flex-shrink-0">
                    <img src={item.imageUrl} alt={item.prompt} className="w-full h-full object-contain rounded-lg" />
                </div>
                <div className="md:w-2/5 p-6 bg-white/50 flex flex-col gap-4 overflow-y-auto">
                    <div>
                        <h3 className="text-2xl font-bold text-[#3D405B]">作品詳情</h3>
                        <p className="text-sm text-neutral-500">{new Date(item.timestamp).toLocaleString()}</p>
                    </div>
                    <div className="text-sm space-y-2 text-neutral-700">
                        <p><strong>模式:</strong> {t(item.mode)}{item.settings.subMode ? ` (${t(`${item.mode}.${item.settings.subMode}`)})` : ''}</p>
                        <p><strong>標題/提示:</strong> {formatPortfolioPrompt(item.prompt)}</p>
                    </div>
                    <div className="mt-auto pt-4 border-t space-y-3">
                        <p className="text-sm font-semibold text-neutral-600 text-center">以此照片開始新創作</p>
                        <button onClick={() => { onSendTo(item, 'portrait'); onClose(); }} className={secondaryButtonClasses + " w-full !text-base !py-2.5"}>虛擬試穿</button>
                        <button onClick={() => { onSendTo(item, 'multiAngle'); onClose(); }} className={secondaryButtonClasses + " w-full !text-base !py-2.5"}>姿勢與場景實驗室</button>
                        <button onClick={() => { onSendTo(item, 'infinitePhotoshoot'); onClose(); }} className={secondaryButtonClasses + " w-full !text-base !py-2.5"}>無限寫真</button>

                        <div className="relative flex py-2 items-center">
                            <div className="flex-grow border-t border-gray-300"></div>
                        </div>

                        <a href={item.imageUrl} download={`portfolio_${item.id}.jpeg`} className={tertiaryButtonClasses + " w-full !text-sm block text-center"}>下載此圖</a>
                        <button onClick={() => onDelete(item.id)} className={dangerButtonClasses + " w-full !text-sm"}>刪除此作品</button>
                    </div>
                </div>
            </MotionDiv>
        </MotionDiv>
    );
};

// FIX: Add the missing ConfirmModal component definition.
const ConfirmModal = ({
    isOpen,
    title,
    message,
    onConfirm,
    onCancel,
    confirmText = '確定',
    cancelText = '取消',
    confirmButtonClass = "bg-red-600 hover:bg-red-700 text-white",
}: {
    isOpen: boolean;
    title: string;
    message: React.ReactNode;
    onConfirm: () => void;
    onCancel: () => void;
    confirmText?: string;
    cancelText?: string;
    confirmButtonClass?: string;
}) => {
    if (!isOpen) return null;

    return (
        <MotionDiv
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-[101] flex items-center justify-center p-4"
            onClick={onCancel}
        >
            <MotionDiv
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-[#F8F5F2] rounded-xl shadow-2xl w-full max-w-sm p-6 text-center"
            >
                <h3 className="text-xl font-bold text-[#3D405B]">{title}</h3>
                <div className="my-4 text-neutral-600">{message}</div>
                <div className="flex justify-center gap-4 mt-6">
                    <button
                        onClick={onCancel}
                        className="px-6 py-2 rounded-lg bg-gray-200 text-gray-800 hover:bg-gray-300 transition-colors"
                    >
                        {cancelText}
                    </button>
                    <button
                        onClick={onConfirm}
                        className={`px-6 py-2 rounded-lg transition-colors ${confirmButtonClass}`}
                    >
                        {confirmText}
                    </button>
                </div>
            </MotionDiv>
        </MotionDiv>
    );
};

const PortfolioModule = ({ onBack, onSendTo, isShowcaseMode, onShowcaseModeChange }: { onBack: () => void; onSendTo: (item: PortfolioItem, target: HomepageMode) => void; isShowcaseMode: boolean; onShowcaseModeChange: (enabled: boolean) => void; }) => {
    const [items, setItems] = useState<PortfolioItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedItem, setSelectedItem] = useState<PortfolioItem | null>(null);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [confirmState, setConfirmState] = useState<{
        isOpen: boolean;
        title: string;
        message: ReactNode;
        onConfirm: () => void;
        confirmText?: string;
        cancelText?: string;
        confirmButtonClass?: string;
    } | null>(null);
    const [activeFilter, setActiveFilter] = useState('all');
    const [editingItemId, setEditingItemId] = useState<string | null>(null);
    const [editingPrompt, setEditingPrompt] = useState('');
    const uploadAssetInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        loadItems();
    }, []);

    const loadItems = async () => {
        setLoading(true);
        try {
            const fetchedItems = await getAllPortfolioItems();
            setItems(fetchedItems);
        } catch (error) {
            console.error(error);
            alert('無法載入作品集。');
        } finally {
            setLoading(false);
        }
    };

    const filterTabs = useMemo(() => {
        const modes = new Set(items.map(item => item.mode));
        // @ts-ignore - Type inference issue with translation function
        const sortedModes = Array.from(modes).sort((a, b) => t(a).localeCompare(t(b), 'zh-Hant'));
        return ['all', ...sortedModes];
    }, [items]);

    const filteredItems = useMemo(() => {
        if (activeFilter === 'all') return items;
        return items.filter(item => item.mode === activeFilter);
    }, [items, activeFilter]);

    const hideConfirm = () => setConfirmState(null);

    const toggleShowcaseMode = () => {
        const newMode = !isShowcaseMode;
        localStorage.setItem('showcaseModeEnabled', JSON.stringify(newMode));
        onShowcaseModeChange(newMode);
    };

    const handleDelete = async (id: string) => {
        setConfirmState({
            isOpen: true,
            title: '刪除作品',
            message: '您確定要刪除這個作品嗎？此操作無法復原。',
            onConfirm: async () => {
                hideConfirm();
                await deletePortfolioItems([id]);
                setItems(prev => prev.filter(item => item.id !== id));
                setSelectedItem(null);
            },
            confirmText: '確定刪除',
            confirmButtonClass: "bg-red-600 hover:bg-red-700 text-white",
        });
    };
    
    const handleBatchDelete = async () => {
        if (selectedIds.length === 0) return;
        setConfirmState({
            isOpen: true,
            title: '批次刪除作品',
            message: `您確定要刪除選中的 ${selectedIds.length} 個作品嗎？`,
            onConfirm: async () => {
                hideConfirm();
                await deletePortfolioItems(selectedIds);
                setItems(prev => prev.filter(item => !selectedIds.includes(item.id)));
                setSelectedIds([]);
            },
            confirmText: '確定刪除',
            confirmButtonClass: "bg-red-600 hover:bg-red-700 text-white",
        });
    };
    
    const handleBatchDownload = async () => {
        if (selectedIds.length === 0) return;
        const imagesToZip = items
            .filter(item => selectedIds.includes(item.id))
            .map(item => ({ url: item.imageUrl, name: `${item.mode}_${item.prompt.slice(0, 20)}_${item.id}` }));
        
        const zipName = `作品集_${getTimestamp()}.zip`;
        await createZipAndDownload(imagesToZip, zipName);
    };

    const toggleSelection = (id: string) => {
        setSelectedIds(prev =>
            prev.includes(id) ? prev.filter(pId => pId !== id) : [...prev, id]
        );
    };
    
    const allVisibleSelected = useMemo(() => {
        const visibleIds = filteredItems.map(item => item.id);
        if (visibleIds.length === 0) return false;
        return visibleIds.every(id => selectedIds.includes(id));
    }, [selectedIds, filteredItems]);

    const handleSelectAll = () => {
        const visibleIds = filteredItems.map(item => item.id);
        if (allVisibleSelected) {
            setSelectedIds(prev => prev.filter(id => !visibleIds.includes(id)));
        } else {
            setSelectedIds(prev => [...new Set([...prev, ...visibleIds])]);
        }
    };

    const handleAssetUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;
    
        setLoading(true);
    
        try {
            const newItems: PortfolioItem[] = [];
            const creationTime = Date.now();
            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                const imageUrl = await new Promise<string>((resolve) => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve(reader.result as string);
                    reader.readAsDataURL(file);
                });
    
                const timestamp = creationTime + i;
                const newItem: PortfolioItem = {
                    id: timestamp.toString(),
                    timestamp: timestamp,
                    imageUrl: imageUrl,
                    mode: 'asset',
                    prompt: file.name,
                    settings: {},
                };
                newItems.push(newItem);
            }
    
            await addMultiplePortfolioItems(newItems);
            loadItems();
        } catch (error) {
            console.error("Failed to upload assets:", error);
            alert('素材上傳失敗。');
        } finally {
            setLoading(false);
            if (uploadAssetInputRef.current) {
                uploadAssetInputRef.current.value = '';
            }
        }
    };

    const handleStartEdit = (item: PortfolioItem) => {
        setEditingItemId(item.id);
        setEditingPrompt(item.prompt);
    };
    
    const handleSaveEdit = async (itemId: string) => {
        const itemToUpdate = items.find(item => item.id === itemId);
        if (!itemToUpdate || !editingPrompt.trim()) return;
    
        const updatedItem = { ...itemToUpdate, prompt: editingPrompt.trim() };
    
        try {
            await addPortfolioItem(updatedItem);
            setItems(prev => prev.map(item => item.id === itemId ? updatedItem : item));
            setEditingItemId(null);
        } catch (error) {
            alert('更新失敗。');
        }
    };


    const mainPanelClasses = cn(
        "w-full p-6 rounded-xl shadow-md border",
        isShowcaseMode
            ? "bg-neutral-50 border-gray-200"
            : "bg-white/60 backdrop-blur-sm border-black/5"
    );
    const backButtonClasses = cn(tertiaryButtonClasses, isShowcaseMode && "!text-gray-600 !border-gray-400 hover:!bg-black/5");
    const showcaseTertiaryButtonClasses = "!text-gray-600 !border-gray-400 hover:!bg-black/5";

    return (
        <MotionDiv initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full max-w-7xl mx-auto flex flex-col items-center">
            <div className={mainPanelClasses}>
                <div className="flex flex-col sm:flex-row justify-between items-start mb-6 gap-4">
                    <div>
                        <h2 className="text-4xl font-bold text-[#3D405B]">我的作品集</h2>
                        <p className="text-neutral-500 mt-1">管理您儲存的創作與靈感。</p>
                    </div>
                    <div className="flex items-center gap-2 sm:gap-4 flex-wrap justify-end">
                        <button onClick={() => uploadAssetInputRef.current?.click()} className={cn(tertiaryButtonClasses, isShowcaseMode && showcaseTertiaryButtonClasses)}>上傳素材</button>
                        <input type="file" ref={uploadAssetInputRef} onChange={handleAssetUpload} multiple accept="image/*" className="hidden" />
                        <button onClick={toggleShowcaseMode} className={cn(tertiaryButtonClasses, isShowcaseMode && showcaseTertiaryButtonClasses)}>
                            {isShowcaseMode ? '關閉展示模式' : '啟用展示模式'}
                        </button>
                    </div>
                </div>

                <div className="flex flex-wrap gap-2 border-b border-gray-300 pb-4 mb-4">
                    {filterTabs.map(mode => (
                        <button
                            key={mode}
                            onClick={() => setActiveFilter(mode)}
                            className={cn(
                                "px-4 py-1.5 text-sm font-medium rounded-full transition-colors",
                                activeFilter === mode
                                    ? "bg-[#3D405B] text-white"
                                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                            )}
                        >
                            {mode === 'all' ? '全部' : t(mode)}
                        </button>
                    ))}
                </div>

                 <div className="flex items-center gap-2 sm:gap-4 flex-wrap mb-6">
                    <div className="flex items-center gap-2">
                        <input type="checkbox" id="select-all" checked={allVisibleSelected} onChange={handleSelectAll} disabled={filteredItems.length === 0} className="h-5 w-5 rounded border-gray-300 text-[#E07A5F] focus:ring-[#E07A5F]" />
                        <label htmlFor="select-all" className="text-neutral-700 font-medium">全選</label>
                    </div>
                    <button onClick={handleBatchDownload} disabled={selectedIds.length === 0} className={cn(tertiaryButtonClasses, isShowcaseMode && showcaseTertiaryButtonClasses)}>打包下載 ({selectedIds.length})</button>
                    <button onClick={handleBatchDelete} disabled={selectedIds.length === 0} className={cn(tertiaryButtonClasses, "!text-red-500 hover:!bg-red-500/10", isShowcaseMode && "!border-red-300")}>刪除選中 ({selectedIds.length})</button>
                </div>

                {loading ? (
                    <p className="text-center py-20 text-neutral-500">載入中...</p>
                ) : items.length === 0 ? (
                    <div className="text-center py-20 text-neutral-500">
                        <p className="text-lg">您的作品集是空的。</p>
                        <p className="mt-2">快去創作並點擊圖片上的 🔖 書籤圖示來儲存您的第一個作品吧！</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                        {filteredItems.map(item => {
                            const isEditing = editingItemId === item.id;
                            return (
                                <div key={item.id}>
                                    <ImageCard
                                        status="done"
                                        imageUrl={item.imageUrl}
                                        styleName={item.mode !== 'asset' ? formatPortfolioPrompt(item.prompt) : undefined}
                                        onSelect={() => !isEditing && setSelectedItem(item)}
                                        onCheckboxChange={() => toggleSelection(item.id)}
                                        isSelected={selectedIds.includes(item.id)}
                                        showCheckbox={true}
                                    />
                                    {item.mode === 'asset' && (
                                        <div className="flex items-center gap-1 mt-2">
                                            {isEditing ? (
                                                <>
                                                    <input 
                                                        type="text"
                                                        value={editingPrompt}
                                                        onChange={(e) => setEditingPrompt(e.target.value)}
                                                        className="w-full p-1 text-xs border border-gray-400 rounded focus:ring-1 focus:ring-[#E07A5F] bg-white text-black"
                                                        autoFocus
                                                        onKeyDown={(e) => { if (e.key === 'Enter') handleSaveEdit(item.id); if (e.key === 'Escape') setEditingItemId(null); }}
                                                    />
                                                    <button onClick={() => handleSaveEdit(item.id)} className="p-1.5 bg-green-100 rounded text-green-700 hover:bg-green-200">
                                                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                                                    </button>
                                                    <button onClick={() => setEditingItemId(null)} className="p-1.5 bg-gray-200 rounded text-gray-700 hover:bg-gray-300">
                                                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                                                    </button>
                                                </>
                                            ) : (
                                                <>
                                                    <p className="text-xs text-neutral-600 truncate flex-grow" title={item.prompt}>{formatPortfolioPrompt(item.prompt)}</p>
                                                    <button onClick={() => handleStartEdit(item)} className="p-1.5 bg-black/5 rounded text-gray-600 hover:bg-black/10 flex-shrink-0">
                                                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>
            
            <AnimatePresence>
                {selectedItem && <DetailModal item={selectedItem} onClose={() => setSelectedItem(null)} onDelete={handleDelete} onSendTo={onSendTo} />}
                {confirmState?.isOpen && (
                    <ConfirmModal
                        isOpen={confirmState.isOpen}
                        title={confirmState.title}
                        message={confirmState.message}
                        onConfirm={confirmState.onConfirm}
                        onCancel={hideConfirm}
                        confirmText={confirmState.confirmText}
                        cancelText={confirmState.cancelText}
                        confirmButtonClass={confirmState.confirmButtonClass}
                    />
                )}
            </AnimatePresence>

            <div className="mt-8 flex justify-center w-full">
                <button onClick={onBack} className={backButtonClasses}>返回主選單</button>
            </div>
        </MotionDiv>
    );
};

export default PortfolioModule;
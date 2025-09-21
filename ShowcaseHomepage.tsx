/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getAllPortfolioItems, PortfolioItem, deletePortfolioItems } from './services/dbService';
import { HomepageMode } from './HomepageImageManager';
import { t } from './lib/i18n';

// Note: This is a simplified copy of the DetailModal from PortfolioModule.tsx
// to avoid complex prop drilling or context setup for this specific request.
const DetailModal = ({ item, onClose, onDelete, onSendTo }: { item: PortfolioItem; onClose: () => void; onDelete: (id: string) => void; onSendTo: (item: PortfolioItem, target: HomepageMode) => void; }) => {
    const secondaryButtonClasses = "text-lg text-center text-[#3D405B] bg-transparent border-2 border-[#BDB5AD] py-3 px-8 rounded-lg transition-colors duration-200 hover:bg-black/5 hover:border-[#3D405B] disabled:opacity-50";
    const tertiaryButtonClasses = "text-sm text-center text-black bg-transparent border border-black/20 py-2 px-4 rounded-md transition-colors duration-200 hover:bg-black/10 disabled:opacity-50";
    const dangerButtonClasses = "text-sm text-center text-red-600 bg-red-100 border border-red-200 py-2 px-4 rounded-md transition-colors duration-200 hover:bg-red-200 disabled:opacity-50";

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
            onClick={onClose}
        >
            <motion.div
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
                        <p><strong>標題/提示:</strong> {item.prompt}</p>
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
            </motion.div>
        </motion.div>
    );
};

interface ShowcaseHomepageProps {
    onSendTo: (item: PortfolioItem, targetModule: HomepageMode) => void;
    onDeleteItem: (id: string) => void;
}

const ShowcaseHomepage: React.FC<ShowcaseHomepageProps> = ({ onSendTo, onDeleteItem }) => {
    const [items, setItems] = useState<PortfolioItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedItem, setSelectedItem] = useState<PortfolioItem | null>(null);

    useEffect(() => {
        getAllPortfolioItems().then(fetchedItems => {
            setItems(fetchedItems);
            setLoading(false);
        }).catch(err => {
            console.error(err);
            setLoading(false);
        });
    }, []);

    const handleDelete = (id: string) => {
        // Optimistically update UI
        setItems(prev => prev.filter(item => item.id !== id));
        setSelectedItem(null);
        // Call parent handler to delete from DB
        onDeleteItem(id);
    };

    return (
        <div className="w-full h-full bg-white text-black flex flex-col font-sans">
            <main className="flex-grow overflow-y-auto p-4 sm:p-6 lg:p-8">
                {loading ? (
                    <div className="flex justify-center items-center h-full"><p className="text-gray-500">正在載入作品集...</p></div>
                ) : items.length === 0 ? (
                    <div className="flex justify-center items-center h-full">
                        <div className="text-center text-gray-500 max-w-md">
                            <h3 className="text-2xl font-bold mb-2">您的展示作品集是空的</h3>
                            <p>前往「作品集」模式，點擊「關閉展示模式」來開始創作。您儲存的所有作品都會顯示在這裡。</p>
                        </div>
                    </div>
                ) : (
                    <motion.div 
                        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
                        initial="hidden"
                        animate="visible"
                        variants={{
                            visible: {
                                transition: {
                                    staggerChildren: 0.05,
                                },
                            },
                        }}
                    >
                        {items.map(item => (
                            <motion.div 
                                key={item.id} 
                                className="group relative overflow-hidden rounded-md cursor-pointer"
                                variants={{
                                    hidden: { opacity: 0, y: 20 },
                                    visible: { opacity: 1, y: 0 },
                                }}
                                onClick={() => setSelectedItem(item)}
                            >
                                <img src={item.imageUrl} alt={item.prompt} className="w-full h-auto object-cover aspect-[3/4] transition-transform duration-300 group-hover:scale-105" />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-80 group-hover:opacity-100 transition-opacity"></div>
                                <div className="absolute bottom-0 left-0 p-4 text-white">
                                    <p className="font-bold uppercase tracking-wider text-sm">{t(item.mode)}</p>
                                    <p className="text-xs opacity-90 truncate mt-1">{item.prompt}</p>
                                </div>
                            </motion.div>
                        ))}
                    </motion.div>
                )}
            </main>
             <AnimatePresence>
                {selectedItem && (
                    <DetailModal 
                        item={selectedItem} 
                        onClose={() => setSelectedItem(null)} 
                        onDelete={handleDelete} 
                        onSendTo={onSendTo} 
                    />
                )}
            </AnimatePresence>
        </div>
    );
};

export default ShowcaseHomepage;

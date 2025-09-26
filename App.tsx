/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState, ChangeEvent, ReactElement, useRef, useEffect, useMemo, ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { editImage, generateRandomStyles, inpaintImage, suggestOutfit, generateMoodboard, removeImageBackground, suggestScene, searchAndGenerateAccessory } from './services/geminiService';
import { createZipAndDownload } from './lib/zipUtils';
import { createProcessAlbumAndDownload, createAlbumPageAndDownload, createCompositionAlbumAndDownload, createDynamicAlbumAndDownload } from './lib/albumUtils';
import { addPortfolioItem, PortfolioItem, getAllPortfolioItems, deletePortfolioItems, clearAllPortfolioItems, addMultiplePortfolioItems, getPortfolioSize } from './services/dbService';
import ImageCard from './components/PolaroidCard';
import MaskingCanvas from './components/MaskingCanvas';
import { cn, getTimestamp } from './lib/utils';
import MultiAngleModule from './MultiAngleModule';
import ImaginativeModule from './ImaginativeModule';
import InfinitePhotoshootModule from './InfinitePhotoshootModule';
import ClothingAssistantModule from './ClothingAssistantModule';
import OutfitAnalysisModule from './OutfitAnalysisModule';
import PortfolioModule from './PortfolioModule';
import { homepageCards, HomepageMode } from './HomepageImageManager';
import ShowcaseHomepage from './ShowcaseHomepage';
import Layout from './components/Layout';
import { t } from './lib/i18n';


// FIX: Cast motion.div to any to bypass TypeScript errors related to framer-motion props.
const MotionDiv = motion.div as any;

const primaryButtonClasses = "text-lg text-center text-white bg-[#E07A5F] py-3 px-8 rounded-lg transition-colors duration-200 hover:bg-[#D46A4D] shadow-sm disabled:opacity-50 disabled:cursor-not-allowed";
const secondaryButtonClasses = "text-lg text-center bg-transparent border-2 border-[#BDB5AD] py-3 px-8 rounded-lg transition-colors duration-200 disabled:opacity-50";
const tertiaryButtonClasses = "text-sm text-center bg-transparent border py-2 px-4 rounded-md transition-colors duration-200 disabled:opacity-50";

// --- START: Icon Components ---
const CameraIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"></path><circle cx="12" cy="13" r="3"></circle></svg>;
const PlusIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>;
const TrashIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>;
// --- END: Icon Components ---

export const OUTFIT_SCENARIOS = [
    { name: '日常休閒', icon: '👕' },
    { name: '都會時尚', icon: '🏙️' },
    { name: '街頭潮流', icon: '🛹' },
    { name: '運動機能', icon: '🏃‍♀️' },
    { name: '晚宴正裝', icon: '👗' },
    { name: '波西米亞', icon: '🌿' },
    { name: '復古年代', icon: '⏳' },
    { name: '戶外遠足', icon: '🌲' },
];

const PHOTO_STYLES = ['攝影棚燈', '自然日光', '黃金時刻', '城市夜景', '霓虹燈效', '電影感光影', '拍立得效果', '黑白攝影'];
const FASHION_BRANDS = ['CHANEL', 'Gucci', 'Nike', 'Zara', 'Supreme', 'Uniqlo'];
const CLOTHING_ACCESSORIES = ['太陽眼鏡', '帽子', '項鍊', '手提包', '手錶', '圍巾', '腰帶', '球鞋'];

const SCENE_VENUES = [
    { name: '都會街頭', emoji: '🏙️' }, { name: '寧靜公園', emoji: '🌳' },
    { name: '文青咖啡廳', emoji: '☕' }, { name: '復古書店', emoji: '📚' },
    { name: '海邊沙灘', emoji: '🏖️' }, { name: '森林步道', emoji: '🌲' },
    { name: '現代美術館', emoji: '🖼️' }, { name: '屋頂酒吧', emoji: '🍸' },
    { name: '工業風廢墟', emoji: '🏭' }, { name: '奢華酒店大廳', emoji: '🏨' },
    { name: '霓虹夜市', emoji: '🏮' }, { name: '日式庭園', emoji: '🏯' }
];
const SCENE_LIGHTING = [
    { name: '黃金時刻', emoji: '🌇' }, { name: '柔和日光', emoji: '☀️' },
    { name: '戲劇性陰影', emoji: '🎭' }, { name: '霓虹燈光', emoji: '💡' },
    { name: '燭光', emoji: '🕯️' }, { name: '攝影棚打光', emoji: '📸' },
    { name: '晨霧', emoji: '🌫️' }, { name: '藍調時刻', emoji: '🌃' },
    { name: '斑駁光影', emoji: '✨' }, { name: '背光剪影', emoji: '👤' },
    { name: '高對比硬光', emoji: '🌗' }, { name: '仙境光暈', emoji: '✨' }
];
const SCENE_EFFECTS = [
    { name: '電影感色調', emoji: '🎬' }, { name: '淺景深', emoji: '📷' },
    { name: '動態模糊', emoji: '🏃' }, { name: '拍立得風格', emoji: '🖼️' },
    { name: '黑白攝影', emoji: '⚫️⚪️' }, { name: '漏光效果', emoji: '💥' },
    { name: '廣角鏡頭', emoji: '🏞️' }, { name: '長焦壓縮感', emoji: '🔭' },
    { name: '顆粒感', emoji: '🎞️' }, { name: '魚眼鏡頭', emoji: '🐠' },
    { name: '過曝效果', emoji: '💡' }, { name: '復古色調', emoji: '📜' }
];

const STEP_CONFIG = {
    portrait: {
        title: "人像虛擬試穿",
        steps: ['風格概念', '設定場景風格', '服飾與配件', '完成'],
    },
    composition: {
        title: "時尚單品組合",
        steps: ['組合生成', '設定場景風格', '服飾與配件', '完成'],
    },
};

const PRESET_STYLES = [
    { name: 'Y2K 千禧', emoji: '💿' },
    { name: '街頭潮流', emoji: '🛹' },
    { name: '極簡主義', emoji: '⚪️' },
    { name: '哥德', emoji: '🦇' },
    { name: '波西米亞', emoji: '🌿' },
    { name: '學院風', emoji: '🎓' },
    { name: '機能 Gorpcore', emoji: '🎒' },
    { name: '奢華晚宴', emoji: '💎' },
    { name: '復古', emoji: '🏺' },
    { name: '賽博龐克', emoji: '🤖' },
];

type Mode = HomepageMode | 'select';
type Step2Tab = 'style' | 'search' | 'add' | 'edit';
export interface HistoryItem {
    stepName: string;
    imageUrl: string;
    prompt?: string;
    moodboardUrl?: string;
}

const SettingsModal = ({ isOpen, onClose, onClearAll, onRestoreRequest }: { isOpen: boolean; onClose: () => void; onClearAll: () => void; onRestoreRequest: (data: any) => void; }) => {
    const [storageLimit, setStorageLimit] = useState<number>(() => Number(localStorage.getItem('portfolio_storage_limit_mb') || 200));
    const [currentUsage, setCurrentUsage] = useState<number>(0);
    const restoreInputRef = useRef<HTMLInputElement>(null);
    const neutralButtonClasses = "text-sm text-center text-neutral-700 bg-black/5 border border-neutral-300 py-2 px-4 rounded-md transition-colors duration-200 hover:bg-black/10 disabled:opacity-50";

    const [falApiKey, setFalApiKey] = useState<string>(() => localStorage.getItem('fal_api_key') || '');
    const [imageEditModel, setImageEditModel] = useState<string>(() => localStorage.getItem('image_edit_model') || 'gemini');
    const [imageGenModel, setImageGenModel] = useState<string>(() => localStorage.getItem('image_gen_model') || 'gemini');

    const [secondaryApiKey, setSecondaryApiKey] = useState<string>(() => localStorage.getItem('secondaryApiKey') || '');
    const [isSecondaryKeyEnabled, setIsSecondaryKeyEnabled] = useState<boolean>(() => localStorage.getItem('isSecondaryKeyEnabled') === 'true');
    const [defaultKeyExists, setDefaultKeyExists] = useState(false);

    useEffect(() => {
        if (isOpen) {
            updateUsage();
            setDefaultKeyExists(!!process.env.API_KEY && process.env.API_KEY.length > 5);
        }
    }, [isOpen]);

    useEffect(() => {
        localStorage.setItem('secondaryApiKey', secondaryApiKey);
    }, [secondaryApiKey]);

    useEffect(() => {
        localStorage.setItem('isSecondaryKeyEnabled', String(isSecondaryKeyEnabled));
    }, [isSecondaryKeyEnabled]);
    
    const updateUsage = async () => {
        const sizeInBytes = await getPortfolioSize();
        setCurrentUsage(Number((sizeInBytes / 1024 / 1024).toFixed(2)));
    };

    const handleLimitChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newLimit = Number(e.target.value);
        setStorageLimit(newLimit);
        localStorage.setItem('portfolio_storage_limit_mb', newLimit.toString());
    };
    
    const handleBackup = async () => {
        try {
            const itemsToBackup = await getAllPortfolioItems();
            const backupData = {
                timestamp: new Date().toISOString(),
                data: itemsToBackup,
            };
            const jsonString = JSON.stringify(backupData, null, 2);
            const blob = new Blob([jsonString], { type: 'application/json' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `portfolio_backup_${getTimestamp()}.json`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(link.href);
            alert('備份成功！');
        } catch (error) {
            alert('備份失敗。');
            console.error(error);
        }
    };
    
    const handleRestore = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const content = e.target?.result;
                if (typeof content !== 'string') throw new Error('檔案讀取錯誤');
                
                const backupData = JSON.parse(content);
                if (!backupData.data || !Array.isArray(backupData.data)) {
                    throw new Error('無效的備份檔案格式。');
                }
                
                onRestoreRequest(backupData);
            } catch (error) {
                alert(`還原失敗: ${error instanceof Error ? error.message : '未知錯誤'}`);
                console.error(error);
            } finally {
                if (restoreInputRef.current) restoreInputRef.current.value = '';
            }
        };
        reader.readAsText(file);
    };

    const handleFalKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFalApiKey(e.target.value);
        localStorage.setItem('fal_api_key', e.target.value);
    };
    
    const handleEditModelChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setImageEditModel(e.target.value);
        localStorage.setItem('image_edit_model', e.target.value);
    };
    
    const handleGenModelChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setImageGenModel(e.target.value);
        localStorage.setItem('image_gen_model', e.target.value);
    };

    if (!isOpen) return null;

    const usagePercentage = storageLimit > 0 ? (currentUsage / storageLimit) * 100 : 0;
    const isSecondaryKeyActive = isSecondaryKeyEnabled && !!secondaryApiKey;

    return (
        <MotionDiv initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
            <MotionDiv initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} onClick={e => e.stopPropagation()} className="bg-[#F8F5F2] rounded-xl shadow-2xl w-full max-w-md p-6 overflow-y-auto max-h-[90vh]">
                <div className="space-y-6">
                    <h3 className="text-2xl font-bold text-[#3D405B]">應用程式設定</h3>
                    
                    <div className="space-y-3">
                        <h4 className="font-semibold text-neutral-700">Gemini API 金鑰設定</h4>
                        <p className="text-xs text-neutral-500">預設使用環境金鑰。您可以啟用並提供備用金鑰來覆蓋預設值。</p>
                        <div>
                            <label className="block text-sm text-neutral-600">預設金鑰 (環境變數)</label>
                            <div className={cn("mt-1 w-full p-2 border rounded-lg text-sm", !isSecondaryKeyActive ? 'border-green-500 bg-green-50 text-green-800 font-medium' : 'bg-gray-100 border-gray-300 text-gray-500')}>
                                {defaultKeyExists ? '● 已啟用' : '未設定'}
                            </div>
                        </div>
                        <div>
                            <div className="flex items-center justify-between">
                                <label htmlFor="secondary-api-key" className="block text-sm text-neutral-600">備用金鑰</label>
                                <div className="flex items-center gap-2 text-sm">
                                    <label htmlFor="enable-secondary-key" className="cursor-pointer text-neutral-600">啟用</label>
                                    <input
                                        type="checkbox"
                                        id="enable-secondary-key"
                                        checked={isSecondaryKeyEnabled}
                                        onChange={e => setIsSecondaryKeyEnabled(e.target.checked)}
                                        className="h-4 w-4 rounded border-gray-300 text-[#E07A5F] focus:ring-[#E07A5F]"
                                    />
                                </div>
                            </div>
                            <input
                                id="secondary-api-key"
                                type="password"
                                value={secondaryApiKey}
                                onChange={e => setSecondaryApiKey(e.target.value)}
                                disabled={!isSecondaryKeyEnabled}
                                className={cn(
                                    "mt-1 w-full p-2 border rounded-lg focus:ring-2 focus:ring-[#E07A5F] transition-colors",
                                    isSecondaryKeyActive && 'border-green-500 bg-green-50'
                                )}
                            />
                        </div>
                    </div>

                    <div className="space-y-3 border-t pt-4">
                        <h4 className="font-semibold text-neutral-700">Fal.ai 模型設定</h4>
                        <p className="text-xs text-neutral-500">輸入您的 Fal API Key 以啟用替代模型。金鑰將儲存在您的瀏覽器中。</p>
                        <label htmlFor="fal-api-key" className="block text-sm text-neutral-600">Fal API Key</label>
                        <input id="fal-api-key" type="password" value={falApiKey} onChange={handleFalKeyChange} className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#E07A5F]" />
                        <label htmlFor="edit-model-select" className="block text-sm text-neutral-600 mt-2">圖片編輯模型</label>
                        <select id="edit-model-select" value={imageEditModel} onChange={handleEditModelChange} className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#E07A5F] bg-white text-gray-900">
                            <option value="gemini">Gemini 2.5 Flash Image Preview</option>
                            <option value="fal">Fal / Seedream V4 Edit</option>
                        </select>
                        <label htmlFor="gen-model-select" className="block text-sm text-neutral-600 mt-2">圖片生成模型</label>
                        <select id="gen-model-select" value={imageGenModel} onChange={handleGenModelChange} className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#E07A5F] bg-white text-gray-900">
                            <option value="gemini">Gemini Imagen 4.0</option>
                            <option value="fal">Fal / Seedream V4 Text-to-Image</option>
                        </select>
                    </div>

                    <div className="space-y-3 border-t pt-4">
                        <h4 className="font-semibold text-neutral-700">儲存空間管理</h4>
                        <label htmlFor="storage-limit" className="block text-sm text-neutral-600">作品集容量上限 (MB)</label>
                        <input id="storage-limit" type="number" min="50" max="2000" step="50" value={storageLimit} onChange={handleLimitChange} className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#E07A5F]" />
                        <div className="w-full bg-gray-200 rounded-full h-2.5">
                            <div className="bg-[#E07A5F] h-2.5 rounded-full" style={{ width: `${Math.min(usagePercentage, 100)}%` }}></div>
                        </div>
                        <p className="text-sm text-neutral-500 text-right">{currentUsage} MB / {storageLimit} MB</p>
                        {usagePercentage > 90 && <p className="text-sm text-yellow-600">警告：容量即將用盡。當新增作品超出上限時，將自動從最舊的作品開始刪除。</p>}
                    </div>

                    <div className="space-y-3 border-t pt-4">
                         <h4 className="font-semibold text-neutral-700">備份與還原</h4>
                         <div className="grid grid-cols-2 gap-3">
                             <button onClick={handleBackup} className={neutralButtonClasses + " w-full"}>備份作品集</button>
                             <button onClick={() => restoreInputRef.current?.click()} className={neutralButtonClasses + " w-full"}>還原作品集</button>
                             <input type="file" accept=".json" ref={restoreInputRef} onChange={handleRestore} className="hidden" />
                         </div>
                    </div>

                    <div className="border-t pt-4 space-y-3">
                         <h4 className="font-semibold text-red-700">危險區域</h4>
                         <button onClick={onClearAll} className="text-sm text-center text-red-600 bg-red-100 border border-red-200 py-2 px-4 rounded-md transition-colors duration-200 hover:bg-red-200 disabled:opacity-50 w-full" >清除所有作品</button>
                    </div>
                </div>
            </MotionDiv>
        </MotionDiv>
    );
};

const StyleSpecificationUI = ({
    styleList,
    setStyleList,
    isSingleStyleMode,
    setIsSingleStyleMode,
    conceptCount,
    setConceptCount,
    isLoading,
    isShowcaseMode
}: {
    styleList: string[];
    setStyleList: React.Dispatch<React.SetStateAction<string[]>>;
    isSingleStyleMode: boolean;
    setIsSingleStyleMode: React.Dispatch<React.SetStateAction<boolean>>;
    conceptCount: number;
    setConceptCount: React.Dispatch<React.SetStateAction<number>>;
    isLoading: boolean;
    isShowcaseMode: boolean;
}) => {
    const handleStyleListChange = (index: number, value: string) => {
        const newList = [...styleList];
        newList[index] = value;
        setStyleList(newList);
    };

    const addStyleToList = (style = '') => {
        if (isSingleStyleMode && styleList.length >= 1) {
            setStyleList([style]);
        } else {
            setStyleList(prev => [...prev, style]);
        }
    };

    const removeStyleFromList = (index: number) => {
        setStyleList(prev => prev.filter((_, i) => i !== index));
    };

    const handleSingleStyleToggle = (checked: boolean) => {
        setIsSingleStyleMode(checked);
        if (checked && styleList.length > 1) {
            setStyleList(prev => [prev[0] || '']);
        }
    };

    useEffect(() => {
        // Sync conceptCount with styleList length unless in single style mode
        if (!isSingleStyleMode) {
            const cleanStyleCount = styleList.filter(s => s.trim()).length;
            if (cleanStyleCount > 0 && conceptCount < cleanStyleCount) {
                setConceptCount(Math.min(6, cleanStyleCount));
            } else if (cleanStyleCount === 0 && styleList.length === 0) {
                setConceptCount(4); // default
            }
        }
    }, [styleList, isSingleStyleMode, conceptCount, setConceptCount]);

    return (
        <div className="mt-2">
            <h4 className="text-lg font-bold mb-3 text-neutral-700">指定設計風格</h4>
            <p className="text-sm text-center text-neutral-500 mb-3">點擊預設風格，或手動新增。如果指定的風格數量少于生成數量，AI 將自動補全。</p>

            <div className="flex flex-wrap gap-2 mb-4 justify-center">
                {PRESET_STYLES.map(style => (
                    <button key={style.name} onClick={() => addStyleToList(style.name)} disabled={isLoading} className="text-sm p-2 bg-black/5 rounded-lg hover:bg-black/10 transition-colors flex items-center gap-2 disabled:opacity-50">
                        <span>{style.emoji}</span>
                        <span>{style.name}</span>
                    </button>
                ))}
            </div>

            <div className="flex items-center justify-center gap-2 mb-4 text-sm text-neutral-600">
                <input type="checkbox" id="single-style-mode" checked={isSingleStyleMode} onChange={e => handleSingleStyleToggle(e.target.checked)} disabled={isLoading} className="h-4 w-4 rounded border-gray-300 text-[#E07A5F] focus:ring-[#E07A5F]" />
                <label htmlFor="single-style-mode" className="select-none cursor-pointer">單一風格，多種變化</label>
            </div>

            <div className="space-y-2">
                {styleList.map((style, index) => (
                    <div key={index} className="flex items-center gap-2">
                        <input
                            type="text"
                            value={style}
                            onChange={e => handleStyleListChange(index, e.target.value)}
                            placeholder="輸入風格..."
                            disabled={isLoading}
                            className={cn(
                                "w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#E07A5F] transition",
                                isShowcaseMode ? "bg-white text-gray-900" : ""
                            )}
                        />
                        <button onClick={() => removeStyleFromList(index)} disabled={isLoading} className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors flex-shrink-0">
                            <TrashIcon />
                        </button>
                    </div>
                ))}
            </div>

            {!(isSingleStyleMode && styleList.length >= 1) && (
                <button onClick={() => addStyleToList()} disabled={isLoading} className="mt-3 text-sm flex items-center gap-2 text-center text-[#3D405B] bg-transparent border-2 border-[#BDB5AD] py-2 px-4 rounded-lg transition-colors duration-200 hover:bg-black/5 hover:border-[#3D405B] disabled:opacity-50 w-full justify-center">
                    <PlusIcon />
                    <span>增加風格</span>
                </button>
            )}
        </div>
    );
};

const ReferenceImageUpload = ({ onUpload, onClear, image, disabled = false, title = "上傳風格參考圖 (可選)" }: { onUpload: (dataUrl: string) => void; onClear: () => void; image: string | null; disabled?: boolean; title?: string; }) => (
    <div className="mt-4 p-4 border border-dashed rounded-lg bg-black/5">
        <h4 className="text-md font-medium text-center mb-2 text-neutral-600">{title}</h4>
        {image ? (
            <div className="relative group w-32 mx-auto">
                <img src={image} className="w-full rounded-md shadow-sm" alt="風格參考"/>
                <button onClick={onClear} disabled={disabled} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full h-6 w-6 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-50">X</button>
            </div>
        ) : (
            <input type="file" accept="image/png, image/jpeg" disabled={disabled} onChange={(e: ChangeEvent<HTMLInputElement>) => {
                if (e.target.files && e.target.files[0]) {
                    const reader = new FileReader();
                    reader.onloadend = () => onUpload(reader.result as string);
                    reader.readAsDataURL(e.target.files[0]);
                    e.target.value = ''; // Allow re-uploading the same file
                }
            }} className="block w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-[#E07A5F]/20 file:text-[#E07A5F] hover:file:bg-[#E07A5F]/30 disabled:opacity-50 disabled:cursor-not-allowed" />
        )}
    </div>
);

// --- START: UI Components ---
interface GlassButtonProps {
    onClick: () => void;
    emoji: string;
    title: string;
    description: string;
    imageUrl?: string;
    key?: string;
}

const GlassButton = ({ onClick, emoji, title, description, imageUrl }: GlassButtonProps) => (
    <div 
        className="liquidGlass-wrapper group aspect-square"
        onClick={onClick} 
        role="button" 
        tabIndex={0} 
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } }}
        aria-label={`${title}: ${description}`}
    >
        <div className="liquidGlass-effect"></div>
        <div className="liquidGlass-tint"></div>
        <div className="liquidGlass-shine"></div>
        <div className="liquidGlass-text p-4 text-white">
            <div className="flex flex-col items-center justify-center text-center gap-2 h-full">
                {imageUrl ? (
                    <div className="w-full flex-1 relative overflow-hidden rounded-xl bg-black/20">
                        <img src={imageUrl} alt={title} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
                    </div>
                ) : (
                    <div className="flex-1 flex items-center justify-center">
                        <span className="text-7xl" aria-hidden="true">{emoji}</span>
                    </div>
                )}
                <div className="flex-shrink-0 mt-2">
                    <h3 className="text-base md:text-lg font-bold" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.4)' }}>{title}</h3>
                    <p className="text-white/80 mt-1 text-xs" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.4)' }}>{description}</p>
                </div>
            </div>
        </div>
    </div>
);

const ModuleSelection = ({ onSelect }: { onSelect: (mode: Mode) => void }) => (
    <MotionDiv initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.8, type: 'spring' }} className="w-full max-w-7xl text-center grid grid-cols-2 lg:grid-cols-4 gap-6">
        {homepageCards.map((card) => (
            <GlassButton
                key={card.id as string}
                onClick={() => onSelect(card.id)}
                emoji={card.emoji}
                title={card.title}
                description={card.description}
                imageUrl={card.imageUrl}
            />
        ))}
    </MotionDiv>
);

const StepUpload = ({ onUpload, onBack, title, description, onSelectFromPortfolio, isShowcaseMode }: { onUpload: (dataUrl: string) => void; onBack: () => void; title: string; description: string; onSelectFromPortfolio: () => void; isShowcaseMode: boolean; }) => (
    <MotionDiv initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full max-w-lg text-center mx-auto">
        <h2 className={cn("text-3xl font-bold text-center mb-6", isShowcaseMode ? "text-gray-800" : "text-white")}>{title}</h2>
        <label htmlFor="file-upload" className="cursor-pointer group block">
            <ImageCard status="done" />
        </label>
        <input id="file-upload" type="file" className="hidden" accept="image/png, image/jpeg, image/webp" onChange={(e: ChangeEvent<HTMLInputElement>) => {
            if (e.target.files && e.target.files[0]) {
                const reader = new FileReader();
                reader.onloadend = () => onUpload(reader.result as string);
                reader.readAsDataURL(e.target.files[0]);
            }
        }} />
        <p className={cn("mt-4", isShowcaseMode ? "text-neutral-500" : "text-neutral-400")}>{description}</p>
        <div className="mt-4 flex justify-center gap-4">
            <button onClick={onSelectFromPortfolio} className={cn(secondaryButtonClasses, "!text-base", isShowcaseMode ? "text-[#3D405B] hover:border-[#3D405B]" : "text-white hover:border-white")}>從作品集選取</button>
        </div>
        <div className="mt-8 flex justify-center w-full">
            <button onClick={onBack} className={cn(tertiaryButtonClasses, isShowcaseMode ? "!text-gray-600 !border-gray-400 border hover:!bg-black/5" : "text-white/80 border-white/30 hover:bg-white/10")}>返回主選單</button>
        </div>
    </MotionDiv>
);

const Stepper = ({ steps, currentStep, onStepClick, isShowcaseMode }: { steps: string[]; currentStep: number; onStepClick: (index: number) => void; isShowcaseMode: boolean; }) => (
    <div className="flex justify-center items-center w-full max-w-2xl mx-auto mb-8">
        {steps.map((step, index) => (
            <React.Fragment key={step}>
                <div className="flex flex-col items-center">
                    <button 
                        onClick={() => onStepClick(index)} 
                        disabled={index === currentStep}
                        className={cn(
                            "w-8 h-8 rounded-full flex items-center justify-center transition-colors",
                            {
                                'bg-[#E07A5F] text-white cursor-pointer hover:bg-[#D46A4D]': index < currentStep, // Completed
                                'bg-orange-500 text-white cursor-default font-bold': index === currentStep, // Active
                                'bg-gray-300 text-gray-600 cursor-pointer hover:bg-gray-400': index > currentStep, // Future
                            }
                        )}
                        aria-current={index === currentStep ? "step" : false}
                    >
                        {index < currentStep ? '✓' : index + 1}
                    </button>
                    <p className={cn(
                        'mt-2 text-sm text-center transition-colors',
                        index <= currentStep 
                            ? (isShowcaseMode ? 'text-[#3D405B]' : 'text-white') 
                            : 'text-neutral-400'
                    )}>{step}</p>
                </div>
                {index < steps.length - 1 && <div className={`flex-1 h-1 mx-2 transition-colors ${index < currentStep ? 'bg-[#E07A5F]' : 'bg-gray-300'}`}></div>}
            </React.Fragment>
        ))}
    </div>
);
// --- END: UI Components ---

interface OutfitCompositionSetupProps {
    personImage: string | null;
    setPersonImage: React.Dispatch<React.SetStateAction<string | null>>;
    itemImages: string[];
    setItemImages: React.Dispatch<React.SetStateAction<string[]>>;
    prompt: string;
    setPrompt: React.Dispatch<React.SetStateAction<string>>;
    isLoading: boolean;
    setIsLoading: React.Dispatch<React.SetStateAction<boolean>>;
    setLoadingMessage: React.Dispatch<React.SetStateAction<string>>;
    handleStartOver: () => void;
    onProceed: (selectedImageUrl: string, resultType: 'moodboard' | 'direct', originalPrompt: string, moodboardUrlForHistory?: string | null) => void;
    onOpenPortfolioPicker: (callback: (imageUrl: string) => void) => void;
    isShowcaseMode: boolean;
}

const OutfitCompositionSetup: React.FC<OutfitCompositionSetupProps> = ({
    personImage,
    setPersonImage,
    itemImages,
    setItemImages,
    prompt,
    setPrompt,
    isLoading,
    setIsLoading,
    setLoadingMessage,
    handleStartOver,
    onProceed,
    onOpenPortfolioPicker,
    isShowcaseMode
}) => {
    const [generationCount, setGenerationCount] = useState<number>(1);
    const [generatedUrls, setGeneratedUrls] = useState<string[]>([]);
    const [selectedGeneratedUrl, setSelectedGeneratedUrl] = useState<string | null>(null);
    const [resultsMode, setResultsMode] = useState<'moodboard' | 'direct' | null>(null);

    const handleItemImagesUpload = (e: ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const files = Array.from(e.target.files as FileList);
            if (itemImages.length + files.length > 8) {
                alert('最多只能上傳 8 件單品圖片。');
                return;
            }
            files.forEach(file => {
                const reader = new FileReader();
                reader.onloadend = () => {
                    setItemImages(prev => [...prev, reader.result as string]);
                };
                reader.readAsDataURL(file);
            });
        }
    };

    const removeItemImage = (index: number) => {
        setItemImages(prev => prev.filter((_, i) => i !== index));
    };

    const handleSuggestOutfit = async () => {
        if (!personImage || itemImages.length === 0) return;
        setIsLoading(true);
        setLoadingMessage('正在生成穿搭建議...');
        try {
            const suggestion = await suggestOutfit(itemImages, personImage);
            setPrompt(suggestion);
        } catch (error) {
            alert(`生成建議失敗: ${error instanceof Error ? error.message : '未知錯誤'}`);
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleResetGeneration = () => {
        setGeneratedUrls([]);
        setSelectedGeneratedUrl(null);
        setResultsMode(null);
    };

    const handleGenerateMoodboard = async () => {
        if (!personImage || itemImages.length === 0) return;
        setResultsMode('moodboard');
        setIsLoading(true);
        setLoadingMessage(`正在生成 ${generationCount} 張情緒板...`);
        setGeneratedUrls(Array(generationCount).fill('loading'));

        try {
            const generationPromises = Array(generationCount).fill(0).map(() =>
                generateMoodboard(itemImages, personImage, prompt)
            );
            const results = await Promise.allSettled(generationPromises);
            const successfulUrls = results
                .filter(r => r.status === 'fulfilled')
                .map(r => (r as PromiseFulfilledResult<string>).value);
            if (successfulUrls.length === 0) throw new Error("所有情緒板生成失敗。");
            setGeneratedUrls(successfulUrls);
            setSelectedGeneratedUrl(null);
        } catch (error) {
            alert(`生成情緒板失敗: ${error instanceof Error ? error.message : '未知錯誤'}`);
            setGeneratedUrls([]);
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleGenerateDirectCombinations = async () => {
        if (!personImage) return;
        setResultsMode('direct');
        setIsLoading(true);
        setLoadingMessage(`正在生成 ${generationCount} 張組合圖...`);
        setGeneratedUrls(Array(generationCount).fill('loading'));

        try {
            const outfitStylePrompt = prompt || '使用提供的單品打造時尚穿搭';
            const backgroundPrompt = 'Keep the existing background.';
            
            const generationPromises = Array(generationCount).fill(0).map((_, index) => {
                const fullPrompt = `Redraw this photo. The person should be wearing a cohesive outfit composed of the provided clothing items. The outfit style should be: "${outfitStylePrompt}". ${backgroundPrompt} It is crucial to maintain the person's original face, identity, and body shape. Output a photorealistic fashion shot. Please generate a unique visual interpretation (variation ${index + 1}).`;
                return editImage(personImage, fullPrompt, itemImages);
            });
            
            const results = await Promise.allSettled(generationPromises);
            const successfulUrls = results
                .filter(r => r.status === 'fulfilled')
                .map(r => (r as PromiseFulfilledResult<string>).value);
            if (successfulUrls.length === 0) throw new Error("所有組合圖生成失敗。");
            
            setGeneratedUrls(successfulUrls);
            setSelectedGeneratedUrl(null);
        } catch (error) {
            alert(`生成組合圖失敗: ${error instanceof Error ? error.message : '未知錯誤'}`);
            setGeneratedUrls([]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDownloadImage = (url: string, filename: string) => {
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const isReadyForGeneration = !!personImage && itemImages.length > 0 && !isLoading;

    const mainPanelClasses = cn(
      "p-8 rounded-xl shadow-md border",
      isShowcaseMode
        ? "bg-neutral-50 border-gray-200"
        : "bg-white/60 backdrop-blur-sm border-black/5"
    );
    const textClasses = cn(isShowcaseMode ? "text-gray-800" : "");
    const subTextClasses = cn(isShowcaseMode ? "text-neutral-500" : "");


    return (
        <MotionDiv initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full max-w-4xl mx-auto">
            <div className={mainPanelClasses}>
                <h2 className={cn("text-3xl font-bold text-center mb-6", textClasses)}>第一步：組合您的時尚單品</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-6">
                    <div>
                        <h3 className={cn("text-lg font-medium mb-2 text-center", textClasses)}>上傳您的人像</h3>
                         <label htmlFor="person-upload" className="cursor-pointer group block">
                            <ImageCard status="done" imageUrl={personImage ?? undefined} />
                        </label>
                        <input id="person-upload" type="file" className="hidden" accept="image/png, image/jpeg, image/webp" onChange={(e) => { if (e.target.files?.[0]) { const reader = new FileReader(); reader.onloadend = () => setPersonImage(reader.result as string); reader.readAsDataURL(e.target.files[0]); } }} />
                    </div>
                     <div>
                        <h3 className={cn("text-lg font-medium mb-2 text-center", textClasses)}>上傳服飾與配件 (最多8件)</h3>
                        <div className="flex flex-col gap-3 mb-4">
                            <input id="item-upload" type="file" multiple accept="image/png, image/jpeg" onChange={handleItemImagesUpload} className="block w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-[#E07A5F]/20 file:text-[#E07A5F] hover:file:bg-[#E07A5F]/30" />
                            <button onClick={() => onOpenPortfolioPicker((imageUrl) => {
                                if (itemImages.length >= 8) {
                                    alert('最多只能上傳 8 件單品圖片。');
                                    return;
                                }
                                setItemImages(prev => [...prev, imageUrl]);
                            })} className={cn(tertiaryButtonClasses, "w-full !text-sm !py-2 border-2", isShowcaseMode ? "!text-[#3D405B] !border-[#BDB5AD] hover:!border-[#3D405B]" : "text-white hover:border-white")}>從作品集選取</button>
                        </div>
                        {itemImages.length > 0 && <div className="grid grid-cols-3 sm:grid-cols-4 gap-4">
                            {itemImages.map((img, i) => (
                                <div key={i} className="relative group">
                                    <img src={img} className="w-full aspect-square object-contain bg-white rounded-lg shadow-sm" alt={`Item ${i + 1}`} />
                                    <button onClick={() => removeItemImage(i)} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full h-6 w-6 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity">X</button>
                                </div>
                            ))}
                        </div>}
                    </div>
                </div>

                <div>
                    <h3 className={cn("text-lg font-medium mb-2 text-center", textClasses)}>描述您理想的穿搭風格 (可選)</h3>
                    <p className={cn("text-sm text-center mb-2", subTextClasses)}>建議先由AI產生提示再手動追加細節。</p>
                    <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="例如：一套適合在東京街拍的Y2K風格穿搭..." className={cn("w-full h-24 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#E07A5F] transition", isShowcaseMode ? "bg-white text-gray-900" : "")} />
                     <div className="flex justify-center gap-4 mt-2">
                        <button onClick={handleSuggestOutfit} disabled={!personImage || itemImages.length === 0 || isLoading} className={cn(tertiaryButtonClasses, "border-2", isShowcaseMode ? "!text-[#3D405B] !border-[#BDB5AD] hover:!border-[#3D405B]" : "text-white hover:border-white")}>AI 來點靈感</button>
                     </div>
                </div>
                
                <div className="text-center mt-8">
                    <div className="flex justify-center items-center gap-4 mb-4">
                        <label className={cn("text-neutral-600", textClasses)}>生成張數:</label>
                        {[1, 2, 3, 4].map(num => (
                            <button key={num} onClick={() => setGenerationCount(num)} className={cn("w-10 h-10 rounded-md border transition-colors", generationCount === num ? "bg-[#E07A5F] text-white border-[#E07A5F]" : "bg-white text-neutral-700 hover:border-gray-400")}>{num}</button>
                        ))}
                    </div>
                    <div className="flex justify-center gap-4">
                        <button onClick={handleGenerateMoodboard} disabled={!isReadyForGeneration} className={cn(secondaryButtonClasses, isShowcaseMode ? "text-[#3D405B] hover:border-[#3D405B]" : "text-white hover:border-white")}>
                            生成情緒板
                        </button>
                        <button onClick={handleGenerateDirectCombinations} disabled={!isReadyForGeneration} className={primaryButtonClasses}>
                            直接組合生成
                        </button>
                    </div>
                </div>
            </div>
            
            <AnimatePresence>
                {generatedUrls.length > 0 && (
                    <MotionDiv initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mt-12">
                        <h2 className={cn("text-3xl font-bold mb-4", isShowcaseMode ? "text-gray-800" : "text-white")}>請選擇您最喜歡的結果</h2>
                        <p className={cn("mb-6", isShowcaseMode ? "text-neutral-500" : "text-neutral-300")}>點擊圖片進行選擇，選中後即可進入下一步。</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-4xl mx-auto mb-8">
                            {generatedUrls.map((url, index) => (
                                url === 'loading' ? 
                                    <div key={index} className="bg-black/5 aspect-square rounded-xl flex items-center justify-center text-neutral-400 animate-pulse"><p>生成中...</p></div> :
                                    <div key={index} className="cursor-pointer" onClick={() => setSelectedGeneratedUrl(url)}>
                                        <ImageCard 
                                            status="done" 
                                            imageUrl={url} 
                                            isSelected={selectedGeneratedUrl === url}
                                            onDownload={() => handleDownloadImage(url, `${resultsMode}_${index + 1}.jpeg`)}
                                        />
                                    </div>
                            ))}
                        </div>
                        <div className="flex flex-col sm:flex-row gap-4 justify-center">
                            <button onClick={handleResetGeneration} disabled={isLoading} className={cn(secondaryButtonClasses, isShowcaseMode ? "text-[#3D405B] hover:border-[#3D405B]" : "text-white hover:border-white")}>重新設定</button>
                            <button onClick={() => onProceed(selectedGeneratedUrl!, resultsMode!, prompt, resultsMode === 'moodboard' ? selectedGeneratedUrl : null)} disabled={isLoading || !selectedGeneratedUrl} className={primaryButtonClasses}>下一步：組合生成</button>
                        </div>
                    </MotionDiv>
                )}
            </AnimatePresence>

             <div className="mt-8 flex justify-center w-full">
                <button onClick={handleStartOver} className={cn(tertiaryButtonClasses, "border", isShowcaseMode ? "!text-gray-600 !border-gray-400 hover:!bg-black/5" : "text-white hover:border-white")}>全部重來</button>
            </div>
        </MotionDiv>
    );
};

const PortfolioPicker = ({ isOpen, onClose, onSelect }: { isOpen: boolean, onClose: () => void, onSelect: (imageUrl: string) => void }) => {
    const [items, setItems] = useState<PortfolioItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeFilter, setActiveFilter] = useState('all');

    useEffect(() => {
        if (isOpen) {
            setLoading(true);
            setActiveFilter('all');
            getAllPortfolioItems()
                .then(fetchedItems => {
                    setItems(fetchedItems);
                    setLoading(false);
                })
                .catch(err => {
                    console.error("Failed to fetch portfolio items for picker:", err);
                    setLoading(false);
                });
        }
    }, [isOpen]);

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


    if (!isOpen) return null;

    return (
        <MotionDiv initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 z-[101] flex items-center justify-center p-4" onClick={onClose}>
            <MotionDiv initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }} onClick={e => e.stopPropagation()} className="bg-[#F8F5F2] rounded-xl shadow-2xl w-full max-w-5xl h-[80vh] flex flex-col p-6">
                <h3 className="text-2xl font-bold text-[#3D405B] mb-4 flex-shrink-0">從作品集選取</h3>
                 <div className="flex flex-wrap gap-2 border-b border-gray-300 pb-3 mb-3 flex-shrink-0">
                    {filterTabs.map(mode => (
                        <button
                            key={mode}
                            onClick={() => setActiveFilter(mode)}
                            className={cn(
                                "px-3 py-1 text-xs font-medium rounded-full transition-colors",
                                activeFilter === mode
                                    ? "bg-[#3D405B] text-white"
                                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                            )}
                        >
                            {mode === 'all' ? '全部' : t(mode)}
                        </button>
                    ))}
                </div>
                <div className="flex-grow overflow-y-auto pr-2">
                    {loading ? (
                        <p className="text-center text-neutral-500">載入中...</p>
                    ) : filteredItems.length === 0 ? (
                        <p className="text-center text-neutral-500">此分類沒有作品。</p>
                    ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                            {filteredItems.map(item => (
                                <div key={item.id} className="cursor-pointer" onClick={() => onSelect(item.imageUrl)}>
                                    <ImageCard status="done" imageUrl={item.imageUrl} />
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </MotionDiv>
        </MotionDiv>
    );
};

function App() {
    const [mode, setMode] = useState<Mode>('select');
    const [currentStep, setCurrentStep] = useState(0);
    const [history, setHistory] = useState<HistoryItem[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState('');
    const [prompt, setPrompt] = useState('');
    const [concepts, setConcepts] = useState<string[]>([]);
    const [generatedConceptStyles, setGeneratedConceptStyles] = useState<string[]>([]);
    const [selectedConcept, setSelectedConcept] = useState<string | null>(null);
    const [referenceImage, setReferenceImage] = useState<string | null>(null);
    const [sceneReferenceImage, setSceneReferenceImage] = useState<string | null>(null);
    const [conceptCount, setConceptCount] = useState<number>(4);
    
    // Step 2 State (was step 3)
    const [step2Tab, setStep2Tab] = useState<Step2Tab>('style');
    const [accessoryForPlacement, setAccessoryForPlacement] = useState<string | null>(null);
    const [isProcessingAccessory, setIsProcessingAccessory] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [customSearchText, setCustomSearchText] = useState('');
    const [selectedBrand, setSelectedBrand] = useState('');
    const [selectedType, setSelectedType] = useState('');
    const [searchCount, setSearchCount] = useState<number>(1);
    const [searchResults, setSearchResults] = useState<string[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const maskCanvasRef = useRef<{ getMask: () => string | null }>(null);

    // Composition Mode State
    const [personImage, setPersonImage] = useState<string | null>(null);
    const [itemImages, setItemImages] = useState<string[]>([]);
    
    // New Direct Style Specification State (Step 1)
    const [styleList, setStyleList] = useState<string[]>([]);
    const [isSingleStyleMode, setIsSingleStyleMode] = useState(false);
    
    // Notification State
    const [notification, setNotification] = useState<string | null>(null);

    // Portfolio interaction state
    const [initialImageForModule, setInitialImageForModule] = useState<string | null>(null);
    const [isPortfolioPickerOpen, setIsPortfolioPickerOpen] = useState(false);
    const [portfolioPickerCallback, setPortfolioPickerCallback] = useState<{ fn: ((imageUrl: string) => void) } | null>(null);

    // Showcase Mode State
    const [isShowcaseMode, setIsShowcaseMode] = useState(false);
    const [showcaseKey, setShowcaseKey] = useState(Date.now());
    
    // Settings Modal State
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);

    useEffect(() => {
        const enabled = localStorage.getItem('showcaseModeEnabled') === 'true';
        setIsShowcaseMode(enabled);
    }, []);

    // Effect to build search query from dropdowns and text input
    useEffect(() => {
        const queryParts = [selectedBrand, selectedType, customSearchText].filter(Boolean);
        setSearchQuery(queryParts.join(' '));
    }, [selectedBrand, selectedType, customSearchText]);

    const showNotification = (message: string) => {
        setNotification(message);
        setTimeout(() => setNotification(null), 3000);
    };

    const resetModuleState = () => {
        setCurrentStep(0);
        setHistory([]);
        setIsLoading(false);
        setLoadingMessage('');
        setPrompt('');
        setConcepts([]);
        setSelectedConcept(null);
        setAccessoryForPlacement(null);
        setPersonImage(null);
        setItemImages([]);
        setReferenceImage(null);
        setSceneReferenceImage(null);
        setConceptCount(4);
        setSearchQuery('');
        setCustomSearchText('');
        setSelectedBrand('');
        setSelectedType('');
        setSearchResults([]);
        setIsSearching(false);
        setIsProcessingAccessory(false);
        setStep2Tab('style');
        setStyleList([]);
        setIsSingleStyleMode(false);
        setGeneratedConceptStyles([]);
        setInitialImageForModule(null);
    };

    const handleStartOver = () => {
        resetModuleState();
        setMode('select');
    };

    const handleModeChange = (newMode: Mode) => {
        if (newMode === mode) return;
        resetModuleState();
        setMode(newMode);
    };
    
    const handleSaveToPortfolio = async (item: Omit<PortfolioItem, 'id' | 'timestamp'>) => {
        try {
            const timestamp = Date.now();
            await addPortfolioItem({
                ...item,
                id: timestamp.toString(),
                timestamp,
            });
            showNotification('成功儲存至作品集！');
        } catch (error) {
            console.error("Failed to save to portfolio:", error);
            alert(`儲存失敗: ${error instanceof Error ? error.message : '未知錯誤'}`);
        }
    };
    
    const handleSendToModule = (item: PortfolioItem, targetModule: Mode) => {
        resetModuleState();
    
        setTimeout(() => {
            setMode(targetModule);
            
            if (targetModule === 'portrait') {
                handleUpload(item.imageUrl);
            } else if (targetModule === 'composition') {
                setPersonImage(item.imageUrl);
            } else {
                setInitialImageForModule(item.imageUrl);
            }
        }, 100);
    };

    const handleDeleteFromShowcase = async (id: string) => {
        await deletePortfolioItems([id]);
        setShowcaseKey(Date.now()); // Force a re-render of the showcase component
    };
    
    // For Portrait mode
    const handleUpload = (imageUrl: string) => {
        setHistory([{ stepName: '原始人像', imageUrl }]);
        setCurrentStep(1);
    };

    const openPortfolioPicker = (callback: (imageUrl: string) => void) => {
        setPortfolioPickerCallback({ fn: callback });
        setIsPortfolioPickerOpen(true);
    };

    const handlePortfolioPick = (imageUrl: string) => {
        portfolioPickerCallback?.fn(imageUrl);
        setIsPortfolioPickerOpen(false);
        setPortfolioPickerCallback(null);
    };
    
    const handleStepJump = (stepperIndex: number) => {
        const currentStepperIndex = currentStep - 1;
        if (stepperIndex === currentStepperIndex) return;

        if (stepperIndex < currentStepperIndex) {
            const historySliceEnd = stepperIndex + 1;
            setHistory(prev => prev.slice(0, historySliceEnd));
            setCurrentStep(stepperIndex + 1);
            setAccessoryForPlacement(null);
            setPrompt('');
            setReferenceImage(null);
            setSceneReferenceImage(null);
        } else { // Jumping forward
             const wizardMode = mode as Exclude<Mode, 'select' | 'multiAngle' | 'imaginative' | 'infinitePhotoshoot' | 'clothingAssistant' | 'portfolio' | 'outfitAnalysis'>;
            const stepConfig = STEP_CONFIG[wizardMode];
            if (!stepConfig) return;

            const newHistory = [...history];
            const lastImage = history[history.length - 1].imageUrl;

            for (let i = currentStepperIndex; i < stepperIndex; i++) {
                const stepName = stepConfig.steps[i] + " (已跳過)";
                newHistory.push({ stepName, imageUrl: lastImage, prompt: '跳過' });
            }
            setHistory(newHistory);
            setCurrentStep(stepperIndex + 1);
            setAccessoryForPlacement(null);
            setPrompt('');
            setReferenceImage(null);
            setSceneReferenceImage(null);
        }
    };
    
    const handleGenerateConcepts = async () => {
        if (history.length === 0) return;
        setIsLoading(true);
        setLoadingMessage('正在生成風格概念...');
        setConcepts(Array(conceptCount).fill('loading'));
        
        try {
            const cleanStyleList = styleList.filter(s => s.trim() !== '');
            let finalPrompts: string[] = [];
    
            if (isSingleStyleMode) {
                const singleStyle = cleanStyleList[0] || (await generateRandomStyles(1))[0];
                finalPrompts = Array(conceptCount).fill(singleStyle);
                setGeneratedConceptStyles(Array(conceptCount).fill(singleStyle));
            } else {
                const numStyles = cleanStyleList.length;
                if (numStyles === 0) {
                    finalPrompts = await generateRandomStyles(conceptCount);
                } else if (numStyles < conceptCount) {
                    const additionalStyles = await generateRandomStyles(conceptCount - numStyles);
                    finalPrompts = [...cleanStyleList, ...additionalStyles];
                } else { // numStyles >= conceptCount
                    finalPrompts = [...cleanStyleList].sort(() => 0.5 - Math.random()).slice(0, conceptCount);
                }
                setGeneratedConceptStyles(finalPrompts);
            }
    
            const generationPromises = finalPrompts.map((prompt, index) => {
                const variationInstruction = isSingleStyleMode ? `, 請生成一個獨特的視覺詮釋 (variation ${index + 1})` : '';
                const basePrompt = `**任務：虛擬試穿**\n\n**指令：** 以輸入的人像為基礎，**務必保持人物的臉部、頭部和身份完全不變**。將他們目前的服裝替換為一套符合「${prompt}」風格的完整穿搭${variationInstruction}。\n\n**嚴格要求：**\n1. **臉部保真**：絕對不能改變原始人物的臉部特徵和身份。\n2. **僅輸出圖片**：不要生成任何文字。`;
                return editImage(history[0].imageUrl, basePrompt, [referenceImage]);
            });
            
            const results = await Promise.all(generationPromises);
            setConcepts(results);
            setReferenceImage(null);
        } catch (error) {
            console.error(error);
            alert(`生成概念圖失敗: ${error instanceof Error ? error.message : '未知錯誤'}`);
            setConcepts([]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDownloadAllConcepts = async () => {
        setIsLoading(true);
        setLoadingMessage('正在打包風格概念圖...');
        const imagesToZip = concepts
            .filter(c => c !== 'loading')
            .map((url, index) => ({
                url,
                name: `風格概念_${generatedConceptStyles[index] || index + 1}`.replace(/[^\w\u4e00-\u9fa5]/g, '_')
            }));
        
        const timestamp = getTimestamp();
        const zipName = `風格概念_${timestamp}.zip`;
        await createZipAndDownload(imagesToZip, zipName);
        setIsLoading(false);
        setLoadingMessage('');
    };
    
    const handleCreateConceptsAlbum = async () => {
        const validConcepts = concepts.filter(c => c !== 'loading');
        if (validConcepts.length === 0) return;
    
        setIsLoading(true);
        setLoadingMessage('正在生成風格相簿...');
        try {
            const imagesToAlbum = validConcepts.map((url, index) => ({
                url,
                style: generatedConceptStyles[index] || `風格 ${index + 1}`
            }));
            
            const timestamp = getTimestamp();
            const filename = `風格概念相簿_${timestamp}.jpg`;
            await createDynamicAlbumAndDownload(imagesToAlbum, filename);
        } catch (error) {
            alert(`生成相簿失败: ${error instanceof Error ? error.message : '未知錯誤'}`);
        } finally {
            setIsLoading(false);
            setLoadingMessage('');
        }
    };
    
    const handleSaveAllConcepts = async () => {
        const conceptsToSave = concepts.filter(c => c !== 'loading');
        if (conceptsToSave.length === 0) return;
    
        setIsLoading(true);
        setLoadingMessage(`正在儲存 ${conceptsToSave.length} 個概念至作品集...`);
        try {
            for (let i = 0; i < conceptsToSave.length; i++) {
                const conceptUrl = conceptsToSave[i];
                const style = generatedConceptStyles[i] || `風格 ${i + 1}`;
                const item: Omit<PortfolioItem, 'id' | 'timestamp'> = {
                    mode: 'portrait',
                    imageUrl: conceptUrl,
                    prompt: style,
                    settings: { 
                        // Save the initial history state for context
                        history: [history[0]] 
                    }
                };
                await handleSaveToPortfolio(item);
            }
            showNotification(`${conceptsToSave.length} 個概念已成功儲存！`);
        } catch (error) {
            alert(`儲存概念失敗: ${error instanceof Error ? error.message : '未知錯誤'}`);
        } finally {
            setIsLoading(false);
            setLoadingMessage('');
        }
    };

    const handleSelectConcept = (imageUrl: string, style: string) => {
        setSelectedConcept(imageUrl);
        setHistory(prev => [...prev, { stepName: '風格概念', imageUrl, prompt: style }]);
        setCurrentStep(prev => prev + 1);
    }
    
    const handleCompositionStep1Complete = (
        finalImageUrl: string,
        resultType: 'moodboard' | 'direct',
        originalPrompt: string,
        moodboardUrlForHistory: string | null = null
    ) => {
        if (!personImage) return;

        const outfitStylePrompt = originalPrompt || (resultType === 'moodboard' ? '使用情緒板組合' : '使用提供的單品打造時尚穿搭');
        const stepName = resultType === 'moodboard' ? '單品組合 (情緒板)' : '單品組合';
        
        const initialHistory = [{ stepName: stepName, imageUrl: personImage, prompt: outfitStylePrompt }];
        const newHistoryItem = {
            stepName: '組合生成',
            imageUrl: finalImageUrl, // This is the image selected by the user
            prompt: resultType === 'moodboard' ? '使用情緒板組合' : '直接組合',
            moodboardUrl: moodboardUrlForHistory
        };
        setHistory([...initialHistory, newHistoryItem]);
        setSceneReferenceImage(null);
        setCurrentStep(2);
        setPrompt(''); // Clear prompt for next step as requested.
    };


    const handleStepAction = async (userPrompt: string, stepName: string) => {
        if (history.length === 0) return;
        setIsLoading(true);
        setLoadingMessage(`正在生成 ${stepName}...`);
        
        try {
            const baseImage = history[history.length - 1].imageUrl;
            let fullPrompt = '';
            let references: (string | null)[] = [];
            
            switch(stepName) {
                case '設定場景風格':
                    references.push(sceneReferenceImage);
    
                    let backgroundPrompt = '';
                    if (sceneReferenceImage && userPrompt) {
                        backgroundPrompt = `The background and overall mood should be primarily inspired by the second image provided (the scene reference). Use the following text for additional details or modifications to the scene: "${userPrompt}".`;
                    } else if (sceneReferenceImage) {
                        backgroundPrompt = `The background and overall mood should be primarily inspired by the second image provided (the scene reference).`;
                    } else if (userPrompt) {
                        backgroundPrompt = `The background and overall mood should match this description: "${userPrompt}".`;
                    } else {
                        backgroundPrompt = 'Keep the existing background.';
                    }
                    
                    const outfitDescription = "It is critical to keep the person's current outfit, clothing, and accessories completely unchanged from the input image.";
                    fullPrompt = `Redraw this photo. ${outfitDescription} ${backgroundPrompt} It is crucial to maintain the person's original face, identity, and body shape. Your only task is to change the background and lighting. Output a photorealistic fashion shot.`;
                    break;
                case '服飾與配件':
                    references.push(referenceImage);
                    fullPrompt = `以當前圖片為基礎，將目前的服裝替換為一套符合「${userPrompt}」描述的穿搭。不要改變人物的身份或背景。專注於更換衣物和配件。`;
                    break;
            }
            
            const newImageUrl = await editImage(baseImage, fullPrompt, references);
            setHistory(prev => [...prev, { stepName, imageUrl: newImageUrl, prompt: userPrompt }]);
            setCurrentStep(prev => prev + 1);
            setPrompt('');
            setReferenceImage(null);
            setSceneReferenceImage(null);
        } catch (error) {
            console.error(error);
            alert(`生成失敗: ${error instanceof Error ? error.message : '未知錯誤'}`);
        } finally {
            setIsLoading(false);
        }
    };

    // --- START: Step 2 Specific Handlers ---
    const handleStep2TabChange = (tab: Step2Tab) => {
        setStep2Tab(tab);
        setAccessoryForPlacement(null);
        setSearchResults([]);
        setSearchQuery('');
        setCustomSearchText('');
        setSelectedBrand('');
        setSelectedType('');
        setIsSearching(false);
        setIsProcessingAccessory(false);
    };
    
    const handleSearchAccessory = async () => {
        if (!searchQuery) return;
        setIsSearching(true);
        setSearchResults(Array(searchCount).fill('loading'));
        try {
            const results = await searchAndGenerateAccessory(searchQuery, searchCount);
            setSearchResults(results);
        } catch (error) {
            alert(`搜尋單品失敗: ${error instanceof Error ? error.message : '未知錯誤'}`);
            setSearchResults([]);
        } finally {
            setIsSearching(false);
        }
    };
    
    const handleAccessorySelectedForPlacement = async (imageDataUrl: string) => {
        setIsProcessingAccessory(true);
        setAccessoryForPlacement(imageDataUrl); 
        try {
            setLoadingMessage('正在移除單品背景...'); 
            const processedImage = await removeImageBackground(imageDataUrl);
            setAccessoryForPlacement(processedImage);
        } catch (error) {
            console.error("Failed to remove background:", error);
            alert(`移除背景失敗: ${error instanceof Error ? error.message : '未知錯誤'}. 將使用原始圖片進行放置。`);
        } finally {
            setIsProcessingAccessory(false);
            setLoadingMessage('');
        }
    };

    const handleCustomAccessoryUpload = (e: ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const reader = new FileReader();
            reader.onloadend = () => {
                handleAccessorySelectedForPlacement(reader.result as string);
            };
            reader.readAsDataURL(e.target.files[0]);
        }
    };

    const handleEnhanceOutfit = async () => {
        if (!prompt || history.length === 0) return;
        setIsLoading(true);
        setLoadingMessage('正在添加配飾...');
        try {
            const baseImage = history[history.length - 1].imageUrl;
            const fullPrompt = `**任務：豐富穿搭造型**\n\n**指令：**\n分析輸入圖片的現有穿搭。根據描述「${prompt}」，在人物身上添加合適的配飾或小物件來豐富畫面。\n\n**嚴格要求：**\n1. **保留現有服裝**：絕對不要移除或替換任何已經存在的主要服裝（例如上衣、褲子、裙子等）。\n2. **僅添加物品**：你的任務是添加新物品，例如項鍊、帽子、太陽眼鏡、手提包、圍巾等裝飾性元素。\n3. **無縫融合**：確保新物品在光影、透視和比例上與人物完美融合。`;
            const newImageUrl = await editImage(baseImage, fullPrompt, []);
            setHistory(prev => [...prev, { stepName: '服飾與配件 (添加配飾)', imageUrl: newImageUrl, prompt: prompt }]);
            setCurrentStep(prev => prev + 1);
            setPrompt('');
        } catch (error) {
            console.error(error);
            alert(`添加配飾失敗: ${error instanceof Error ? error.message : '未知錯誤'}`);
        } finally {
            setIsLoading(false);
        }
    };

    const handleMaskedAccessoryIntegration = async () => {
        const maskDataUrl = maskCanvasRef.current?.getMask();
        if (!maskDataUrl || !accessoryForPlacement) {
            alert("請先選擇一件單品，並在畫面上繪製您想放置的區域。");
            return;
        }
        setIsLoading(true);
        setLoadingMessage('正在整合單品...');
        try {
            const baseImage = history[history.length - 1].imageUrl;
            const newImageUrl = await editImage(baseImage, `Integrate the fashion accessory from the second image onto the person in the first image. Place it in the area indicated by the black mask in the third image. Adjust lighting, shadows, and perspective for a seamless, photorealistic result.`, [accessoryForPlacement, maskDataUrl]);
    
            setHistory(prev => [...prev, { stepName: '服飾與配件 (添加)', imageUrl: newImageUrl, prompt: '添加自訂單品' }]);
            setCurrentStep(prev => prev + 1);
            setAccessoryForPlacement(null);
        } catch (error) {
            console.error("Failed to integrate accessory with mask:", error);
            alert(`單品整合失敗: ${error instanceof Error ? error.message : '未知錯誤'}`);
        } finally {
            setIsLoading(false);
        }
    };

    const handleInpaint = async () => {
        const maskDataUrl = maskCanvasRef.current?.getMask();
        if (!maskDataUrl || !prompt) {
            alert("請先在圖片上繪製遮罩區域並輸入提示詞。");
            return;
        }
        setIsLoading(true);
        setLoadingMessage('正在編輯指定區域...');
        try {
            const baseImage = history[history.length - 1].imageUrl;
            const newImageUrl = await inpaintImage(baseImage, maskDataUrl, prompt);
            setHistory(prev => [...prev, { stepName: '服飾與配件 (區域編輯)', imageUrl: newImageUrl, prompt }]);
            setCurrentStep(prev => prev + 1);
            setPrompt('');
        } catch (error) {
            console.error("Inpainting failed:", error);
            alert(`區域編輯失敗: ${error instanceof Error ? error.message : '未知錯誤'}`);
        } finally {
            setIsLoading(false);
        }
    };
    // --- END: Step 2 Specific Handlers ---
    
    const handleSkipStep = () => {
        if (history.length === 0) return;
        const wizardMode = mode as Exclude<Mode, 'select' | 'multiAngle' | 'imaginative' | 'infinitePhotoshoot' | 'clothingAssistant' | 'portfolio' | 'outfitAnalysis'>;
        const stepConfig = STEP_CONFIG[wizardMode];
        const stepIndex = currentStep - 1;
        const stepName = stepConfig.steps[stepIndex] + " (已跳過)";
        setHistory(prev => [...prev, { stepName, imageUrl: prev[prev.length - 1].imageUrl, prompt: '跳過' }]);
        setCurrentStep(prev => prev + 1);
    };
    
    const handleBackStep = () => {
        if (mode === 'composition' && currentStep === 1) {
            setHistory([]);
            setCurrentStep(0);
            return;
        }
        if (currentStep <= 1) return;
        
        if (accessoryForPlacement) {
            setAccessoryForPlacement(null);
            return;
        }
        
        if (mode === 'portrait' && currentStep === 2) {
            setSelectedConcept(null);
        }
        setHistory(prev => prev.slice(0, -1));
        setCurrentStep(prev => prev - 1);
        setAccessoryForPlacement(null);
        setPrompt('');
        setReferenceImage(null);
        setSceneReferenceImage(null);
    };

    const getDesignTargetForDownload = (): string => {
        const firstStep = history.find(h => h.stepName.startsWith('風格') || h.stepName.startsWith('原始'));
        return firstStep?.prompt?.split(' ')[0].replace(/[()]/g, '') || '造型';
    };

    const handleDownloadZip = async () => {
        setIsLoading(true);
        setLoadingMessage('正在打包專案...');
        const imagesToZip = history.map((item, index) => ({
            url: item.imageUrl,
            name: `${index}_${item.stepName.replace(/[^\w\u4e00-\u9fa5]/g, '_')}`
        }));
        const designTarget = getDesignTargetForDownload();
        const timestamp = getTimestamp();
        const zipName = `時尚專案_${designTarget}_${timestamp}.zip`;
        await createZipAndDownload(imagesToZip, zipName);
        setIsLoading(false);
    };

    const handleDownloadProcessAlbum = async () => {
        setIsLoading(true);
        setLoadingMessage('正在生成設計相本...');
        try {
            const finalImage = history[history.length - 1];
            if (!finalImage) throw new Error("找不到最終設計圖。");
            
            const processImages = history.map(h => ({ url: h.imageUrl, label: h.stepName.split(' ')[0] }));
            if (processImages.length === 0) throw new Error("找不到設計過程圖片。");
    
            const designTarget = getDesignTargetForDownload();
            const timestamp = getTimestamp();
            const filename = `設計過程相本_${designTarget}_${timestamp}.jpg`;
            await createProcessAlbumAndDownload(finalImage, processImages, filename);
    
        } catch (error) {
            console.error("無法生成設計過程相本:", error);
            alert(`生成設計相本失敗: ${error instanceof Error ? error.message : '未知錯誤'}`);
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleDownloadCompositionAlbum = async () => {
        setIsLoading(true);
        setLoadingMessage('正在生成組合設計相本...');
        try {
            if (!personImage) throw new Error("找不到人像照片");
            if (history.length === 0) throw new Error("找不到最終設計圖");
    
            const finalImage = { url: history[history.length - 1].imageUrl };
            const person = { url: personImage };
            const items = itemImages.map(url => ({ url }));
            
            const moodboardStep = history.find(h => h.moodboardUrl);
            const moodboard = moodboardStep ? { url: moodboardStep.moodboardUrl! } : null;
    
            const designTarget = getDesignTargetForDownload();
            const timestamp = getTimestamp();
            const filename = `組合設計相本_${designTarget}_${timestamp}.jpg`;
    
            await createCompositionAlbumAndDownload(finalImage, person, items, moodboard, filename);
        } catch (error) {
            console.error("無法生成組合設計相本:", error);
            alert(`生成組合設計相本失敗: ${error instanceof Error ? error.message : '未知錯誤'}`);
        } finally {
            setIsLoading(false);
            setLoadingMessage('');
        }
    };

    const renderStepContent = () => {
        if (mode === 'select' || history.length === 0 || currentStep === 0) return null;
        
        const wizardMode = mode as Exclude<Mode, 'select' | 'multiAngle' | 'imaginative' | 'infinitePhotoshoot' | 'clothingAssistant' | 'portfolio' | 'outfitAnalysis'>;
        const stepConfig = STEP_CONFIG[wizardMode];
        const stepIndex = currentStep - 1;
        const stepName = stepConfig.steps[stepIndex];

        switch (stepName) {
            case '風格概念': // Portrait Mode Step 1
                return (
                    <div>
                        <h3 className="text-2xl font-bold mb-2">第一步：風格概念</h3>
                        <p className="text-neutral-600 mb-2">請設定您想生成的風格與數量，也可以上傳一張參考圖來引導風格。</p>
                        
                        <StyleSpecificationUI
                            styleList={styleList}
                            setStyleList={setStyleList}
                            isSingleStyleMode={isSingleStyleMode}
                            setIsSingleStyleMode={setIsSingleStyleMode}
                            conceptCount={conceptCount}
                            setConceptCount={setConceptCount}
                            isLoading={isLoading}
                            isShowcaseMode={isShowcaseMode}
                        />

                        <ReferenceImageUpload image={referenceImage} onUpload={setReferenceImage} onClear={() => setReferenceImage(null)} disabled={isLoading} />
                        
                        <div className="flex justify-center items-center gap-2 my-4">
                            <label className="text-neutral-600">生成数量:</label>
                            {[1, 2, 3, 4, 5, 6].map(num => <button key={num} onClick={() => setConceptCount(num)} disabled={isLoading} className={cn("w-10 h-10 rounded-md border transition-colors", conceptCount === num ? "bg-[#E07A5F] text-white border-[#E07A5F]" : "bg-white text-neutral-700 hover:border-gray-400", "disabled:opacity-50")}>{num}</button>)}
                        </div>

                        <button onClick={handleGenerateConcepts} className={primaryButtonClasses + " w-full"} disabled={isLoading}>
                            {isLoading ? '生成中...' : `生成 ${conceptCount} 種概念`}
                        </button>
                        {concepts.length > 0 && !concepts.includes('loading') && (
                            <div className="flex justify-center gap-2 my-4 flex-wrap">
                                <button onClick={handleCreateConceptsAlbum} disabled={isLoading} className={cn(secondaryButtonClasses, "!text-sm !py-2 !px-3", isShowcaseMode ? "text-[#3D405B] hover:border-[#3D405B]" : "text-white hover:border-white")}>製作相簿</button>
                                <button onClick={handleDownloadAllConcepts} disabled={isLoading} className={cn(secondaryButtonClasses, "!text-sm !py-2 !px-3", isShowcaseMode ? "text-[#3D405B] hover:border-[#3D405B]" : "text-white hover:border-white")}>全部下載</button>
                                <button onClick={handleSaveAllConcepts} disabled={isLoading} className={cn(secondaryButtonClasses, "!text-sm !py-2 !px-3", isShowcaseMode ? "text-[#3D405B] hover:border-[#3D405B]" : "text-white hover:border-white")}>全部存入作品集</button>
                            </div>
                        )}
                        {concepts.length > 0 && <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                            {concepts.map((concept, index) =>
                                concept === 'loading' ?
                                <div key={index} className="bg-black/5 aspect-square rounded-xl flex items-center justify-center text-neutral-400 animate-pulse"><p>生成中...</p></div> :
                                <div key={index} className="cursor-pointer" >
                                    <ImageCard status="done" imageUrl={concept} keepAspectRatio={true} 
                                        onSelect={() => handleSelectConcept(concept, generatedConceptStyles[index] || `風格 ${index+1}`)}
                                        onSave={() => handleSaveToPortfolio({
                                            mode: 'portrait',
                                            imageUrl: concept,
                                            prompt: generatedConceptStyles[index] || `風格 ${index + 1}`,
                                            settings: { history: [history[0]] }
                                        })}
                                    />
                                </div>
                            )}
                        </div>}
                    </div>
                );
            case '設定場景風格':
                const addTemplateToPrompt = (template: string) => {
                    setPrompt(prev => prev ? `${prev}, ${template}` : template);
                };

                const handleSuggestScene = async () => {
                    if (history.length === 0) return;
                    setIsLoading(true);
                    setLoadingMessage('正在生成場景建議...');
                    try {
                        const suggestion = await suggestScene(history[history.length - 1].imageUrl);
                        setPrompt(suggestion);
                    } catch (error) {
                        alert(`生成建議失敗: ${error instanceof Error ? error.message : '未知錯誤'}`);
                    } finally {
                        setIsLoading(false);
                    }
                };

                const TemplateSelector = ({ title, templates }: { title: string, templates: { name: string, emoji: string }[] }) => (
                    <div className="mt-3">
                        <h4 className="text-md font-medium text-neutral-600 mb-2">{title}</h4>
                        <div className="flex flex-wrap gap-2">
                            {templates.map(t => (
                                <button key={t.name} onClick={() => addTemplateToPrompt(t.name)} disabled={isLoading} className="text-xs p-2 bg-black/5 rounded-lg hover:bg-black/10 transition-colors flex items-center gap-1.5 disabled:opacity-50">
                                    <span>{t.emoji}</span>
                                    <span>{t.name}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                );

                return (
                    <div>
                        <div className='flex justify-between items-center mb-2'>
                            <h3 className="text-2xl font-bold">設定場景風格</h3>
                            <button onClick={handleSuggestScene} className={cn(tertiaryButtonClasses, "border", isShowcaseMode ? "!text-[#3D405B] !border-[#BDB5AD] hover:!border-[#3D405B]" : "text-white hover:border-white")} disabled={isLoading}>AI 來點靈感</button>
                        </div>
                        <p className="text-neutral-600 mb-2">請描述您想要的整體背景、光線以及攝影感覺，或使用下方模板快速選擇。</p>
                        <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="例如：夜晚的東京街頭，霓虹燈光閃爍。" className={cn("w-full h-24 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#E07A5F] transition", isShowcaseMode ? "bg-white text-gray-900" : "")} />
                        
                        <TemplateSelector title="場合" templates={SCENE_VENUES} />
                        <TemplateSelector title="光線" templates={SCENE_LIGHTING} />
                        <TemplateSelector title="攝影效果" templates={SCENE_EFFECTS} />

                        <ReferenceImageUpload image={sceneReferenceImage} onUpload={setSceneReferenceImage} onClear={() => setSceneReferenceImage(null)} disabled={isLoading} title="上傳場景參考圖 (可選)" />
                        <button onClick={() => openPortfolioPicker(setSceneReferenceImage)} className={cn(tertiaryButtonClasses, "w-full !text-sm !py-2 mt-2 border-2", isShowcaseMode ? "!text-[#3D405B] !border-[#BDB5AD] hover:!border-[#3D405B]" : "text-white hover:border-white")}>從作品集選取</button>
                        
                        <div className="mt-4">
                            <button onClick={() => handleStepAction(prompt, stepName)} disabled={(!prompt && !sceneReferenceImage) || isLoading} className={primaryButtonClasses + " w-full"}>生成場景</button>
                        </div>
                    </div>
                );
            case '服飾與配件': // All modes Step 2
            case '組合生成': // For Composition mode, this step is now conceptually step 2, but the UI is shown for step 3
                const TabButton = ({ tab, children }: { tab: Step2Tab; children: React.ReactNode }) => (
                    <button onClick={() => handleStep2TabChange(tab)} className={cn("px-4 py-2 rounded-t-lg font-medium text-sm sm:text-base", step2Tab === tab ? 'bg-white/80 text-[#E07A5F]' : 'bg-transparent text-neutral-500 hover:bg-white/50')}>
                        {children}
                    </button>
                );
                
                const isPlacingAccessory = accessoryForPlacement !== null;
                const showTabs = !isPlacingAccessory;

                return (
                    <div>
                        <h3 className="text-2xl font-bold mb-4">調整服飾與配件</h3>
                         {showTabs && (
                            <div className="border-b border-gray-300 mb-4 flex gap-1 sm:gap-2 flex-wrap">
                               <TabButton tab="style">整體風格</TabButton>
                               <TabButton tab="search">搜尋單品</TabButton>
                               <TabButton tab="add">自訂單品</TabButton>
                               <TabButton tab="edit">區域編輯</TabButton>
                            </div>
                        )}
                        <AnimatePresence mode="wait">
                            <MotionDiv key={step2Tab + (isPlacingAccessory ? '-placement' : '')} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
                                {isPlacingAccessory ? (
                                    <div>
                                        <h4 className="font-medium text-lg text-neutral-800 mb-2">放置單品</h4>
                                        <div className="p-2 border rounded-lg bg-black/5 inline-block mb-4 relative">
                                            <img src={accessoryForPlacement} alt="Accessory for placement" className="h-24 object-contain" />
                                            {isProcessingAccessory && <div className="absolute inset-0 bg-white/70 flex items-center justify-center rounded-lg"><svg className="animate-spin h-6 w-6 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg></div>}
                                        </div>
                                        <p className="text-sm text-neutral-600 mb-2">在主圖上塗抹您想放置單品的確切位置和大致範圍。</p>
                                        <button onClick={handleMaskedAccessoryIntegration} disabled={isLoading || isProcessingAccessory} className={primaryButtonClasses + " w-full mt-4"}>
                                            {isLoading ? "整合中..." : "AI 智慧整合單品"}
                                        </button>
                                        <button onClick={() => setAccessoryForPlacement(null)} disabled={isLoading || isProcessingAccessory} className={cn(tertiaryButtonClasses, "w-full mt-2 border", isShowcaseMode ? "!text-[#3D405B] !border-[#BDB5AD] hover:!border-[#3D405B]" : "text-white hover:border-white")}>
                                            取消放置
                                        </button>
                                    </div>
                                ) : step2Tab === 'style' ? (
                                    <div>
                                        <div className='flex justify-between items-center mb-2'>
                                            <h4 className="font-medium text-lg text-neutral-800">整體風格</h4>
                                            <button onClick={async () => { const styles = await generateRandomStyles(1); setPrompt(styles[0]); }} className={cn(tertiaryButtonClasses, "border", isShowcaseMode ? "!text-[#3D405B] !border-[#BDB5AD] hover:!border-[#3D405B]" : "text-white hover:border-white")} disabled={isLoading}>AI 來點靈感</button>
                                        </div>
                                        <p className="text-sm text-neutral-600 mb-3">輸入風格描述，然後選擇替換現有穿搭，或是在目前的基礎上添加更多配飾。</p>
                                        <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="例如：換成一套龐克風格的皮衣和靴子" className={cn("w-full h-24 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#E07A5F] transition", isShowcaseMode ? "bg-white text-gray-900" : "")} />
                                        <div className="mt-4 grid grid-cols-2 gap-3">
                                            <button onClick={() => handleStepAction(prompt, "服飾與配件")} disabled={!prompt || isLoading} className={cn(secondaryButtonClasses, "w-full !text-base !py-2.5", isShowcaseMode ? "text-[#3D405B] hover:border-[#3D405B]" : "text-white hover:border-white")}>替換穿搭</button>
                                            <button onClick={handleEnhanceOutfit} disabled={!prompt || isLoading} className={cn(primaryButtonClasses, "w-full !text-base !py-2.5")}>添加配飾</button>
                                        </div>
                                    </div>
                                ) : step2Tab === 'search' ? (
                                    <div>
                                        <h4 className="font-medium text-lg text-neutral-800 mb-2">AI 生成單品</h4>
                                        <p className="text-sm text-neutral-600 mb-3">透過品牌、類型或關鍵字搜尋，AI 將為您生成單品圖片。</p>
                                        <div className="grid grid-cols-2 gap-3 mb-3">
                                            <select value={selectedBrand} onChange={e => setSelectedBrand(e.target.value)} className={cn("w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#E07A5F] transition text-sm", isShowcaseMode ? "bg-white text-gray-900" : "")}>
                                                <option value="">選擇品牌 (可選)</option>
                                                {FASHION_BRANDS.map(brand => <option key={brand} value={brand}>{brand}</option>)}
                                            </select>
                                            <select value={selectedType} onChange={e => setSelectedType(e.target.value)} className={cn("w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#E07A5F] transition text-sm", isShowcaseMode ? "bg-white text-gray-900" : "")}>
                                                <option value="">選擇類型 (可選)</option>
                                                {CLOTHING_ACCESSORIES.map(type => <option key={type} value={type}>{type}</option>)}
                                            </select>
                                        </div>
                                        <input value={customSearchText} onChange={e => setCustomSearchText(e.target.value)} placeholder="輸入其他關鍵字..." className={cn("w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#E07A5F] transition mb-3", isShowcaseMode ? "bg-white text-gray-900" : "")} />

                                        <div className="flex items-center gap-4 mb-3">
                                            <label className="text-neutral-600 text-sm">生成數量:</label>
                                            {[1, 2, 3, 4].map(num => (
                                                <button key={num} onClick={() => setSearchCount(num)} className={cn("w-9 h-9 text-sm rounded-md border transition-colors", searchCount === num ? "bg-[#E07A5F] text-white border-[#E07A5F]" : "bg-white text-neutral-700 hover:border-gray-400")}>{num}</button>
                                            ))}
                                        </div>
                                        <button onClick={handleSearchAccessory} disabled={!searchQuery || isSearching || isLoading} className={primaryButtonClasses + " w-full !text-base !py-2.5"}>
                                            {isSearching ? '生成中...' : '生成單品'}
                                        </button>
                                        {searchResults.length > 0 && (
                                            <div className="mt-4">
                                                <h5 className="font-medium text-neutral-700 mb-2">點擊圖片以選用並去背</h5>
                                                <div className="grid grid-cols-2 gap-3">
                                                    {searchResults.map((res, i) =>
                                                        res === 'loading' ?
                                                        <div key={i} className="bg-black/5 aspect-square rounded-xl flex items-center justify-center text-neutral-400 animate-pulse"><p>生成中...</p></div> :
                                                        <div key={i}>
                                                            <ImageCard
                                                                status="done"
                                                                imageUrl={res}
                                                                onSelect={() => handleAccessorySelectedForPlacement(res)}
                                                                onSave={() => handleSaveToPortfolio({
                                                                    mode: 'imaginative',
                                                                    imageUrl: res,
                                                                    prompt: searchQuery,
                                                                    settings: {
                                                                        subMode: 'conceptClothing',
                                                                        searchQuery: searchQuery,
                                                                    }
                                                                })}
                                                            />
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ) : step2Tab === 'add' ? (
                                    <div>
                                        <h4 className="font-medium text-lg text-neutral-800 mb-2">上傳自訂單品</h4>
                                        <p className="text-sm text-neutral-600 mb-3">上傳單一服飾或配件的圖片，建議使用去背 PNG 檔案。上傳後將會自動為您再次去背優化。</p>
                                        <div className="flex flex-col gap-3 mt-3">
                                            <input type="file" accept="image/png, image/jpeg" onChange={handleCustomAccessoryUpload} className="text-sm w-full file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-[#E07A5F]/20 file:text-[#E07A5F] hover:file:bg-[#E07A5F]/30" />
                                            <button onClick={() => openPortfolioPicker(handleAccessorySelectedForPlacement)} className={cn(tertiaryButtonClasses, "!text-sm w-full border-2", isShowcaseMode ? "!text-[#3D405B] !border-[#BDB5AD] hover:!border-[#3D405B]" : "text-white hover:border-white")}>從作品集選取</button>
                                        </div>
                                    </div>
                                ) : step2Tab === 'edit' ? (
                                    <div>
                                        <p className="text-sm text-neutral-600 mb-2">在下方圖片上塗抹要修改的區域，然後輸入文字描述。</p>
                                        <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="例如：一頂黑色的棒球帽、一條金色的項鍊" className={cn("w-full h-24 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#E07A5F] transition", isShowcaseMode ? "bg-white text-gray-900" : "")} />
                                        <button onClick={handleInpaint} disabled={!prompt || isLoading} className={primaryButtonClasses + " w-full mt-2"}>
                                            {isLoading ? "編輯中..." : "生成修改"}
                                        </button>
                                    </div>
                                ) : null}
                            </MotionDiv>
                        </AnimatePresence>
                    </div>
                );
            case '完成':
                 const isCompositionMode = mode === 'composition';
                return (
                    <div className='text-center'>
                         <h3 className="text-3xl font-bold mb-4">您的造型已完成！</h3>
                         <p className='text-neutral-500 mb-6'>您可以下載最終成品，或將整個設計過程打包下載。</p>
                         <div className="flex flex-col sm:flex-row gap-4 justify-center">
                            <a href={history[history.length-1].imageUrl} download="final_design.jpeg" className={primaryButtonClasses}>下載完成圖</a>
                            {!isCompositionMode && (
                                 <button onClick={handleDownloadProcessAlbum} disabled={isLoading} className={cn(secondaryButtonClasses, isShowcaseMode ? "text-[#3D405B] hover:border-[#3D405B]" : "text-white hover:border-white")}>{loadingMessage.includes('設計') ? '生成相本中...' : '下載設計過程相本'}</button>
                            )}
                            {isCompositionMode && (
                                <button onClick={handleDownloadCompositionAlbum} disabled={isLoading} className={cn(secondaryButtonClasses, isShowcaseMode ? "text-[#3D405B] hover:border-[#3D405B]" : "text-white hover:border-white")}>{loadingMessage.includes('組合') ? '生成相本中...' : '下載組合設計相本'}</button>
                            )}
                            <button onClick={handleDownloadZip} disabled={isLoading} className={cn(secondaryButtonClasses, isShowcaseMode ? "text-[#3D405B] hover:border-[#3D405B]" : "text-white hover:border-white")}>{loadingMessage === '正在打包專案...' ? '打包中...' : '打包所有步驟 (ZIP)'}</button>
                         </div>
                    </div>
                )
            default: return null;
        }
    };
    
    const renderWizard = () => {
        if (mode === 'select' || history.length === 0) return null;

        const wizardMode = mode as Exclude<Mode, 'select' | 'multiAngle' | 'imaginative' | 'infinitePhotoshoot' | 'clothingAssistant' | 'portfolio' | 'outfitAnalysis'>;
        const stepConfig = STEP_CONFIG[wizardMode];
        if (!stepConfig) return null;
        
        const stepIndex = currentStep - 1;
        const isFinalStep = stepIndex === stepConfig.steps.length - 1;
        const latestImage = history[history.length - 1].imageUrl;
        const isConceptStep = mode === 'portrait' && currentStep === 1;
        const showTwoColumnLayout = !isConceptStep && !isFinalStep && !(mode === 'composition' && currentStep === 0);
        
        const stepIsAccessoryStep = stepConfig.steps[stepIndex] === '服飾與配件';
        const isMaskingMode = stepIsAccessoryStep && (step2Tab === 'edit' || accessoryForPlacement !== null);

        const imagePanelClasses = cn(
            "p-4 rounded-xl shadow-md border",
            isShowcaseMode 
                ? "bg-neutral-50 border-gray-200" 
                : "bg-white/60 backdrop-blur-sm border-black/5"
        );
        const controlPanelClasses = cn(
            "p-6 rounded-xl shadow-md border",
             isShowcaseMode 
                ? "bg-neutral-50 border-gray-200 text-gray-800" 
                : "bg-white/60 backdrop-blur-sm border-black/5"
        );
        const titleClasses = cn(
            "text-3xl font-bold text-center mb-2",
            isShowcaseMode ? "text-gray-800" : "text-white"
        );


        return (
            <div className="w-full max-w-7xl mx-auto flex-1 flex flex-col p-4">
                <h2 className={titleClasses}>{stepConfig.title}</h2>
                <Stepper steps={stepConfig.steps} currentStep={stepIndex} onStepClick={handleStepJump} isShowcaseMode={isShowcaseMode} />
                <div className={`grid grid-cols-1 ${showTwoColumnLayout ? 'lg:grid-cols-5' : ''} gap-8 mt-4 items-start`}>
                    <AnimatePresence mode="wait">
                        <MotionDiv 
                            key={latestImage}
                            className={cn(imagePanelClasses, !showTwoColumnLayout ? 'max-w-3xl mx-auto w-full' : 'lg:col-span-3')}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.5 }}
                        >
                            <div className="relative">
                                 {isMaskingMode ? (
                                    <MaskingCanvas baseImage={latestImage} ref={maskCanvasRef} />
                                ) : (
                                    <ImageCard status="done" imageUrl={latestImage} keepAspectRatio={true} onSave={() => handleSaveToPortfolio({
                                        mode: mode as 'portrait' | 'composition',
                                        imageUrl: latestImage,
                                        prompt: history[history.length-1].prompt || '已存檔的步驟',
                                        settings: { history }
                                    })} />
                                 )}

                                {isLoading && !loadingMessage.startsWith('正在') && <div className="absolute inset-0 bg-white/70 flex flex-col items-center justify-center rounded-lg z-50">
                                    <svg className="animate-spin h-8 w-8 text-gray-500 mb-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                    <p className="text-gray-600">{loadingMessage}</p>
                                </div>}
                            </div>
                        </MotionDiv>
                    </AnimatePresence>
                    
                    <MotionDiv
                        key={`step-content-${currentStep}-${step2Tab}`}
                        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                        className={cn(controlPanelClasses, showTwoColumnLayout ? 'lg:col-span-2' : '')}
                    >
                        {renderStepContent()}
                    </MotionDiv>
                </div>
                <div className="mt-8 flex justify-between items-center w-full">
                    <button onClick={handleStartOver} className={cn(tertiaryButtonClasses, "border", isShowcaseMode ? "!text-gray-600 !border-gray-400 hover:!bg-black/5" : "text-white/80 border-white/30 hover:bg-white/10")}>全部重來</button>
                     {history.length > 0 && !isFinalStep && (
                        <div className="flex gap-4">
                            <button onClick={handleBackStep} disabled={isLoading || (mode !== 'composition' && currentStep <= 1)} className={cn(tertiaryButtonClasses, "border", isShowcaseMode ? "!text-gray-600 !border-gray-400 hover:!bg-black/5" : "text-white/80 border-white/30 hover:bg-white/10")}>上一步</button>
                            <button onClick={handleSkipStep} disabled={isLoading} className={cn(secondaryButtonClasses, isShowcaseMode ? "text-[#3D405B] hover:border-[#3D405B]" : "text-white hover:border-white")}>跳過這步</button>
                        </div>
                    )}
                </div>
            </div>
        );
    }
    
    const saveHandler = (item: Omit<PortfolioItem, 'id' | 'timestamp'>) => {
        handleSaveToPortfolio(item);
    };
    
    const renderModule = () => {
        const key = `${mode}-${initialImageForModule}`; // Force remount on mode change
        switch(mode) {
            case 'select':
                return isShowcaseMode 
                    ? <ShowcaseHomepage key={showcaseKey} onSendTo={handleSendToModule} onDeleteItem={handleDeleteFromShowcase} /> 
                    : <ModuleSelection onSelect={(selectedMode) => setMode(selectedMode)} />;
            case 'multiAngle':
                return <MultiAngleModule onBack={handleStartOver} onSave={saveHandler} initialImage={initialImageForModule} onOpenPortfolioPicker={(cb) => openPortfolioPicker(cb)} isShowcaseMode={isShowcaseMode} />;
            case 'imaginative':
                return <ImaginativeModule onBack={handleStartOver} onSave={saveHandler} isShowcaseMode={isShowcaseMode} onOpenPortfolioPicker={(cb) => openPortfolioPicker(cb)} />;
            case 'infinitePhotoshoot':
                return <InfinitePhotoshootModule onBack={handleStartOver} onSave={saveHandler} initialImage={initialImageForModule} onOpenPortfolioPicker={(cb) => openPortfolioPicker(cb)} isShowcaseMode={isShowcaseMode} />;
            case 'clothingAssistant':
                return <ClothingAssistantModule onBack={handleStartOver} onSave={saveHandler} initialImage={initialImageForModule} onOpenPortfolioPicker={(cb) => openPortfolioPicker(cb)} isShowcaseMode={isShowcaseMode} />;
            case 'outfitAnalysis':
                return <OutfitAnalysisModule onBack={handleStartOver} onSave={saveHandler} isShowcaseMode={isShowcaseMode} />;
            case 'portfolio':
                return <PortfolioModule onBack={handleStartOver} onSendTo={handleSendToModule} isShowcaseMode={isShowcaseMode} onShowcaseModeChange={setIsShowcaseMode} />;
            default:
                if (history.length > 0) {
                    return <MotionDiv key="wizard" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full flex-1 flex flex-col">{renderWizard()}</MotionDiv>;
                }
                if (mode === 'composition') {
                    return <div className="w-full flex justify-center py-8 px-4">
                        <OutfitCompositionSetup
                            personImage={personImage}
                            setPersonImage={setPersonImage}
                            itemImages={itemImages}
                            setItemImages={setItemImages}
                            prompt={prompt}
                            setPrompt={setPrompt}
                            isLoading={isLoading}
                            setIsLoading={setIsLoading}
                            setLoadingMessage={setLoadingMessage}
                            handleStartOver={handleStartOver}
                            onProceed={handleCompositionStep1Complete}
                            onOpenPortfolioPicker={openPortfolioPicker}
                            isShowcaseMode={isShowcaseMode}
                        />
                    </div>;
                }
                if (mode === 'portrait') {
                     return <div className="flex justify-center items-center w-full py-10 min-h-[60vh]">
                        <StepUpload onUpload={handleUpload} onBack={handleStartOver} title="從人像照片開始" description="請上傳您的人像或全身照片。" onSelectFromPortfolio={() => openPortfolioPicker(handleUpload)} isShowcaseMode={isShowcaseMode} />
                    </div>;
                }
                return null;
        }
    }

    const isShowcaseActive = isShowcaseMode && mode === 'select';

    const renderAppContent = () => {
        if (mode === 'select' && !isShowcaseMode) {
             return (
                <div className="z-10 flex flex-col items-center justify-center w-full max-w-7xl mx-auto flex-1 p-4 sm:p-8">
                    <div className="text-center mb-12">
                        <h1 className="text-6xl md:text-7xl font-bold text-white" style={{textShadow: '0 2px 10px rgba(0,0,0,0.5)'}}>香蕉時尚玩具箱 ✨</h1>
                        <p className="text-neutral-300 mt-4 text-xl md:text-2xl">選擇您的起點，讓 AI 為您打造夢想造型 - <a href="https://linktr.ee/dseditor" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 underline ml-1">Made by Dseditor</a></p>
                    </div>
                    <AnimatePresence mode="wait">
                       <ModuleSelection onSelect={(selectedMode) => setMode(selectedMode)} />
                    </AnimatePresence>
                </div>
            );
        }

        return (
             <Layout
                activeMode={mode}
                onSelectMode={handleModeChange}
                onGoHome={handleStartOver}
                onOpenSettings={() => setIsSettingsOpen(true)}
                isShowcaseMode={isShowcaseMode}
            >
                <div className="w-full">
                    <AnimatePresence mode="wait">
                        <MotionDiv key={mode} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="w-full">
                            {renderModule()}
                        </MotionDiv>
                    </AnimatePresence>
                </div>
            </Layout>
        );
    }

    const handleClearAll = () => {
        // This logic can be expanded
        clearAllPortfolioItems().then(() => {
            window.dispatchEvent(new CustomEvent('portfolio-updated'));
            setIsSettingsOpen(false);
            showNotification('所有作品已清除');
        });
    };
    
    const handleRestore = (backupData: any) => {
        addMultiplePortfolioItems(backupData.data).then(() => {
            window.dispatchEvent(new CustomEvent('portfolio-updated'));
            setIsSettingsOpen(false);
            showNotification('作品集已還原');
        });
    };

    return (
        <main className={cn(
            "min-h-screen w-full relative overflow-hidden",
            !isShowcaseMode 
                ? "text-white" 
                : "bg-white text-black"
        )}>
            {!isShowcaseActive && <div className="absolute top-0 left-0 w-full h-full bg-grid-custom z-0"></div>}
            
            <AnimatePresence>
                {notification && (
                    <MotionDiv
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="fixed top-8 left-1/2 -translate-x-1/2 bg-green-500 text-white py-2 px-6 rounded-full shadow-lg z-[101]"
                    >
                        {notification}
                    </MotionDiv>
                )}
            </AnimatePresence>
            
            <SettingsModal
                isOpen={isSettingsOpen}
                onClose={() => setIsSettingsOpen(false)}
                onClearAll={handleClearAll}
                onRestoreRequest={handleRestore}
            />

            <PortfolioPicker 
                isOpen={isPortfolioPickerOpen}
                onClose={() => setIsPortfolioPickerOpen(false)}
                onSelect={handlePortfolioPick}
            />

            {isLoading && loadingMessage.startsWith('正在') && <div className="fixed inset-0 bg-black/30 z-[100] flex items-center justify-center"><div className="bg-white p-6 rounded-lg shadow-xl flex items-center gap-4 text-slate-800"><svg className="animate-spin h-6 w-6 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg><p>{loadingMessage}</p></div></div>}
            
            {renderAppContent()}

        </main>
    );
}

export default App;
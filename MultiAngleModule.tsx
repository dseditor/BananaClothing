/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React from 'react';
import { useState, ChangeEvent, ReactElement, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { generatePoseAngleEmotionView, generateRandomPrompts } from './services/geminiService';
import ImageCard from './components/PolaroidCard';
import { cn, getTimestamp } from './lib/utils';
import { createZipAndDownload } from './lib/zipUtils';
import { PortfolioItem } from './services/dbService';

// FIX: Cast motion.div to any to bypass TypeScript errors related to framer-motion props.
const MotionDiv = motion.div as any;

const primaryButtonClasses = "text-lg text-center text-white bg-[#E07A5F] py-3 px-8 rounded-lg transition-colors duration-200 hover:bg-[#D46A4D] shadow-sm disabled:opacity-50 disabled:cursor-not-allowed";
const secondaryButtonClasses = "text-lg text-center text-[#3D405B] bg-transparent border-2 border-[#BDB5AD] py-3 px-8 rounded-lg transition-colors duration-200 hover:bg-black/5 hover:border-[#3D405B] disabled:opacity-50";
const tertiaryButtonClasses = "text-sm text-center text-white/80 bg-transparent border border-white/30 py-2 px-4 rounded-md transition-colors duration-200 hover:bg-white/10 disabled:opacity-50";

// --- START: Icon Components ---
const UserIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>;
const FootprintsIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 16v-2.38c0-.9.6-1.72 1.48-2.02l7.04-2.1c.9-.28 1.48-.9 1.48-1.8V4.5c0-1.42-1.58-2.22-2.75-1.42L4 8.5"/><path d="M20 20v-2.38c0-.9-.6-1.72-1.48-2.02l-7.04-2.1c-.9-.28-1.48-.9-1.48-1.8V8.5c0-1.42 1.58-2.22 2.75-1.42L20 12.5"/></svg>;
const MaximizeIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"></path></svg>;
const HandIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 11V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v0"/><path d="M14 10V4a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v2"/><path d="M10 10.5V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v8"/><path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-4a8 8 0 0 1-8-8 2 2 0 1 1 4 0"/></svg>;
const ZapIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>;
const WindIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.7 7.7a2.5 2.5 0 1 1 1.8 4.3H2"/><path d="M9.6 4.6A2 2 0 1 1 11 8H2"/><path d="M12.6 19.4A2 2 0 1 0 14 16H2"/></svg>;
const SmileIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>;
const FrownIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M16 16s-1.5-2-4-2-4 2-4 2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>;
const AngryIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M16 16s-1.5-2-4-2-4 2-4 2"/><path d="m9 10 2-1 2 1"/><path d="m15 10-2-1-2 1"/></svg>;
const PlusIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>;
const TrashIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>;
const UploadIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>;
const ImageIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>;
// --- END: Icon Components ---

const POSE_PRESETS = [
    { name: '走路', icon: <FootprintsIcon /> }, { name: '放鬆站姿', icon: <UserIcon /> }, { name: '跳舞', icon: <ZapIcon /> },
    { name: '跳躍', icon: <WindIcon /> }, { name: '思考', icon: <HandIcon /> }, { name: '雙手抱胸', icon: <UserIcon /> }
];
const ANGLE_PRESETS = [
    { name: '正面', icon: <UserIcon /> }, { name: '背面', icon: <UserIcon /> }, { name: '左側面', icon: <UserIcon /> },
    { name: '右側面', icon: <UserIcon /> }, { name: '低角度', icon: <MaximizeIcon /> }, { name: '高角度', icon: <MaximizeIcon /> }
];
const EMOTION_PRESETS = [
    { name: '開心', icon: <SmileIcon /> }, { name: '悲傷', icon: <FrownIcon /> }, { name: '憤怒', icon: <AngryIcon /> },
    { name: '驚訝', icon: <SmileIcon /> }, { name: '自信', icon: <SmileIcon /> }, { name: '沉思', icon: <FrownIcon /> }
];

const MODE_CONFIG = {
    pose: { presets: POSE_PRESETS, title: '生成多種姿勢' },
    angle: { presets: ANGLE_PRESETS, title: '變換拍攝角度' },
    emotion: { presets: EMOTION_PRESETS, title: '改變人物情緒' },
};

interface Result { id: string; imageUrl: string; prompt: string; status: 'pending' | 'done' | 'error'; error?: string; }
type SubMode = 'pose' | 'angle' | 'emotion';
type GenerationItem = { id: string; type: 'text' | 'image'; value: string; };

const MultiAngleModule = ({ onBack, onSave, initialImage, onOpenPortfolioPicker, isShowcaseMode }: { onBack: () => void; onSave: (item: Omit<PortfolioItem, 'id' | 'timestamp'>) => void; initialImage: string | null; onOpenPortfolioPicker: (callback: (imageUrl: string) => void) => void; isShowcaseMode: boolean; }) => {
    const [uploadedImage, setUploadedImage] = useState<string | null>(initialImage || null);
    const [subMode, setSubMode] = useState<SubMode>('pose');
    const [itemList, setItemList] = useState<GenerationItem[]>([]);
    const [generationCount, setGenerationCount] = useState<number>(4);
    const [isSingleItemMode, setIsSingleItemMode] = useState(false);
    const [results, setResults] = useState<Result[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState('');
    const [selectedForDownload, setSelectedForDownload] = useState<string[]>([]);
    const [isZipping, setIsZipping] = useState(false);

    const handleSubModeChange = (mode: SubMode) => {
        setSubMode(mode);
        setItemList([]);
        setGenerationCount(4);
        setIsSingleItemMode(false);
        setResults([]);
        setSelectedForDownload([]);
    };

    const handleImageUpload = (e: ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setUploadedImage(reader.result as string);
                handleSubModeChange('pose');
            };
            reader.readAsDataURL(e.target.files[0]);
        }
    };

    const handleSingleItemToggle = (checked: boolean) => {
        setIsSingleItemMode(checked);
        if (checked && itemList.length > 1) {
            const firstValidItem = itemList.find(item => item.value.trim() !== '');
            setItemList(firstValidItem ? [firstValidItem] : []);
        }
    };

    const handleAddTextItem = (value = '') => {
        const newItem: GenerationItem = { id: getTimestamp() + Math.random(), type: 'text', value };
        if (isSingleItemMode) {
            setItemList([newItem]);
        } else {
            setItemList(prev => [...prev, newItem]);
        }
    };

    const handleAddReferenceItem = () => {
        const newItem: GenerationItem = { id: getTimestamp() + Math.random(), type: 'image', value: '' };
        if (isSingleItemMode) {
            setItemList([newItem]);
        } else {
            setItemList(prev => [...prev, newItem]);
        }
    };

    const handleUpdateItemValue = (id: string, value: string) => {
        setItemList(prev => prev.map(item => item.id === id ? { ...item, value } : item));
    };

    const handleRemoveItem = (id: string) => {
        setItemList(prev => prev.filter(item => item.id !== id));
    };

    const handleGenerate = async () => {
        if (!uploadedImage) return;
        setIsLoading(true);
        setLoadingMessage('正在準備...');
        setSelectedForDownload([]);
        setResults([]);

        try {
            let finalItems: GenerationItem[] = [];
            const cleanItemList = itemList.filter(item => item.value.trim() !== '');

            if (isSingleItemMode) {
                if (cleanItemList.length === 0) throw new Error("請在清單中提供一個項目。");
                finalItems = Array(generationCount).fill(cleanItemList[0]);
            } else {
                 if (cleanItemList.length === 0) {
                    setLoadingMessage(`正在生成 ${generationCount} 個隨機靈感...`);
                    const randoms = await generateRandomPrompts(subMode, generationCount);
                    finalItems = randoms.map(r => ({ id: getTimestamp() + Math.random(), type: 'text', value: r }));
                } else if (cleanItemList.length < generationCount) {
                    setLoadingMessage(`正在補全 ${generationCount - cleanItemList.length} 個隨機靈感...`);
                    const additionalPrompts = await generateRandomPrompts(subMode, generationCount - cleanItemList.length);
                    const additionalItems: GenerationItem[] = additionalPrompts.map(p => ({ id: getTimestamp() + Math.random(), type: 'text', value: p }));
                    finalItems = [...cleanItemList, ...additionalItems];
                } else { // >= generationCount
                    finalItems = [...cleanItemList].sort(() => 0.5 - Math.random()).slice(0, generationCount);
                }
            }
            
            setLoadingMessage('正在生成圖片...');
            const initialResults: Result[] = finalItems.map((p, i) => ({ 
                id: `${p.id}-${i}`, 
                imageUrl: '', 
                prompt: p.type === 'text' ? p.value : `參考圖 ${i + 1}`, 
                status: 'pending' 
            }));
            setResults(initialResults);

            const settled = await Promise.all(finalItems.map(async (item, i) => {
                try {
                    const promptText = item.type === 'text' ? item.value : '採用參考圖的姿勢與情緒';
                    const refImage = (subMode === 'pose' || subMode === 'emotion') && item.type === 'image' ? item.value : undefined;
                    const imageUrl = await generatePoseAngleEmotionView(uploadedImage, subMode, promptText, refImage);
                    return { status: 'fulfilled' as const, value: imageUrl, index: i };
                } catch (error) {
                    return { status: 'rejected' as const, reason: error, index: i };
                }
            }));
            
            setResults(initialResults.map((res, i) => {
                const s = settled.find(sr => sr.index === i);
                if (s?.status === 'fulfilled') return { ...res, status: 'done', imageUrl: s.value };
                return { ...res, status: 'error', error: s?.reason instanceof Error ? s.reason.message : '未知錯誤' };
            }));

        } catch (error) {
            alert(`生成失敗: ${error instanceof Error ? error.message : '未知錯誤'}`);
            setResults([]);
        } finally {
            setIsLoading(false);
            setLoadingMessage('');
        }
    };
    
    const toggleDownloadSelection = (id: string) => {
        setSelectedForDownload(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
    };

    const allSelected = useMemo(() => {
        const doneIds = results.filter(r => r.status === 'done').map(r => r.id);
        return doneIds.length > 0 && doneIds.every(id => selectedForDownload.includes(id));
    }, [results, selectedForDownload]);

    const handleSelectAll = () => {
        if (allSelected) {
            setSelectedForDownload([]);
        } else {
            const doneIds = results.filter(r => r.status === 'done').map(r => r.id);
            setSelectedForDownload(doneIds);
        }
    };
    
    const handleSaveAllToPortfolio = async () => {
        const itemsToSave = results.filter(r => r.status === 'done');
        if (itemsToSave.length === 0) return;

        setIsLoading(true);
        setLoadingMessage(`正在儲存 ${itemsToSave.length} 張圖片至作品集...`);

        try {
            for (const item of itemsToSave) {
                 const portfolioItem: Omit<PortfolioItem, 'id' | 'timestamp'> = {
                    mode: 'multiAngle',
                    imageUrl: item.imageUrl,
                    prompt: item.prompt,
                    settings: { uploadedImage, subMode }
                };
                await onSave(portfolioItem);
            }
            alert(`${itemsToSave.length} 張圖片已成功儲存至作品集！`);
        } catch (error) {
            alert(`儲存至作品集失敗: ${error instanceof Error ? error.message : '未知錯誤'}`);
        } finally {
            setIsLoading(false);
            setLoadingMessage('');
        }
    };
    
    const handleDownloadZip = async () => {
        if (selectedForDownload.length === 0) return;
        setIsZipping(true);
        const imagesToZip = results
            .filter(r => selectedForDownload.includes(r.id) && r.status === 'done')
            .map(r => ({ url: r.imageUrl, name: `${subMode}_${r.prompt.replace(/\s+/g, '_')}` }));
        const zipName = `姿勢與場景_${getTimestamp()}.zip`;
        await createZipAndDownload(imagesToZip, zipName);
        setIsZipping(false);
    };

    const titleClasses = cn("text-3xl font-bold text-center mb-6", isShowcaseMode ? "text-gray-800" : "text-white/90");
    const descriptionClasses = cn("mt-4", isShowcaseMode ? "text-neutral-600" : "text-neutral-400");
    const backButtonClasses = cn(tertiaryButtonClasses, isShowcaseMode && "!text-gray-600 !border-gray-400 hover:!bg-black/5");

    if (!uploadedImage) {
        return <MotionDiv initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full max-w-lg text-center mx-auto">
            <h2 className={titleClasses}>姿勢與場景實驗室</h2>
            <label htmlFor="multi-angle-upload" className="cursor-pointer group block"><ImageCard status="done" /></label>
            <input id="multi-angle-upload" type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
            <p className={descriptionClasses}>請上傳您的人像或全身照片。</p>
            <div className="mt-4 flex justify-center gap-4">
                <button onClick={() => onOpenPortfolioPicker((img) => { setUploadedImage(img); handleSubModeChange('pose'); })} className={cn(secondaryButtonClasses, "!text-base", isShowcaseMode ? "text-[#3D405B] hover:border-[#3D405B]" : "text-white hover:border-white")}>從作品集選取</button>
            </div>
            <div className="mt-8 flex justify-center w-full"><button onClick={onBack} className={backButtonClasses}>返回主選單</button></div>
        </MotionDiv>;
    }

    const TabButton = ({ mode, children }: { mode: SubMode; children: React.ReactNode }) => (
        <button onClick={() => handleSubModeChange(mode)} className={cn("px-4 py-2 rounded-t-lg font-medium text-sm sm:text-base", subMode === mode ? 'bg-white/80 text-[#E07A5F]' : 'bg-transparent text-neutral-500 hover:bg-white/50')}>
            {children}
        </button>
    );

    const successfulResultsCount = results.filter(r => r.status === 'done').length;

    const mainPanelClasses = cn(
        "p-6 rounded-xl shadow-md border",
        isShowcaseMode 
            ? "bg-neutral-50 border-gray-200" 
            : "bg-white/60 backdrop-blur-sm border-black/5"
    );

    return (
        <MotionDiv initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full max-w-7xl mx-auto">
             <h2 className={cn("text-4xl font-bold text-center mb-4", isShowcaseMode ? "text-gray-800" : "text-white/90")}>姿勢與場景實驗室</h2>
             <p className={cn("text-lg mb-8 text-center", isShowcaseMode ? "text-neutral-600" : "text-neutral-300")}>選擇變化類型，為您的照片創造新生命。</p>
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-start">
                <div className={cn(mainPanelClasses, "lg:col-span-2 flex flex-col gap-6")}>
                    <div>
                        <h3 className="text-xl font-bold mb-2 text-[#3D405B]">您的參考照片</h3>
                        <ImageCard status="done" imageUrl={uploadedImage} keepAspectRatio={true} />
                    </div>
                    <div className="border-b border-gray-300 flex gap-1 sm:gap-2 flex-wrap">
                       <TabButton mode="pose">姿勢</TabButton>
                       <TabButton mode="angle">角度</TabButton>
                       <TabButton mode="emotion">情緒</TabButton>
                    </div>
                    <AnimatePresence mode="wait">
                        <MotionDiv key={subMode} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
                            <h3 className="text-2xl font-bold text-[#3D405B]">{MODE_CONFIG[subMode].title}</h3>
                            <div>
                                <h4 className="text-lg font-bold mb-3 text-neutral-700">預設項目</h4>
                                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                                    {MODE_CONFIG[subMode].presets.map(p => <button key={p.name} onClick={() => handleAddTextItem(p.name)} disabled={isLoading || (isSingleItemMode && itemList.length > 0)} className="flex flex-col items-center justify-center gap-2 p-3 bg-black/5 rounded-lg hover:bg-black/10 transition-colors disabled:opacity-50"><span className="text-neutral-700">{p.icon}</span><span className="text-xs font-medium text-neutral-800 text-center">{p.name}</span></button>)}
                                </div>
                            </div>
                            <div>
                                <h4 className="text-lg font-bold mb-3 text-neutral-700">項目清單</h4>
                                <p className="text-sm text-neutral-500 mb-2">點擊預設或手動新增。如果清單項目少於生成數量，AI 將自動補全。</p>
                                <div className="space-y-3">
                                    {itemList.map((item) => (
                                        <div key={item.id} className="flex items-center gap-2">
                                            {item.type === 'text' ? (
                                                <input
                                                    type="text" value={item.value} onChange={e => handleUpdateItemValue(item.id, e.target.value)}
                                                    placeholder="輸入..."
                                                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#E07A5F] transition"
                                                />
                                            ) : (
                                                <div className="w-full p-2 border border-dashed rounded-lg bg-black/5">
                                                    {item.value ? (
                                                         <div className="relative group w-24 mx-auto">
                                                            <img src={item.value} className="w-full rounded-md shadow-sm" alt="姿勢參考"/>
                                                        </div>
                                                    ) : (
                                                        <div className="flex justify-center gap-2">
                                                             <label htmlFor={`upload-${item.id}`} className="flex-1 text-xs text-center p-2 bg-black/5 rounded-lg hover:bg-black/10 transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer">
                                                                <UploadIcon /><span>上傳</span>
                                                                <input id={`upload-${item.id}`} type="file" accept="image/*" className="hidden" onChange={e => { if (e.target.files?.[0]) { const r = new FileReader(); r.onloadend = () => handleUpdateItemValue(item.id, r.result as string); r.readAsDataURL(e.target.files[0]); e.target.value = ''; }}}/>
                                                            </label>
                                                            <button onClick={() => onOpenPortfolioPicker((url) => handleUpdateItemValue(item.id, url))} className="flex-1 text-xs text-center p-2 bg-black/5 rounded-lg hover:bg-black/10 transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50">
                                                                <ImageIcon /><span>作品集</span>
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                            <button onClick={() => handleRemoveItem(item.id)} className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors flex-shrink-0">
                                                <TrashIcon />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                                 <div className="mt-2 grid grid-cols-2 gap-2">
                                    <button onClick={() => handleAddTextItem()} disabled={isLoading || (isSingleItemMode && itemList.length > 0)} className="text-sm flex items-center gap-2 text-center text-[#3D405B] bg-transparent border-2 border-dashed border-[#BDB5AD] py-2 px-4 rounded-lg transition-colors duration-200 hover:bg-black/5 hover:border-[#3D405B] w-full justify-center disabled:opacity-50">
                                        <PlusIcon /><span>增加項目</span>
                                    </button>
                                    <button onClick={handleAddReferenceItem} disabled={isLoading || subMode === 'angle' || (isSingleItemMode && itemList.length > 0)} className="text-sm flex items-center gap-2 text-center text-[#3D405B] bg-transparent border-2 border-dashed border-[#BDB5AD] py-2 px-4 rounded-lg transition-colors duration-200 hover:bg-black/5 hover:border-[#3D405B] w-full justify-center disabled:opacity-50">
                                        <ImageIcon /><span>增加參考圖</span>
                                    </button>
                                </div>
                            </div>
                            <div>
                                <div className="flex items-center justify-center gap-2 mb-4 text-sm text-neutral-600">
                                    <input type="checkbox" id="single-item-mode" checked={isSingleItemMode} onChange={e => handleSingleItemToggle(e.target.checked)} disabled={isLoading} className="h-4 w-4 rounded border-gray-300 text-[#E07A5F] focus:ring-[#E07A5F]" />
                                    <label htmlFor="single-item-mode" className="select-none cursor-pointer">單一項目，多種變化</label>
                                </div>
                                <div className="flex justify-center items-center gap-2 my-4">
                                    <label className="text-neutral-600">生成數量:</label>
                                    {[1, 2, 3, 4, 5, 6].map(num => <button key={num} onClick={() => setGenerationCount(num)} disabled={isLoading} className={cn("w-10 h-10 rounded-md border transition-colors", generationCount === num ? "bg-[#E07A5F] text-white border-[#E07A5F]" : "bg-white text-neutral-700 hover:border-gray-400", "disabled:opacity-50")}>{num}</button>)}
                                </div>
                            </div>
                        </MotionDiv>
                    </AnimatePresence>
                    <button onClick={handleGenerate} disabled={isLoading} className={primaryButtonClasses + " w-full"}>{isLoading ? (loadingMessage || '生成中...') : `生成 ${generationCount} 張圖片`}</button>
                </div>
                <div className={cn(mainPanelClasses, "lg:col-span-3")}>
                    <h3 className="text-2xl font-bold mb-4 text-[#3D405B]">生成結果</h3>
                    {results.length === 0 ? <div className="text-center py-16 text-neutral-500"><p>完成設定後，點擊「生成」按鈕開始。</p></div> : <>
                         <div className="flex items-center gap-4 mb-4">
                                <div className="flex items-center gap-2">
                                    <input type="checkbox" id="select-all" checked={allSelected} onChange={handleSelectAll} disabled={successfulResultsCount === 0} className="h-5 w-5 rounded border-gray-400 text-[#E07A5F] focus:ring-[#E07A5F]" />
                                    <label htmlFor="select-all" className="text-neutral-700 font-medium cursor-pointer">全選</label>
                                </div>
                                <button onClick={handleSaveAllToPortfolio} disabled={isLoading || successfulResultsCount === 0} title="全部加入作品集" className="flex items-center gap-2 text-sm text-center text-[#3D405B] bg-transparent border-2 border-[#BDB5AD] py-2 px-4 rounded-lg transition-colors duration-200 hover:bg-black/5 hover:border-[#3D405B] disabled:opacity-50">
                                     <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/></svg>
                                    <span>全部加入作品集</span>
                                </button>
                            </div>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            {results.map(r => <ImageCard key={r.id} status={r.status} imageUrl={r.imageUrl} styleName={r.prompt} error={r.error} onCheckboxChange={() => r.status === 'done' && toggleDownloadSelection(r.id)} isSelected={selectedForDownload.includes(r.id)} showCheckbox={true} onSave={r.status === 'done' ? () => onSave({ mode: 'multiAngle', imageUrl: r.imageUrl, prompt: r.prompt, settings: { uploadedImage, subMode }}) : undefined} />)}
                        </div>
                        {successfulResultsCount > 0 && <div className="mt-6 text-center border-t pt-6">
                            <p className="mb-4 text-neutral-600">勾選滿意的圖片，打包下載。</p>
                            <button onClick={handleDownloadZip} disabled={isLoading || isZipping || selectedForDownload.length === 0} className={secondaryButtonClasses}>{isZipping ? '打包中...' : `下載選中 ${selectedForDownload.length} 張 (ZIP)`}</button>
                        </div>}
                    </>}
                </div>
            </div>
            <div className="mt-8 flex justify-between items-center w-full">
                <button onClick={onBack} className={backButtonClasses}>返回主選單</button>
                <button onClick={() => setUploadedImage(null)} className={backButtonClasses}>更換照片</button>
            </div>
        </MotionDiv>
    );
};

export default MultiAngleModule;
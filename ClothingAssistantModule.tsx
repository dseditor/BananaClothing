/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState, ChangeEvent, ReactElement, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { generateModelWearingGarment, generatePersonWearingGarment, generateRandomPrompts } from './services/geminiService';
import ImageCard from './components/PolaroidCard';
import { cn, getTimestamp } from './lib/utils';
import { createZipAndDownload } from './lib/zipUtils';
import { PortfolioItem } from './services/dbService';

const MotionDiv = motion.div as any;

const primaryButtonClasses = "text-lg text-center text-white bg-[#E07A5F] py-3 px-8 rounded-lg transition-colors duration-200 hover:bg-[#D46A4D] shadow-sm disabled:opacity-50 disabled:cursor-not-allowed";
const secondaryButtonClasses = "text-lg text-center text-[#3D405B] bg-transparent border-2 border-[#BDB5AD] py-3 px-8 rounded-lg transition-colors duration-200 hover:bg-black/5 hover:border-[#3D405B] disabled:opacity-50";
const tertiaryButtonClasses = "text-sm text-center bg-transparent border py-2 px-4 rounded-md transition-colors duration-200 disabled:opacity-50";

const UserIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>;
const PlusIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>;
const TrashIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>;

const FEMALE_MODEL_TYPES: { id: string; label: string; prompt: string; icon: ReactElement }[] = [
    { id: 'f_asian_slender', label: '亞洲-纖瘦', prompt: 'a tall (175cm), slender, 20-25 year old East Asian female model with a slim, runway-style build, standing gracefully', icon: <UserIcon /> },
    { id: 'f_asian_petite', label: '亞洲-嬌小', prompt: 'a petite (158cm), 20-25 year old East Asian female model with a delicate frame and youthful appearance', icon: <UserIcon /> },
    { id: 'f_asian_curvy', label: '亞洲-圓潤', prompt: 'a 25-30 year old East Asian female model (165cm) with a softer, more rounded and curvy body shape', icon: <UserIcon /> },
    { id: 'f_asian_standard', label: '亞洲-標準', prompt: 'a 25-30 year old East Asian female model (165cm) with a standard, average build and a friendly appearance', icon: <UserIcon /> },
    { id: 'f_caucasian_slender', label: '白人-纖瘦', prompt: 'a very tall (180cm), slender, 20-25 year old Caucasian female model with high-fashion features and long limbs', icon: <UserIcon /> },
    { id: 'f_caucasian_athletic', label: '白人-健美', prompt: 'an athletic (172cm), 25-30 year old Caucasian female model with defined muscle tone, especially in the legs and arms', icon: <UserIcon /> },
    { id: 'f_caucasian_curvy', label: '白人-曲線', prompt: 'a curvy (168cm), 25-30 year old Caucasian female model with a distinct hourglass figure, wider hips, and a fuller bust', icon: <UserIcon /> },
    { id: 'f_caucasian_standard', label: '白人-標準', prompt: 'a 25-30 year old Caucasian female model (170cm) with a standard, average build and a commercial look', icon: <UserIcon /> },
];

const MALE_MODEL_TYPES: { id: string; label: string; prompt: string; icon: ReactElement }[] = [
    { id: 'm_asian_slender', label: '亞洲-斯文', prompt: 'a slender (180cm), 20-25 year old East Asian male model with a slim build and refined features, often seen in K-pop', icon: <UserIcon /> },
    { id: 'm_asian_standard', label: '亞洲-標準', prompt: 'a 25-30 year old East Asian male model (178cm) with a standard, average build and a friendly appearance', icon: <UserIcon /> },
    { id: 'm_asian_athletic', label: '亞洲-陽光', prompt: 'an athletic (182cm), 25-30 year old East Asian male model with a lean, toned physique and a sporty vibe', icon: <UserIcon /> },
    { id: 'm_asian_muscular', label: '亞洲-健碩', prompt: 'a muscular (180cm), 25-30 year old East Asian male model with a well-defined, strong physique, like a fitness model', icon: <UserIcon /> },
    { id: 'm_caucasian_slender', label: '白人-纖瘦', prompt: 'a tall (188cm), very slim, 20-25 year old Caucasian male model with a high-fashion, androgynous look', icon: <UserIcon /> },
    { id: 'm_caucasian_athletic', label: '白人-健美', prompt: 'an athletic (185cm), 25-30 year old Caucasian male model with a well-defined, lean physique and rugged features', icon: <UserIcon /> },
    { id: 'm_caucasian_muscular', label: '白人-肌肉', prompt: 'a muscular (185cm), 25-30 year old Caucasian male model with a heavily built, bodybuilder-like physique', icon: <UserIcon /> },
    { id: 'm_caucasian_standard', label: '白人-標準', prompt: 'a 25-30 year old Caucasian male model (185cm) with a standard, healthy build, like a catalog model', icon: <UserIcon /> },
];


interface Result {
    id: string;
    imageUrl: string;
    prompt: string;
    status: 'pending' | 'done' | 'error';
    error?: string;
}

type SubMode = 'oneGarment' | 'oneModel';

const ItemListManager = ({ items, setItems, isSingleItemMode, isShowcaseMode }: { items: string[], setItems: React.Dispatch<React.SetStateAction<string[]>>, isSingleItemMode: boolean, isShowcaseMode: boolean }) => {
    const handleItemChange = (index: number, value: string) => {
        const newItems = [...items];
        newItems[index] = value;
        setItems(newItems);
    };
    const handleAddItem = () => setItems(prev => [...prev, '']);
    const handleRemoveItem = (index: number) => setItems(prev => prev.filter((_, i) => i !== index));

    return (
        <div className="space-y-2">
            {items.map((item, index) => (
                <div key={index} className="flex items-center gap-2">
                    <input
                        type="text" value={item} onChange={e => handleItemChange(index, e.target.value)}
                        placeholder="請輸入身高、體重、人種與性別..."
                        className={cn(
                            "w-full p-2 border rounded-lg focus:ring-2 focus:ring-[#E07A5F] transition",
                            isShowcaseMode ? "bg-white border-gray-300 text-gray-900" : "border-gray-300"
                        )}
                    />
                    <button onClick={() => handleRemoveItem(index)} className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors flex-shrink-0">
                        <TrashIcon />
                    </button>
                </div>
            ))}
            {(!isSingleItemMode || items.length === 0) && (
                <button onClick={handleAddItem} disabled={isSingleItemMode && items.length > 0} className="mt-2 text-sm flex items-center gap-2 text-center text-[#3D405B] bg-transparent border-2 border-dashed border-[#BDB5AD] py-2 px-4 rounded-lg transition-colors duration-200 hover:bg-black/5 hover:border-[#3D405B] w-full justify-center disabled:opacity-50">
                    <PlusIcon /><span>增加項目</span>
                </button>
            )}
        </div>
    );
};

const ClothingAssistantModule = ({ onBack, onSave, initialImage, onOpenPortfolioPicker, isShowcaseMode }: { onBack: () => void; onSave: (item: Omit<PortfolioItem, 'id' | 'timestamp'>) => void; initialImage: string | null; onOpenPortfolioPicker: (callback: (imageUrl: string) => void) => void; isShowcaseMode: boolean; }) => {
    const [subMode, setSubMode] = useState<SubMode>(initialImage ? 'oneModel' : 'oneGarment');
    const [isLoading, setIsLoading] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState('');
    const [results, setResults] = useState<Result[]>([]);
    const [selectedForDownload, setSelectedForDownload] = useState<string[]>([]);
    const [isZipping, setIsZipping] = useState(false);

    // One Garment, Many Models State
    const [garmentImage, setGarmentImage] = useState<string | null>(null);
    const [modelPrompts, setModelPrompts] = useState<string[]>([]);
    const [isSingleItemMode, setIsSingleItemMode] = useState(false);
    const [selectedGender, setSelectedGender] = useState<'female' | 'male'>('female');
    const [generationCount, setGenerationCount] = useState<number>(4);

    // One Model, Many Garments State
    const [portraitImage, setPortraitImage] = useState<string | null>(initialImage || null);
    const [garmentImages, setGarmentImages] = useState<string[]>([]);
    const [bodyDescription, setBodyDescription] = useState('');

    const handleReset = () => {
        setIsLoading(false);
        setLoadingMessage('');
        setResults([]);
        setSelectedForDownload([]);
        setIsZipping(false);
        setGarmentImage(null);
        setModelPrompts([]);
        setIsSingleItemMode(false);
        setGenerationCount(4);
        setPortraitImage(null);
        setGarmentImages([]);
        setBodyDescription('');
        setSelectedGender('female');
    };

    const handleSubModeSelect = (mode: SubMode) => {
        handleReset();
        setSubMode(mode);
    };
    
    const handleGenderSelect = (gender: 'female' | 'male') => {
        if (gender !== selectedGender) {
            setSelectedGender(gender);
            // Optional: Clear list when switching gender? For now, no.
        }
    };

    const handleGarmentImagesUpload = (e: ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const files = Array.from(e.target.files);
            if (garmentImages.length + files.length > 8) {
                alert('最多只能上傳 8 件衣服圖片。');
                return;
            }
            files.forEach(file => {
                const reader = new FileReader();
                reader.onloadend = () => setGarmentImages(prev => [...prev, reader.result as string]);
                reader.readAsDataURL(file);
            });
        }
    };

    const removeGarmentImage = (index: number) => {
        setGarmentImages(prev => prev.filter((_, i) => i !== index));
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

    const handleGenerate = async () => {
        setIsLoading(true);
        setLoadingMessage('正在準備...');
        setSelectedForDownload([]);
        setResults([]);
        
        try {
            if (subMode === 'oneGarment') {
                if (!garmentImage) throw new Error("請先上傳服飾圖片。");
    
                let finalPrompts: string[] = [];
                const cleanItemList = modelPrompts.filter(s => s.trim() !== '');
    
                if (isSingleItemMode) {
                    if (cleanItemList.length === 0) throw new Error("請在清單中提供一個項目。");
                    finalPrompts = Array(generationCount).fill(cleanItemList[0]);
                } else {
                    if (cleanItemList.length === 0) {
                        setLoadingMessage(`正在生成 ${generationCount} 個隨機靈感...`);
                        finalPrompts = await generateRandomPrompts('model', generationCount);
                    } else if (cleanItemList.length < generationCount) {
                        setLoadingMessage(`正在補全 ${generationCount - cleanItemList.length} 個隨機靈感...`);
                        const additional = await generateRandomPrompts('model', generationCount - cleanItemList.length);
                        finalPrompts = [...cleanItemList, ...additional];
                    } else { // >= generationCount
                        finalPrompts = [...cleanItemList].sort(() => 0.5 - Math.random()).slice(0, generationCount);
                    }
                }
                
                const allPresets = [...FEMALE_MODEL_TYPES, ...MALE_MODEL_TYPES];
                const finalApiPrompts = finalPrompts.map(item => {
                    const preset = allPresets.find(p => p.label === item);
                    return preset ? preset.prompt : item;
                });
                
                const initial: Result[] = finalPrompts.map((p, i) => ({ id: `${p}-${i}`, imageUrl: '', prompt: p, status: 'pending' }));
                setResults(initial);

                setLoadingMessage('正在生成圖片...');
                const settled = await Promise.all(finalApiPrompts.map((prompt, index) =>
                    generateModelWearingGarment(garmentImage, prompt)
                        .then(url => ({ status: 'fulfilled' as const, value: url, index }))
                        .catch(e => ({ status: 'rejected' as const, reason: e, index }))
                ));
                
                setResults(initial.map((res, i) => {
                    const s = settled.find(x => x.index === i);
                    if (s?.status === 'fulfilled') return { ...res, status: 'done', imageUrl: s.value };
                    return { ...res, status: 'error', error: s?.reason instanceof Error ? s.reason.message : '未知錯誤' };
                }));

            } else if (subMode === 'oneModel') {
                if (!portraitImage || garmentImages.length === 0) throw new Error("請上傳您的人像和至少一件服飾。");
                const imagesToGenerate = garmentImages.slice(0, generationCount);

                const initial: Result[] = imagesToGenerate.map((g, i) => ({ id: `garment-${i}`, imageUrl: '', prompt: `穿搭 ${i + 1}`, status: 'pending' }));
                setResults(initial);

                setLoadingMessage('正在生成圖片...');
                const settled = await Promise.all(imagesToGenerate.map((g, i) =>
                    generatePersonWearingGarment(portraitImage, g, bodyDescription)
                        .then(url => ({ status: 'fulfilled' as const, value: url, index: i }))
                        .catch(e => ({ status: 'rejected' as const, reason: e, index: i }))
                ));
                
                setResults(initial.map((res, i) => {
                    const s = settled.find(x => x.index === i);
                    if (s?.status === 'fulfilled') return { ...res, status: 'done', imageUrl: s.value };
                    return { ...res, status: 'error', error: s?.reason instanceof Error ? s.reason.message : '未知錯誤' };
                }));
            }

        } catch (error) {
            alert(`生成失敗: ${error instanceof Error ? error.message : '未知錯誤'}`);
            setResults([]);
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
            .map(r => ({ url: r.imageUrl, name: r.prompt.replace(/\s+/g, '_') }));
            
        const zipName = `服裝助理_${getTimestamp()}.zip`;
        await createZipAndDownload(imagesToZip, zipName);
        setIsZipping(false);
    };
    
    const handleSaveAllToPortfolio = async () => {
        const itemsToSave = results.filter(r => r.status === 'done');
        if (itemsToSave.length === 0) return;

        setIsLoading(true);
        setLoadingMessage(`正在儲存 ${itemsToSave.length} 張圖片至作品集...`);

        try {
            for (const item of itemsToSave) {
                 const portfolioItem: Omit<PortfolioItem, 'id' | 'timestamp'> = {
                    mode: 'clothingAssistant',
                    imageUrl: item.imageUrl,
                    prompt: item.prompt,
                    settings: { 
                        subMode,
                        garmentImage: subMode === 'oneGarment' ? garmentImage : null,
                        portraitImage: subMode === 'oneModel' ? portraitImage : null,
                        garmentImages: subMode === 'oneModel' ? garmentImages : [],
                    }
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
    
    const showcaseTertiaryButtonClasses = "!text-gray-600 !border-gray-400 hover:!bg-black/5 !border-2";

    const renderOneGarmentControls = () => (
        <div className="flex flex-col gap-6">
            <div>
                <h3 className="text-xl font-bold mb-2 text-[#3D405B]">1. 上傳服飾</h3>
                <label htmlFor="garment-upload" className="cursor-pointer block"><ImageCard status="done" imageUrl={garmentImage ?? undefined} /></label>
                <input id="garment-upload" type="file" className="hidden" accept="image/*" onChange={e => { if (e.target.files?.[0]) { const r = new FileReader(); r.onloadend = () => setGarmentImage(r.result as string); r.readAsDataURL(e.target.files[0]); } }} />
                <div className="mt-2 text-center">
                    <button onClick={() => onOpenPortfolioPicker(setGarmentImage)} className={cn(tertiaryButtonClasses, "!text-xs !py-1.5", isShowcaseMode && showcaseTertiaryButtonClasses)}>從作品集選取</button>
                </div>
            </div>
             <div>
                 <h3 className="text-xl font-bold mb-2 text-[#3D405B]">2. 選擇模特性別</h3>
                <div className={cn("flex gap-2 rounded-lg p-1 mb-4", isShowcaseMode ? "bg-gray-200" : "bg-black/5")}>
                    <button onClick={() => handleGenderSelect('female')} className={cn("w-1/2 p-2 rounded-md font-semibold transition-colors", selectedGender === 'female' ? "bg-white shadow text-[#E07A5F]" : "text-neutral-600 hover:bg-white/50")}>女性</button>
                    <button onClick={() => handleGenderSelect('male')} className={cn("w-1/2 p-2 rounded-md font-semibold transition-colors", selectedGender === 'male' ? "bg-white shadow text-[#E07A5F]" : "text-neutral-600 hover:bg-white/50")}>男性</button>
                </div>
                 <h3 className="text-xl font-bold mb-2 text-[#3D405B]">3. 建立模特兒清單</h3>
                <p className="text-sm text-neutral-500 mb-2">點擊預設或手動新增。如果清單項目少於生成數量，AI 將自動補全。</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-4">
                    {(selectedGender === 'female' ? FEMALE_MODEL_TYPES : MALE_MODEL_TYPES).map(m => (
                        <button key={m.id} onClick={() => setModelPrompts(prev => [...prev, m.label])} disabled={isLoading || (isSingleItemMode && modelPrompts.length > 0)} className="flex items-center justify-center gap-2 p-2 bg-black/5 rounded-lg hover:bg-black/10 transition-colors disabled:opacity-50">
                            <span className="text-xs font-medium text-neutral-800 text-center">{m.label}</span>
                        </button>
                    ))}
                </div>
                <ItemListManager items={modelPrompts} setItems={setModelPrompts} isSingleItemMode={isSingleItemMode} isShowcaseMode={isShowcaseMode} />
                <div className="flex items-center justify-center gap-2 mt-4 text-sm text-neutral-600">
                    <input type="checkbox" id="single-item-mode" checked={isSingleItemMode} onChange={e => setIsSingleItemMode(e.target.checked)} disabled={isLoading} className="h-4 w-4 rounded border-gray-300 text-[#E07A5F] focus:ring-[#E07A5F]" />
                    <label htmlFor="single-item-mode" className="select-none cursor-pointer">單一項目，多種變化</label>
                </div>
            </div>
            <div>
                 <h3 className="text-xl font-bold mb-2 text-[#3D405B]">4. 設定生成數量</h3>
                 <div className="flex items-center gap-2 my-2 justify-center">
                    {[1, 2, 3, 4, 5, 6].map(num => <button key={num} onClick={() => setGenerationCount(num)} disabled={isLoading} className={cn("w-10 h-10 rounded-md border transition-colors", generationCount === num ? "bg-[#E07A5F] text-white border-[#E07A5F]" : "bg-white text-neutral-700 hover:border-gray-400", "disabled:opacity-50")}>{num}</button>)}
                </div>
            </div>
            <button onClick={handleGenerate} disabled={isLoading || !garmentImage || (modelPrompts.length === 0 && !isSingleItemMode)} className={primaryButtonClasses + " w-full mt-4"}>
                {isLoading ? '生成中...' : `生成 ${generationCount} 張圖片`}
            </button>
        </div>
    );

    const renderOneModelControls = () => (
        <div className="flex flex-col gap-6">
            <div>
                <h3 className="text-xl font-bold mb-2 text-[#3D405B]">1. 上傳您的人像</h3>
                <label htmlFor="portrait-upload" className="cursor-pointer block"><ImageCard status="done" imageUrl={portraitImage ?? undefined} /></label>
                <input id="portrait-upload" type="file" className="hidden" accept="image/*" onChange={e => { if (e.target.files?.[0]) { const r = new FileReader(); r.onloadend = () => setPortraitImage(r.result as string); r.readAsDataURL(e.target.files[0]); } }} />
                 <div className="mt-2 text-center">
                    <button onClick={() => onOpenPortfolioPicker(setPortraitImage)} className={cn(tertiaryButtonClasses, "!text-xs !py-1.5", isShowcaseMode && showcaseTertiaryButtonClasses)}>從作品集選取</button>
                </div>
            </div>
            <div>
                <h3 className="text-xl font-bold mb-2 text-[#3D405B]">2. 身体描述 (可選)</h3>
                <p className="text-sm text-neutral-500 mb-2">若您上傳的是頭像，請在此描述期望的身材，AI 將為您生成全身。例如：「高挑纖瘦的身材」。</p>
                <textarea value={bodyDescription} onChange={e => setBodyDescription(e.target.value)} placeholder="輸入身材描述..." className={cn("w-full h-20 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#E07A5F] transition", isShowcaseMode ? "bg-white text-gray-900" : "")} />
            </div>
            <div>
                <h3 className="text-xl font-bold mb-2 text-[#3D405B]">3. 上傳服飾 (最多8件)</h3>
                <input id="garments-upload" type="file" multiple accept="image/*" onChange={handleGarmentImagesUpload} className="block w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-[#E07A5F]/20 file:text-[#E07A5F] hover:file:bg-[#E07A5F]/30 mb-4" />
                {garmentImages.length > 0 && <div className="grid grid-cols-3 sm:grid-cols-4 gap-4">
                    {garmentImages.map((img, i) => (
                        <div key={i} className="relative group">
                            <img src={img} className="w-full aspect-square object-contain bg-white rounded-lg shadow-sm" alt={`Garment ${i + 1}`} />
                            <button onClick={() => removeGarmentImage(i)} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full h-6 w-6 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity">X</button>
                        </div>
                    ))}
                </div>}
            </div>
            <div>
                <h3 className="text-xl font-bold mb-2 text-[#3D405B]">4. 設定生成數量</h3>
                 <div className="flex items-center gap-2 my-2 justify-center">
                    {[1, 2, 3, 4, 5, 6].map(num => <button key={num} onClick={() => setGenerationCount(num)} disabled={isLoading || num > garmentImages.length} className={cn("w-10 h-10 rounded-md border transition-colors", generationCount === num ? "bg-[#E07A5F] text-white border-[#E07A5F]" : "bg-white text-neutral-700 hover:border-gray-400", "disabled:opacity-50")}>{num}</button>)}
                </div>
            </div>
            <button onClick={handleGenerate} disabled={isLoading || !portraitImage || garmentImages.length === 0} className={primaryButtonClasses + " w-full mt-4"}>
                {isLoading ? '生成中...' : `生成 ${Math.min(generationCount, garmentImages.length)} 套穿搭`}
            </button>
        </div>
    );
    
    const successfulResultsCount = results.filter(r => r.status === 'done').length;
    const titleClasses = cn("text-4xl font-bold text-center mb-8", isShowcaseMode ? "text-gray-800" : "text-white/90");
    const backButtonClasses = cn(tertiaryButtonClasses, "border", isShowcaseMode && "!text-gray-600 !border-gray-400 hover:!bg-black/5");
    const mainPanelClasses = cn(
        "p-6 rounded-xl shadow-md border",
        isShowcaseMode 
            ? "bg-neutral-50 border-gray-200" 
            : "bg-white/60 backdrop-blur-sm border-black/5"
    );

    return (
        <MotionDiv initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full max-w-7xl mx-auto flex flex-col items-center">
            <h2 className={titleClasses}>服裝助理</h2>
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 w-full items-start">
                 <div className={cn("lg:col-span-2", mainPanelClasses)}>
                    <div className={cn("flex gap-2 rounded-lg p-1 mb-4", isShowcaseMode ? "bg-gray-200" : "bg-black/5")}>
                        <button onClick={() => handleSubModeSelect('oneGarment')} className={cn("w-1/2 p-2 rounded-md font-semibold transition-colors", subMode === 'oneGarment' ? "bg-white shadow text-[#E07A5F]" : "text-neutral-600 hover:bg-white/50")}>一衣多人</button>
                        <button onClick={() => handleSubModeSelect('oneModel')} className={cn("w-1/2 p-2 rounded-md font-semibold transition-colors", subMode === 'oneModel' ? "bg-white shadow text-[#E07A5F]" : "text-neutral-600 hover:bg-white/50")}>一人多衣</button>
                    </div>
                    <AnimatePresence mode="wait">
                        <MotionDiv key={subMode} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                           {subMode === 'oneGarment' ? renderOneGarmentControls() : renderOneModelControls()}
                        </MotionDiv>
                    </AnimatePresence>
                 </div>
                 <div className={cn("lg:col-span-3", mainPanelClasses)}>
                    <h3 className="text-2xl font-bold mb-4 text-[#3D405B]">生成結果</h3>
                    {results.length === 0 ? <p className="text-center py-16 text-neutral-500">完成設定後，點擊生成。</p> : (
                        <>
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
                                {results.map(r => <ImageCard key={r.id} status={r.status} imageUrl={r.imageUrl} styleName={r.prompt} error={r.error} showCheckbox={true} onCheckboxChange={() => r.status === 'done' && toggleDownloadSelection(r.id)} isSelected={selectedForDownload.includes(r.id)} keepAspectRatio={true} onSave={r.status === 'done' ? () => onSave({ mode: 'clothingAssistant', imageUrl: r.imageUrl, prompt: r.prompt, settings: { subMode, garmentImage: subMode === 'oneGarment' ? garmentImage : undefined, portraitImage: subMode === 'oneModel' ? portraitImage : undefined, garmentImages: subMode === 'oneModel' ? garmentImages : undefined }}) : undefined} />)}
                            </div>
                            {successfulResultsCount > 0 && <div className="mt-6 text-center border-t pt-6">
                                <p className="mb-4 text-neutral-600">勾選滿意的圖片，然後打包下載。</p>
                                <button onClick={handleDownloadZip} disabled={isLoading || isZipping || selectedForDownload.length === 0} className={secondaryButtonClasses}>{isZipping ? '打包中...' : `下載選中 ${selectedForDownload.length} 張 (ZIP)`}</button>
                            </div>}
                        </>
                    )}
                </div>
            </div>
            <div className="mt-8 flex justify-center w-full">
                <button onClick={onBack} className={backButtonClasses}>返回主選單</button>
            </div>
        </MotionDiv>
    );
};

export default ClothingAssistantModule;
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState, ChangeEvent, ReactElement, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { generateRandomStyles, generateVirtualModel, generateConceptClothing, generateTimeTravelScene, generateAlchemyOutfit, generateAlchemyAccessory, generateBoutiqueItem, describeImageStyle, generateStyledCreation } from './services/geminiService';
import ImageCard from './components/PolaroidCard';
import { cn, getTimestamp } from './lib/utils';
import { createZipAndDownload } from './lib/zipUtils';
import { createDynamicAlbumAndDownload, createBoutiqueAlbumAndDownload } from './lib/albumUtils';
import { PortfolioItem } from './services/dbService';

const MotionDiv = motion.div as any;

const primaryButtonClasses = "text-lg text-center text-white bg-[#81B29A] py-3 px-8 rounded-lg transition-colors duration-200 hover:bg-[#6A947E] shadow-sm disabled:opacity-50 disabled:cursor-not-allowed";
const secondaryButtonClasses = "text-lg text-center text-[#3D405B] bg-transparent border-2 border-[#BDB5AD] py-3 px-8 rounded-lg transition-colors duration-200 hover:bg-black/5 hover:border-[#3D405B] disabled:opacity-50";
const tertiaryButtonClasses = "text-sm text-center text-white/80 bg-transparent border border-white/30 py-2 px-4 rounded-md transition-colors duration-200 hover:bg-white/10 disabled:opacity-50";

// --- START: Icon Components ---
const UserIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>;
const ShirtIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.38 3.46 16 2a4 4 0 0 1-8 0L3.62 3.46a2 2 0 0 0-1.34 2.23l.58 3.47a1 1 0 0 0 .99.84H6v10c0 1.1.9 2 2 2h8a2 2 0 0 0 2-2V10h2.15a1 1 0 0 0 .99-.84l.58-3.47a2 2 0 0 0-1.34-2.23z"/></svg>;
const SparklesIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.9 1.9-3.2 1.3-1.3 3.2L3 12l1.9 1.9 1.3 3.2 3.2 1.3L12 21l1.9-1.9 3.2-1.3 1.3-3.2L21 12l-1.9-1.9-1.3-3.2-3.2-1.3Z"/></svg>;
const WandIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 4V2"/><path d="M15 10V8"/><path d="M12.5 7.5h-5"/><path d="m20 15-4.08-4.08a2.83 2.83 0 0 0-4-4L4 15"/><path d="M15 22v-4.08a2.83 2.83 0 0 0-4-4L4 22"/></svg>;
const BotIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2"/><path d="M20 14h2"/><path d="M15 13v2"/><path d="M9 13v2"/></svg>;
const CrownIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m2 4 3 12h14l3-12-6 7-4-7-4 7-6-7zm3 16h14"/></svg>;
const GlassesIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="6" cy="15" r="4"/><circle cx="18" cy="15" r="4"/><path d="M14 15a2 2 0 0 0-2-2 2 2 0 0 0-2 2"/><path d="M2.5 13 5 7c.7-1.3 1.4-2 3-2"/><path d="M21.5 13 19 7c-.7-1.3-1.4-2-3-2"/></svg>;
const UsbIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 19v-5h4v5"/><path d="M8 14h8"/><path d="M6 10h12v4H6z"/><path d="M12 10V6"/><path d="M10 6h4"/></svg>;
const CutleryIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 2v20"/><path d="M10 2v10.5a5.5 5.5 0 0 0 11 0V2h-5Z"/><path d="M4 2v10.5A5.5 5.5 0 0 0 9.5 18H10V2H4Z"/></svg>;
const ClayModelIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.25 10.75-8.5-4.25-8.5 4.25 8.5 4.25 8.5-4.25Z"/><path d="m4.25 10.75 8.5 4.25 8.5-4.25"/><path d="m12.75 6.5-8.5 4.25"/></svg>;
const ModelIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3v18h8V3H8z"/><path d="M4 21h16"/><path d="M12 3v-2"/><path d="M12 21v2"/></svg>;
const MouseIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="2" width="14" height="20" rx="7"/><path d="M12 6v4"/></svg>;
const TowelIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12h20"/><path d="M2 6h20v12H2V6z"/><path d="M6 6v12"/></svg>;
const CandleIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 4h6v2a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4V6h4Z"/><path d="M12 4V2"/><path d="M8 20h8"/><path d="M8 16h8v4H8z"/></svg>;
const PuzzleIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 7V4.5a2.5 2.5 0 0 0-5 0V7"/><path d="M14 7h2.5a2.5 2.5 0 0 1 0 5H14"/><path d="M10 7H7.5a2.5 2.5 0 0 0 0 5H10"/><path d="M10 17v-2.5a2.5 2.5 0 0 0-5 0V17"/><path d="M10 17h4"/><path d="M7 14v2.5a2.5 2.5 0 0 0 5 0V14"/></svg>;
const PlusIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>;
const TrashIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>;
const UploadIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>;
const ImageIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>;
// --- END: Icon Components ---

const VIRTUAL_MODEL_TYPES = [
    { name: '時裝模特', icon: <UserIcon /> },
    { name: '街頭潮人', icon: <SparklesIcon /> },
    { name: '奇幻角色', icon: <WandIcon /> },
    { name: '科幻戰士', icon: <BotIcon /> },
    { name: '皇室貴族', icon: <CrownIcon /> },
    { name: '日常人物', icon: <UserIcon /> }
];
const CONCEPT_CLOTHING_TYPES = [
    { name: '連衣裙', icon: <ShirtIcon /> },
    { name: '外套', icon: <ShirtIcon /> },
    { name: '褲子', icon: <ShirtIcon /> },
    { name: '鞋子', icon: <ShirtIcon /> },
    { name: '帽子', icon: <CrownIcon /> },
    { name: '包包', icon: <ShirtIcon /> },
    { name: '眼鏡', icon: <GlassesIcon /> },
    { name: '飾品', icon: <SparklesIcon /> }
];
const TIME_TRAVEL_ERAS = ['石器時代', '古埃及', '維多利亞時代', '裝飾藝術', '世紀中期現代', '80年代孟菲斯', '賽博龐克未來', '太陽龐克未來'];
const BOUTIQUE_ITEM_TYPES = [
    { name: 'USB隨身碟', icon: <UsbIcon /> },
    { name: '餐廚刀叉盤子', icon: <CutleryIcon /> },
    { name: '黏土模型', icon: <ClayModelIcon /> },
    { name: '建築模型', icon: <ModelIcon /> },
    { name: '滑鼠墊', icon: <MouseIcon /> },
    { name: '床單毛巾', icon: <TowelIcon /> },
    { name: '香氛蠟燭', icon: <CandleIcon /> },
    { name: '拼圖', icon: <PuzzleIcon /> },
];

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
    { name: '少年漫畫', emoji: '💥' },
    { name: '少女漫畫', emoji: '🌸' },
    { name: '日本動畫', emoji: '🎌' },
];

type SubMode = 'select' | 'virtualModel' | 'conceptClothing' | 'timeTravel' | 'styleAlchemy' | 'boutiqueItems';
type AlchemyMode = 'none' | 'outfit' | 'accessory';
interface Result {
    id: string;
    imageUrl: string;
    prompt: string;
    status: 'pending' | 'done' | 'error';
    error?: string;
}
type GenerationItem = { id: string; type: 'text' | 'image'; value: string; };

const LightCardButton = ({ onClick, emoji, title, description, disabled = false }: { onClick: () => void; emoji: string; title: string; description: string; disabled?: boolean; }) => (
    <div
        onClick={!disabled ? onClick : undefined}
        className={cn(
            "bg-white/90 border border-black/5 rounded-2xl p-6 text-center shadow-md hover:shadow-xl hover:-translate-y-2 transition-all duration-300 cursor-pointer backdrop-blur-sm",
            "flex flex-col items-center justify-center gap-4",
            disabled ? "opacity-60 cursor-not-allowed hover:translate-y-0" : ""
        )}
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-disabled={disabled}
    >
        <span className="text-8xl mb-2">{emoji}</span>
        <div>
            <h3 className="text-2xl font-bold text-gray-800">{title}</h3>
            <p className="text-gray-600 mt-2 text-base">{description}</p>
        </div>
    </div>
);

const TypeSelector = ({ types, selected, setter, customValue, customSetter, placeholder, isShowcaseMode }: { types: { name: string, icon: ReactElement }[], selected: string, setter: (val: string) => void, customValue: string, customSetter: (val: string) => void, placeholder: string, isShowcaseMode: boolean }) => (
    <>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 mb-2">
            {types.map(t => (
                <button 
                    key={t.name} 
                    onClick={() => setter(t.name)} 
                    className={cn(
                        "flex flex-col items-center justify-center gap-2 p-3 bg-black/5 rounded-lg hover:bg-black/10 transition-all",
                        selected === t.name ? "ring-2 ring-[#81B29A] font-semibold text-neutral-800" : "text-neutral-700"
                    )}
                >
                     {t.icon}
                     <span className="text-sm">{t.name}</span>
                </button>
            ))}
        </div>
        <input 
            type="text"
            value={customValue} 
            onChange={e => customSetter(e.target.value)} 
            placeholder={placeholder}
            className={cn("w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#81B29A] transition", isShowcaseMode && "bg-white text-gray-900")} 
        />
    </>
);

const StyleInputWithReference = ({ styleValue, styleSetter, title, description, placeholder, referenceImage, onUpload, onClear, isMaster, onMasterChange, onRandomize, disabled, isShowcaseMode, onOpenPortfolioPicker }: { styleValue: string; styleSetter: (val: string) => void; title: string; description: string; placeholder: string; referenceImage: string | null; onUpload: (dataUrl: string) => void; onClear: () => void; isMaster: boolean; onMasterChange: (val: boolean) => void; onRandomize?: () => void; disabled?: boolean; isShowcaseMode: boolean; onOpenPortfolioPicker?: () => void; }) => (
    <>
        <h3 className="text-xl font-bold mt-4 mb-2">{title}</h3>
        <p className="text-sm text-neutral-500 mb-2">{description}</p>
        <div className="space-y-3">
            <div className="p-3 border border-dashed rounded-lg bg-black/5">
                <h4 className="text-sm font-medium text-center mb-2 text-neutral-600">上傳風格參考圖 (可選)</h4>
                {referenceImage ? (
                    <div className="relative group w-24 mx-auto">
                        <img src={referenceImage} className="w-full rounded-md shadow-sm" alt="風格參考"/>
                        <button onClick={onClear} disabled={disabled} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full h-6 w-6 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-50">X</button>
                    </div>
                ) : (
                    <div className="flex flex-col gap-2">
                        <input type="file" accept="image/png, image/jpeg" disabled={disabled} onChange={(e: ChangeEvent<HTMLInputElement>) => {
                            if (e.target.files?.[0]) {
                                const reader = new FileReader();
                                reader.onloadend = () => onUpload(reader.result as string);
                                reader.readAsDataURL(e.target.files[0]);
                                e.target.value = '';
                            }
                        }} className="block w-full text-xs file:mr-2 file:py-1 file:px-2 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-[#81B29A]/20 file:text-[#81B29A] hover:file:bg-[#81B29A]/30 disabled:opacity-50" />
                        {onOpenPortfolioPicker && (
                            <button
                                onClick={onOpenPortfolioPicker}
                                disabled={disabled}
                                className={cn(
                                    tertiaryButtonClasses, 
                                    "!text-xs !py-1.5 w-full", 
                                    isShowcaseMode && "!text-[#3D405B] !border-[#BDB5AD] hover:!border-[#3D405B] !border-2"
                                )}
                            >
                                從作品集選取
                            </button>
                        )}
                    </div>
                )}
            </div>
            <div className="flex gap-2 items-center">
                 <input 
                    type="text"
                    value={styleValue} 
                    onChange={e => styleSetter(e.target.value)} 
                    placeholder={placeholder} 
                    className={cn("w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#81B29A] transition", isShowcaseMode && "bg-white text-gray-900")}
                    disabled={disabled}
                />
                {onRandomize && <button onClick={onRandomize} disabled={disabled} className="text-sm text-center text-neutral-600 bg-transparent border border-neutral-400 py-2 px-3 rounded-md transition-colors duration-200 hover:bg-black/5 disabled:opacity-50">🎲</button>}
            </div>
             <div className="flex items-center gap-2 text-sm text-neutral-600">
                <input type="checkbox" id="master-designer" checked={isMaster} onChange={e => onMasterChange(e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-[#81B29A] focus:ring-[#81B29A]" disabled={disabled} />
                <label htmlFor="master-designer" className="select-none">大師設計 (模仿知名設計師風格)</label>
            </div>
        </div>
    </>
);

const ItemListManager = ({ items, setItems, isSingleItemMode, placeholder, isShowcaseMode }: { items: string[], setItems: React.Dispatch<React.SetStateAction<string[]>>, isSingleItemMode: boolean, placeholder: string, isShowcaseMode: boolean }) => {
    const handleItemChange = (index: number, value: string) => {
        const newItems = [...items];
        newItems[index] = value;
        setItems(newItems);
    };
    const handleAddItem = (value = '') => {
        if (isSingleItemMode) {
             setItems([value]);
        } else {
             setItems(prev => [...prev, value]);
        }
    };
    const handleRemoveItem = (index: number) => setItems(prev => prev.filter((_, i) => i !== index));

    return (
        <div className="space-y-2">
            {items.map((item, index) => (
                <div key={index} className="flex items-center gap-2">
                    <input
                        type="text" value={item} onChange={e => handleItemChange(index, e.target.value)}
                        placeholder={placeholder}
                        className={cn("w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#81B29A] transition", isShowcaseMode && "bg-white text-gray-900")}
                    />
                    <button onClick={() => handleRemoveItem(index)} className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors flex-shrink-0">
                        <TrashIcon />
                    </button>
                </div>
            ))}
            {!(isSingleItemMode && items.length > 0) && (
                <button onClick={() => handleAddItem()} className="mt-2 text-sm flex items-center gap-2 text-center text-[#3D405B] bg-transparent border-2 border-dashed border-[#BDB5AD] py-2 px-4 rounded-lg transition-colors duration-200 hover:bg-black/5 hover:border-[#3D405B] w-full justify-center">
                    <PlusIcon /><span>增加項目</span>
                </button>
            )}
        </div>
    );
};


const ImaginativeModule = ({ onBack, onSave, isShowcaseMode, onOpenPortfolioPicker }: { onBack: () => void; onSave: (item: Omit<PortfolioItem, 'id' | 'timestamp'>) => void; isShowcaseMode: boolean; onOpenPortfolioPicker: (callback: (imageUrl: string) => void) => void; }) => {
    const [subMode, setSubMode] = useState<SubMode>('select');
    const [isLoading, setIsLoading] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState('');
    const [results, setResults] = useState<Result[]>([]);
    const [selectedForDownload, setSelectedForDownload] = useState<string[]>([]);
    
    // --- Input States ---
    const [count, setCount] = useState(4);
    const [uploadedImage, setUploadedImage] = useState<string | null>(null);

    // Specific states for each mode
    const [selectedVirtualModelType, setSelectedVirtualModelType] = useState('');
    const [customVirtualModelType, setCustomVirtualModelType] = useState('');
    
    const [selectedConceptClothingType, setSelectedConceptClothingType] = useState('');
    const [customConceptClothingType, setCustomConceptClothingType] = useState('');

    const [selectedTimeTravelEra, setSelectedTimeTravelEra] = useState('');
    const [customTimeTravelEra, setCustomTimeTravelEra] = useState('');
    
    // Alchemy states
    const [alchemyMode, setAlchemyMode] = useState<AlchemyMode>('none');
    const [alchemyImages, setAlchemyImages] = useState<string[]>([]);
    const [alchemyPrompt, setAlchemyPrompt] = useState('');
    const [alchemyCount, setAlchemyCount] = useState(1);

    // New feature states
    const [generationMode, setGenerationMode] = useState<'multiStyle' | 'multiType'>('multiStyle');
    const [styleReferenceImage, setStyleReferenceImage] = useState<string | null>(null);
    const [isMasterDesigner, setIsMasterDesigner] = useState(false);
    const [multiTypeSelection, setMultiTypeSelection] = useState<string[]>([]);
    const [multiTypeCustom, setMultiTypeCustom] = useState('');

    // State for multi-type style
    const [virtualModelStyle, setVirtualModelStyle] = useState('');
    const [conceptClothingStyle, setConceptClothingStyle] = useState('');
    
    // NEW State for multi-style (Direct Specification)
    const [itemList, setItemList] = useState<GenerationItem[]>([]);
    const [isSingleItemMode, setIsSingleItemMode] = useState(false);

    // NEW state for Boutique Items list mode
    const [boutiqueItemList, setBoutiqueItemList] = useState<string[]>([]);
    const [isSingleBoutiqueItemMode, setIsSingleBoutiqueItemMode] = useState(false);

    useEffect(() => {
        if (isSingleItemMode && itemList.length > 1) {
            setItemList(prev => [prev[0] || { id: getTimestamp(), type: 'text', value: '' }]);
        }
    }, [isSingleItemMode, itemList.length]);

    const mainPanelClasses = cn(
        "p-6 rounded-xl shadow-md border",
        isShowcaseMode
            ? "bg-neutral-50 border-gray-200"
            : "bg-white/60 backdrop-blur-sm border-black/5"
    );
    const backButtonClasses = cn(tertiaryButtonClasses, isShowcaseMode && "!text-gray-600 !border-gray-400 hover:!bg-black/5");


    const resetInputs = () => {
        setCount(4);
        setUploadedImage(null);
        setResults([]);
        setSelectedForDownload([]);
        setSelectedVirtualModelType('');
        setCustomVirtualModelType('');
        setVirtualModelStyle('');
        setSelectedConceptClothingType('');
        setCustomConceptClothingType('');
        setConceptClothingStyle('');
        setSelectedTimeTravelEra('');
        setCustomTimeTravelEra('');
        setAlchemyMode('none');
        setAlchemyImages([]);
        setAlchemyPrompt('');
        setAlchemyCount(1);
        setGenerationMode('multiStyle');
        setStyleReferenceImage(null);
        setIsMasterDesigner(false);
        setItemList([]);
        setIsSingleItemMode(false);
        setMultiTypeSelection([]);
        setMultiTypeCustom('');
        setBoutiqueItemList([]);
        setIsSingleBoutiqueItemMode(false);
    };

    const handleSubModeSelect = (mode: SubMode) => {
        resetInputs();
        setSubMode(mode);
    };

    const handleGenerate = async () => {
        setIsLoading(true);
        setSelectedForDownload([]);
        setResults([]);
        
        try {
            // --- Alchemy Logic ---
            if (subMode === 'styleAlchemy') {
                setLoadingMessage('正在融合風格...');

                const initialResults: Result[] = Array.from({ length: alchemyCount }, (_, i) => ({
                    id: `${alchemyPrompt}-${i}`,
                    imageUrl: '',
                    prompt: alchemyPrompt,
                    status: 'pending'
                }));
                setResults(initialResults);

                const generator = alchemyMode === 'outfit' ? generateAlchemyOutfit : generateAlchemyAccessory;

                const generationPromises = initialResults.map(() => 
                    generator(alchemyImages, alchemyPrompt)
                        .then(imageUrl => ({ status: 'fulfilled' as const, value: imageUrl }))
                        .catch(error => ({ status: 'rejected' as const, reason: error }))
                );

                const settledResults = await Promise.all(generationPromises);

                const finalResults: Result[] = initialResults.map((res, i) => {
                    const settled = settledResults[i];
                    if (settled.status === 'fulfilled') {
                        return { ...res, status: 'done', imageUrl: settled.value };
                    } else {
                        return { ...res, status: 'error', error: settled.reason instanceof Error ? settled.reason.message : '未知錯誤' };
                    }
                });
                setResults(finalResults);
                setIsLoading(false);
                return;
            }
            
            if (subMode === 'timeTravel') {
                if (!uploadedImage) throw new Error("請先上傳圖片。");
                const baseInput = uploadedImage;
                let prompts: string[] = [];
                const generator = generateTimeTravelScene;
                const userSelection = customTimeTravelEra || selectedTimeTravelEra;
                if (!userSelection) throw new Error("請選擇或輸入一個年代。");
                prompts.push(userSelection);

                if (count > 1) {
                    const basePool = TIME_TRAVEL_ERAS;
                    const randomPool = basePool.filter(e => e !== userSelection).sort(() => 0.5 - Math.random());
                    prompts.push(...randomPool.slice(0, count - 1));
                }

                setLoadingMessage('正在生成...');
                const initialResults: Result[] = prompts.map((p, i) => ({ id: `${p}-${i}`, imageUrl: '', prompt: p, status: 'pending' }));
                setResults(initialResults);

                const settledResults = await Promise.all(prompts.map(async (p, i) => {
                    try {
                        const imageUrl = await generator(baseInput, p);
                        return { status: 'fulfilled' as const, value: imageUrl, index: i };
                    } catch (error) {
                        return { status: 'rejected' as const, reason: error, index: i };
                    }
                }));

                const finalResults: Result[] = initialResults.map((res, i) => {
                    const settled = settledResults.find(sr => sr.index === i);
                    if (settled?.status === 'fulfilled') return { ...res, status: 'done', imageUrl: settled.value };
                    if (settled?.status === 'rejected') return { ...res, status: 'error', error: settled.reason instanceof Error ? settled.reason.message : '未知錯誤' };
                    return res;
                });
                setResults(finalResults);
                return;
            }

            if (subMode === 'boutiqueItems') {
                if (!uploadedImage) throw new Error("請先上傳圖片。");
            
                let finalPrompts: string[] = [];
                const cleanList = boutiqueItemList.filter(s => s.trim() !== '');
                
                if (isSingleBoutiqueItemMode) {
                    if (cleanList.length === 0) throw new Error("在單一項目模式下，請至少提供一個項目。");
                    finalPrompts = Array(count).fill(cleanList[0]);
                } else {
                    const numItems = cleanList.length;
                    const basePool = ['馬克杯', '手機殼', '絲巾', '抱枕', '帆布手提袋', '筆記本與鋼筆套組', '地墊', '掛鐘', '夜燈', '香氛擴香', '鑰匙圈', '開瓶器', '眼鏡布'];
                    if (numItems === 0) {
                        setLoadingMessage('正在生成隨機小物靈感...');
                        finalPrompts = [...basePool].sort(() => 0.5 - Math.random()).slice(0, count);
                    } else if (numItems < count) {
                        setLoadingMessage(`正在補全 ${count - numItems} 個隨機靈感...`);
                        const additionalNeeded = count - numItems;
                        const randomPool = basePool.filter(p => !cleanList.includes(p)).sort(() => 0.5 - Math.random());
                        const additionalItems = randomPool.slice(0, additionalNeeded);
                        finalPrompts = [...cleanList, ...additionalItems];
                    } else { // numItems >= count
                        finalPrompts = [...cleanList].sort(() => 0.5 - Math.random()).slice(0, count);
                    }
                }
            
                setLoadingMessage('正在生成精品小物...');
                const initialResults: Result[] = finalPrompts.map((p, i) => ({ id: `${p}-${i}`, imageUrl: '', prompt: p, status: 'pending' }));
                setResults(initialResults);
            
                const settledResults = await Promise.all(finalPrompts.map(async (p, i) => {
                    try {
                        const imageUrl = await generateBoutiqueItem(uploadedImage, p);
                        return { status: 'fulfilled' as const, value: imageUrl, index: i };
                    } catch (error) {
                        return { status: 'rejected' as const, reason: error, index: i };
                    }
                }));
            
                const finalResults: Result[] = initialResults.map((res, i) => {
                    const settled = settledResults.find(sr => sr.index === i);
                    if (settled?.status === 'fulfilled') return { ...res, status: 'done', imageUrl: settled.value };
                    if (settled?.status === 'rejected') return { ...res, status: 'error', error: settled.reason instanceof Error ? settled.reason.message : '未知錯誤' };
                    return res;
                });
                setResults(finalResults);
                return;
            }
            
            // --- Main Logic for Virtual Model & Concept Clothing ---
            const isModel = subMode === 'virtualModel';
            let generationItems: string[];
            let finalItems: GenerationItem[] = [];
            let displayPrompts: string[] = [];
            
            if (generationMode === 'multiStyle') {
                const itemType = isModel ? (customVirtualModelType || selectedVirtualModelType) : (customConceptClothingType || selectedConceptClothingType);
                if (!itemType) { alert(isModel ? '請選擇或輸入模特類型' : '請選擇或輸入服飾類型'); throw new Error('No item selected'); }
                
                setLoadingMessage('正在準備風格...');
                const cleanItemList = itemList.filter(item => item.value.trim() !== '');

                if (isSingleItemMode) {
                    if (cleanItemList.length === 0) throw new Error("請在清單中提供一個項目。");
                    finalItems = Array(count).fill(cleanItemList[0]);
                } else {
                     if (cleanItemList.length === 0) {
                        const randomStyles = await generateRandomStyles(count);
                        finalItems = randomStyles.map(s => ({ id: getTimestamp() + Math.random(), type: 'text', value: s }));
                    } else if (count > cleanItemList.length) {
                        const additionalStyles = await generateRandomStyles(count - cleanItemList.length);
                        const additionalItems: GenerationItem[] = additionalStyles.map(s => ({ id: getTimestamp() + Math.random(), type: 'text', value: s }));
                        finalItems = [...cleanItemList, ...additionalItems];
                    } else { // count <= cleanItemList.length
                        finalItems = [...cleanItemList].sort(() => 0.5 - Math.random()).slice(0, count);
                    }
                }
                displayPrompts = finalItems.map((item, i) => item.type === 'text' ? item.value : `參考圖 ${i+1}`);
                generationItems = Array(count).fill(itemType);

            } else { // multiType
                const allAvailableTypes = (isModel ? VIRTUAL_MODEL_TYPES : CONCEPT_CLOTHING_TYPES).map(t => t.name);
                let userSelection = [...multiTypeSelection];
                if (multiTypeCustom.trim()) userSelection.push(multiTypeCustom.trim());

                if (userSelection.length === 0) {
                    generationItems = [...allAvailableTypes].sort(() => 0.5 - Math.random()).slice(0, count);
                } else if (userSelection.length < count) {
                    const remainingNeeded = count - userSelection.length;
                    const remainingPool = allAvailableTypes.filter(t => !userSelection.includes(t)).sort(() => 0.5 - Math.random());
                    generationItems = [...userSelection, ...remainingPool.slice(0, remainingNeeded)];
                } else if (userSelection.length > count) {
                    generationItems = [...userSelection].sort(() => 0.5 - Math.random()).slice(0, count);
                } else {
                    generationItems = userSelection;
                }

                let userStyle = isModel ? virtualModelStyle : conceptClothingStyle;
                if (styleReferenceImage) {
                    setLoadingMessage('正在分析風格圖片...');
                    const describedStyle = await describeImageStyle(styleReferenceImage);
                    userStyle = `${describedStyle}${userStyle ? `, ${userStyle}` : ''}`;
                }

                let baseStyle = userStyle;
                let displayStyle = userStyle;

                if (isMasterDesigner) {
                    setLoadingMessage('正在向大師尋求靈感...');
                    baseStyle = `A design in the style of a master, inspired by: "${userStyle || 'something creative and unique'}"`;
                    displayStyle = userStyle ? `大師風格 (${userStyle})` : '大師風格';
                } else {
                    if (!baseStyle) {
                        baseStyle = (await generateRandomStyles(1))[0];
                        displayStyle = baseStyle;
                    }
                }
                
                finalItems = Array.from({ length: count }, (_, i) => ({ id: getTimestamp() + i, type: 'text', value: `${baseStyle}, variation ${i + 1}` }));
                displayPrompts = Array(count).fill(displayStyle);
            }
            
            setLoadingMessage('正在生成...');
            const finalDisplayPrompts = Array.from({ length: count }, (_, i) => {
                if (generationMode === 'multiStyle') {
                    return displayPrompts[i];
                }
                return `${generationItems[i]} (${displayPrompts[i]})`;
            });
            
            const initialResults: Result[] = Array.from({ length: count }, (_, i) => ({
                id: `${generationItems[i]}-${finalDisplayPrompts[i]}-${i}`,
                imageUrl: '',
                prompt: finalDisplayPrompts[i],
                status: 'pending'
            }));
            setResults(initialResults);

            const settledResults = await Promise.all(Array.from({ length: count }, async (_, i) => {
                const item = finalItems[i];
                const itemType = generationItems[i];
                const isModel = subMode === 'virtualModel';

                try {
                    let imageUrl: string;
                    if (item.type === 'text') {
                        const generator = isModel ? generateVirtualModel : generateConceptClothing;
                        imageUrl = await generator(itemType, item.value);
                    } else { // item.type === 'image'
                        imageUrl = await generateStyledCreation(itemType, item.value);
                    }
                    return { status: 'fulfilled' as const, value: imageUrl, index: i };
                } catch (reason) {
                    return { status: 'rejected' as const, reason, index: i };
                }
            }));

            const finalResults: Result[] = initialResults.map((res, i) => {
                const settled = settledResults.find(sr => sr.index === i);
                if (settled?.status === 'fulfilled') return { ...res, status: 'done', imageUrl: settled.value };
                if (settled?.status === 'rejected') return { ...res, status: 'error', error: settled.reason instanceof Error ? settled.reason.message : '未知錯誤' };
                return res;
            });
            setResults(finalResults);

        } catch (error) {
            if (!(error instanceof Error && error.message === 'No item selected')) {
                alert(`生成失敗: ${error instanceof Error ? error.message : '未知錯誤'}`);
            }
            setResults([]);
        } finally {
            setIsLoading(false);
            setLoadingMessage('');
        }
    };
    
    const getDesignTarget = () => {
        switch (subMode) {
            case 'virtualModel': return customVirtualModelType || selectedVirtualModelType || '模特';
            case 'conceptClothing': return customConceptClothingType || selectedConceptClothingType || '服飾';
            case 'timeTravel': return customTimeTravelEra || selectedTimeTravelEra || '時空';
            case 'styleAlchemy': return alchemyPrompt || (alchemyMode === 'outfit' ? '穿搭' : '配件');
            case 'boutiqueItems': return boutiqueItemList[0] || '精品小物';
            default: return '靈感';
        }
    };

    const toggleDownloadSelection = (id: string) => setSelectedForDownload(p => p.includes(id) ? p.filter(i => i !== id) : [...p, id]);

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

    const handleDownloadZip = async () => {
        const imagesToZip = results
            .filter(r => selectedForDownload.includes(r.id))
            .map(r => ({ url: r.imageUrl, name: r.prompt }));

        const designTarget = getDesignTarget();
        const timestamp = getTimestamp();
        const zipName = `天馬行空_${designTarget}_${timestamp}.zip`;
        await createZipAndDownload(imagesToZip, zipName);
    };

    const handleDownloadAlbum = async () => {
        const imagesToAlbum = results
            .filter(r => selectedForDownload.includes(r.id) && r.status === 'done')
            .map(r => ({
                url: r.imageUrl,
                style: r.prompt,
            }));
        
        if (imagesToAlbum.length === 0) {
            alert('請選擇已成功生成的圖片來製作相簿。');
            return;
        }

        setIsLoading(true);
        setLoadingMessage('正在生成相簿...');
        try {
            const designTarget = getDesignTarget();
            const timestamp = getTimestamp();
            const filename = `天馬行空靈感集_${designTarget}_${timestamp}.jpg`;
            
            if (subMode === 'boutiqueItems' && uploadedImage) {
                await createBoutiqueAlbumAndDownload(imagesToAlbum, uploadedImage, '精品小物靈感集', filename);
            } else {
                await createDynamicAlbumAndDownload(imagesToAlbum, filename);
            }
    
        } catch (error) {
            alert(`生成相簿失敗: ${error instanceof Error ? error.message : '未知錯誤'}`);
        } finally {
            setIsLoading(false);
            setLoadingMessage('');
        }
    };
    
    const handleSaveAllToPortfolio = async () => {
        const itemsToSave = results.filter(r => r.status === 'done' && selectedForDownload.includes(r.id));
        if (itemsToSave.length === 0) return;

        setIsLoading(true);
        setLoadingMessage(`正在儲存 ${itemsToSave.length} 張圖片至作品集...`);

        try {
            for (const item of itemsToSave) {
                 const portfolioItem: Omit<PortfolioItem, 'id' | 'timestamp'> = {
                    mode: 'imaginative',
                    imageUrl: item.imageUrl,
                    prompt: item.prompt,
                    settings: { 
                        subMode, 
                        uploadedImage,
                        generationMode,
                        item: subMode === 'virtualModel' ? (customVirtualModelType || selectedVirtualModelType) : (customConceptClothingType || selectedConceptClothingType),
                        style: item.prompt
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

    const handleAlchemyImageUpload = (e: ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const files = Array.from(e.target.files).slice(0, 4 - alchemyImages.length);
            files.forEach(file => {
                const reader = new FileReader();
                reader.onloadend = () => setAlchemyImages(prev => [...prev, reader.result as string]);
                reader.readAsDataURL(file);
            });
        }
    };
    
    const renderMultiStyleControls = () => {
        const isModel = subMode === 'virtualModel';
        const types = isModel ? VIRTUAL_MODEL_TYPES : CONCEPT_CLOTHING_TYPES;
        const selectedType = isModel ? selectedVirtualModelType : selectedConceptClothingType;
        const setSelectedType = isModel ? setSelectedVirtualModelType : setSelectedConceptClothingType;
        const customType = isModel ? customVirtualModelType : customConceptClothingType;
        const setCustomType = isModel ? setCustomVirtualModelType : setCustomConceptClothingType;

        const addStyleToList = (style = '') => {
            const newItem: GenerationItem = { id: getTimestamp() + Math.random(), type: 'text', value: style };
            if (isSingleItemMode) {
                 setItemList([newItem]);
            } else if (style && !itemList.some(item => item.value === style)) {
                 setItemList(prev => [...prev, newItem]);
            }
        };

        const handleAddTextItem = (value = '') => {
            const newItem: GenerationItem = { id: getTimestamp() + Math.random(), type: 'text', value };
            if (isSingleItemMode) { setItemList([newItem]); } else { setItemList(prev => [...prev, newItem]); }
        };
        const handleAddReferenceItem = () => {
            const newItem: GenerationItem = { id: getTimestamp() + Math.random(), type: 'image', value: '' };
            if (isSingleItemMode) { setItemList([newItem]); } else { setItemList(prev => [...prev, newItem]); }
        };
        const handleUpdateItemValue = (id: string, value: string) => {
            setItemList(prev => prev.map(item => item.id === id ? { ...item, value } : item));
        };
        const handleRemoveItem = (id: string) => {
            setItemList(prev => prev.filter(item => item.id !== id));
        };

        return (
            <>
                <h3 className="text-xl font-bold mb-2">1. 選擇或輸入{isModel ? "模特" : "服飾"}類型</h3>
                <TypeSelector types={types} selected={selectedType} setter={(v) => {setSelectedType(v); setCustomType(v);}} customValue={customType} customSetter={(v) => {setCustomType(v); setSelectedType('');}} placeholder={isModel ? "或自訂模特類型..." : "或自訂服飾類型..."} isShowcaseMode={isShowcaseMode} />
                
                <h3 className="text-xl font-bold mt-4 mb-2">2. 指定設計風格</h3>
                <p className="text-sm text-neutral-500 mb-3">點擊預設風格、手動新增，或加入參考圖。如果指定的項目數量少于生成數量，AI 將自動補全。</p>
                
                <div className="flex flex-wrap gap-2 mb-4">
                    {PRESET_STYLES.map(style => (
                        <button key={style.name} onClick={() => addStyleToList(style.name)} disabled={isLoading || (isSingleItemMode && itemList.length > 0)} className="text-sm p-2 bg-black/5 rounded-lg hover:bg-black/10 transition-colors flex items-center gap-2 disabled:opacity-50">
                            <span>{style.emoji}</span>
                            <span>{style.name}</span>
                        </button>
                    ))}
                </div>
    
                <div className="space-y-3">
                    {itemList.map((item) => (
                        <div key={item.id} className="flex items-center gap-2">
                            {item.type === 'text' ? (
                                <input
                                    type="text" value={item.value} onChange={e => handleUpdateItemValue(item.id, e.target.value)}
                                    placeholder="輸入自訂風格..."
                                    className={cn("w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#81B29A] transition", isShowcaseMode && "bg-white text-gray-900")}
                                />
                            ) : (
                                <div className="w-full p-2 border border-dashed rounded-lg bg-black/5">
                                    {item.value ? (
                                        <div className="relative group w-24 mx-auto">
                                            <img src={item.value} className="w-full rounded-md shadow-sm" alt="風格參考"/>
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
                    <button onClick={handleAddReferenceItem} disabled={isLoading || (isSingleItemMode && itemList.length > 0)} className="text-sm flex items-center gap-2 text-center text-[#3D405B] bg-transparent border-2 border-dashed border-[#BDB5AD] py-2 px-4 rounded-lg transition-colors duration-200 hover:bg-black/5 hover:border-[#3D405B] w-full justify-center disabled:opacity-50">
                        <ImageIcon /><span>增加參考圖</span>
                    </button>
                </div>


                <div className="flex items-center justify-center gap-2 my-4 text-sm text-neutral-600">
                    <input type="checkbox" id="single-item-mode" checked={isSingleItemMode} onChange={e => setIsSingleItemMode(e.target.checked)} disabled={isLoading} className="h-4 w-4 rounded border-gray-300 text-[#81B29A] focus:ring-[#81B29A]" />
                    <label htmlFor="single-item-mode" className="select-none cursor-pointer">單一風格/參考，多種變化</label>
                </div>
            </>
        );
    };
    
    if (subMode === 'select') {
        return (
            <MotionDiv 
                initial={{ opacity: 0, y: 20 }} 
                animate={{ opacity: 1, y: 0 }} 
                className="w-full max-w-6xl mx-auto bg-[#F8F5F2] rounded-2xl p-8 sm:p-12 shadow-2xl"
            >
                 <h2 className="text-5xl font-bold text-center mb-4 text-[#3D405B]">天馬行空</h2>
                 <p className="text-xl text-neutral-600 mb-10 text-center">選擇您的創作模式，讓想像力自由馳騁。</p>
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    <LightCardButton onClick={() => handleSubModeSelect('virtualModel')} emoji="🤖" title="虛擬模特" description="無需參考圖，從零開始創造人物與穿搭。" />
                    <LightCardButton onClick={() => handleSubModeSelect('conceptClothing')} emoji="👕" title="概念服飾" description="設計不存在的服飾單品，生成去背圖片。" />
                    <LightCardButton onClick={() => handleSubModeSelect('timeTravel')} emoji="⏳" title="時空旅行" description="上傳您的人像照片，穿越到不同年代。" />
                    <LightCardButton onClick={() => handleSubModeSelect('styleAlchemy')} emoji="⚗️" title="風格煉金術" description="融合多張圖片的風格，創造全新設計。" />
                    <LightCardButton onClick={() => handleSubModeSelect('boutiqueItems')} emoji="🎁" title="精品小物" description="上傳圖片，生成對應風格的文創商品。" />
                 </div>
                 <div className="mt-12 text-center">
                    <button 
                        onClick={onBack} 
                        className="text-sm text-center text-neutral-500 bg-transparent border border-neutral-400 py-2 px-4 rounded-md transition-colors duration-200 hover:bg-black/5 hover:border-neutral-600"
                    >
                        返回主選單
                    </button>
                </div>
            </MotionDiv>
        );
    }
    
    const isGenerateDisabled = () => {
        if (isLoading) return true;
        const isModel = subMode === 'virtualModel';
        switch (subMode) {
            case 'virtualModel':
            case 'conceptClothing':
                if (generationMode === 'multiStyle') {
                    const itemType = isModel ? (customVirtualModelType || selectedVirtualModelType) : (customConceptClothingType || selectedConceptClothingType);
                    if (!itemType) return true;
                    if (isSingleItemMode && itemList.length === 0) return true;
                    return false;
                } else { // multiType
                    const style = isModel ? virtualModelStyle : conceptClothingStyle;
                    return !style && !styleReferenceImage && !isMasterDesigner;
                }
            case 'timeTravel': return !uploadedImage || !(customTimeTravelEra || selectedTimeTravelEra);
            case 'styleAlchemy': return alchemyMode === 'none' || alchemyImages.length < 2 || !alchemyPrompt;
            case 'boutiqueItems':
                if (!uploadedImage) return true;
                if (isSingleBoutiqueItemMode && boutiqueItemList.filter(i => i.trim()).length === 0) return true;
                return false;
            default: return true;
        }
    };

    const renderControls = () => {
        const renderCountSelector = (currentCount: number, setter: (n: number) => void) => (
             <div className="flex items-center gap-2 my-4 justify-center">
                <label className="text-neutral-600">生成數量:</label>
                {[1, 2, 3, 4, 5, 6].map(num => <button key={num} onClick={() => setter(num)} className={cn("w-10 h-10 rounded-md border text-neutral-800 transition-colors", currentCount === num ? "bg-[#81B29A] text-white border-[#81B29A]" : "bg-white hover:border-gray-400")}>{num}</button>)}
            </div>
        );

        switch(subMode) {
            case 'virtualModel':
            case 'conceptClothing':
                const isModel = subMode === 'virtualModel';
                const types = isModel ? VIRTUAL_MODEL_TYPES : CONCEPT_CLOTHING_TYPES;
                const style = isModel ? virtualModelStyle : conceptClothingStyle;
                const setStyle = isModel ? setVirtualModelStyle : setConceptClothingStyle;
                
                const handleMultiTypeSelect = (name: string) => {
                    setMultiTypeSelection(prev => {
                        if (prev.includes(name)) {
                            return prev.filter(item => item !== name);
                        }
                        if (prev.length < 5) {
                            return [...prev, name];
                        }
                        alert('最多只能選擇 5 個預設項目。');
                        return prev;
                    });
                };
                
                return <>
                    <div className="border-b border-gray-300 mb-4 flex gap-2">
                        <button onClick={() => setGenerationMode('multiStyle')} className={cn("px-4 py-2 rounded-t-lg font-medium", generationMode === 'multiStyle' ? 'bg-white/80 text-[#81B29A]' : 'bg-transparent text-neutral-500 hover:bg-white/50')}>一物多風</button>
                        <button onClick={() => setGenerationMode('multiType')} className={cn("px-4 py-2 rounded-t-lg font-medium", generationMode === 'multiType' ? 'bg-white/80 text-[#81B29A]' : 'bg-transparent text-neutral-500 hover:bg-white/50')}>一風多物</button>
                    </div>
                    <AnimatePresence mode="wait">
                        <MotionDiv key={generationMode} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
                            {generationMode === 'multiStyle' ? (
                                renderMultiStyleControls()
                            ) : ( // multiType
                                <>
                                    <StyleInputWithReference 
                                        styleValue={style} 
                                        styleSetter={setStyle} 
                                        title="1. 輸入一種風格" 
                                        description="所有生成的物件都將採用此風格。" 
                                        placeholder="例如：賽博龐克" 
                                        referenceImage={styleReferenceImage} 
                                        onUpload={setStyleReferenceImage} 
                                        onClear={() => setStyleReferenceImage(null)} 
                                        isMaster={isMasterDesigner} 
                                        onMasterChange={setIsMasterDesigner} 
                                        disabled={isLoading} 
                                        onRandomize={async () => setStyle((await generateRandomStyles(1))[0])} 
                                        isShowcaseMode={isShowcaseMode}
                                        onOpenPortfolioPicker={() => onOpenPortfolioPicker(setStyleReferenceImage)}
                                    />
                                    <h3 className="text-xl font-bold mt-4 mb-2">2. 選擇生成項目 (最多5+1)</h3>
                                    <p className="text-sm text-neutral-500 mb-3">請選擇最多 5 個預設項目，並可額外手動輸入 1 個。AI 將根據您的選擇與生成數量，智慧組合生成內容。</p>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 mb-2">
                                        {types.map(t => (
                                            <button key={t.name} onClick={() => handleMultiTypeSelect(t.name)} className={cn("flex flex-col items-center justify-center gap-2 p-3 bg-black/5 rounded-lg hover:bg-black/10 transition-all", multiTypeSelection.includes(t.name) ? "ring-2 ring-[#81B29A] font-semibold text-neutral-800" : "text-neutral-700", multiTypeSelection.length >= 5 && !multiTypeSelection.includes(t.name) && "opacity-50 cursor-not-allowed")}>
                                                {t.icon} <span className="text-sm">{t.name}</span>
                                            </button>
                                        ))}
                                    </div>
                                    <input 
                                        type="text"
                                        value={multiTypeCustom} 
                                        onChange={e => setMultiTypeCustom(e.target.value)} 
                                        placeholder="額外輸入一個自訂項目..."
                                        className={cn("w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#81B29A] transition mt-2", isShowcaseMode && "bg-white text-gray-900")} 
                                    />
                                </>
                            )}
                        </MotionDiv>
                    </AnimatePresence>
                    {renderCountSelector(count, setCount)}
                </>;
            case 'timeTravel': return <>
                <h3 className="text-xl font-bold mb-2">1. 上傳您的照片</h3>
                <label htmlFor="tt-upload" className="cursor-pointer block mb-4"><ImageCard status="done" imageUrl={uploadedImage ?? undefined} /></label>
                <input id="tt-upload" type="file" className="hidden" accept="image/*" onChange={e => { if (e.target.files?.[0]) { const reader = new FileReader(); reader.onloadend = () => setUploadedImage(reader.result as string); reader.readAsDataURL(e.target.files[0]); }}} />
                <h3 className="text-xl font-bold mt-4 mb-2">2. 選擇或輸入一個年代</h3>
                <TypeSelector 
                    types={TIME_TRAVEL_ERAS.map(e => ({ name: e, icon: <></> }))}
                    selected={selectedTimeTravelEra}
                    setter={(val) => {
                        setSelectedTimeTravelEra(val);
                        setCustomTimeTravelEra(val);
                    }}
                    customValue={customTimeTravelEra}
                    customSetter={(val) => {
                        setCustomTimeTravelEra(val);
                        setSelectedTimeTravelEra('');
                    }}
                    placeholder="或自訂年代/風格..."
                    isShowcaseMode={isShowcaseMode}
                />
                {renderCountSelector(count, setCount)}
            </>;
            case 'boutiqueItems':
                const addBoutiqueItemToList = (name: string) => {
                    if (isSingleBoutiqueItemMode) {
                        setBoutiqueItemList([name]);
                    } else if (!boutiqueItemList.includes(name)) {
                        setBoutiqueItemList(prev => [...prev, name]);
                    }
                };
                const handleSingleBoutiqueToggle = (checked: boolean) => {
                    setIsSingleBoutiqueItemMode(checked);
                    if (checked && boutiqueItemList.length > 1) {
                        setBoutiqueItemList(prev => [prev[0] || '']);
                    }
                };

                return <>
                    <h3 className="text-xl font-bold mb-2">1. 上傳您的穿搭照片</h3>
                    <label htmlFor="bi-upload" className="cursor-pointer block mb-4"><ImageCard status="done" imageUrl={uploadedImage ?? undefined} /></label>
                    <input id="bi-upload" type="file" className="hidden" accept="image/*" onChange={e => { if (e.target.files?.[0]) { const reader = new FileReader(); reader.onloadend = () => setUploadedImage(reader.result as string); reader.readAsDataURL(e.target.files[0]); }}} />
                    
                    <h3 className="text-xl font-bold mt-4 mb-2">2. 選擇或建立想生成的精品小物</h3>
                    <p className="text-sm text-neutral-500 mb-3">點擊預設項目，或手動新增。如果清單項目少於生成数量，AI 將自動補全。</p>

                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 mb-4">
                        {BOUTIQUE_ITEM_TYPES.map(t => (
                            <button key={t.name} onClick={() => addBoutiqueItemToList(t.name)} disabled={isLoading || (isSingleBoutiqueItemMode && boutiqueItemList.length > 0 && !boutiqueItemList.includes(t.name))} className="flex flex-col items-center justify-center gap-2 p-3 bg-black/5 rounded-lg hover:bg-black/10 transition-colors disabled:opacity-50">
                                {t.icon}
                                <span className="text-sm text-neutral-800">{t.name}</span>
                            </button>
                        ))}
                    </div>

                    <ItemListManager items={boutiqueItemList} setItems={setBoutiqueItemList} isSingleItemMode={isSingleBoutiqueItemMode} placeholder="輸入自訂小物..." isShowcaseMode={isShowcaseMode} />

                    <div className="flex items-center justify-center gap-2 my-4 text-sm text-neutral-600">
                        <input type="checkbox" id="single-boutique-mode" checked={isSingleBoutiqueItemMode} onChange={e => handleSingleBoutiqueToggle(e.target.checked)} disabled={isLoading} className="h-4 w-4 rounded border-gray-300 text-[#81B29A] focus:ring-[#81B29A]" />
                        <label htmlFor="single-boutique-mode" className="select-none cursor-pointer">單一項目，多種變化</label>
                    </div>
                
                    {renderCountSelector(count, setCount)}
                </>;
            case 'styleAlchemy':
                return <>
                    <h3 className="text-xl font-bold mb-2">1. 選擇創造類型</h3>
                    <div className="grid grid-cols-2 gap-4 mb-4">
                        <button onClick={() => setAlchemyMode('outfit')} className={cn("flex flex-col items-center justify-center gap-2 p-3 bg-black/5 rounded-lg hover:bg-black/10 transition-all", alchemyMode === 'outfit' ? "ring-2 ring-[#81B29A] font-semibold text-neutral-800" : "text-neutral-700")}>
                            <ShirtIcon /><span>穿搭</span>
                        </button>
                        <button onClick={() => setAlchemyMode('accessory')} className={cn("flex flex-col items-center justify-center gap-2 p-3 bg-black/5 rounded-lg hover:bg-black/10 transition-all", alchemyMode === 'accessory' ? "ring-2 ring-[#81B29A] font-semibold text-neutral-800" : "text-neutral-700")}>
                            <GlassesIcon /><span>配件</span>
                        </button>
                    </div>

                    <AnimatePresence>
                        {alchemyMode !== 'none' && (
                             <MotionDiv initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.3 }}>
                                <h3 className="text-xl font-bold mb-2 mt-4">2. 上傳 2-4 張風格參考圖</h3>
                                <div className="grid grid-cols-2 gap-2 mb-2">
                                    {alchemyImages.map((img, i) => <div key={i} className="relative group"><img src={img} className="w-full aspect-square object-cover rounded-md"/><button onClick={() => setAlchemyImages(p => p.filter((_, idx) => idx !== i))} className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full h-5 w-5 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100">X</button></div>)}
                                    {alchemyImages.length < 4 && <label htmlFor="sa-upload" className="cursor-pointer aspect-square bg-black/5 rounded-md flex items-center justify-center text-neutral-400 hover:bg-black/10 text-3xl">+</label>}
                                    <input id="sa-upload" type="file" multiple className="hidden" accept="image/*" onChange={handleAlchemyImageUpload} />
                                </div>
                                 <button onClick={() => onOpenPortfolioPicker((url) => setAlchemyImages(p => [...p, url]))} disabled={alchemyImages.length >= 4} className="text-sm w-full text-center text-[#3D405B] bg-transparent border-2 border-dashed border-[#BDB5AD] py-2 px-4 rounded-lg transition-colors duration-200 hover:bg-black/5 hover:border-[#3D405B] disabled:opacity-50 mb-4">
                                    從作品集選取
                                </button>
                                <h3 className="text-xl font-bold mt-4 mb-2">3. 描述您想創造的{alchemyMode === 'outfit' ? '穿搭' : '配件'}</h3>
                                <input value={alchemyPrompt} onChange={e => setAlchemyPrompt(e.target.value)} placeholder={alchemyMode === 'outfit' ? '例如：一位女性模特的全身穿搭' : '例如：一副太陽眼鏡'} className={cn("w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#81B29A] transition", isShowcaseMode && "bg-white text-gray-900")} />
                                {renderCountSelector(alchemyCount, setAlchemyCount)}
                            </MotionDiv>
                        )}
                    </AnimatePresence>
                </>;
        }
        return null;
    }
    
    const renderResultsHeader = () => (
        <div className="flex items-center gap-4 mb-4">
            <div className="flex items-center gap-2">
                <input type="checkbox" id="select-all" checked={allSelected} onChange={handleSelectAll} disabled={results.filter(r => r.status === 'done').length === 0} className="h-5 w-5 rounded border-gray-400 text-[#81B29A] focus:ring-[#81B29A]" />
                <label htmlFor="select-all" className="text-neutral-700 font-medium cursor-pointer">全選</label>
            </div>
             <button onClick={handleSaveAllToPortfolio} disabled={isLoading || selectedForDownload.length === 0} className="flex items-center gap-2 text-sm text-center text-[#3D405B] bg-transparent border-2 border-[#BDB5AD] py-2 px-4 rounded-lg transition-colors duration-200 hover:bg-black/5 hover:border-[#3D405B] disabled:opacity-50">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/></svg>
                <span>全部存入作品集 ({selectedForDownload.length})</span>
             </button>
        </div>
    );

    return (
        <MotionDiv initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full max-w-7xl mx-auto">
             <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-start">
                <div className={cn("lg:col-span-2", mainPanelClasses)}>
                    {renderControls()}
                    <button onClick={handleGenerate} disabled={isGenerateDisabled()} className={primaryButtonClasses + " w-full mt-6"}>
                        {isLoading ? (loadingMessage || '生成中...') : '開始生成'}
                    </button>
                </div>

                 <div className={cn("lg:col-span-3", mainPanelClasses)}>
                    <h3 className="text-2xl font-bold mb-4">生成結果</h3>
                    {results.length === 0 ? <p className="text-center py-16 text-neutral-500">完成設定後點擊「開始生成」。</p> :
                    <>
                         {renderResultsHeader()}
                        <div className={cn("grid gap-4", results.length > 1 ? "grid-cols-2" : "grid-cols-1 max-w-md mx-auto")}>
                            <AnimatePresence>
                            {results.map(r => 
                                <MotionDiv key={r.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                                    <ImageCard imageUrl={r.imageUrl} status={r.status} error={r.error} styleName={r.prompt} onSelect={() => toggleDownloadSelection(r.id)} isSelected={selectedForDownload.includes(r.id)} onSave={r.status === 'done' ? () => onSave({ mode: 'imaginative', imageUrl: r.imageUrl, prompt: r.prompt, settings: { subMode, uploadedImage }}) : undefined} keepAspectRatio={true} showCheckbox={true} onCheckboxChange={() => toggleDownloadSelection(r.id)} />
                                </MotionDiv>
                            )}
                            </AnimatePresence>
                        </div>
                        {results.some(r => r.status === 'done') &&
                            <div className="mt-6 text-center border-t pt-6 flex flex-col items-center gap-4">
                                <p className="text-neutral-600">勾選滿意的圖片，然後下載。</p>
                                <div className="flex flex-wrap justify-center gap-4">
                                    <button onClick={handleDownloadAlbum} disabled={isLoading || selectedForDownload.length === 0} className={secondaryButtonClasses}>下載相簿 ({selectedForDownload.length})</button>
                                    <button onClick={handleDownloadZip} disabled={isLoading || selectedForDownload.length === 0} className={secondaryButtonClasses}>打包下載 (ZIP) ({selectedForDownload.length})</button>
                                </div>
                            </div>
                        }
                    </>
                    }
                 </div>
             </div>

             <div className="mt-8 flex justify-between items-center w-full">
                <button onClick={onBack} className={backButtonClasses}>返回主選單</button>
                <button onClick={() => handleSubModeSelect('select')} className={backButtonClasses}>返回創作模式</button>
            </div>
        </MotionDiv>
    );
};

export default ImaginativeModule;
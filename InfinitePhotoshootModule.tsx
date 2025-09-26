/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState, ChangeEvent, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { generateVariations, editImage, generateSuggestedPrompts, generateSingleSuggestedCategory, describeImageForAlbum } from './services/geminiService';
import ImageCard from './components/PolaroidCard';
import { cn, getTimestamp } from './lib/utils';
import { createZipAndDownload } from './lib/zipUtils';
import { createPdfAlbumAndDownload, centerCropImage, resizeImageForAnalysis } from './lib/albumUtils';
import { PortfolioItem } from './services/dbService';

const MotionDiv = motion.div as any;

const primaryButtonClasses = "text-lg text-center text-white bg-[#5D5D81] py-3 px-8 rounded-lg transition-colors duration-200 hover:bg-[#4C4C6A] shadow-sm disabled:opacity-50 disabled:cursor-not-allowed";
const secondaryButtonClasses = "text-lg text-center bg-transparent border-2 border-[#BDB5AD] py-3 px-8 rounded-lg transition-colors duration-200 disabled:opacity-50";
const tertiaryButtonClasses = "text-sm text-center bg-transparent border py-2 px-4 rounded-md transition-colors duration-200 disabled:opacity-50";

const DiceIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><path d="M16 8h.01"></path><path d="M12 12h.01"></path><path d="M8 16h.01"></path><path d="M8 8h.01"></path><path d="M16 16h.01"></path></svg>;

const VARIATION_CATEGORIES = [
    { id: 'style', name: '風格' }, { id: 'era', name: '年代' },
    { id: 'scene', name: '場景' }, { id: 'trend', name: '潮流' },
    { id: 'brand', name: '品牌' }, { id: 'country', name: '國家' },
    { id: 'photography', name: '攝影' }, { id: 'color', name: '色調' },
    { id: 'fabric', name: '材質' }, { id: 'fantasy', name: '奇幻' },
    { id: 'occupation', name: '職業' }, { id: 'art', name: '藝術' },
];

const CARD_COLORS = [
    'from-red-100 to-red-200 border-red-300 bg-red-500',
    'from-blue-100 to-blue-200 border-blue-300 bg-blue-500',
    'from-green-100 to-green-200 border-green-300 bg-green-500',
    'from-yellow-100 to-yellow-200 border-yellow-300 bg-yellow-500',
    'from-purple-100 to-purple-200 border-purple-300 bg-purple-500',
    'from-pink-100 to-pink-200 border-pink-300 bg-pink-500',
];

interface SuggestionCard {
    title: string;
    description: string;
    prompt: string;
    color: string;
}

interface Result {
    id: string;
    imageUrl: string;
    prompt: string;
    description: string;
    color: string;
    status: 'pending' | 'done' | 'error';
    error?: string;
}

interface CustomImage {
    id: string;
    originalUrl: string;
    croppedUrl: string;
    title?: string;
    description?: string;
    status: 'ready' | 'tagging' | 'tagged' | 'error';
    error?: string;
}

interface CropperProps {
    imageUrl: string;
    aspectRatio: number; // width / height
    onCrop: (dataUrl: string) => void;
    onCancel: () => void;
}

const Cropper = ({ imageUrl, aspectRatio, onCrop, onCancel }: CropperProps) => {
    const imageRef = useRef<HTMLImageElement | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
    const [crop, setCrop] = useState({ x: 0, y: 0, width: 0, height: 0 });
    const [displayScale, setDisplayScale] = useState(1);

    useEffect(() => {
        const image = new Image();
        image.src = imageUrl;
        image.onload = () => {
            imageRef.current = image;
            const { naturalWidth, naturalHeight } = image;
            setImageSize({ width: naturalWidth, height: naturalHeight });

            const imageAspectRatio = naturalWidth / naturalHeight;
            const cropTargetAspectRatio = aspectRatio;

            let cropWidth, cropHeight;
            
            if (imageAspectRatio > cropTargetAspectRatio) {
                // Image is wider than crop box -> fit to height
                cropHeight = naturalHeight;
                cropWidth = naturalHeight * cropTargetAspectRatio;
            } else {
                // Image is taller or same aspect -> fit to width
                cropWidth = naturalWidth;
                cropHeight = naturalWidth / cropTargetAspectRatio;
            }
           
            const initialX = (naturalWidth - cropWidth) / 2;
            const initialY = (naturalHeight - cropHeight) / 2;
            setCrop({
                x: Math.round(initialX),
                y: Math.round(initialY),
                width: Math.round(cropWidth),
                height: Math.round(cropHeight),
            });
        };
    }, [imageUrl, aspectRatio]);
    
    useEffect(() => {
        const calculateScale = () => {
            if (containerRef.current && imageSize.width > 0) {
                const containerWidth = containerRef.current.offsetWidth;
                setDisplayScale(containerWidth / imageSize.width);
            }
        };
        calculateScale();
        window.addEventListener('resize', calculateScale);
        return () => window.removeEventListener('resize', calculateScale);
    }, [imageSize.width]);

    const handleXChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setCrop(prev => ({ ...prev, x: Number(e.target.value) }));
    };

    const handleYChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setCrop(prev => ({ ...prev, y: Number(e.target.value) }));
    };

    const handleCrop = () => {
        const image = imageRef.current;
        if (!image || !crop.width) return;

        const canvas = document.createElement('canvas');
        const finalWidth = 1024;
        canvas.width = finalWidth;
        canvas.height = Math.round(finalWidth / aspectRatio);

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.drawImage(
            image,
            crop.x, crop.y,
            crop.width, crop.height,
            0, 0,
            canvas.width, canvas.height
        );
        onCrop(canvas.toDataURL('image/jpeg', 0.9));
    };
    
    const scaledCrop = {
        x: crop.x * displayScale,
        y: crop.y * displayScale,
        width: crop.width * displayScale,
        height: crop.height * displayScale,
    };
    const displaySize = {
        width: imageSize.width * displayScale,
        height: imageSize.height * displayScale,
    };
    const maxX = imageSize.width - crop.width;
    const maxY = imageSize.height - crop.height;

    return (
        <MotionDiv initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/80 z-[100] flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-3xl text-center text-white mb-4">
                <h3 className="text-2xl font-bold">裁切圖片</h3>
                <p>使用滑桿調整 1:1.4 裁切框的位置。</p>
            </div>
            <div
                ref={containerRef}
                className="w-full max-w-3xl bg-gray-900 relative overflow-hidden"
                style={{ height: imageSize.width > 0 ? `${displaySize.height}px` : '400px' }}
            >
                {imageSize.width > 0 && (
                    <>
                        <img
                            src={imageUrl}
                            className="absolute top-0 left-0"
                            style={{ width: displaySize.width, height: displaySize.height }}
                            draggable={false}
                        />
                        <div className="absolute inset-0 pointer-events-none">
                            {/* Mask Overlay */}
                            <div className="absolute bg-black/60" style={{ top: 0, left: 0, width: '100%', height: scaledCrop.y }} />
                            <div className="absolute bg-black/60" style={{ top: scaledCrop.y + scaledCrop.height, left: 0, width: '100%', bottom: 0 }} />
                            <div className="absolute bg-black/60" style={{ top: scaledCrop.y, left: 0, width: scaledCrop.x, height: scaledCrop.height }} />
                            <div className="absolute bg-black/60" style={{ top: scaledCrop.y, left: scaledCrop.x + scaledCrop.width, right: 0, height: scaledCrop.height }} />
                            {/* Crop Frame */}
                            <div className="absolute border-4 border-white/80 border-dashed" style={{
                                top: scaledCrop.y,
                                left: scaledCrop.x,
                                width: scaledCrop.width,
                                height: scaledCrop.height,
                            }} />
                        </div>
                    </>
                )}
            </div>
            <div className="w-full max-w-3xl flex flex-col gap-3 mt-4 text-white p-4 bg-black/20 rounded-lg">
                 <div className="flex items-center gap-3">
                    <label htmlFor="x-slider" className="w-12 text-sm">X 軸</label>
                    <input id="x-slider" type="range" min="0" max={maxX > 0 ? maxX : 0} value={crop.x} onChange={handleXChange} className="w-full" disabled={maxX <= 0} />
                    <input type="number" value={crop.x} onChange={handleXChange} className="w-20 bg-gray-700 p-1 rounded text-center" disabled={maxX <= 0}/>
                </div>
                <div className="flex items-center gap-3">
                    <label htmlFor="y-slider" className="w-12 text-sm">Y 軸</label>
                    <input id="y-slider" type="range" min="0" max={maxY > 0 ? maxY : 0} value={crop.y} onChange={handleYChange} className="w-full" disabled={maxY <= 0} />
                    <input type="number" value={crop.y} onChange={handleYChange} className="w-20 bg-gray-700 p-1 rounded text-center" disabled={maxY <= 0}/>
                </div>
            </div>
            <div className="flex gap-4 mt-6">
                <button onClick={onCancel} className={secondaryButtonClasses + " !text-white !border-white/50"}>取消</button>
                <button onClick={handleCrop} className={primaryButtonClasses}>確認裁切</button>
            </div>
        </MotionDiv>
    );
};

type Mode = 'variation' | 'standard' | 'custom';

const InfinitePhotoshootModule = ({ onBack, onSave, initialImage, onOpenPortfolioPicker, isShowcaseMode }: { onBack: () => void; onSave: (item: Omit<PortfolioItem, 'id' | 'timestamp'>) => void; initialImage: string | null; onOpenPortfolioPicker: (callback: (imageUrl: string) => void) => void; isShowcaseMode: boolean; }) => {
    const [originalImage, setOriginalImage] = useState<string | null>(null);
    const [croppedImage, setCroppedImage] = useState<string | null>(initialImage || null);
    const [isCropping, setIsCropping] = useState(false);

    const [mode, setMode] = useState<Mode>('variation');
    const [cardCount, setCardCount] = useState<number>(6);
    
    // Variation Mode State
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [customCategory, setCustomCategory] = useState('');
    const [suggestionCards, setSuggestionCards] = useState<SuggestionCard[]>([]);
    const [keepOriginalOutfit, setKeepOriginalOutfit] = useState(false);
    
    // Standard Mode State
    const [scenePrompt, setScenePrompt] = useState('');
    const [stylePrompt, setStylePrompt] = useState('');
    const [suggestedScenes, setSuggestedScenes] = useState<string[]>([]);
    const [suggestedStyles, setSuggestedStyles] = useState<string[]>([]);
    const [isSuggestionsLoading, setIsSuggestionsLoading] = useState(false);
    const [isUnifiedStandardMode, setIsUnifiedStandardMode] = useState(true);

    // Custom Mode State
    const [customImages, setCustomImages] = useState<CustomImage[]>([]);
    const [isTagging, setIsTagging] = useState(false);
    
    const [results, setResults] = useState<Result[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState('');
    const [selectedForDownload, setSelectedForDownload] = useState<string[]>([]);
    const [isZipping, setIsZipping] = useState(false);

    useEffect(() => {
        if (mode === 'standard' && suggestedScenes.length === 0 && !isSuggestionsLoading) {
            const fetchStandardSuggestions = async () => {
                setIsSuggestionsLoading(true);
                try {
                    const [scenes, styles] = await Promise.all([
                        generateSuggestedPrompts('scene', 10),
                        generateSuggestedPrompts('style', 10)
                    ]);
                    setSuggestedScenes(scenes);
                    setSuggestedStyles(styles);
                } catch (error) {
                    console.error("Failed to fetch standard mode suggestions:", error);
                    alert('獲取標準模式建議失敗。');
                } finally {
                    setIsSuggestionsLoading(false);
                }
            };
            fetchStandardSuggestions();
        }
    }, [mode, isSuggestionsLoading, suggestedScenes.length]);

    const handleImageUpload = (e: ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setOriginalImage(reader.result as string);
                setIsCropping(true);
                setSelectedCategory(null);
                setSuggestionCards([]);
                setResults([]);
                setSelectedForDownload([]);
            };
            reader.readAsDataURL(e.target.files[0]);
        }
    };

    const handleCustomImagesUpload = async (e: ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const files = Array.from(e.target.files as FileList).slice(0, 20);
            if (files.length < 4) {
                alert('請至少上傳 4 張圖片。');
                return;
            }
            setIsLoading(true);
            setLoadingMessage('正在處理圖片...');
            const cropPromises = files.map(file => new Promise<CustomImage | null>((resolve) => {
                const reader = new FileReader();
                reader.onloadend = async () => {
                    try {
                        const originalUrl = reader.result as string;
                        const croppedUrl = await centerCropImage(originalUrl, 1 / 1.4);
                        resolve({ id: getTimestamp() + Math.random(), originalUrl, croppedUrl, status: 'ready' });
                    } catch (error) {
                        console.error("Error cropping image:", error);
                        resolve(null);
                    }
                };
                reader.readAsDataURL(file);
            }));
            const newImages = (await Promise.all(cropPromises)).filter((img): img is CustomImage => img !== null);
            setCustomImages(newImages);
            setIsLoading(false);
            setLoadingMessage('');
        }
    };
    
    const handleCropConfirm = (dataUrl: string) => {
        setCroppedImage(dataUrl);
        setIsCropping(false);
    };

    const handleCropCancel = () => {
        setOriginalImage(null);
        setIsCropping(false);
    };

    const handleFullReset = () => {
        setOriginalImage(null);
        setCroppedImage(null);
        setIsCropping(false);
        setResults([]);
        setSuggestionCards([]);
        setCustomImages([]);
        setSelectedForDownload([]);
        setKeepOriginalOutfit(false);
        setIsUnifiedStandardMode(true);
    };
    
    const fetchSuggestions = async (category: string) => {
        setIsLoading(true);
        setLoadingMessage('正在抽取靈感卡...');
        setSuggestionCards([]);
        setResults([]);
        try {
            const variations = await generateVariations(category, cardCount);
            const cards = variations.map((v, i) => ({
                ...v,
                color: CARD_COLORS[i % CARD_COLORS.length],
            }));
            setSuggestionCards(cards);
        } catch (error) {
            alert(`無法獲取建議: ${error instanceof Error ? error.message : '未知錯誤'}`);
            setSelectedCategory(null);
        } finally {
            setIsLoading(false);
            setLoadingMessage('');
        }
    };

    const handleTagging = async () => {
        const imagesToTag = customImages.filter(img => selectedForDownload.includes(img.id));
        if (imagesToTag.length === 0) {
            alert('請先選擇要標記的圖片。');
            return;
        }

        setIsTagging(true);
        setLoadingMessage(`正在標記 ${imagesToTag.length} 張圖片...`);

        setCustomImages(prev => prev.map(img => selectedForDownload.includes(img.id) ? { ...img, status: 'tagging' } : img));

        const taggingPromises = imagesToTag.map(async (image) => {
            try {
                const thumbnailUrl = await resizeImageForAnalysis(image.croppedUrl);
                const tags = await describeImageForAlbum(thumbnailUrl);
                return { ...image, ...tags, status: 'tagged' as const };
            } catch (error) {
                return { ...image, status: 'error' as const, error: error instanceof Error ? error.message : '未知錯誤' };
            }
        });
        
        const taggedResults = await Promise.all(taggingPromises);

        setCustomImages(prev => {
            const newImages = [...prev];
            taggedResults.forEach(tagged => {
                const index = newImages.findIndex(i => i.id === tagged.id);
                if (index !== -1) {
                    newImages[index] = tagged;
                }
            });
            return newImages;
        });

        setIsTagging(false);
        setLoadingMessage('');
    };

    const handleRandomizePrompts = () => {
        if (suggestedScenes.length > 0 && suggestedStyles.length > 0) {
            const randomScene = suggestedScenes[Math.floor(Math.random() * suggestedScenes.length)];
            const randomStyle = suggestedStyles[Math.floor(Math.random() * suggestedStyles.length)];
            setScenePrompt(randomScene);
            setStylePrompt(randomStyle);
        }
    };

    const handleGenerate = async () => {
        if (!croppedImage && mode !== 'custom') return;
        
        setIsLoading(true);
        setLoadingMessage('正在準備...');
        if (mode !== 'custom') {
             setSelectedForDownload([]);
             setResults([]);
        }
       
        const baseImage = croppedImage;

        try {
            if (mode === 'variation') {
                if (suggestionCards.length === 0) throw new Error("請先抽取靈感卡。");
                if (!baseImage) throw new Error("缺少參考照片。");
                const initialResults: Result[] = suggestionCards.map(card => ({
                    id: card.title, imageUrl: '', prompt: card.title, description: card.description,
                    color: card.color, status: 'pending',
                }));
                setResults(initialResults);

                setLoadingMessage('正在生成寫真系列...');
                const settledResults = await Promise.all(suggestionCards.map(async (card, i) => {
                    try {
                        const fullPrompt = keepOriginalOutfit
                            ? `**Task: Photoshoot Generation (Outfit Preservation)**\n\n**Instructions:** Redraw the person from the provided image, **strictly maintaining their exact face, identity, AND current clothing/outfit**. Your task is to change the **background, scene, and the person's pose** based on the following creative direction, as if it's a photoshoot of the same person in the same outfit but in a different setting.\n\n**Creative Direction:** ${card.prompt}\n\n**Strict Requirements:**\n1. **Outfit Preservation:** The original clothing must remain unchanged.\n2. **Identity Preservation:** Do not alter the person's face or physical characteristics.\n3. **Image-Only Output:** Your only output must be the final, generated image. Do not include any text.\n4. **Photorealistic Output:** Generate a high-quality, realistic fashion photograph.`
                            : `**Task: Photoshoot Generation**\n\n**Instructions:** Redraw the person from the provided image, maintaining their exact face and identity. Adapt their outfit and the scene based on the following creative direction.\n\n**Specific Concept:** ${card.prompt}\n\n**Strict Requirements:**\n1. **Identity Preservation:** Do not alter the person's face or physical characteristics.\n2. **Image-Only Output:** Your only output must be the final, generated image. Do not include any text.\n3. **Photorealistic Output:** Generate a high-quality, realistic fashion photograph.`;

                        const imageUrl = await editImage(baseImage, fullPrompt);
                        return { status: 'fulfilled' as const, value: imageUrl, index: i };
                    } catch (error) {
                        return { status: 'rejected' as const, reason: error, index: i };
                    }
                }));
                 const finalResults: Result[] = initialResults.map((res, i) => {
                    const settled = settledResults.find(sr => sr.index === i);
                    if (settled?.status === 'fulfilled') return { ...res, status: 'done', imageUrl: settled.value };
                    return { ...res, status: 'error', error: settled?.reason instanceof Error ? settled.reason.message : '未知錯誤' };
                });
                setResults(finalResults);

            } else if(mode === 'standard') {
                if (!baseImage) throw new Error("缺少參考照片。");
                if (isUnifiedStandardMode && (!scenePrompt || !stylePrompt)) throw new Error("在統一模式下，請輸入場景和穿著風格。");
                
                let initialResults: Result[];
                let promptsForGeneration: { scene: string; style: string }[];

                if (isUnifiedStandardMode) {
                    const description = `場景: ${scenePrompt} | 風格: ${stylePrompt}`;
                    initialResults = Array.from({ length: cardCount }, (_, i) => ({
                        id: `std-${i}`, imageUrl: '', prompt: `Variation ${i + 1}`, description: description,
                        color: CARD_COLORS[i % CARD_COLORS.length], status: 'pending'
                    }));
                    promptsForGeneration = Array(cardCount).fill({ scene: scenePrompt, style: stylePrompt });
                } else {
                    promptsForGeneration = Array.from({ length: cardCount }, () => ({
                        scene: suggestedScenes[Math.floor(Math.random() * suggestedScenes.length)],
                        style: suggestedStyles[Math.floor(Math.random() * suggestedStyles.length)],
                    }));
                    initialResults = promptsForGeneration.map((pair, i) => ({
                        id: `std-diverse-${i}`, imageUrl: '', prompt: `Variation ${i + 1}`,
                        description: `場景: ${pair.scene} | 風格: ${pair.style}`,
                        color: CARD_COLORS[i % CARD_COLORS.length], status: 'pending'
                    }));
                }
            
                setResults(initialResults);

                setLoadingMessage('正在生成寫真系列...');
                const settledResults = await Promise.all(promptsForGeneration.map(async (prompts, i) => {
                    try {
                        const fullPrompt = `**Task: Photoshoot Generation**\n\n**Instructions:** Redraw the person from the provided image, maintaining their exact face and identity. Adapt their outfit and the scene based on the following creative direction.\n\n**Scene:** ${prompts.scene}\n**Clothing Style:** ${prompts.style}\n**Creative Variation:** ${i + 1}\n\n**Strict Requirements:**\n1. **Identity Preservation:** Do not alter the person's face or physical characteristics.\n2. **Image-Only Output:** Your only output must be the final, generated image. Do not include any text.\n3. **Photorealistic Output:** Generate a high-quality, realistic fashion photograph.`;
                        const imageUrl = await editImage(baseImage, fullPrompt);
                        return { status: 'fulfilled' as const, value: imageUrl, index: i };
                    } catch (error) {
                        return { status: 'rejected' as const, reason: error, index: i };
                    }
                }));
                
                const finalResults: Result[] = initialResults.map((res, i) => {
                    const settled = settledResults.find(sr => sr.index === i);
                    if (settled?.status === 'fulfilled') return { ...res, status: 'done', imageUrl: settled.value };
                    return { ...res, status: 'error', error: settled?.reason instanceof Error ? settled.reason.message : '未知錯誤' };
                });
                setResults(finalResults);
            }
        } catch (error) {
            alert(`生成失敗: ${error instanceof Error ? error.message : '未知錯誤'}`);
            if (mode !== 'custom') setResults([]);
        } finally {
            setIsLoading(false);
            setLoadingMessage('');
        }
    };
    
    const toggleDownloadSelection = (id: string) => {
        setSelectedForDownload(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
    };

    const allSelectedIds = useMemo(() => {
        if (mode === 'custom') {
            return customImages.map(r => r.id);
        }
        return results.filter(r => r.status === 'done').map(r => r.id);
    }, [results, customImages, mode]);

    const allSelected = useMemo(() => {
        return allSelectedIds.length > 0 && allSelectedIds.every(id => selectedForDownload.includes(id));
    }, [allSelectedIds, selectedForDownload]);

    const handleSelectAll = () => {
        if (allSelected) {
            setSelectedForDownload([]);
        } else {
            setSelectedForDownload(allSelectedIds);
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
                    mode: 'infinitePhotoshoot',
                    imageUrl: item.imageUrl,
                    prompt: mode === 'standard' 
                        ? `場景: ${scenePrompt} | 風格: ${stylePrompt}` 
                        : item.prompt,
                    settings: { 
                        uploadedImage: croppedImage, 
                        mode,
                        variationCategory: mode === 'variation' ? (customCategory || selectedCategory) : undefined,
                        standardScene: mode === 'standard' ? scenePrompt : undefined,
                        standardStyle: mode === 'standard' ? stylePrompt : undefined,
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

    const handleDownloadZip = async () => {
        if (selectedForDownload.length === 0) return;

        setIsZipping(true);
        const imagesToZip = results
            .filter(r => selectedForDownload.includes(r.id) && r.status === 'done')
            .map(r => ({ url: r.imageUrl, name: `photoshoot_${r.prompt.replace(/\s+/g, '_')}` }));
            
        const theme = mode === 'variation' ? (customCategory || selectedCategory) : `${scenePrompt}-${stylePrompt}`;
        const timestamp = getTimestamp();
        const zipName = `無限寫真_${theme}_${timestamp}.zip`;
        await createZipAndDownload(imagesToZip, zipName);
        setIsZipping(false);
    };

    const handleDownloadPdfAlbum = async () => {
        if (selectedForDownload.length === 0) return;

        const updateLoading = (msg: string) => {
            setIsLoading(true);
            setLoadingMessage(msg);
        };

        try {
            let coverBaseImage: { url: string; prompt: string };
            let contentImages: { url: string; prompt: string; description: string; color: string; }[];
            let backCoverImages: string[];
            let albumTheme: string;

            if (mode === 'custom') {
                const taggedImages = customImages.filter(i => i.status === 'tagged' && selectedForDownload.includes(i.id));
                if(taggedImages.length === 0) throw new Error("請先選擇已成功標記的圖片。");

                const allTags = taggedImages.map(i => `${i.title}: ${i.description}`).join('; ');
                albumTheme = `Custom Album: ${allTags.substring(0, 100)}`;
                
                coverBaseImage = { url: taggedImages[0].croppedUrl, prompt: taggedImages[0].title! };
                contentImages = taggedImages.map((r, i) => ({ url: r.croppedUrl, prompt: r.title!, description: r.description!, color: CARD_COLORS[i % CARD_COLORS.length] }));
                backCoverImages = taggedImages.slice(0, 4).map(r => r.croppedUrl);

            } else {
                const resultsToProcess = results.filter(r => selectedForDownload.includes(r.id) && r.status === 'done');
                if (resultsToProcess.length === 0) throw new Error("沒有成功生成的圖片可供選擇。");
                
                coverBaseImage = { url: resultsToProcess[0].imageUrl, prompt: resultsToProcess[0].prompt };
                contentImages = resultsToProcess.map(r => ({ url: r.imageUrl, prompt: r.prompt, description: r.description, color: r.color }));
                backCoverImages = resultsToProcess.slice(0, 4).map(r => r.imageUrl);
                albumTheme = mode === 'variation' ? (customCategory || selectedCategory || 'Photoshoot') : (scenePrompt || 'Photoshoot');
            }
            
            const timestamp = getTimestamp();
            const filename = `無限寫真集_${albumTheme.replace(/\s+/g, '_')}_${timestamp}.pdf`;

            await createPdfAlbumAndDownload({
                coverBaseImage,
                contentImages,
                backCoverImages,
                theme: albumTheme,
                filename,
                onProgress: updateLoading,
                mode: mode,
                standardModePrompts: { scene: scenePrompt, style: stylePrompt }
            });

        } catch (error) {
            alert(`生成 PDF 寫真集失敗: ${error instanceof Error ? error.message : '未知錯誤'}`);
        } finally {
            setIsLoading(false);
            setLoadingMessage('');
        }
    };

    if (isCropping && originalImage) {
        return <Cropper imageUrl={originalImage} aspectRatio={1 / 1.4} onCrop={handleCropConfirm} onCancel={handleCropCancel} />;
    }

    if (!croppedImage && mode !== 'custom') {
        return (
            <MotionDiv initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full max-w-lg text-center mx-auto">
                 <h2 className="text-3xl font-bold text-center mb-6 text-white/90">無限寫真</h2>
                <label htmlFor="ip-upload" className="cursor-pointer group block">
                    <ImageCard status="done" />
                </label>
                <input id="ip-upload" type="file" className="hidden" accept="image/png, image/jpeg, image/webp" onChange={handleImageUpload} />
                <p className="mt-4 text-neutral-400">請上傳一張您的人像或全身照片以開始，或直接跳到自訂模式。</p>
                <div className="mt-4 flex flex-col sm:flex-row justify-center gap-4">
                    <button onClick={() => onOpenPortfolioPicker((imgUrl) => { setOriginalImage(imgUrl); setIsCropping(true); })} className={cn(secondaryButtonClasses, "!text-base", isShowcaseMode ? "text-[#3D405B] hover:border-[#3D405B]" : "text-white hover:border-white")}>從作品集選取</button>
                    <button onClick={() => setMode('custom')} className={cn(secondaryButtonClasses, "!text-base", isShowcaseMode ? "text-[#3D405B] hover:border-[#3D405B]" : "text-white hover:border-white")}>跳過並進入自訂</button>
                </div>
                <div className="mt-8 flex justify-center w-full">
                    <button onClick={onBack} className={cn(tertiaryButtonClasses, "border", isShowcaseMode ? "!text-gray-600 !border-gray-400 hover:!bg-black/5" : "text-white/80 border-white/30 hover:!border-white")}>返回主選單</button>
                </div>
            </MotionDiv>
        );
    }
    
    const renderVariationControls = () => (
        <>
            <div>
                <h3 className="text-xl font-bold mb-2 text-[#3D405B]">設定差異類別</h3>
                <div className="flex gap-2 mb-2">
                    <input
                        type="text" value={customCategory} onChange={(e) => setCustomCategory(e.target.value)}
                        placeholder="自訂類別，或由 AI 建議"
                        className={cn("w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5D5D81] transition", isShowcaseMode ? "bg-white text-gray-800" : "text-gray-800")}
                        disabled={isLoading}
                    />
                    <button
                        onClick={async () => setCustomCategory(await generateSingleSuggestedCategory())}
                        disabled={isLoading}
                        className={cn(
                            "p-2 rounded-lg transition-colors duration-200 disabled:opacity-50",
                            isShowcaseMode
                                ? "text-gray-600 bg-transparent border-2 border-gray-400 hover:bg-black/5"
                                : "text-white/80 bg-transparent border border-white/30 hover:bg-white/10"
                        )}
                        aria-label="AI 來點靈感"
                        title="AI 來點靈感"
                    >
                        <DiceIcon />
                    </button>
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {VARIATION_CATEGORIES.map(cat => (
                        <button key={cat.id} onClick={() => { setSelectedCategory(cat.name); setCustomCategory(''); }} disabled={isLoading}
                            className={cn("p-2 text-sm border-2 rounded-lg hover:border-[#3D405B] transition-colors disabled:opacity-50 font-medium", selectedCategory === cat.name && !customCategory ? "border-[#5D5D81] bg-[#5D5D81]/10 text-[#3D405B]" : "border-transparent bg-black/5 text-neutral-700")}>
                            {cat.name}
                        </button>
                    ))}
                </div>
                 <div className="flex items-center gap-2 mt-4 text-sm text-neutral-600">
                    <input 
                        type="checkbox" 
                        id="keep-outfit" 
                        checked={keepOriginalOutfit} 
                        onChange={e => setKeepOriginalOutfit(e.target.checked)} 
                        disabled={isLoading}
                        className="h-4 w-4 rounded border-gray-300 text-[#5D5D81] focus:ring-[#5D5D81]"
                    />
                    <label htmlFor="keep-outfit" className="select-none cursor-pointer">
                        保持原圖造型 <span className="text-xs opacity-70">(僅適用於全身照片)</span>
                    </label>
                </div>
            </div>
            <button onClick={() => fetchSuggestions(customCategory || selectedCategory!)} disabled={isLoading || (!customCategory && !selectedCategory)} className={primaryButtonClasses + " w-full mt-4"}>
                抽取靈感卡
            </button>
        </>
    );

    const renderStandardControls = () => (
        <>
            <div>
                <h3 className="text-xl font-bold mb-2 text-[#3D405B]">場景</h3>
                <div className="flex gap-2 mb-2">
                    <input type="text" value={scenePrompt} onChange={e => setScenePrompt(e.target.value)} placeholder="輸入場景描述..."
                        className={cn("w-full p-2 border rounded-lg focus:ring-2 focus:ring-[#5D5D81] transition", isShowcaseMode ? "bg-white text-gray-800 border-gray-300 placeholder-gray-500" : "bg-gray-800 text-white border-gray-600 placeholder-gray-400")} disabled={isLoading}/>
                    <button onClick={handleRandomizePrompts} disabled={isLoading || isSuggestionsLoading} className="p-2 text-2xl">🎲</button>
                </div>
                <div className="flex flex-wrap gap-2">
                    {suggestedScenes.map(s => <button key={s} onClick={() => setScenePrompt(s)} disabled={isLoading} className="text-xs p-2 bg-black/5 rounded-lg hover:bg-black/10 transition-colors text-neutral-700">{s}</button>)}
                </div>
            </div>
            <div>
                <h3 className="text-xl font-bold mt-4 mb-2 text-[#3D405B]">穿著風格</h3>
                <input type="text" value={stylePrompt} onChange={e => setStylePrompt(e.target.value)} placeholder="輸入風格描述..."
                    className={cn("w-full p-2 border rounded-lg focus:ring-2 focus:ring-[#5D5D81] transition mb-2", isShowcaseMode ? "bg-white text-gray-800 border-gray-300 placeholder-gray-500" : "bg-gray-800 text-white border-gray-600 placeholder-gray-400")} disabled={isLoading}/>
                <div className="flex flex-wrap gap-2">
                    {suggestedStyles.map(s => <button key={s} onClick={() => setStylePrompt(s)} disabled={isLoading} className="text-xs p-2 bg-black/5 rounded-lg hover:bg-black/10 transition-colors text-neutral-700">{s}</button>)}
                </div>
            </div>
             <div className="flex items-center gap-2 mt-4 text-sm text-neutral-600">
                <input 
                    type="checkbox" 
                    id="unified-standard-mode" 
                    checked={isUnifiedStandardMode} 
                    onChange={e => setIsUnifiedStandardMode(e.target.checked)} 
                    disabled={isLoading}
                    className="h-4 w-4 rounded border-gray-300 text-[#5D5D81] focus:ring-[#5D5D81]"
                />
                <label htmlFor="unified-standard-mode" className="select-none cursor-pointer">
                    統一抽選 (所有圖片使用相同場景與風格)
                </label>
            </div>
             <button onClick={handleGenerate} disabled={isLoading || (isUnifiedStandardMode && (!scenePrompt || !stylePrompt))} className={primaryButtonClasses + " w-full mt-4"}>
                生成寫真
            </button>
        </>
    );

    const renderCustomControls = () => (
        <>
            <h3 className="text-xl font-bold mb-2 text-[#3D405B]">上傳您的照片 (4-20張)</h3>
            <p className="text-sm text-neutral-500 mb-2">照片將被自動裁切為 1:1.4 的寫真集比例。</p>
            <input id="custom-upload" type="file" multiple accept="image/*" onChange={handleCustomImagesUpload} className="block w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-[#5D5D81]/20 file:text-[#5D5D81] hover:file:bg-[#5D5D81]/30 disabled:opacity-50" disabled={isLoading || isTagging}/>
        </>
    );

    const showSuggestionCards = suggestionCards.length > 0;
    const showResults = results.length > 0;
    const showCustomImageGrid = mode === 'custom' && customImages.length > 0;
    const successfulResultsCount = results.filter(r => r.status === 'done').length;
    const taggedCustomImagesCount = customImages.filter(i => i.status === 'tagged').length;

    const titleClasses = cn("text-4xl font-bold text-center mb-8", isShowcaseMode ? "text-gray-800" : "text-white/90");
    const backButtonClasses = cn(tertiaryButtonClasses, isShowcaseMode && "!text-gray-600 !border-gray-400 hover:!bg-black/5");
    const mainPanelClasses = cn(
        "p-6 rounded-xl shadow-md border",
        isShowcaseMode 
            ? "bg-neutral-50 border-gray-200" 
            : "bg-white/60 backdrop-blur-sm border-black/5"
    );

    return (
        <MotionDiv initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full max-w-7xl mx-auto flex flex-col items-center">
            <h2 className={titleClasses}>無限寫真</h2>
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 w-full items-start">
                <div className={cn(mainPanelClasses, "lg:col-span-2 flex flex-col gap-6 sticky top-8")}>
                    {mode !== 'custom' && (
                        <div>
                            <h3 className="text-xl font-bold mb-2 text-[#3D405B]">1. 您的參考照片</h3>
                            <ImageCard status="done" imageUrl={croppedImage} keepAspectRatio={true} />
                        </div>
                    )}
                     <div>
                        <h3 className="text-xl font-bold mb-2 text-[#3D405B]">{mode !== 'custom' ? '2. ' : ''}選擇模式</h3>
                         <div className="flex gap-2 rounded-lg bg-black/5 p-1 mb-4">
                            <button onClick={() => setMode('variation')} className={cn("w-1/3 p-2 rounded-md font-semibold transition-colors", mode === 'variation' ? "bg-white shadow text-[#5D5D81]" : "text-neutral-600 hover:bg-white/50")}>差異</button>
                            <button onClick={() => setMode('standard')} className={cn("w-1/3 p-2 rounded-md font-semibold transition-colors", mode === 'standard' ? "bg-white shadow text-[#5D5D81]" : "text-neutral-600 hover:bg-white/50")}>標準</button>
                            <button onClick={() => setMode('custom')} className={cn("w-1/3 p-2 rounded-md font-semibold transition-colors", mode === 'custom' ? "bg-white shadow text-[#5D5D81]" : "text-neutral-600 hover:bg-white/50")}>自訂</button>
                        </div>
                    </div>
                     <AnimatePresence mode="wait">
                        <MotionDiv key={mode} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4">
                            {mode === 'variation' && renderVariationControls()}
                            {mode === 'standard' && renderStandardControls()}
                            {mode === 'custom' && renderCustomControls()}
                        </MotionDiv>
                    </AnimatePresence>
                    {mode !== 'custom' && (
                        <div>
                            <h3 className="text-xl font-bold mb-2 text-[#3D405B]">生成數量: {cardCount}</h3>
                            <input type="range" min="4" max="16" value={cardCount} onChange={e => setCardCount(Number(e.target.value))} disabled={isLoading} className="w-full" />
                        </div>
                    )}
                </div>

                <div className={cn(mainPanelClasses, "lg:col-span-3 w-full")}>
                    <AnimatePresence mode="wait">
                    {isLoading && !showSuggestionCards && !showResults && !showCustomImageGrid ? (
                        <MotionDiv key="loading-suggestions" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                            <div className="text-center py-20 text-neutral-600">
                                <svg className="animate-spin h-8 w-8 text-gray-500 mx-auto mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                <p>{loadingMessage}</p>
                            </div>
                        </MotionDiv>
                    ) : isSuggestionsLoading ? (
                         <MotionDiv key="loading-suggestions-standard" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                            <div className="text-center py-20 text-neutral-600">
                                <p>AI 思考中，請稍候...</p>
                            </div>
                        </MotionDiv>
                    ) : showResults ? (
                        <MotionDiv key="results-grid" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                            <h3 className="text-2xl font-bold mb-4 text-[#3D405B]">生成結果</h3>
                             <div className="flex items-center gap-4 mb-4">
                                <div className="flex items-center gap-2">
                                    <input type="checkbox" id="select-all" checked={allSelected} onChange={handleSelectAll} disabled={successfulResultsCount === 0} className="h-5 w-5 rounded border-gray-400 text-[#5D5D81] focus:ring-[#5D5D81]" />
                                    <label htmlFor="select-all" className="text-neutral-700 font-medium cursor-pointer">全選</label>
                                </div>
                                <button onClick={handleSaveAllToPortfolio} disabled={isLoading || successfulResultsCount === 0} title="儲存選中項目至作品集" className="flex items-center gap-2 text-sm text-center text-[#3D405B] bg-transparent border-2 border-[#BDB5AD] py-2 px-4 rounded-lg transition-colors duration-200 hover:bg-black/5 hover:border-[#3D405B] disabled:opacity-50">
                                     <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/></svg>
                                    <span>儲存選中</span>
                                </button>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                {results.map(r => <ImageCard key={r.id} status={r.status} imageUrl={r.imageUrl} error={r.error} styleName={r.prompt} showCheckbox={true} onCheckboxChange={() => r.status === 'done' && toggleDownloadSelection(r.id)} isSelected={selectedForDownload.includes(r.id)} onSave={r.status === 'done' ? () => onSave({ mode: 'infinitePhotoshoot', imageUrl: r.imageUrl, prompt: r.prompt, settings: { croppedImage }}) : undefined} />)}
                            </div>
                            {successfulResultsCount > 0 && (
                                <div className="mt-6 text-center border-t pt-6 flex flex-col items-center gap-4">
                                    <p className="text-neutral-600">勾選滿意的圖片，然後下載。</p>
                                    <div className="flex flex-wrap justify-center gap-4">
                                        <button onClick={handleDownloadPdfAlbum} disabled={isZipping || isLoading || selectedForDownload.length === 0} className={secondaryButtonClasses}>下載 PDF 寫真集 ({selectedForDownload.length})</button>
                                        <button onClick={handleDownloadZip} disabled={isZipping || isLoading || selectedForDownload.length === 0} className={secondaryButtonClasses}>{isZipping ? '打包中...' : `打包下載 (ZIP) (${selectedForDownload.length})`}</button>
                                    </div>
                                </div>
                            )}
                        </MotionDiv>
                    ) : showSuggestionCards ? (
                         <MotionDiv key="suggestion-cards" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                            <h3 className="text-2xl font-bold mb-4 text-[#3D405B]">靈感卡 ({suggestionCards.length})</h3>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
                                {suggestionCards.map(card => (
                                    <div key={card.title} className={cn('p-4 rounded-lg border text-gray-800 bg-gradient-to-br', card.color)}>
                                        <h4 className="font-bold text-sm">{card.title}</h4>
                                        <p className="text-xs mt-1 opacity-80">{card.description}</p>
                                    </div>
                                ))}
                            </div>
                            <div className="flex flex-col sm:flex-row gap-4 justify-center">
                                <button onClick={() => fetchSuggestions(customCategory || selectedCategory!)} disabled={isLoading} className={secondaryButtonClasses}>再抽一次</button>
                                <button onClick={handleGenerate} disabled={isLoading} className={primaryButtonClasses}>生成寫真</button>
                            </div>
                        </MotionDiv>
                    ) : showCustomImageGrid ? (
                        <MotionDiv key="custom-grid" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                             <div className="flex items-center gap-4 mb-4">
                                <div className="flex items-center gap-2">
                                    <input type="checkbox" id="select-all" checked={allSelected} onChange={handleSelectAll} disabled={customImages.length === 0} className="h-5 w-5 rounded border-gray-400 text-[#5D5D81] focus:ring-[#5D5D81]" />
                                    <label htmlFor="select-all" className="text-neutral-700 font-medium cursor-pointer">全選</label>
                                </div>
                                <button onClick={handleTagging} disabled={isLoading || isTagging || selectedForDownload.length === 0} className={primaryButtonClasses + " !py-2 !px-4 !text-base"}>{isTagging ? '標記中...' : `開始標記 (${selectedForDownload.length})`}</button>
                            </div>
                             <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                {customImages.map(img => <ImageCard key={img.id} status={img.status === 'tagging' ? 'pending' : 'done'} imageUrl={img.croppedUrl} styleName={img.title} error={img.error} showCheckbox onCheckboxChange={() => toggleDownloadSelection(img.id)} isSelected={selectedForDownload.includes(img.id)} />)}
                            </div>
                             {taggedCustomImagesCount > 0 && (
                                <div className="mt-6 text-center border-t pt-6">
                                    <button onClick={handleDownloadPdfAlbum} disabled={isZipping || isLoading || isTagging} className={primaryButtonClasses}>生成 PDF 寫真集</button>
                                </div>
                            )}
                        </MotionDiv>
                    ) : (
                         <MotionDiv key="placeholder" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                            <div className="text-center py-20 text-neutral-500">
                                <p>請完成左側設定，開啟您的無限寫真之旅。</p>
                            </div>
                        </MotionDiv>
                    )}
                    </AnimatePresence>
                </div>
            </div>

            <div className="mt-8 flex justify-between items-center w-full">
                <button onClick={onBack} className={backButtonClasses}>返回主選單</button>
                <button onClick={handleFullReset} className={backButtonClasses}>全部重來</button>
            </div>
        </MotionDiv>
    );
};

export default InfinitePhotoshootModule;
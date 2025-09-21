/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState, ChangeEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { analyzeOutfit, extractClothingItem, critiqueAndRedesignOutfit } from './services/geminiService';
import ImageCard from './components/PolaroidCard';
import { cn } from './lib/utils';
import { PortfolioItem } from './services/dbService';
import { createZipAndDownload } from './lib/zipUtils';

const MotionDiv = motion.div as any;

const primaryButtonClasses = "text-lg text-center text-white bg-[#6A8D73] py-3 px-8 rounded-lg transition-colors duration-200 hover:bg-[#597862] shadow-sm disabled:opacity-50 disabled:cursor-not-allowed";
const secondaryButtonClasses = "text-lg text-center bg-transparent border-2 border-[#BDB5AD] py-3 px-8 rounded-lg transition-colors duration-200 disabled:opacity-50";
const tertiaryButtonClasses = "text-sm text-center bg-transparent border py-2 px-4 rounded-md transition-colors duration-200 disabled:opacity-50";

interface AnalysisResult {
    item: string;
    description: string;
    brand: string;
}

const OutfitAnalysisModule = ({ onBack, onSave, isShowcaseMode }: { onBack: () => void; onSave: (item: Omit<PortfolioItem, 'id' | 'timestamp'>) => void; isShowcaseMode: boolean; }) => {
    const [step, setStep] = useState(0); // 0: upload, 1: analysis, 2: redesign
    const [uploadedImage, setUploadedImage] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState('');
    const [analysisResult, setAnalysisResult] = useState<AnalysisResult[]>([]);
    const [extractingItemId, setExtractingItemId] = useState<string | null>(null);
    const [isExtractingAll, setIsExtractingAll] = useState(false);
    const [critique, setCritique] = useState('');
    const [redesignedImage, setRedesignedImage] = useState<string | null>(null);

    const handleImageUpload = async (dataUrl: string) => {
        setUploadedImage(dataUrl);
        setStep(1);
        setIsLoading(true);
        setLoadingMessage('正在分析您的穿搭...');
        setAnalysisResult([]);
        try {
            const result = await analyzeOutfit(dataUrl);
            setAnalysisResult(result);
        } catch (error) {
            alert(`分析失敗: ${error instanceof Error ? error.message : '未知錯誤'}`);
            handleStartOver();
        } finally {
            setIsLoading(false);
            setLoadingMessage('');
        }
    };
    
    const handleFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) {
            const reader = new FileReader();
            reader.onloadend = () => handleImageUpload(reader.result as string);
            reader.readAsDataURL(e.target.files[0]);
        }
    };

    const handleExtractItem = async (item: AnalysisResult, index: number) => {
        if (!uploadedImage) return;
        const itemId = `${item.item}-${index}`;
        setExtractingItemId(itemId);
        try {
            const extractedImageUrl = await extractClothingItem(uploadedImage, `${item.item}: ${item.description}`);
            const portfolioItem: Omit<PortfolioItem, 'id' | 'timestamp'> = {
                mode: 'outfitAnalysis',
                imageUrl: extractedImageUrl,
                prompt: `從穿搭分析提取: ${item.item}`,
                settings: {
                    subMode: 'extractedItem',
                    originalImage: uploadedImage,
                    item: item.item,
                    description: item.description,
                    brand: item.brand,
                }
            };
            await onSave(portfolioItem);
            alert(`「${item.item}」已成功提取並儲存至作品集！`);
        } catch (error) {
            alert(`提取失敗: ${error instanceof Error ? error.message : '未知錯誤'}`);
        } finally {
            setExtractingItemId(null);
        }
    };

    const handleExtractAll = async () => {
        if (!uploadedImage || analysisResult.length === 0) return;
        setIsExtractingAll(true);
        setLoadingMessage(`正在提取 ${analysisResult.length} 個單品...`);
        let successCount = 0;
        try {
            for (const item of analysisResult) {
                try {
                    const extractedImageUrl = await extractClothingItem(uploadedImage, `${item.item}: ${item.description}`);
                    const portfolioItem: Omit<PortfolioItem, 'id' | 'timestamp'> = {
                        mode: 'outfitAnalysis',
                        imageUrl: extractedImageUrl,
                        prompt: `從穿搭分析提取: ${item.item}`,
                        settings: {
                            subMode: 'extractedItem',
                            originalImage: uploadedImage,
                            item: item.item,
                            description: item.description,
                            brand: item.brand,
                        }
                    };
                    await onSave(portfolioItem);
                    successCount++;
                } catch (error) {
                    console.error(`Failed to extract ${item.item}:`, error);
                }
            }
            alert(`${successCount} / ${analysisResult.length} 個單品已成功提取並儲存至作品集！`);
        } catch (error) {
            alert(`批次提取時發生錯誤: ${error instanceof Error ? error.message : '未知錯誤'}`);
        } finally {
            setIsExtractingAll(false);
            setLoadingMessage('');
        }
    };
    
    const handleDownloadAllAsZip = async () => {
        if (!uploadedImage || analysisResult.length === 0) return;
        setIsExtractingAll(true); 
        setLoadingMessage(`正在準備 ${analysisResult.length} 個單品以供下載...`);
        try {
            const promises = analysisResult.map(async (item) => {
                try {
                    const extractedImageUrl = await extractClothingItem(uploadedImage, `${item.item}: ${item.description}`);
                    return { url: extractedImageUrl, name: item.item.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '_') };
                } catch (e) {
                    console.error(`Failed to extract ${item.item} for download:`, e);
                    return null;
                }
            });
    
            const results = (await Promise.all(promises)).filter((i): i is {url: string, name: string} => i !== null);
            
            if (results.length > 0) {
                await createZipAndDownload(results, `穿搭分析提取_${Date.now()}.zip`);
            }
            if (results.length < analysisResult.length) {
                alert(`已成功下載 ${results.length} 個單品，有 ${analysisResult.length - results.length} 個提取失敗。`);
            }
        } catch (error) {
            alert(`下載 ZIP 失敗: ${error instanceof Error ? error.message : '未知錯誤'}`);
        } finally {
            setIsExtractingAll(false);
            setLoadingMessage('');
        }
    };

    const handleProceedToRedesign = async () => {
        if (!uploadedImage) return;
        setStep(2);
        setIsLoading(true);
        setLoadingMessage('AI 造型師正在為您改造...');
        setCritique('');
        setRedesignedImage(null);
        try {
            const { critique, imageUrl } = await critiqueAndRedesignOutfit(uploadedImage);
            setCritique(critique);
            setRedesignedImage(imageUrl);
        } catch (error) {
            alert(`改造失敗: ${error instanceof Error ? error.message : '未知錯誤'}`);
            setStep(1); // Go back to analysis step on failure
        } finally {
            setIsLoading(false);
            setLoadingMessage('');
        }
    };

    const handleSaveRedesign = () => {
        if (!redesignedImage) return;
        const portfolioItem: Omit<PortfolioItem, 'id' | 'timestamp'> = {
            mode: 'outfitAnalysis',
            imageUrl: redesignedImage,
            prompt: 'AI 改造穿搭',
            settings: {
                originalImage: uploadedImage,
                critique: critique,
            }
        };
        onSave(portfolioItem);
        alert('改造後的造型已儲存至作品集！');
    };

    const handleStartOver = () => {
        setStep(0);
        setUploadedImage(null);
        setIsLoading(false);
        setLoadingMessage('');
        setAnalysisResult([]);
        setExtractingItemId(null);
        setCritique('');
        setRedesignedImage(null);
        setIsExtractingAll(false);
    };

    const renderContent = () => {
        const titleClasses = cn("text-3xl font-bold text-center mb-6", isShowcaseMode ? "text-gray-800" : "text-white/90");
        const analysisPanelClasses = cn(
            "p-6 rounded-xl shadow-md border",
            isShowcaseMode 
                ? "bg-neutral-50 border-gray-200 text-gray-800" 
                : "bg-white/80 backdrop-blur-sm border-black/5 text-gray-800"
        );
        const backButtonClasses = cn(tertiaryButtonClasses, isShowcaseMode ? "!text-gray-600 !border-gray-400 border hover:!bg-black/5" : "text-white/80 border-white/30 hover:bg-white/10");


        switch (step) {
            case 0:
                return (
                    <MotionDiv initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full max-w-lg text-center mx-auto">
                        <h2 className={titleClasses}>穿搭分析</h2>
                        <label htmlFor="oa-upload" className="cursor-pointer group block"><ImageCard status="done" /></label>
                        <input id="oa-upload" type="file" className="hidden" accept="image/*" onChange={handleFileUpload} />
                        <p className={cn("mt-4", isShowcaseMode ? "text-neutral-600" : "text-neutral-400")}>請上傳您的穿搭照片，讓 AI 進行分析。</p>
                        <div className="mt-8 flex justify-center w-full"><button onClick={onBack} className={backButtonClasses}>返回主選單</button></div>
                    </MotionDiv>
                );
            case 1:
                return (
                    <MotionDiv initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full max-w-5xl mx-auto">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                            <ImageCard status="done" imageUrl={uploadedImage!} keepAspectRatio={true} />
                            <div className={analysisPanelClasses}>
                                <h3 className="text-2xl font-bold mb-4 text-[#3D405B]">穿搭分析結果</h3>
                                {isLoading && analysisResult.length === 0 ? (
                                    <p className="text-gray-600">{loadingMessage}</p>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left border-collapse">
                                            <thead className="border-b-2 border-gray-300">
                                                <tr>
                                                    <th className="p-2 font-semibold text-xs text-gray-500 uppercase tracking-wider">項目</th>
                                                    <th className="p-2 font-semibold text-xs text-gray-500 uppercase tracking-wider">描述</th>
                                                    <th className="p-2 font-semibold text-xs text-gray-500 uppercase tracking-wider">可能品牌</th>
                                                    <th className="p-2 font-semibold text-xs text-gray-500 uppercase tracking-wider">操作</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {analysisResult.map((res, i) => {
                                                    const itemId = `${res.item}-${i}`;
                                                    const isExtracting = extractingItemId === itemId;
                                                    return (
                                                        <tr key={i} className="border-b border-gray-200 hover:bg-black/5">
                                                            <td className="p-2 font-semibold text-gray-800">{res.item}</td>
                                                            <td className="p-2 text-sm text-gray-700">{res.description}</td>
                                                            <td className="p-2 text-sm italic text-gray-600">{res.brand}</td>
                                                            <td className="p-2">
                                                                <button onClick={() => handleExtractItem(res, i)} disabled={isExtracting || isExtractingAll} className="text-xs text-[#6A8D73] font-semibold hover:underline disabled:opacity-50 disabled:no-underline">
                                                                    {isExtracting ? '提取中...' : '提取至作品集'}
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                        <p className="text-xs text-neutral-500 mt-4 italic">* 品牌名稱由 AI 生成，僅供風格參考。</p>
                                        <div className="flex flex-col sm:flex-row gap-3 mt-4">
                                            <button onClick={handleExtractAll} disabled={isLoading || isExtractingAll || analysisResult.length === 0} className={cn(secondaryButtonClasses, "w-full !text-sm !py-2", isShowcaseMode && "text-[#3D405B] hover:border-[#3D405B]")}>{isExtractingAll ? '提取中...' : '全部提取至作品集'}</button>
                                            <button onClick={handleDownloadAllAsZip} disabled={isLoading || isExtractingAll || analysisResult.length === 0} className={cn(secondaryButtonClasses, "w-full !text-sm !py-2", isShowcaseMode && "text-[#3D405B] hover:border-[#3D405B]")}>{isExtractingAll ? '處理中...' : '下載全部 ZIP'}</button>
                                        </div>
                                    </div>
                                )}
                                <div className="mt-6">
                                    <button onClick={handleProceedToRedesign} className={primaryButtonClasses + " w-full !text-base !py-2.5"} disabled={analysisResult.length === 0 || isExtractingAll}>下一步：AI 評價與改造</button>
                                </div>
                            </div>
                        </div>
                    </MotionDiv>
                );
            case 2:
                 const titleClassesRedesign = cn("text-2xl font-bold mb-4", isShowcaseMode ? "text-gray-800" : "text-white/90");
                return (
                     <MotionDiv initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full max-w-6xl mx-auto">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                            <div className="text-center">
                                <h3 className={titleClassesRedesign}>原始穿搭</h3>
                                <ImageCard status="done" imageUrl={uploadedImage!} keepAspectRatio={true} />
                            </div>
                             <div className="text-center">
                                <h3 className={titleClassesRedesign}>AI 改造建議</h3>
                                <ImageCard status={isLoading ? 'pending' : 'done'} imageUrl={redesignedImage ?? undefined} keepAspectRatio={true} onSave={redesignedImage ? handleSaveRedesign : undefined} />
                            </div>
                        </div>
                        <div className={cn(analysisPanelClasses, "mt-8")}>
                            <h3 className="text-2xl font-bold mb-2 text-[#3D405B]">AI 造型師評價</h3>
                            <p className="whitespace-pre-wrap text-gray-700">{critique || '正在生成評價...'}</p>
                        </div>
                    </MotionDiv>
                );
            default: return null;
        }
    };
    
    return (
        <div className="w-full flex flex-col items-center py-8 px-4">
            {renderContent()}
            <div className="mt-8 flex justify-between items-center w-full max-w-6xl">
                <button onClick={onBack} className={cn(tertiaryButtonClasses, "border", isShowcaseMode ? "!text-gray-600 !border-gray-400 hover:!bg-black/5" : "text-white/80 border-white/30 hover:!border-white")}>返回主選單</button>
                {step > 0 && <div className="flex gap-4">
                    <button onClick={() => setStep(prev => prev - 1)} disabled={isLoading} className={cn(tertiaryButtonClasses, "border", isShowcaseMode ? "!text-gray-600 !border-gray-400 hover:!bg-black/5" : "text-white/80 border-white/30 hover:!border-white")}>上一步</button>
                    <button onClick={handleStartOver} className={cn(tertiaryButtonClasses, "border", isShowcaseMode ? "!text-gray-600 !border-gray-400 hover:!bg-black/5" : "text-white/80 border-white/30 hover:!border-white")}>全部重來</button>
                </div>}
            </div>
             {(isLoading || isExtractingAll) && <div className="fixed inset-0 bg-black/30 z-[100] flex items-center justify-center"><div className="bg-white p-6 rounded-lg shadow-xl flex items-center gap-4 text-slate-800"><svg className="animate-spin h-6 w-6 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg><p>{loadingMessage}</p></div></div>}
        </div>
    );
};

export default OutfitAnalysisModule;
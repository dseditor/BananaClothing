/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '../lib/utils';

// FIX: Cast motion.div to any to bypass TypeScript errors related to framer-motion props.
// This is a workaround for what appears to be a local environment or type-definition issue.
const MotionDiv = motion.div as any;

type ImageStatus = 'pending' | 'done' | 'error';

interface ImageCardProps {
    imageUrl?: string;
    status: ImageStatus;
    styleName?: string;
    error?: string;
    onRegenerate?: () => void;
    onDownload?: () => void;
    onSave?: () => void;
    onSelect?: () => void;
    isMobile?: boolean;
    isSelected?: boolean;
    keepAspectRatio?: boolean;
    showCheckbox?: boolean;
    onCheckboxChange?: () => void;
}

const LoadingSpinner = ({ styleName }: { styleName?: string }) => (
    <div className="flex flex-col items-center justify-center h-full text-center text-gray-500">
        <svg className="animate-spin h-8 w-8 text-gray-400 mb-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <p>{styleName || '設計生成中...'}</p>
    </div>
);

const ErrorDisplay = ({ message }: { message?: string }) => (
    <div className="flex flex-col items-center justify-center h-full text-center text-red-500 p-4">
         <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-red-400 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p className="font-semibold">生成失敗</p>
        <p className="text-xs mt-1 text-red-400">{message || '請稍後再試一次。'}</p>
    </div>
);

const Placeholder = ({ children }: { children: React.ReactNode }) => (
    <div className="flex flex-col items-center justify-center h-full text-neutral-400 border-2 border-dashed border-neutral-300 rounded-lg">
        {children}
    </div>
);


const ImageCard: React.FC<ImageCardProps> = ({ imageUrl, status, styleName, error, onRegenerate, onDownload, onSave, onSelect, isMobile, isSelected, keepAspectRatio, showCheckbox, onCheckboxChange }) => {
    const canSelect = status === 'done' && !!onSelect;
    
    const handleCardClick = () => {
        // The main click action, typically for opening a detail view.
        // Checkbox clicks are handled separately and stop propagation.
        if (canSelect) {
            onSelect();
        } else if (showCheckbox && onCheckboxChange) {
            // Fallback for cards that are selectable but don't have a detail view
            onCheckboxChange();
        }
    };

    const cardContent = (
        <>
            {status === 'pending' && <LoadingSpinner styleName={styleName} />}
            {status === 'error' && <ErrorDisplay message={error} />}
            {status === 'done' && imageUrl && (
                 <div className="relative w-full h-full group">
                    {(isSelected && showCheckbox) ? (
                        <div onClick={(e) => { e.stopPropagation(); onCheckboxChange?.();}} className="absolute top-2 left-2 z-20 bg-[#E07A5F] border-2 border-white text-white rounded-md h-6 w-6 flex items-center justify-center shadow cursor-pointer">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                        </div>
                    ) : (isSelected && !showCheckbox) ? (
                        <div className="absolute top-2 left-2 z-20 bg-[#E07A5F] text-white rounded-full h-6 w-6 flex items-center justify-center shadow">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                        </div>
                    ) : null}

                    {showCheckbox && !isSelected && (
                         <div onClick={(e) => { e.stopPropagation(); onCheckboxChange?.();}} className="absolute top-2 left-2 z-20 bg-white/70 border-2 border-gray-400 rounded-md h-6 w-6 flex items-center justify-center shadow cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    )}
                     <img
                        key={imageUrl}
                        src={imageUrl}
                        alt={`Generated interior design: ${styleName}`}
                        className={cn(
                            "w-full transition-opacity duration-500 rounded-lg",
                            keepAspectRatio ? "h-auto" : "h-full object-cover"
                        )}
                    />
                    {styleName && (
                        <div className="absolute bottom-2 right-2 z-10">
                            <span className="text-xs font-semibold text-white bg-black/50 px-2 py-1 rounded">
                                {styleName}
                            </span>
                        </div>
                    )}
                     <div className={cn(
                        "absolute top-3 right-3 z-10 flex flex-col gap-2 transition-opacity duration-300",
                        !isMobile && "opacity-0 group-hover:opacity-100",
                    )}>
                        {onSave && (
                            <button
                                onClick={(e) => { e.stopPropagation(); onSave(); }}
                                className="p-2 bg-black/50 rounded-full text-white hover:bg-black/75 focus:outline-none focus:ring-2 focus:ring-white"
                                aria-label="保存到作品集"
                            >
                               <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/></svg>
                            </button>
                        )}
                        {onDownload && (
                            <button
                                onClick={(e) => { e.stopPropagation(); onDownload(); }}
                                className="p-2 bg-black/50 rounded-full text-white hover:bg-black/75 focus:outline-none focus:ring-2 focus:ring-white"
                                aria-label="下載圖片"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                </svg>
                            </button>
                        )}
                         {onRegenerate && (
                            <button
                                onClick={(e) => { e.stopPropagation(); onRegenerate(); }}
                                className="p-2 bg-black/50 rounded-full text-white hover:bg-black/75 focus:outline-none focus:ring-2 focus:ring-white"
                                aria-label="重新生成圖片"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.899 2.186l-1.42.71a5.002 5.002 0 00-8.479-1.554H10a1 1 0 110 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm12 14a1 1 0 01-1-1v-2.101a7.002 7.002 0 01-11.899-2.186l1.42-.71a5.002 5.002 0 008.479 1.554H10a1 1 0 110-2h6a1 1 0 011 1v6a1 1 0 01-1-1z" clipRule="evenodd" />
                                </svg>
                            </button>
                        )}
                    </div>
                </div>
            )}
            {status === 'done' && !imageUrl && (
                <Placeholder>
                     <div className="text-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                        </svg>
                        <p className="mt-2 text-sm font-medium">點擊此處開始</p>
                      </div>
                </Placeholder>
            )}
        </>
    );

    return (
        <MotionDiv 
            onClick={handleCardClick}
            className={cn(
                "bg-white/50 w-full rounded-xl shadow-md overflow-hidden transition-all relative",
                !keepAspectRatio && "aspect-square",
                isSelected && !showCheckbox && "ring-4 ring-offset-2 ring-[#E07A5F]",
                (canSelect || (showCheckbox && onCheckboxChange)) && "cursor-pointer"
            )}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
        >
            {cardContent}
        </MotionDiv>
    );
};

export default ImageCard;

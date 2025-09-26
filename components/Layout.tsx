/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState, Fragment } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { homepageCards, HomepageMode } from '../HomepageImageManager';
import { t } from '../lib/i18n';
import { cn } from '../lib/utils';

const MotionDiv = motion.div as any;

const MenuIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>;
const CloseIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>;
const HomeIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>;
const SettingsIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>;


interface LayoutProps {
    children: React.ReactNode;
    activeMode: HomepageMode | 'select';
    onSelectMode: (mode: HomepageMode) => void;
    onGoHome?: () => void;
    onOpenSettings: () => void;
    isShowcaseMode: boolean;
}

const Layout: React.FC<LayoutProps> = ({ children, activeMode, onSelectMode, onGoHome, onOpenSettings, isShowcaseMode }) => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    const handleSelect = (mode: HomepageMode) => {
        setIsMenuOpen(false);
        onSelectMode(mode);
    };

    const headerClasses = cn(
        "flex justify-between items-center p-4 flex-shrink-0 w-full z-30",
        isShowcaseMode
            ? "bg-white/80 border-b border-gray-200 backdrop-blur-sm text-black"
            : "bg-slate-900/50 backdrop-blur-sm text-white"
    );

    const menuPanelClasses = cn(
        "fixed top-0 left-0 h-full w-full max-w-xs z-50 flex flex-col",
         isShowcaseMode ? "bg-white text-black" : "bg-slate-800 text-white"
    );
    
    const menuItemClasses = (id: string) => cn(
        "flex items-center gap-4 p-3 rounded-lg cursor-pointer transition-colors w-full text-left",
        activeMode === id 
            ? (isShowcaseMode ? "bg-gray-100 text-black font-semibold" : "bg-white/10 text-white font-semibold")
            : (isShowcaseMode ? "hover:bg-gray-100" : "hover:bg-white/5")
    );


    return (
        <div className="w-full h-screen flex flex-col">
            <header className={headerClasses}>
                <button onClick={() => setIsMenuOpen(true)} className="p-2">
                    <MenuIcon />
                </button>
                <h1 className="text-lg font-bold tracking-widest uppercase absolute left-1/2 -translate-x-1/2">
                    香蕉時尚設計箱
                </h1>
                <div className="flex items-center gap-1 sm:gap-2">
                     <button onClick={onOpenSettings} className="p-2" aria-label="Settings">
                        <SettingsIcon />
                    </button>
                    {onGoHome && (
                        <button onClick={onGoHome} className="p-2 text-sm flex items-center gap-2">
                            <HomeIcon />
                            <span className="hidden sm:inline">主選單</span>
                        </button>
                    )}
                </div>
            </header>

            <AnimatePresence>
                {isMenuOpen && (
                    <>
                        <MotionDiv
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.3 }}
                            className="fixed inset-0 bg-black/50 z-40"
                            onClick={() => setIsMenuOpen(false)}
                        />
                        <MotionDiv
                            initial={{ x: '-100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '-100%' }}
                            transition={{ type: 'tween', duration: 0.3, ease: 'easeInOut' }}
                            className={menuPanelClasses}
                        >
                            <div className="flex justify-between items-center p-4 border-b" style={{borderColor: isShowcaseMode ? 'rgb(229 231 235)' : 'rgba(255,255,255,0.1)'}}>
                                <h2 className="text-lg font-bold tracking-widest uppercase">Modules</h2>
                                <button onClick={() => setIsMenuOpen(false)} className="p-2"><CloseIcon /></button>
                            </div>
                            <nav className="flex-grow overflow-y-auto p-4">
                                <ul className="space-y-2">
                                    {homepageCards.map(item => (
                                        <li key={item.id}>
                                            <button className={menuItemClasses(item.id)} onClick={() => handleSelect(item.id)}>
                                                <span className="text-2xl w-8 text-center">{item.emoji}</span>
                                                <span className="font-medium">{item.title}</span>
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            </nav>
                        </MotionDiv>
                    </>
                )}
            </AnimatePresence>

            <div className="flex-grow overflow-y-auto relative z-10">
                {children}
            </div>
        </div>
    );
};

export default Layout;
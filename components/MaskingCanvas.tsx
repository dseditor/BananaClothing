/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useRef, useEffect, useState, useImperativeHandle, forwardRef } from 'react';

interface MaskingCanvasProps {
    baseImage: string;
}

const MaskingCanvas = forwardRef(({ baseImage }: MaskingCanvasProps, ref) => {
    const imageCanvasRef = useRef<HTMLCanvasElement>(null);
    const drawingCanvasRef = useRef<HTMLCanvasElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [brushSize, setBrushSize] = useState(40);
    const [isErasing, setIsErasing] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    // Expose a method to the parent to get the mask data URL
    useImperativeHandle(ref, () => ({
        getMask: (): string | null => {
            const canvas = drawingCanvasRef.current;
            const ctx = canvas?.getContext('2d');
            if (!canvas || !ctx) return null;

            // Create a new canvas to generate the black and white mask
            const maskCanvas = document.createElement('canvas');
            maskCanvas.width = canvas.width;
            maskCanvas.height = canvas.height;
            const maskCtx = maskCanvas.getContext('2d');

            if(!maskCtx) return null;

            // Fill with white (the area to keep)
            maskCtx.fillStyle = 'white';
            maskCtx.fillRect(0, 0, maskCanvas.width, maskCanvas.height);
            
            // Draw the user's mask in black (the area to change)
            maskCtx.globalCompositeOperation = 'source-atop';
            maskCtx.drawImage(canvas, 0, 0);
            
            // Invert to make the drawn area black
            maskCtx.globalCompositeOperation = 'source-in';
            maskCtx.fillStyle = 'black';
            maskCtx.fillRect(0, 0, maskCanvas.width, maskCanvas.height);

            return maskCanvas.toDataURL('image/png');
        }
    }));

    useEffect(() => {
        const image = new Image();
        image.crossOrigin = 'anonymous';
        image.src = baseImage;
        image.onload = () => {
            const container = containerRef.current;
            const imageCanvas = imageCanvasRef.current;
            const drawingCanvas = drawingCanvasRef.current;
            if (!container || !imageCanvas || !drawingCanvas) return;
            
            const containerWidth = container.offsetWidth;
            const aspectRatio = image.width / image.height;
            const canvasHeight = containerWidth / aspectRatio;
            container.style.height = `${canvasHeight}px`;

            [imageCanvas, drawingCanvas].forEach(canvas => {
                canvas.width = image.width;
                canvas.height = image.height;
                canvas.style.width = `${containerWidth}px`;
                canvas.style.height = `${canvasHeight}px`;
            });

            const imageCtx = imageCanvas.getContext('2d');
            imageCtx?.drawImage(image, 0, 0);
        };
    }, [baseImage]);

    const getCoords = (e: React.MouseEvent | React.TouchEvent) => {
        const canvas = drawingCanvasRef.current;
        if (!canvas) return { x: 0, y: 0 };
        const rect = canvas.getBoundingClientRect();
        const touch = (e as React.TouchEvent).touches?.[0];
        const clientX = touch ? touch.clientX : (e as React.MouseEvent).clientX;
        const clientY = touch ? touch.clientY : (e as React.MouseEvent).clientY;

        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;

        return {
            x: (clientX - rect.left) * scaleX,
            y: (clientY - rect.top) * scaleY,
        };
    };

    const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
        e.preventDefault();
        setIsDrawing(true);
        draw(e);
    };

    const stopDrawing = (e: React.MouseEvent | React.TouchEvent) => {
        e.preventDefault();
        setIsDrawing(false);
        const ctx = drawingCanvasRef.current?.getContext('2d');
        ctx?.beginPath();
    };

    const draw = (e: React.MouseEvent | React.TouchEvent) => {
        if (!isDrawing) return;
        e.preventDefault();
        const canvas = drawingCanvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!ctx) return;

        const { x, y } = getCoords(e);

        ctx.lineWidth = brushSize;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        
        ctx.globalCompositeOperation = isErasing ? 'destination-out' : 'source-over';
        ctx.strokeStyle = isErasing ? 'rgba(0,0,0,1)' : 'rgba(224, 122, 95, 0.7)';
        
        ctx.lineTo(x, y);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x, y);
    };
    
    const clearMask = () => {
        const canvas = drawingCanvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (ctx && canvas) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
    };

    return (
        <div className="relative w-full" ref={containerRef}>
            <canvas ref={imageCanvasRef} className="absolute top-0 left-0 w-full h-full rounded-lg" />
            <canvas
                ref={drawingCanvasRef}
                className="absolute top-0 left-0 w-full h-full cursor-crosshair rounded-lg"
                onMouseDown={startDrawing}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onMouseMove={draw}
                onTouchStart={startDrawing}
                onTouchEnd={stopDrawing}
                onTouchMove={draw}
            />
            <div className="absolute top-2 right-2 bg-white/70 backdrop-blur-sm p-2 rounded-lg shadow-md flex flex-col gap-3">
                 <div className="flex flex-col items-center">
                    <label htmlFor="brushSize" className="text-xs text-neutral-600 mb-1">筆刷 ({brushSize}px)</label>
                    <input
                        type="range"
                        id="brushSize"
                        min="10"
                        max="150"
                        value={brushSize}
                        onChange={(e) => setBrushSize(Number(e.target.value))}
                        className="w-24"
                    />
                 </div>
                 <div className="flex gap-2 justify-center">
                    <button onClick={() => setIsErasing(false)} className={`p-2 rounded-md transition-colors ${!isErasing ? 'bg-[#E07A5F] text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`} title="繪製">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>
                    </button>
                    <button onClick={() => setIsErasing(true)} className={`p-2 rounded-md transition-colors ${isErasing ? 'bg-[#E07A5F] text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`} title="橡皮擦">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m7 21-4.3-4.3c-1-1-1-2.5 0-3.4l9.6-9.6c1-1 2.5-1 3.4 0l5.6 5.6c1 1 1 2.5 0 3.4L13 21H7Z"/><path d="M22 21H7"/><path d="m5 12 5 5"/></svg>
                    </button>
                    <button onClick={clearMask} className="p-2 rounded-md bg-gray-200 text-gray-700 hover:bg-gray-300 transition-colors" title="清除">
                       <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                    </button>
                 </div>
            </div>
        </div>
    );
});

export default MaskingCanvas;
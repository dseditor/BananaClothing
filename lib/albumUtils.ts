/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import jsPDF from 'jspdf';
import { generateMagazineHeadlines, editImage } from '../services/geminiService';

interface AlbumImage {
    url: string;
    style: string;
}

interface ProcessImage {
    url: string;
    label: string;
}

interface FinalImage {
    imageUrl: string;
}


/**
 * Implements an "object-fit: cover" strategy for drawing an image onto a canvas.
 * It scales and crops the image from its center to fill the destination rectangle without distortion.
 * @param ctx The canvas rendering context.
 * @param img The image element to draw.
 * @param x The x-coordinate of the destination rectangle.
 * @param y The y-coordinate of the destination rectangle.
 * @param w The width of the destination rectangle.
 * @param h The height of the destination rectangle.
 */
function drawImageCover(ctx: CanvasRenderingContext2D, img: HTMLImageElement, x: number, y: number, w: number, h: number) {
    const imgRatio = img.width / img.height;
    const cellRatio = w / h;
    let sx, sy, sw, sh;

    if (imgRatio > cellRatio) { // Image is wider than the cell, crop sides
        sh = img.height;
        sw = sh * cellRatio;
        sx = (img.width - sw) / 2;
        sy = 0;
    } else { // Image is taller or same ratio as the cell, crop top/bottom
        sw = img.width;
        sh = sw / cellRatio;
        sx = 0;
        sy = (img.height - sh) / 2;
    }
    ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
}

/**
 * Wraps text to fit within a specified width on a canvas.
 * @param context The canvas rendering context.
 * @param text The text to wrap.
 * @param maxWidth The maximum width for a line of text.
 * @returns An array of strings, where each string is a line of wrapped text.
 */
function wrapText(context: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
    if (!text) return [];
    const words = text.split(' ');
    const lines: string[] = [];
    if (words.length === 0) return lines;
    
    let currentLine = words[0];

    for (let i = 1; i < words.length; i++) {
        const word = words[i];
        const width = context.measureText(currentLine + " " + word).width;
        if (width < maxWidth) {
            currentLine += " " + word;
        } else {
            lines.push(currentLine);
            currentLine = word;
        }
    }
    lines.push(currentLine);
    return lines;
}

/**
 * Creates a professional-looking album page on a canvas with a 2x2 grid of images,
 * including titles and style labels, and then triggers a download for the user.
 * @param images An array of objects, each containing an image URL and its corresponding style name.
 * @param title The main title to be displayed at the top of the album page.
 * @param filename The desired filename for the downloaded image.
 */
export async function createAlbumPageAndDownload(images: AlbumImage[], title: string = '智能室內設計風格集', filename?: string): Promise<void> {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) {
        console.error("Could not get canvas context");
        return;
    }

    const canvasSize = 2400;
    const padding = 80;
    const titleHeight = 200;
    const footerHeight = 120;
    canvas.width = canvasSize;
    canvas.height = canvasSize + titleHeight + footerHeight;

    ctx.fillStyle = '#F8F5F2';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#3D405B';
    ctx.font = 'bold 80px "Noto Sans TC", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(title, canvas.width / 2, padding + 80);

    const loadedImages = await Promise.all(
        images.map(imgData => new Promise<HTMLImageElement>((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => resolve(img);
            img.onerror = (err) => reject(new Error(`Could not load image: ${imgData.url}. Error: ${err}`));
            img.src = imgData.url;
        }))
    );

    const gridSize = (canvasSize - padding * 2) / 2;
    const positions = [
        { x: padding, y: titleHeight },
        { x: padding + gridSize, y: titleHeight },
        { x: padding, y: titleHeight + gridSize },
        { x: padding + gridSize, y: titleHeight + gridSize }
    ];

    loadedImages.forEach((img, index) => {
        if (index >= positions.length) return;
        const { x, y } = positions[index];
        drawImageCover(ctx, img, x, y, gridSize, gridSize);

        const styleText = images[index].style;
        ctx.font = '50px "Noto Sans TC", sans-serif';
        const textMetrics = ctx.measureText(styleText);
        const textWidth = textMetrics.width;
        const textHeight = 50;
        
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(x + 15, y + gridSize - textHeight - 45, textWidth + 40, textHeight + 30);

        ctx.fillStyle = 'white';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'bottom';
        ctx.fillText(styleText, x + 35, y + gridSize - 25);
    });

    ctx.fillStyle = '#8f8f8f';
    ctx.font = '36px "Noto Sans TC", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('由 Gemini 2.5 Flash Image Preview 驅動', canvas.width / 2, canvas.height - 50);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
    const link = document.createElement('a');
    link.href = dataUrl;
    const finalFilename = filename || `${title.replace(/\s+/g, '_')}.jpg`;
    link.download = finalFilename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
}

export async function createDynamicAlbumAndDownload(images: AlbumImage[], filename: string): Promise<void> {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx || images.length === 0) return;

    const loadedImages = await Promise.all(
        images.map(imgData => new Promise<HTMLImageElement>((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => resolve(img);
            img.onerror = () => reject(new Error(`Could not load image: ${imgData.url}`));
            img.src = imgData.url;
        }))
    );

    const firstImage = loadedImages[0];
    const aspectRatio = firstImage.width / firstImage.height;
    const cellWidth = 1024; // Standard width for a single cell
    const cellHeight = cellWidth / aspectRatio;

    if (images.length % 2 === 0) { // Even number of images -> 2 columns
        const numRows = images.length / 2;
        canvas.width = cellWidth * 2;
        canvas.height = cellHeight * numRows;
        
        loadedImages.forEach((img, index) => {
            const row = Math.floor(index / 2);
            const col = index % 2;
            drawImageCover(ctx, img, col * cellWidth, row * cellHeight, cellWidth, cellHeight);
        });

    } else { // Odd number of images -> 1 row
        canvas.width = cellWidth * images.length;
        canvas.height = cellHeight;

        loadedImages.forEach((img, index) => {
            drawImageCover(ctx, img, index * cellWidth, 0, cellWidth, cellHeight);
        });
    }

    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
}


/**
 * Creates a "Design Process Album" with a large final image and smaller process images below.
 * @param finalImage The final design image object.
 * @param processImages An array of image objects representing the design steps.
 * @param filename The desired filename for the downloaded image.
 */
export async function createProcessAlbumAndDownload(finalImage: FinalImage, processImages: ProcessImage[], filename: string = '設計過程相本.jpg'): Promise<void> {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) {
        console.error("Could not get canvas context");
        return;
    }

    // --- Layout Constants ---
    const canvasWidth = 1200;
    const padding = 50;
    const contentWidth = canvasWidth - padding * 2; // 1100
    const mainImageBottomMargin = 40;
    const subImageGap = 20;
    const subImageLabelHeight = 60; // Space for text
    const titleHeight = 120;
    const footerHeight = 80;

    // --- Load Images ---
    const allImageUrls = [finalImage.imageUrl, ...processImages.map(p => p.url)];
    const loadedImages = await Promise.all(
        allImageUrls.map(url => new Promise<HTMLImageElement>((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => resolve(img);
            img.onerror = (err) => reject(new Error(`Could not load image: ${url}. Error: ${err}`));
            img.src = url;
        }))
    );
    const mainLoadedImage = loadedImages[0];
    const subLoadedImages = loadedImages.slice(1);

    // --- Calculate Dimensions ---
    const mainImageAspectRatio = mainLoadedImage.width / mainLoadedImage.height;
    const mainImageHeight = contentWidth / mainImageAspectRatio;
    
    const numSubImages = subLoadedImages.length;
    const subImageWidth = (contentWidth - (subImageGap * (numSubImages - 1))) / numSubImages;
    const subImageHeight = subImageWidth; // Assume square aspect for layout simplicity

    const totalHeight = padding + titleHeight + mainImageHeight + mainImageBottomMargin + subImageHeight + subImageLabelHeight + footerHeight + padding;
    canvas.width = canvasWidth;
    canvas.height = totalHeight;

    // --- Drawing ---
    // Background
    ctx.fillStyle = '#F8F5F2'; // Match app background
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Title
    ctx.fillStyle = '#3D405B';
    ctx.font = 'bold 52px "Noto Sans TC", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('我的設計過程', canvas.width / 2, padding + 70);

    // Main Image
    const mainImageY = padding + titleHeight;
    ctx.shadowColor = 'rgba(0, 0, 0, 0.15)';
    ctx.shadowBlur = 20;
    ctx.shadowOffsetY = 10;
    ctx.drawImage(mainLoadedImage, padding, mainImageY, contentWidth, mainImageHeight);
    ctx.shadowColor = 'transparent'; // Reset shadow

    // Sub Images and Labels
    const subImageY = mainImageY + mainImageHeight + mainImageBottomMargin;
    let currentX = padding;
    subLoadedImages.forEach((img, index) => {
        drawImageCover(ctx, img, currentX, subImageY, subImageWidth, subImageHeight);
        
        // Label
        ctx.fillStyle = '#3D405B';
        ctx.font = '28px "Noto Sans TC", sans-serif';
        ctx.textAlign = 'center';
        const labelText = processImages[index].label;
        ctx.fillText(labelText, currentX + subImageWidth / 2, subImageY + subImageHeight + 40);

        currentX += subImageWidth + subImageGap;
    });
    
    // Footer
    ctx.fillStyle = '#8f8f8f';
    ctx.font = '24px "Noto Sans TC", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('由 Gemini 2.5 Flash Image Preview 驅動', canvas.width / 2, canvas.height - 40);


    // --- Download ---
    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
}

export async function createCompositionAlbumAndDownload(
    finalImage: { url: string },
    personImage: { url: string },
    itemImages: { url: string }[],
    moodboardImage: { url: string } | null,
    filename: string = '時尚組合相本.jpg'
): Promise<void> {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // --- Layout Constants ---
    const canvasWidth = 1200;
    const padding = 50;
    const contentWidth = canvasWidth - padding * 2;
    const vMargin = 40;
    const titleHeight = 120;
    const footerHeight = 80;
    const sectionTitleHeight = 60;
    const sourceImageSize = 200;
    const sourceImageGap = 30;
    const itemImageSize = 150;
    const itemImageGap = 20;

    // --- Load Images ---
    const allImageUrls = [finalImage.url, personImage.url, ...(moodboardImage ? [moodboardImage.url] : []), ...itemImages.map(i => i.url)];
    const loadedImages = await Promise.all(allImageUrls.map(url => new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => resolve(img);
        img.onerror = err => reject(new Error(`Could not load image: ${url}. Error: ${err}`));
        img.src = url;
    })));

    const [mainLoadedImage, personLoadedImage, ...restLoadedImages] = loadedImages;
    const moodboardLoadedImage = moodboardImage ? restLoadedImages.shift() : null;
    const itemLoadedImages = restLoadedImages;

    // --- Calculate dynamic height ---
    const mainImageAspectRatio = mainLoadedImage.width / mainLoadedImage.height;
    const mainImageHeight = contentWidth / mainImageAspectRatio;
    
    let totalHeight = padding + titleHeight + mainImageHeight + vMargin;

    // Source section height
    totalHeight += sectionTitleHeight + sourceImageSize + vMargin;

    // Items section height
    if (itemLoadedImages.length > 0) {
        const itemsPerRow = Math.floor((contentWidth + itemImageGap) / (itemImageSize + itemImageGap));
        const numItemRows = Math.ceil(itemLoadedImages.length / itemsPerRow);
        totalHeight += sectionTitleHeight + (numItemRows * itemImageSize) + ((numItemRows - 1) * itemImageGap) + vMargin;
    }

    totalHeight += footerHeight;
    canvas.width = canvasWidth;
    canvas.height = totalHeight;
    
    // --- Drawing ---
    let currentY = 0;
    // BG
    ctx.fillStyle = '#F8F5F2';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Title
    currentY = padding + 70;
    ctx.fillStyle = '#3D405B';
    ctx.font = 'bold 52px "Noto Sans TC", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('我的時尚組合', canvas.width / 2, currentY);

    // Main Image
    currentY = padding + titleHeight;
    ctx.shadowColor = 'rgba(0, 0, 0, 0.15)';
    ctx.shadowBlur = 20;
    ctx.shadowOffsetY = 10;
    ctx.drawImage(mainLoadedImage, padding, currentY, contentWidth, mainImageHeight);
    ctx.shadowColor = 'transparent';
    
    currentY += mainImageHeight + vMargin;
    
    // Source Section
    ctx.fillStyle = '#3D405B';
    ctx.font = '32px "Noto Sans TC", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('Source Materials', padding, currentY + sectionTitleHeight - 10);
    currentY += sectionTitleHeight;
    
    let sourceX = padding;
    drawImageCover(ctx, personLoadedImage, sourceX, currentY, sourceImageSize, sourceImageSize);
    if (moodboardLoadedImage) {
        sourceX += sourceImageSize + sourceImageGap;
        drawImageCover(ctx, moodboardLoadedImage, sourceX, currentY, sourceImageSize, sourceImageSize);
    }
    currentY += sourceImageSize + vMargin;
    
    // Items section
    if (itemLoadedImages.length > 0) {
        ctx.fillText('Fashion Items', padding, currentY + sectionTitleHeight - 10);
        currentY += sectionTitleHeight;

        const itemsPerRow = Math.floor((contentWidth + itemImageGap) / (itemImageSize + itemImageGap));
        let itemX = padding;
        let itemY = currentY;

        itemLoadedImages.forEach((img, index) => {
            drawImageCover(ctx, img, itemX, itemY, itemImageSize, itemImageSize);
            itemX += itemImageSize + itemImageGap;
            if ((index + 1) % itemsPerRow === 0) {
                itemX = padding;
                itemY += itemImageSize + itemImageGap;
            }
        });
    }
    
    // Footer
    ctx.fillStyle = '#8f8f8f';
    ctx.font = '24px "Noto Sans TC", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('由 Gemini 2.5 Flash Image Preview 驅動', canvas.width / 2, canvas.height - 40);
    
    // --- Download ---
    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
}


export async function createBoutiqueAlbumAndDownload(
    images: AlbumImage[], 
    sourceImageUrl: string, 
    title: string = '精品小物靈感集', 
    filename?: string
): Promise<void> {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // --- Layout Constants ---
    const canvasWidth = 2400;
    const padding = 100;
    const titleHeight = 200;
    const footerHeight = 120;
    const midMargin = 80;
    const sourceLabelHeight = 80;
    const contentWidth = canvasWidth - padding * 2; // 2200

    // --- Load Images ---
    const allImageUrls = [...images.map(i => i.url), sourceImageUrl];
    const loadedImages = await Promise.all(
        allImageUrls.map(url => new Promise<HTMLImageElement>((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => resolve(img);
            img.onerror = (err) => reject(new Error(`Could not load image: ${url}. Error: ${err}`));
            img.src = url;
        }))
    );
    const generatedLoadedImages = loadedImages.slice(0, 4);
    const sourceLoadedImage = loadedImages[4];
    
    // --- Calculate Dimensions ---
    const gridCellSize = (contentWidth - padding) / 2; // 1050
    const gridHeight = gridCellSize * 2 + padding;

    const sourceImageAspectRatio = sourceLoadedImage.width / sourceLoadedImage.height;
    const sourceImageDisplayHeight = contentWidth / sourceImageAspectRatio;
    
    const totalHeight = padding + titleHeight + gridHeight + midMargin + sourceLabelHeight + sourceImageDisplayHeight + footerHeight + padding;
    canvas.width = canvasWidth;
    canvas.height = totalHeight;

    // --- Drawing ---
    // Background
    ctx.fillStyle = '#F8F5F2';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Title
    ctx.fillStyle = '#3D405B';
    ctx.font = 'bold 80px "Noto Sans TC", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(title, canvas.width / 2, padding + 80);

    // 2x2 Grid of Generated Images
    const gridY = padding + titleHeight;
    const positions = [
        { x: padding, y: gridY },
        { x: padding + gridCellSize + padding, y: gridY },
        { x: padding, y: gridY + gridCellSize + padding },
        { x: padding + gridCellSize + padding, y: gridY + gridCellSize + padding }
    ];

    generatedLoadedImages.forEach((img, index) => {
        if (index >= positions.length) return;
        const { x, y } = positions[index];
        drawImageCover(ctx, img, x, y, gridCellSize, gridCellSize);
    });

    // Source Image Label
    const sourceLabelY = gridY + gridHeight + midMargin;
    ctx.fillStyle = '#8f8f8f';
    ctx.font = '50px "Noto Sans TC", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('靈感來源 (Source of Inspiration)', canvas.width / 2, sourceLabelY);
    
    // Source Image
    const sourceImageY = sourceLabelY + sourceLabelHeight;
    ctx.shadowColor = 'rgba(0, 0, 0, 0.1)';
    ctx.shadowBlur = 15;
    ctx.shadowOffsetY = 5;
    ctx.drawImage(sourceLoadedImage, padding, sourceImageY, contentWidth, sourceImageDisplayHeight);
    ctx.shadowColor = 'transparent';

    // Footer
    ctx.fillStyle = '#8f8f8f';
    ctx.font = '36px "Noto Sans TC", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('由 Gemini 2.5 Flash Image Preview 驅動', canvas.width / 2, canvas.height - 60);

    // --- Download ---
    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
    const link = document.createElement('a');
    link.href = dataUrl;
    const finalFilename = filename || `${title.replace(/\s+/g, '_')}.jpg`;
    link.download = finalFilename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
}

export const centerCropImage = (imageDataUrl: string, targetAspectRatio: number): Promise<string> => {
    return new Promise((resolve, reject) => {
        const image = new Image();
        image.crossOrigin = 'anonymous';
        image.src = imageDataUrl;
        image.onload = () => {
            const { naturalWidth, naturalHeight } = image;
            const imageAspectRatio = naturalWidth / naturalHeight;

            let sWidth, sHeight, sx, sy;

            if (imageAspectRatio > targetAspectRatio) {
                // Image is wider than target, crop the sides
                sHeight = naturalHeight;
                sWidth = naturalHeight * targetAspectRatio;
                sx = (naturalWidth - sWidth) / 2;
                sy = 0;
            } else {
                // Image is taller than target, crop top and bottom
                sWidth = naturalWidth;
                sHeight = naturalWidth / targetAspectRatio;
                sx = 0;
                sy = (naturalHeight - sHeight) / 2;
            }

            const canvas = document.createElement('canvas');
            const finalWidth = 1024; // Standardize output width
            canvas.width = finalWidth;
            canvas.height = finalWidth / targetAspectRatio;
            const ctx = canvas.getContext('2d');
            if (!ctx) return reject('Could not get canvas context');

            ctx.drawImage(image, sx, sy, sWidth, sHeight, 0, 0, canvas.width, canvas.height);
            resolve(canvas.toDataURL('image/jpeg', 0.9));
        };
        image.onerror = (err) => reject(new Error(`Image load error: ${err}`));
    });
};

export const resizeImageForAnalysis = (imageDataUrl: string, maxDimension: number = 512): Promise<string> => {
    return new Promise((resolve, reject) => {
        const image = new Image();
        image.crossOrigin = 'anonymous';
        image.src = imageDataUrl;
        image.onload = () => {
            const { naturalWidth, naturalHeight } = image;

            if (naturalWidth <= maxDimension && naturalHeight <= maxDimension) {
                resolve(imageDataUrl);
                return;
            }

            let width = naturalWidth;
            let height = naturalHeight;

            if (width > height) {
                if (width > maxDimension) {
                    height *= maxDimension / width;
                    width = maxDimension;
                }
            } else {
                if (height > maxDimension) {
                    width *= maxDimension / height;
                    height = maxDimension;
                }
            }
            
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (!ctx) return reject('Could not get canvas context');

            ctx.drawImage(image, 0, 0, width, height);
            resolve(canvas.toDataURL('image/jpeg', 0.85));
        };
        image.onerror = (err) => reject(new Error(`Image load error for resizing: ${err}`));
    });
};


// --- NEW PDF ALBUM GENERATION ---

interface PdfAlbumParams {
    coverBaseImage: { url: string; prompt: string };
    contentImages: { url: string; prompt: string; description: string; color: string; }[];
    backCoverImages: string[];
    theme: string;
    filename: string;
    onProgress: (message: string) => void;
    mode: 'variation' | 'standard' | 'custom';
    standardModePrompts?: { scene: string; style: string };
}

// Helper to load an image
const loadImage = (url: string): Promise<HTMLImageElement> => new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = err => reject(new Error(`Could not load image: ${url}. Error: ${err}`));
    img.src = url;
});

const createCoverPage = async (baseImageUrl: string, headlines: { title: string; headlines: string[] }): Promise<string> => {
    // Pre-render the source image onto an A4 canvas to ensure correct aspect ratio for the AI model.
    const A4_WIDTH = 2480;
    const A4_HEIGHT = 3508;
    const canvas = document.createElement('canvas');
    canvas.width = A4_WIDTH;
    canvas.height = A4_HEIGHT;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not get canvas context for cover pre-rendering');

    const baseImage = await loadImage(baseImageUrl);
    drawImageCover(ctx, baseImage, 0, 0, A4_WIDTH, A4_HEIGHT);
    const preppedImageUrl = canvas.toDataURL('image/jpeg', 0.9);

    const prompt = `Task: Create a professional fashion magazine cover.
Instructions: Use the provided image as the base. Artistically integrate the following text onto the cover, making it look like a cohesive part of the design (e.g., using varied fonts, sizes, and layouts that complement the image). Do not just overlay plain system font text.

Magazine Title: "${headlines.title.toUpperCase()}"

Main Headlines:
- ${headlines.headlines.join('\n- ')}

Strict Requirements:
1.  Maintain the original person's face and identity.
2.  Maintain the original image's aspect ratio (A4 Portrait).
3.  The final output must be a single, high-quality image.`;

    const generatedCoverUrl = await editImage(preppedImageUrl, prompt, []);
    return generatedCoverUrl;
};

const tailwindColorToScheme = (colorClass: string): { bg: string; title: string; desc: string; stroke: string; } => {
    if (colorClass.includes('red')) return { bg: 'rgba(190, 24, 93, 0.8)', title: '#FFFFFF', desc: '#FCE7F3', stroke: 'rgba(88, 28, 135, 0.5)' };
    if (colorClass.includes('blue')) return { bg: 'rgba(30, 64, 175, 0.8)', title: '#FFFFFF', desc: '#DBEAFE', stroke: 'rgba(0,0,0,0.5)' };
    if (colorClass.includes('green')) return { bg: 'rgba(22, 101, 52, 0.8)', title: '#FFFFFF', desc: '#DCFCE7', stroke: 'rgba(0,0,0,0.5)' };
    if (colorClass.includes('yellow')) return { bg: 'rgba(202, 138, 4, 0.8)', title: '#FFFFFF', desc: '#FEF9C3', stroke: 'rgba(0,0,0,0.5)' };
    if (colorClass.includes('purple')) return { bg: 'rgba(76, 29, 149, 0.8)', title: '#FFFFFF', desc: '#EDE9FE', stroke: 'rgba(0,0,0,0.5)' };
    if (colorClass.includes('pink')) return { bg: 'rgba(190, 24, 93, 0.8)', title: '#FFFFFF', desc: '#FCE7F3', stroke: 'rgba(88, 28, 135, 0.5)' };
    return { bg: 'rgba(17, 24, 39, 0.8)', title: '#FFFFFF', desc: '#D1D5DB', stroke: 'rgba(0,0,0,0.5)' };
};

const createContentPage = async (imageUrl: string, titleText: string, descText: string, colorClass: string): Promise<string> => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not get canvas context');

    const scheme = tailwindColorToScheme(colorClass);

    const A4_WIDTH = 2480;
    const A4_HEIGHT = 3508;
    canvas.width = A4_WIDTH;
    canvas.height = A4_HEIGHT;

    const baseImage = await loadImage(imageUrl);

    // Draw the image to cover the entire canvas as a background
    drawImageCover(ctx, baseImage, 0, 0, canvas.width, canvas.height);

    const hasText = titleText || descText;
    if (!hasText) {
        return canvas.toDataURL('image/jpeg', 0.9);
    }

    const padding = canvas.width * 0.05; // ~124px
    const maxWidth = canvas.width * 0.35; 
    const lineSpacing = 1.4;

    const titleFontSize = Math.max(25, Math.floor(canvas.width * 0.02)); // ~25px
    ctx.font = `bold ${titleFontSize}px "Noto Sans TC", sans-serif`;
    const titleLines = wrapText(ctx, titleText, maxWidth);

    const descFontSize = Math.max(15, Math.floor(canvas.width * 0.016)); // ~13.5px
    ctx.font = `normal ${descFontSize}px "Noto Sans TC", sans-serif`;
    const descLines = wrapText(ctx, descText, maxWidth);

    const titleHeight = titleLines.length * (titleFontSize * lineSpacing);
    const descHeight = descLines.length * (descFontSize * lineSpacing);
    const totalTextHeight = titleHeight + (descLines.length > 0 ? descHeight + (titleFontSize * 0.5) : 0);
    
    // Calculate position for text block based on the old background rectangle's logic for consistency
    const bgRectHeight = totalTextHeight + padding * 1.1;
    const bgRectX = padding;
    const bgRectY = canvas.height - bgRectHeight - padding;
    
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    
    let currentY = bgRectY + padding * 0.75;
    const textX = bgRectX + padding * 0.75;

    // Set shadow for text readability against any background
    ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
    ctx.shadowBlur = 15;
    ctx.shadowOffsetY = 5;

    // Draw title
    ctx.font = `bold ${titleFontSize}px "Noto Sans TC", sans-serif`;
    ctx.fillStyle = scheme.title;
    titleLines.forEach(line => {
        ctx.fillText(line, textX, currentY);
        currentY += titleFontSize * lineSpacing;
    });

    // Draw description
    if (descLines.length > 0 && descText) {
        currentY += titleFontSize * 0.5;
        ctx.font = `normal ${descFontSize}px "Noto Sans TC", sans-serif`;
        ctx.fillStyle = scheme.desc;
        descLines.forEach(line => {
            ctx.fillText(line, textX, currentY);
            currentY += descFontSize * lineSpacing;
        });
    }

    // Reset shadow
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
    
    return canvas.toDataURL('image/jpeg', 0.9);
};


const createBackCoverPage = async (
    imageUrls: string[],
    mode: 'variation' | 'standard' | 'custom',
    standardModePrompts?: { scene: string; style: string }
): Promise<string> => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not get canvas context');

    const A4_WIDTH = 2480;
    const A4_HEIGHT = 3508;
    canvas.width = A4_WIDTH;
    canvas.height = A4_HEIGHT;

    // 1. Load images
    const imagesToDraw = imageUrls.slice(0, 4);
    if (imagesToDraw.length === 0) { // Handle case with no images
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, A4_WIDTH, A4_HEIGHT);
        ctx.fillStyle = '#FFFFFF';
        ctx.font = '80px "Noto Sans TC", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText("No images available for back cover.", A4_WIDTH / 2, A4_HEIGHT / 2);
        return canvas.toDataURL('image/jpeg', 0.9);
    }
    const images = await Promise.all(imagesToDraw.map(loadImage));

    // 2. Draw full-bleed 2x2 grid
    const cellWidth = A4_WIDTH / 2;
    const cellHeight = A4_HEIGHT / 2;
    const positions = [
        { x: 0, y: 0 },
        { x: cellWidth, y: 0 },
        { x: 0, y: cellHeight },
        { x: cellWidth, y: cellHeight },
    ];

    images.forEach((img, index) => {
        if (index < positions.length) {
            const { x, y } = positions[index];
            drawImageCover(ctx, img, x, y, cellWidth, cellHeight);
        }
    });

    // 3. Draw text with shadow for readability
    ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
    ctx.shadowBlur = 15;
    ctx.shadowOffsetY = 5;
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'center';

    // Unified text for both modes
    ctx.font = '50px "Inter", sans-serif';
    ctx.fillText('Banana Fashion Design Studio', A4_WIDTH / 2, A4_HEIGHT - 70);

    // Reset shadow
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;

    return canvas.toDataURL('image/jpeg', 0.9);
};


export async function createPdfAlbumAndDownload(params: PdfAlbumParams): Promise<void> {
    const { coverBaseImage, contentImages, backCoverImages, theme, filename, onProgress, mode, standardModePrompts } = params;

    // 1. Generate Magazine Headlines
    onProgress('正在生成封面文字...');
    const headlines = await generateMagazineHeadlines(theme);

    // 2. Create Cover Page
    onProgress('正在製作 AI 藝術封面...');
    const coverPageDataUrl = await createCoverPage(coverBaseImage.url, headlines);

    // 3. Create Back Cover Page
    onProgress('正在製作封底...');
    const backCoverPageDataUrl = await createBackCoverPage(backCoverImages, mode, standardModePrompts);

    // 4. Create PDF
    onProgress('正在合併為 PDF...');
    const pdf = new jsPDF({
        orientation: 'p',
        unit: 'px',
        format: 'a4',
    });

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();

    // Add Cover
    pdf.addImage(coverPageDataUrl, 'JPEG', 0, 0, pdfWidth, pdfHeight);

    // Add Content Pages
    for (const [index, image] of contentImages.entries()) {
        onProgress(`正在處理內頁 ${index + 1}/${contentImages.length}...`);
        pdf.addPage();
        
        let title = '';
        let description = '';

        if (mode === 'variation' || mode === 'custom') {
            title = image.prompt;
            description = image.description;
        } else if (mode === 'standard' && standardModePrompts) {
            title = standardModePrompts.scene;
            description = standardModePrompts.style;
        }
        
        const pageDataUrl = await createContentPage(
            image.url, 
            title,
            description,
            image.color
        );
        pdf.addImage(pageDataUrl, 'JPEG', 0, 0, pdfWidth, pdfHeight);
    }
    
    // Add Back Cover
    pdf.addPage();
    pdf.addImage(backCoverPageDataUrl, 'JPEG', 0, 0, pdfWidth, pdfHeight);

    // 5. Download
    onProgress('準備下載...');
    pdf.save(filename);
}
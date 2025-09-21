/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { GoogleGenAI, Modality, Type, GenerateContentResponse } from "@google/genai";

const ai = new GoogleGenAI({apiKey: process.env.API_KEY});

const dataUrlToPart = (dataUrl: string, isPng: boolean = false) => {
    const [meta, base64Data] = dataUrl.split(',');
    const mimeType = isPng ? 'image/png' : (meta.match(/:(.*?);/)?.[1] || 'image/jpeg');
    return { inlineData: { mimeType, data: base64Data } };
};

const extractBase64FromResponse = (response: GenerateContentResponse): string => {
    const candidate = response.candidates?.[0];
    if (!candidate) {
        // Using Traditional Chinese for user-facing error.
        throw new Error("模型未返回有效回應。");
    }

    // Check for image data first
    for (const part of candidate.content?.parts || []) {
        if (part.inlineData) {
            return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
        }
    }

    // If no image, provide a more detailed error based on the finish reason.
    if (candidate.finishReason && candidate.finishReason !== 'STOP') {
        let errorMessage = `圖片生成失敗，原因：${candidate.finishReason}。`;
        if (candidate.finishReason === 'SAFETY') {
            const blockedCategories = candidate.safetyRatings
                ?.filter(r => r.blocked)
                .map(r => r.category.replace('HARM_CATEGORY_', ''))
                .join(', ');
            errorMessage = `圖片生成失敗，因為內容可能違反了安全政策${blockedCategories ? ` (${blockedCategories})` : ''}。請嘗試調整您的圖片或描述。`;
        } else if (candidate.finishReason === 'RECITATION') {
             errorMessage = '圖片生成失敗，因為輸出內容與受版權保護的材料過於相似。';
        } else {
             errorMessage = `圖片生成失敗，原因代碼：${candidate.finishReason}。`;
        }
        throw new Error(errorMessage);
    }
    
    // Fallback error if no image and no clear reason provided.
    throw new Error("回應中找不到圖片資料。");
};

const callImageEditModel = async (parts: any[], promptText: string): Promise<string> => {
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image-preview',
        contents: { parts: [...parts, { text: promptText }] },
        config: { responseModalities: [Modality.IMAGE, Modality.TEXT] },
    });
    return extractBase64FromResponse(response);
};

// --- Main App Functions ---

export const editImage = (baseImage: string, prompt: string, referenceImages?: (string | null)[]): Promise<string> => {
    const parts = [dataUrlToPart(baseImage)];
    if (referenceImages) {
        referenceImages.forEach(refImg => {
            if (refImg) parts.push(dataUrlToPart(refImg));
        });
    }
    return callImageEditModel(parts, prompt);
};

export const generateInitialConcepts = (portraitImage: string, prompt: string, referenceImage: string | null, count: number): Promise<string[]> => {
    const basePrompt = `**任務：虛擬試穿**\n\n**指令：** 以輸入的人像為基礎，**務必保持人物的臉部、頭部和身份完全不變**。將他們目前的服裝替換為一套符合「${prompt || '多樣化'}」風格的完整穿搭。生成一張時尚、高品質的寫實照片。\n\n**嚴格要求：**\n1. **臉部保真**：絕對不能改變原始人物的臉部特徵和身份。\n2. **僅輸出圖片**：不要生成任何文字。`;
    const promises = Array(count).fill(0).map(() => editImage(portraitImage, basePrompt, [referenceImage]));
    return Promise.all(promises);
};

export const inpaintImage = (baseImage: string, maskImage: string, prompt: string): Promise<string> => {
    const fullPrompt = `使用提供的遮罩編輯原始圖片。在遮罩區域內，添加以下時尚單品或配件：「${prompt}」。將變更無縫地融合到現有的服裝和光線中。`;
    return callImageEditModel([dataUrlToPart(baseImage), dataUrlToPart(maskImage, true)], fullPrompt);
};

export const suggestScene = async (baseImage: string): Promise<string> => {
    const imagePart = dataUrlToPart(baseImage);
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: {
            parts: [
                { text: '分析這張圖片中的人物和他們的穿搭。為時尚寫真建議一個有創意且合適的背景場景。請僅提供場景的描述文字，包含地點、光線和氛圍。例如：「夜晚下過雨的東京街頭，濕潤的路面反映著閃爍的霓虹燈招牌。」' },
                imagePart
            ]
        },
    });
    return response.text.trim();
};

export const suggestOutfit = async (itemImages: string[], personImage: string): Promise<string> => {
    const imageParts = [dataUrlToPart(personImage), ...itemImages.map(img => dataUrlToPart(img))];
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: { parts: [{ text: '分析這些人物和各種服飾/配件的圖片。描述一套可以融合所有單品的、有凝聚力且吸引人的時尚穿搭。這段描述應適合做為圖片生成模型的提示詞。請僅提供描述文字。語言：繁體中文。' }, ...imageParts] },
    });
    return response.text.trim();
};

export const generateMoodboard = async (itemImages: string[], personImage: string, prompt: string): Promise<string> => {
    const imageParts = [dataUrlToPart(personImage), ...itemImages.map(img => dataUrlToPart(img))];
    const moodboardPrompt = `根據提供的人物和時尚單品圖片，以及使用者期望的「${prompt || '一個有趣且有創意的風格'}」風格，創建一張單一、有凝聚力的「情緒板」圖片。這張圖片不應是簡單的拼貼。相反，它必須是一張概念性、藝術性的圖像，捕捉期望的時尚美學。它 sollte視覺化地呈現最終服裝和場景的情緒、色調、紋理和整體感覺。例如，它可以是抽象的紋理、一個光線優美的房間角落，或是一個能喚起正確情感的風景。專注於創建一張視覺上鼓舞人心的參考圖像，為拍攝設定基調。`;
    
    // Use the faster image editing model for conceptual generation
    return callImageEditModel(imageParts, moodboardPrompt);
};

export const createOutfitFromItems = async (itemImages: string[], personImage: string, prompt: string): Promise<string> => {
    const imageParts = [dataUrlToPart(personImage), ...itemImages.map(img => dataUrlToPart(img))];
    const descriptionResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: { parts: [{ text: `根據這些人物和時尚單品的圖片，以及使用者的描述「${prompt}」，為一個圖片生成模型生成一個高度詳細的提示。目標是創建一張照片般逼真的時尚寫真，展示該人物穿著所有提供的單品組成的協調服裝。` }, ...imageParts] },
    });
    const response = await ai.models.generateImages({
        model: 'imagen-4.0-generate-001',
        prompt: `照片般逼真的時尚攝影。 ${descriptionResponse.text}`,
        config: { numberOfImages: 1, outputMimeType: 'image/jpeg', aspectRatio: '9:16' },
    });
    return `data:image/jpeg;base64,${response.generatedImages[0].image.imageBytes}`;
};

export const integrateAccessoryWithMask = (baseImage: string, accessoryImage: string, maskImage: string): Promise<string> => {
    const prompt = `將第二張圖片中的時尚配件整合到第一張圖片的人物身上。將其放置在第三張圖片中黑色遮罩所指示的區域。調整光線、陰影和透視，以達到無縫、照片般逼真的效果。`;
    return callImageEditModel([dataUrlToPart(baseImage), dataUrlToPart(accessoryImage), dataUrlToPart(maskImage, true)], prompt);
};

export const searchAndGenerateAccessory = async (query: string, count: number): Promise<string[]> => {
    const response = await ai.models.generateImages({
        model: 'imagen-4.0-generate-001',
        prompt: `一件單獨的時尚單品，「${query}」，放置在純白色背景上，攝影棚燈光，照片般逼真的產品照。`,
        config: { numberOfImages: count, outputMimeType: 'image/jpeg', aspectRatio: '1:1' },
    });
    return response.generatedImages.map(img => `data:image/jpeg;base64,${img.image.imageBytes}`);
};

export const removeImageBackground = (image: string): Promise<string> => callImageEditModel([dataUrlToPart(image)], '分割此圖中的主要物體或人物，並使背景透明。輸出一張帶有透明背景的 PNG 圖片。');

export const generateRandomStyles = async (count: number): Promise<string[]> => {
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `生成 ${count} 個簡短、有創意的時尚或藝術風格描述。風格要多樣化，包含現代潮流、歷史時期、藝術運動、繪畫風格等。例如：「Y2K 千禧辣妹風」、「少年漫畫風格」、「奢華晚宴」、「賽博龐克」、「印象派畫風」。以 JSON 陣列的格式返回結果。語言：繁體中文。`,
        config: {
            responseMimeType: "application/json",
            responseSchema: { type: Type.ARRAY, items: { type: Type.STRING } }
        }
    });
    try {
        return JSON.parse(response.text);
    } catch (e) {
        return Array(count).fill("AI 生成風格");
    }
};

// --- Multi-Angle Module Functions ---

export const generatePoseAngleEmotionView = (baseImage: string, type: 'pose' | 'angle' | 'emotion', prompt: string, referenceImage?: string | null): Promise<string> => {
    let fullPrompt = '';
    const references = [];
    const outputInstruction = '\n\n**嚴格要求：**\n1. **僅輸出圖片**：不要生成任何文字。\n2. **身份保真**：絕對不能改變原始人物的臉部特徵和身份。';

    if (referenceImage) {
        references.push(dataUrlToPart(referenceImage));
    }
    
    switch (type) {
        case 'pose':
            if (referenceImage) {
                fullPrompt = `**任務：姿勢遷移**\n\n**指令：** 根據第一張圖片中的人物，生成一張新圖片。人物必須穿著完全相同的服裝和配飾，並保持相同的身份和臉部特徵。\n\n**姿勢要求：** 人物的新姿勢必須**精確地模仿**第二張參考圖中的姿勢。請專注於複製身體的輪廓、四肢的位置和整體的身體語言。\n\n**文字提示（輔助）：** "${prompt}"`;
            } else {
                fullPrompt = `以提供的人物圖片為基礎，生成一張*相同人物穿著相同服裝*但採用不同姿勢的新圖片：「${prompt}」。保持相同的風格和衣物。`;
            }
            break;
        case 'angle':
            fullPrompt = `生成一張*相同人物穿著相同服裝*但從不同視角拍攝的新圖片：「${prompt}」。`;
            break;
        case 'emotion':
            fullPrompt = `**任務：情緒與表情變換**\n\n**指令：** 重繪第一張圖片中的人物，改變他們的臉部表情和身體語言以傳達「${prompt}」的情緒。保持人物的身份、臉部特徵和**所有衣物**完全不變。`;
            if (referenceImage) {
                fullPrompt += `\n\n**情緒參考：** 新的情緒和身體語言應**主要模仿**第二張參考圖中所展示的感覺。`;
            }
            break;
    }
    
    fullPrompt += outputInstruction;
    return callImageEditModel([dataUrlToPart(baseImage), ...references], fullPrompt);
};

export const generateRandomPrompts = async (type: 'pose' | 'angle' | 'emotion' | 'model', count: number): Promise<string[]> => {
    let content = '';
    let fallbackType = '';
    switch (type) {
        case 'pose':
            content = `生成 ${count} 個簡短、有創意的模特兒姿勢描述。例如：「雙手插腰」、「輕鬆地走路」。以 JSON 陣列的格式返回結果。`;
            fallbackType = '姿勢';
            break;
        case 'angle':
            content = `生成 ${count} 個簡短、創意的攝影視角描述。例如：「由下往上的廣角鏡頭」、「過肩鏡頭」。以 JSON 陣列的格式返回結果。`;
            fallbackType = '角度';
            break;
        case 'emotion':
            content = `生成 ${count} 個簡短、用來描述表情與情緒的詞語。例如：「開心地大笑」、「沉思」。以 JSON 陣列的格式返回結果。`;
            fallbackType = '情緒';
            break;
        case 'model':
            content = `生成 ${count} 個簡短、有創意的模特儿描述，包含人種、體型與年齡。例如：「一位高挑纖瘦的東亞女性模特儿」。以 JSON 陣列的格式返回結果。語言：繁體中文。`;
            fallbackType = '模特兒';
            break;
    }
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: content,
        config: {
            responseMimeType: "application/json",
            responseSchema: { type: Type.ARRAY, items: { type: Type.STRING } }
        }
    });
    try {
        return JSON.parse(response.text);
    } catch (e) {
        return Array(count).fill(`AI 生成${fallbackType}`);
    }
};

// --- Clothing Assistant Module Functions ---
export const generateModelWearingGarment = (garmentImage: string, modelPrompt: string): Promise<string> => {
    const fullPrompt = `**任務：虛擬模特試穿**

**指令：**
生成一張照片般逼真的圖片，展示一位「${modelPrompt}」模特兒，穿著所提供圖片中唯一的服裝。

**場景：**
模特兒應以全身照呈現，站在一個簡潔、光線明亮的攝影棚中，背景為純淺灰色。

**嚴格要求：**
1. **服裝保真**：必須準確呈現服裝的設計、顏色和合身度。
2. **僅輸出圖片**：絕對不要生成任何文字、描述或評論。你的唯一輸出必須是最終的圖片。`;
    return callImageEditModel([dataUrlToPart(garmentImage)], fullPrompt);
};

export const generatePersonWearingGarment = (personImage: string, garmentImage: string, bodyDescription?: string): Promise<string> => {
    const bodyInstruction = bodyDescription
        ? `如果第一張圖是頭像，請根據此描述「${bodyDescription}」為人物生成一個完整的身體。生成的身體應與頭部無縫連接。`
        : "如果第一張圖是頭像，請智慧地生成一個與人物特徵相匹配的、合適且逼真的完整身體。";

    const fullPrompt = `**任務：虛擬試穿**

**指令：** 重繪第一張圖片中的人物，確保他們的臉部和身份完美保留。他們現在應該穿著第二張圖片中展示的完整服裝。

**身體生成：** ${bodyInstruction} 如果第一張圖片已經顯示了身体，請保留原始的身體形狀。

**嚴格要求：**
1. **身份保留：** 不要改變第一張圖片中人物的臉部或身體特徵。
2. **服裝替換：** 人物原來的衣服必須完全被第二張圖片中的服裝所取代。
3. **照片般逼真的輸出：** 最終結果應該是一張無縫、高品質、逼真的時尚全身照，背景為簡單的攝影棚。
4. **僅輸出圖片**：絕對不要生成任何文字。你的唯一輸出必須是最終的圖片。`;
    return editImage(personImage, fullPrompt, [garmentImage]);
};


// --- Imaginative Module Functions ---

export const generateVirtualModel = async (modelType: string, style: string): Promise<string> => {
    const response = await ai.models.generateImages({
        model: 'imagen-4.0-generate-001',
        prompt: `A photorealistic fashion portrait of a virtual model. Their character type is: "${modelType}". Their clothing style is: "${style}". Create a unique and creative character. Ensure high-resolution and cinematic lighting.`,
        config: { numberOfImages: 1, outputMimeType: 'image/jpeg', aspectRatio: '9:16' },
    });
    return `data:image/jpeg;base64,${response.generatedImages[0].image.imageBytes}`;
};

export const generateConceptClothing = async (clothingType: string, style: string): Promise<string> => {
    const response = await ai.models.generateImages({
        model: 'imagen-4.0-generate-001',
        prompt: `A single piece of concept clothing, a "${clothingType}", designed in the style of: "${style}". Present a unique design concept. The object is centered on a plain white background, with studio lighting, photorealistic.`,
        config: { numberOfImages: 1, outputMimeType: 'image/jpeg', aspectRatio: '1:1' },
    });
    return `data:image/jpeg;base64,${response.generatedImages[0].image.imageBytes}`;
};

export const generateTimeTravelScene = (baseImage: string, era: string): Promise<string> => {
    const prompt = `重繪這張照片中的人物，但將他們的服裝和背景更改為符合「${era}」的風格。保持完全相同的人物、臉部和身份至關重要。\n\n**嚴格要求：**\n1. **僅輸出圖片**：不要生成任何文字。\n2. **身份保真**：絕對不能改變原始人物的臉部特徵和身份。`;
    return callImageEditModel([dataUrlToPart(baseImage)], prompt);
};

const getBoutiqueItemPrompt = (itemType: string): string => {
    const imageOnlyInstruction = " 最終輸出必須是此物品的單張照片般逼真的圖片。不要輸出任何文字。";
    const prompts: { [key: string]: string } = {
        'USB隨身碟': `根據提供圖片中服裝的風格、顏色和主題，設計一個有創意且獨特的 USB 隨身碟。設計應巧妙地融合圖片中的元素。最終輸出應為該 USB 隨身碟在乾淨、中性背景上的照片般逼真的產品照片，採用專業的攝影棚燈光，突顯其材質和設計細節。${imageOnlyInstruction}`,
        '餐廚刀叉盤子': `受提供圖片中服裝的美學啟發，設計一套精品餐具（叉子、刀子、湯匙）和一個匹配的盤子。設計應將圖片中的顏色和圖案轉化到餐具上。最終輸出應為該套餐具優雅地擺放在中性表面上的照片般逼真的產品照片，如同設計目錄中的一樣。${imageOnlyInstruction}`,
        '黏土模型': `根據提供的人物服裝圖片，創作一個該人物的詳細而迷人的黏土動畫風格公仔。整個角色，包括服裝和配件，都應該以聚合物黏土的外觀重新創作。將模型以等角視圖呈現在乾淨、單色的攝影棚背景上。光線應該柔和，強調黏土的觸感和手工感。${imageOnlyInstruction}`,
        '建築模型': `根據提供的人物圖片，創作一個受其服裝啟發的風格化建築模型。模型應以實體物件的形式呈現在素色背景上，具有專業、逼真的材質和燈光，就像一個專業的建築模型。${imageOnlyInstruction}`,
        '滑鼠墊': `設計一個高品質的滑鼠墊，其特色是對提供圖片中人物和服裝的風格化藝術詮釋。設計應美觀並捕捉角色風格的精髓。最終輸出應為該滑鼠墊在現代辦公桌設置上的照片般逼真的產品照，旁邊放著鍵盤和滑鼠。${imageOnlyInstruction}`,
        '床單毛巾': `根據提供圖片中服裝的圖案、顏色和整體氛圍，為一套豪華床單（或一條大毛巾）設計一個圖案。設計應是對源圖像主題的雅致抽象。最終輸出應為該產品整齊折疊或展示在床上/浴室環境中的照片般逼真的照片，以展示其設計。${imageOnlyInstruction}`,
        '香氛蠟燭': `根據提供的圖片，設計一款奢華香氛蠟燭。主要重點是燭杯（容器）的設計，應融入服裝美學中的顏色、圖案和材質。同時，為蠟燭設計一個簡約而優雅的標籤。最終輸出必須是該蠟燭的照片般逼真的產品照片，呈現在與其風格相得益彰的表面上，並採用柔和、專業的燈光，突顯燭杯的質感。${imageOnlyInstruction}`,
        '拼圖': `使用提供的圖片作為靈感，設計一個 1000 片的拼圖。拼圖的圖像應該是對人物時尚風格的優美、藝術性詮釋。最終輸出必須是專業的產品照片。場景應展示拼圖的盒子，盒子上有完整的藝術品，直立放置。在盒子前面，應該有一小部分實際的拼圖已經拼好，旁邊散落著幾片形狀獨特的零散拼圖塊，營造出一種真實感和邀請感。使用乾淨、明亮的攝影棚燈光。${imageOnlyInstruction}`,
    };
    return prompts[itemType] || `根據提供圖片中服裝的風格、顏色和整體主題，設計一款有創意且吸引人的「${itemType}」。最終輸出應為該物品在乾淨、中性背景上的照片般逼真的產品照片，看起來像專業的商業攝影。${imageOnlyInstruction}`;
};

export const generateBoutiqueItem = (baseImage: string, itemType: string): Promise<string> => {
    const prompt = getBoutiqueItemPrompt(itemType);
    return callImageEditModel([dataUrlToPart(baseImage)], prompt);
};

const alchemyPrompt = (type: 'outfit' | 'accessory', userPrompt: string): string => `分析所有提供的參考圖片，以理解它們結合後的美學、風格、色調和紋理。然後，生成一張單一的、全新的、照片般逼真的「${userPrompt}」圖片。這個新創作應該是所有參考圖片風格的創造性融合。不要簡單地複製元素；要創造一個有凝聚力的新設計。${type === 'accessory' ? '將最終物體放置在純白色背景上，並使用攝影棚燈光。' : '這應該是一張完整的時尚寫真，有模特兒穿著這套服裝。'} \n\n**嚴格要求：**\n1. **僅輸出圖片**：不要生成任何文字。`;

export const generateAlchemyOutfit = (referenceImages: string[], prompt: string): Promise<string> => {
    const parts = referenceImages.map(img => dataUrlToPart(img));
    return callImageEditModel(parts, alchemyPrompt('outfit', prompt));
};

export const generateAlchemyAccessory = (referenceImages: string[], prompt: string): Promise<string> => {
    const parts = referenceImages.map(img => dataUrlToPart(img));
    return callImageEditModel(parts, alchemyPrompt('accessory', prompt));
};

export const describeImageStyle = async (referenceImage: string): Promise<string> => {
    const imagePart = dataUrlToPart(referenceImage);
    const prompt = '分析這張圖片中的服裝，並用一個簡潔的短語描述其時尚風格，該短語應適合用作圖片生成提示。例如：「帶有低腰牛仔褲的 Y2K 街頭風格」、「帶有粗花呢西裝外套的深色學術風」或「帶有機能性面料的 Gorpcore 風」。僅提供風格描述短語。';
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: { parts: [{ text: prompt }, imagePart] },
    });
    return response.text.trim();
};

export const generateStyledCreation = (creationPrompt: string, styleReferenceImage: string): Promise<string> => {
    const fullPrompt = `**任務：** 根據文字描述和風格參考圖生成一張新圖片。

**描述：** "${creationPrompt}"

**風格：** 新圖片的整體風格、色調、情緒和質感必須主要受提供的參考圖啟發。

**嚴格要求：**
1. **僅輸出圖片**：你的唯一輸出必須是最終的圖片。不要生成任何文字。
2. **照片般逼真**：生成一張高品質、逼真的照片。`;
    return callImageEditModel([dataUrlToPart(styleReferenceImage)], fullPrompt);
};


// --- Infinite Photoshoot Module Functions ---
export const describeImageForAlbum = async (imageUrl: string): Promise<{ title: string; description: string }> => {
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: {
            parts: [
                { text: '分析這張時尚照片。您的目標是為相簿提供文字。請簡潔且有創意。語言必須是繁體中文。返回一個包含兩個屬性的 JSON 物件：一個簡短、引人注目的「title」(大標題)，以及一個單句的「description」(小標題)。' },
                dataUrlToPart(imageUrl)
            ]
        },
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    title: { type: Type.STRING },
                    description: { type: Type.STRING }
                },
                required: ["title", "description"]
            }
        }
    });
    try {
        return JSON.parse(response.text);
    } catch (e) {
        console.error("Failed to parse image description from Gemini:", e);
        return { title: "AI 生成標題", description: "這張圖片的 AI 生成描述。" };
    }
};

export const generateVariations = async (category: string, count: number): Promise<{ title: string; description: string; prompt: string }[]> => {
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `您是一位高級時尚雜誌的創意總監。針對「${category}」類別，生成整整 ${count} 個多樣化且富於想像力的攝影概念。對於每個概念，請提供：1. 一個簡短、引人注目的「title」。2. 一句能喚起情緒的「description」。3. 一個給 AI 圖像生成器的簡潔「prompt」，專注於服裝和場景的視覺元素。語言必須是繁體中文。`,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        title: { type: Type.STRING },
                        description: { type: Type.STRING },
                        prompt: { type: Type.STRING }
                    },
                    required: ["title", "description", "prompt"]
                }
            }
        }
    });
    try {
        return JSON.parse(response.text);
    } catch (e) {
        console.error("Failed to parse variations from Gemini:", e);
        throw new Error("無法從 AI 獲取有效的風格變化建議。");
    }
};

export const generateMagazineHeadlines = async (theme: string): Promise<{ title: string; headlines: string[] }> => {
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `You are a creative director for a high-fashion magazine. The theme for the next issue is "${theme}". Generate content for the cover. Provide all text in English.
        The output should be a JSON object with:
        1. A main "title" for the magazine (e.g., "VOGUE", "ELLE", "BAZAAR", or something creative related to the theme).
        2. An array of 2 to 4 short, punchy "headlines" related to the theme. The total number of headlines should not exceed 4. Examples: "The Future of Style", "Timeless Pieces Reimagined", "A New Era Begins".`,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    title: { type: Type.STRING },
                    headlines: { type: Type.ARRAY, items: { type: Type.STRING } }
                },
                required: ["title", "headlines"]
            }
        }
    });
    try {
        return JSON.parse(response.text);
    } catch (e) {
        console.error("Failed to parse magazine headlines:", e);
        return { title: theme.toUpperCase(), headlines: ["The Style Issue", "Bold & Beautiful", "Modern Fashion"] };
    }
};

export const generateSuggestedPrompts = async (type: 'scene' | 'style', count: number): Promise<string[]> => {
    const content = `為時尚攝影的${type}生成 ${count} 個多樣化且有創意的一句話概念。場景範例：「夜晚的東京街頭」、「有霧的森林」。風格範例：「哥德蘿莉塔」、「80年代復古未來主義」。以 JSON 字符串數組格式返回結果。語言：繁體中文。`;
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: content,
        config: {
            responseMimeType: "application/json",
            responseSchema: { type: Type.ARRAY, items: { type: Type.STRING } }
        }
    });
    try {
        return JSON.parse(response.text);
    } catch (e) {
        console.error(`Failed to parse suggested ${type}s:`, e);
        return Array(count).fill(`AI 生成${type === 'scene' ? '場景' : '風格'}`);
    }
};

export const generateSingleSuggestedCategory = async (): Promise<string> => {
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `生成一個單一、有創意的、一到兩個詞的時尚攝影類別。範例：「年代」、「奇幻」、「藝術」、「次文化」。僅以純文字返回類別名稱。語言：繁體中文。`,
    });
    return response.text.trim();
};

// --- Outfit Analysis Module Functions ---

export const analyzeOutfit = async (image: string): Promise<{ item: string; description: string; brand: string }[]> => {
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: {
            parts: [
                { text: "分析這張圖片中的穿搭。識別每個服裝項目（例如，「上衣」、「褲子」、「鞋子」、「飾品」）。對於每個項目，提供簡短的描述，並建議一個可能的高端或流行品牌，該品牌可能會生產此類商品。品牌建議僅供風格參考。以 JSON 數組對象的形式返回結果，每個對象都包含 'item'、'description' 和 'brand' 鍵。語言必須是繁體中文。請確保 JSON 字串值中不包含任何 Markdown 語法 (例如 ** 或 * )。" },
                dataUrlToPart(image)
            ]
        },
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        item: { type: Type.STRING },
                        description: { type: Type.STRING },
                        brand: { type: Type.STRING }
                    },
                    required: ["item", "description", "brand"]
                }
            }
        }
    });
    try {
        return JSON.parse(response.text);
    } catch (e) {
        console.error("Failed to parse outfit analysis from Gemini:", e);
        throw new Error("無法解析穿搭分析結果。");
    }
};

export const extractClothingItem = (baseImage: string, itemDescription: string): Promise<string> => {
    const prompt = `從提供的圖片中，精確地提取被描述為「${itemDescription}」的服裝項目。輸出必須是只有該物品且背景透明的 PNG 圖片。不要包含人物或背景的任何其他部分。`;
    return callImageEditModel([dataUrlToPart(baseImage)], prompt);
};

export const critiqueAndRedesignOutfit = async (image: string): Promise<{ critique: string; imageUrl: string }> => {
    const prompt = `您是一位專業的時尚造型師。
    1. **評價**: 首先，對所提供圖片中的穿搭提出建設性的評價。具體說明哪些部分搭配得好，哪些可以改進。
    2. **改造**: 根據您的評價，重新設計一套更時尚、更協調或更前衛的穿搭。生成一張同一個人物穿著改良後服裝的新圖片。
    **嚴格指示**:
    - 保持人物確切的臉部、身份和身形。
    - 輸出必須同時包含您的文字評價和新圖片。
    - 評價文字必須使用繁體中文。`;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image-preview',
        contents: { parts: [dataUrlToPart(image), { text: prompt }] },
        config: { responseModalities: [Modality.TEXT, Modality.IMAGE] },
    });

    const candidate = response.candidates?.[0];
    if (!candidate) {
        throw new Error("模型未返回有效回應。");
    }

    let critique = '';
    let imageUrl = '';

    for (const part of candidate.content.parts) {
        if (part.text) {
            critique = part.text;
        } else if (part.inlineData) {
            imageUrl = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
        }
    }

    if (!critique || !imageUrl) {
        // Fallback or more specific error handling can be added here
        if (candidate.finishReason && candidate.finishReason !== 'STOP') {
             throw new Error(`模型未能同時生成評價和圖片，原因：${candidate.finishReason}`);
        }
        throw new Error("模型未能同時生成評價和圖片。");
    }

    return { critique, imageUrl };
};

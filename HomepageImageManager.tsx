/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

// Note: The 'Mode' type is defined in App.tsx. 
// We are using a string literal type here to avoid circular dependencies
// and keep this file as a standalone configuration.
export type HomepageMode = 'portrait' | 'composition' | 'multiAngle' | 'imaginative' | 'infinitePhotoshoot' | 'clothingAssistant' | 'outfitAnalysis' | 'portfolio';

export interface HomepageCardConfig {
  id: HomepageMode;
  title: string;
  description: string;
  emoji: string;
  imageGenerationPrompt: string;
  imageUrl: string; // Leave empty to use emoji fallback. Fill with image URL to display image.
}

export const homepageCards: HomepageCardConfig[] = [
  {
    id: 'portrait',
    title: '從人像照片開始',
    description: '上傳您的人像或全身照，為您進行虛擬試穿。',
    emoji: '👩‍🎨',
    imageGenerationPrompt: "A beautiful, close-up portrait RAW photo of a person from the chest up. Their expression is neutral yet engaging. The lighting is soft window light coming from the side, highlighting the contours of their face. The background is a simple, out-of-focus indoor setting. The photo should have a very sharp focus on the eyes and a natural skin texture. No heavy retouching. Shot on an 85mm f/1.8 lens.",
    imageUrl: 'https://raw.githubusercontent.com/dseditor/pdfbookshelf/main/webp/ComfyUI_00081_.webp',
  },
  {
    id: 'composition',
    title: '從時尚單品開始',
    description: '上傳服飾與人像，打造完整的造型。',
    emoji: '👠',
    imageGenerationPrompt: "A flat-lay RAW photo composition of fashion items on a clean, light gray background. Include a stylish pair of heels, a folded sweater, a leather handbag, and sunglasses. The arrangement is artistic yet casual. Lighting is bright and even, like from a large softbox overhead, revealing the textures of each item. The image has a clean, high-end catalog feel.",
    imageUrl: 'https://raw.githubusercontent.com/dseditor/pdfbookshelf/main/webp/ComfyUI_00082_.webp',
  },
  {
    id: 'multiAngle',
    title: '姿勢與場景實驗室',
    description: '上傳一張照片，生成不同站姿、角度與情緒。',
    emoji: '🔄',
    imageGenerationPrompt: "A dynamic RAW photo showing the same person in a sequence of three different poses, captured with a strobe effect or motion blur. The person is in a studio with a solid dark gray background. The lighting is dramatic, creating strong highlights and shadows that define their form as they move. The focus is on the motion and the different angles of the body. Shot with a fast shutter speed to freeze some parts of the motion.",
    imageUrl: 'https://raw.githubusercontent.com/dseditor/pdfbookshelf/main/webp/ComfyUI_00083_.webp',
  },
  {
    id: 'imaginative',
    title: '天馬行空',
    description: '讓 AI 引導您，創造獨一無二的虛擬人物與服飾。',
    emoji: '🚀',
    imageGenerationPrompt: "An abstract, creative RAW photo. A close-up on a person's face, but half of the face is overlaid with a projection of swirling galaxy nebulae in vibrant colors. The lighting is dark and moody, with the projection being the main light source. There's a subtle lens flare and a sense of wonder and infinite possibility. The texture of the skin should still be visible through the projection.",
    imageUrl: 'https://raw.githubusercontent.com/dseditor/pdfbookshelf/main/webp/ComfyUI_00084_.webp',
  },
  {
    id: 'infinitePhotoshoot',
    title: '無限寫真',
    description: '選擇主題與變化，AI 為您生成一系列風格寫真。',
    emoji: '📸',
    imageGenerationPrompt: "A RAW photo of a vintage film camera sitting on a stack of glossy fashion magazines. The background is a bustling, slightly out-of-focus photography studio with lights and backdrops visible. The lighting catches the metallic texture of the camera and the vibrant covers of the magazines. The mood is creative, professional, and full of potential. A shallow depth of field is used to draw focus to the camera.",
    imageUrl: 'https://raw.githubusercontent.com/dseditor/pdfbookshelf/main/webp/ComfyUI_00085_.webp',
  },
  {
    id: 'clothingAssistant',
    title: '服裝助理',
    description: '一衣多人展示或一人多衣試穿，加速您的設計流程。',
    emoji: '👔',
    imageGenerationPrompt: "A high-end fashion design studio workspace RAW photo. On a large digital screen, an AI is generating multiple model variations wearing the same designer jacket. Mannequins, fabric swatches, and design sketches are visible on the desk. The mood is futuristic, efficient, and creative. Soft, diffused lighting from the screen illuminates the scene.",
    imageUrl: 'https://raw.githubusercontent.com/dseditor/pdfbookshelf/main/webp/ComfyUI_00086_.webp',
  },
  {
    id: 'outfitAnalysis',
    title: '穿搭分析',
    description: '上傳您的穿搭照片，讓 AI 進行分析、單品提取與風格改造建議。',
    emoji: '🧐',
    imageGenerationPrompt: "",
    imageUrl: 'https://raw.githubusercontent.com/dseditor/pdfbookshelf/main/webp/ComfyUI_00087_.webp',
  },
  {
    id: 'portfolio',
    title: '作品集',
    description: '管理您儲存的創作與靈感。',
    emoji: '📚',
    imageGenerationPrompt: "", // No generation needed for this card
    imageUrl: 'https://raw.githubusercontent.com/dseditor/pdfbookshelf/main/webp/ComfyUI_00088_.webp',
  },
];
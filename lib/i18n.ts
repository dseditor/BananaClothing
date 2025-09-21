/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

const translations: { [key: string]: any } = {
    'portrait': '從人像照片開始',
    'composition': '從時尚單品開始',
    'multiAngle': {
        __title: '姿勢與場景實驗室',
        'pose': '姿勢',
        'angle': '角度',
        'emotion': '情緒'
    },
    'imaginative': {
        __title: '天馬行空',
        'virtualModel': '虛擬模特',
        'conceptClothing': '概念服飾',
        'timeTravel': '時空旅行',
        'styleAlchemy': '風格煉金術',
        'boutiqueItems': '精品小物'
    },
    'infinitePhotoshoot': '無限寫真',
    'outfitAnalysis': '穿搭分析',
    'clothingAssistant': {
        __title: '服裝助理',
        'oneGarment': '一衣多人',
        'oneModel': '一人多衣'
    },
    'portfolio': '作品集',
    'asset': '素材',
};

/**
 * A simple translation function.
 * Supports dot notation for nested keys (e.g., 'imaginative.virtualModel').
 * @param key The key to translate.
 * @returns The translated string or the key itself if not found.
 */
export function t(key: string): string {
    if (!key) return '';
    
    const keys = key.split('.');
    let result: any = translations;

    for (const k of keys) {
        if (result && typeof result === 'object' && k in result) {
            result = result[k];
        } else {
            return key; // Key not found, return the original key
        }
    }

    // If the final result is an object with a __title property, return that.
    if (typeof result === 'object' && result !== null && result.__title) {
        return result.__title;
    }

    return typeof result === 'string' ? result : key;
}
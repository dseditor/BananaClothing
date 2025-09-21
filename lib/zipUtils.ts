/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import JSZip from 'jszip';
import saveAs from 'file-saver';

interface ZipImage {
    url: string;
    name: string;
}

/**
 * Creates a ZIP file containing the provided images and triggers a download.
 * @param images An array of objects, each with an image URL and a name for the file.
 * @param zipName The desired name for the output ZIP file.
 */
export async function createZipAndDownload(images: ZipImage[], zipName: string = '室內設計專案.zip'): Promise<void> {
    const zip = new JSZip();

    const fetchPromises = images.map(async (imgData) => {
        try {
            const response = await fetch(imgData.url);
            if (!response.ok) {
                throw new Error(`Failed to fetch image: ${response.statusText}`);
            }
            const blob = await response.blob();
            
            // Sanitize filename more robustly
            const safeName = imgData.name.replace(/[\\/:*?"<>|()]/g, '_').replace(/\s+/g, '_');
            const fileName = `${safeName || 'design'}.jpeg`;
            
            zip.file(fileName, blob, { binary: true });
        } catch (error) {
            console.error(`Could not add image ${imgData.name} to zip:`, error);
        }
    });

    await Promise.all(fetchPromises);

    const zipBlob = await zip.generateAsync({ 
        type: 'blob',
        compression: "DEFLATE",
        compressionOptions: {
            level: 9
        }
    });
    saveAs(zipBlob, zipName);
}
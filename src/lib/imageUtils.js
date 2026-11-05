/**
 * Procesa y comprime imágenes mediante HTML5 Canvas para optimizar el almacenamiento.
 * Devuelve { name, dataUrl, size }.
 */
export function processImageFile(file, maxWidth = 900, maxHeight = 900, quality = 0.85) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > maxWidth || height > maxHeight) {
          if (width > height) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        canvas.getContext("2d").drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL("image/jpeg", quality);
        resolve({
          name: file.name,
          dataUrl,
          size: Math.round(dataUrl.length / 1024) + " KB",
        });
      };
      img.onerror = () => reject(new Error("No se pudo procesar la imagen"));
      img.src = e.target.result;
    };
    reader.onerror = () => reject(new Error("Error al leer archivo"));
    reader.readAsDataURL(file);
  });
}

/** Convierte un dataURL (base64) en Blob para subirlo a Supabase Storage */
export function dataUrlToBlob(dataUrl) {
  const [header, base64] = dataUrl.split(",");
  const mime = header.match(/:(.*?);/)?.[1] || "image/jpeg";
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

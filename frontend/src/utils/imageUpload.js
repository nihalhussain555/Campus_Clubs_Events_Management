const READABLE_TYPES = /^image\/(png|jpe?g|webp)$/i;

// Avatars are stored inline on the user document and the API body limit is 1 mb,
// while every original camera photo is several megabytes.
export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;

export const isSupportedImage = (file) =>
  Boolean(file) && READABLE_TYPES.test(file.type || '');

export const downscaleImage = (file, maxDimension = 512) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onerror = () => reject(new Error('Could not read the selected file'));

    reader.onload = () => {
      const img = new Image();

      img.onerror = () => reject(new Error('That file is not a readable image'));

      img.onload = () => {
        const scale = Math.min(
          1,
          maxDimension / Math.max(img.width, img.height)
        );

        const canvas = document.createElement('canvas');

        canvas.width = Math.max(1, Math.round(img.width * scale));
        canvas.height = Math.max(1, Math.round(img.height * scale));

        const ctx = canvas.getContext('2d');

        // JPEG has no alpha channel, so transparent PNGs would go black.
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        resolve(canvas.toDataURL('image/jpeg', 0.82));
      };

      img.src = reader.result;
    };

    reader.readAsDataURL(file);
  });

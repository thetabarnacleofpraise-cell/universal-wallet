export function exportQrAsPng(svgElement: SVGElement, size: number = 220): Blob {
  const svgData = new XMLSerializer().serializeToString(svgElement);
  const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(svgBlob);

  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context not available');

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, size, size);

  const img = new Image();
  img.width = size;
  img.height = size;

  const drawPromise = new Promise<void>((resolve, reject) => {
    img.onload = () => {
      ctx.drawImage(img, 0, 0, size, size);
      URL.revokeObjectURL(url);
      resolve();
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to render QR image'));
    };
  });

  img.src = url;

  return new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
}

export async function renderQrToPngBlob(svgElement: SVGElement, size: number = 220): Promise<Blob> {
  const svgData = new XMLSerializer().serializeToString(svgElement);
  const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(svgBlob);

  return new Promise<Blob>((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        URL.revokeObjectURL(url);
        reject(new Error('Canvas 2D context not available'));
        return;
      }
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, size, size);
      ctx.drawImage(img, 0, 0, size, size);
      URL.revokeObjectURL(url);
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Failed to create PNG blob'));
      }, 'image/png');
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to render QR image'));
    };
    img.src = url;
  });
}

export function canShareFiles(): boolean {
  return typeof navigator !== 'undefined' &&
    typeof navigator.canShare === 'function' &&
    typeof navigator.share === 'function';
}

export async function shareQrImage(pngBlob: Blob, title: string = 'Universal Wallet Transfer'): Promise<boolean> {
  if (!canShareFiles()) return false;

  const file = new File([pngBlob], 'universal-wallet-transfer.png', { type: 'image/png' });

  if (!navigator.canShare({ files: [file] })) return false;

  try {
    await navigator.share({ files: [file], title });
    return true;
  } catch {
    return false;
  }
}

export function downloadQrPng(pngBlob: Blob, filename: string = 'universal-wallet-transfer.png'): void {
  const url = URL.createObjectURL(pngBlob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

import { Capacitor } from '@capacitor/core';
import { Directory, Filesystem } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

export async function exportarPdf(blob: Blob, nombre: string): Promise<void> {
  if (!Capacitor.isNativePlatform()) {
    const url = URL.createObjectURL(blob);
    const enlace = document.createElement('a');
    enlace.href = url; enlace.download = nombre;
    document.body.appendChild(enlace); enlace.click(); enlace.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
    return;
  }
  const data = await new Promise<string>((resolve, reject) => {
    const lector = new FileReader();
    lector.onload = () => resolve(String(lector.result).split(',')[1]);
    lector.onerror = () => reject(new Error('No se pudo preparar el PDF.'));
    lector.readAsDataURL(blob);
  });
  const path = `reportes/${nombre.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
  const archivo = await Filesystem.writeFile({ path, data, directory: Directory.Cache, recursive: true });
  try {
    await Share.share({ title: nombre, files: [archivo.uri], dialogTitle: 'Guardar o compartir reporte' });
  } catch (error) {
    await Filesystem.deleteFile({ path, directory: Directory.Cache }).catch(() => undefined);
    throw error;
  }
  // Android puede resolver Share antes de que la app elegida lea el archivo.
  // Mantenerlo en Cache; el sistema puede liberarlo y una nueva descarga lo reemplaza.
}

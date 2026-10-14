import { vi } from 'vitest';
import { exportarPdf } from './exportar-pdf';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

vi.mock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: () => true } }));
vi.mock('@capacitor/filesystem', () => ({
  Directory: { Cache: 'CACHE' },
  Filesystem: { writeFile: vi.fn(), deleteFile: vi.fn() },
}));
vi.mock('@capacitor/share', () => ({ Share: { share: vi.fn() } }));

describe('Exportación nativa de PDF', () => {
  beforeEach(() => {
    vi.mocked(Filesystem.writeFile).mockResolvedValue({uri:'file:///cache/reporte.pdf'});
    vi.mocked(Filesystem.deleteFile).mockResolvedValue();
    vi.mocked(Share.share).mockResolvedValue({});
  });
  afterEach(() => vi.clearAllMocks());
  it('comparte el archivo autenticado y lo conserva para que Android pueda leerlo', async () => {
    await exportarPdf(new Blob(['%PDF prueba']), 'FiadOS-2026-09-30.pdf');
    expect(Filesystem.writeFile).toHaveBeenCalledWith({
      path:'reportes/FiadOS-2026-09-30.pdf', data:btoa('%PDF prueba'), directory:Directory.Cache, recursive:true,
    });
    expect(Share.share).toHaveBeenCalledWith(expect.objectContaining({files:['file:///cache/reporte.pdf']}));
    expect(Filesystem.deleteFile).not.toHaveBeenCalled();
  });
  it('limpia el temporal incluso si falla el menú de compartir', async () => {
    vi.mocked(Share.share).mockRejectedValueOnce(new Error('Fallo nativo'));
    await expect(exportarPdf(new Blob(['%PDF']), 'reporte.pdf')).rejects.toThrow('Fallo nativo');
    expect(Filesystem.deleteFile).toHaveBeenCalledOnce();
  });
});

jest.mock('@nestjs/typeorm', () => ({
  InjectRepository: () => () => {},
}));

const sharp = require('sharp');
import { ArchivosService } from '../../src/modules/uploads/uploads.service';

describe('ArchivosService (Unit Tests)', () => {
  let service: ArchivosService;
  let mockConfigService: any;
  let mockRepositorioArchivo: any;
  let mockRepositorioImagenProducto: any;
  let mockRepositorioCategoria: any;
  let mockRepositorioUsuario: any;

  beforeEach(() => {
    mockConfigService = {
      get: jest.fn((key: string) => {
        if (key === 'CLOUDINARY_CLOUD_NAME') return 'demo-cloud';
        if (key === 'CLOUDINARY_API_KEY') return '1234567890';
        if (key === 'CLOUDINARY_API_SECRET') return 'abcdef-secret';
        return null;
      }),
    };

    mockRepositorioArchivo = {
      create: jest.fn((dto) => ({ id: 'arch-1', ...dto })),
      save: jest.fn((entity) => Promise.resolve({ id: 'arch-1', ...entity })),
      findOne: jest.fn(),
      find: jest.fn().mockResolvedValue([]),
      remove: jest.fn().mockResolvedValue(true),
      createQueryBuilder: jest.fn(() => ({
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      })),
    };

    mockRepositorioImagenProducto = {
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn(),
      remove: jest.fn().mockResolvedValue(true),
    };

    mockRepositorioCategoria = {
      find: jest.fn().mockResolvedValue([]),
    };

    mockRepositorioUsuario = {
      find: jest.fn().mockResolvedValue([]),
    };

    service = new ArchivosService(
      mockConfigService,
      mockRepositorioArchivo,
      mockRepositorioImagenProducto,
      mockRepositorioCategoria,
      mockRepositorioUsuario,
    );
  });

  describe('HU-83: optimizarImagen (Rol Sistema)', () => {
    it('debe convertir cualquier buffer de imagen a formato WebP optimizado y calcular ahorro', async () => {
      // Generar imagen sintética de prueba con sharp
      const bufferOriginalPng = await sharp({
        create: {
          width: 800,
          height: 800,
          channels: 3,
          background: { r: 100, g: 150, b: 200 },
        },
      })
        .png()
        .toBuffer();

      const resultado = await service.optimizarImagen(bufferOriginalPng, 'productos');

      expect(resultado.buffer).toBeDefined();
      expect(resultado.pesoOriginal).toBe(bufferOriginalPng.length);
      expect(resultado.pesoOptimizado).toBe(resultado.buffer.length);
      expect(resultado.ancho).toBe(800);
      expect(resultado.alto).toBe(800);

      // Verificar que el formato de salida sea webp
      const metadata = await sharp(resultado.buffer).metadata();
      expect(metadata.format).toBe('webp');
    });

    it('debe redimensionar a máx 500x500 cuando la categoría es perfil', async () => {
      const bufferGrande = await sharp({
        create: {
          width: 1200,
          height: 1200,
          channels: 3,
          background: { r: 255, g: 255, b: 0 },
        },
      })
        .jpeg()
        .toBuffer();

      const resultado = await service.optimizarImagen(bufferGrande, 'perfiles');

      expect(resultado.ancho).toBeLessThanOrEqual(500);
      expect(resultado.alto).toBeLessThanOrEqual(500);
    });
  });

  describe('HU-80: Cloudinary status y configuración', () => {
    it('debe detectar correctamente que Cloudinary está configurado cuando existen credenciales', () => {
      expect(service.isCloudinaryConfigured()).toBe(true);

      const estado = service.obtenerEstadoCloudinary();
      expect(estado.configurado).toBe(true);
      expect(estado.cloudName).toBe('demo-cloud');
      expect(estado.modoPorDefecto).toBe('cloudinary');
    });

    it('debe indicar modo local cuando no hay credenciales de Cloudinary', () => {
      mockConfigService.get.mockReturnValue(null);
      const servicioLocal = new ArchivosService(
        mockConfigService,
        mockRepositorioArchivo,
        mockRepositorioImagenProducto,
        mockRepositorioCategoria,
        mockRepositorioUsuario,
      );

      expect(servicioLocal.isCloudinaryConfigured()).toBe(false);
      const estado = servicioLocal.obtenerEstadoCloudinary();
      expect(estado.configurado).toBe(false);
      expect(estado.modoPorDefecto).toBe('local');
    });
  });

  describe('HU-81: Detección y eliminación de obsoletas', () => {
    it('debe clasificar una imagen como enUso si está referenciada en un producto', async () => {
      mockRepositorioArchivo.createQueryBuilder = jest.fn(() => ({
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([
          {
            id: 'arch-1',
            url: '/uploads/productos/vestido_1.webp',
            nombreArchivo: 'vestido_1.webp',
            pesoBytes: 50000,
            categoria: 'productos',
          },
          {
            id: 'arch-2',
            url: '/uploads/productos/huerfana.webp',
            nombreArchivo: 'huerfana.webp',
            pesoBytes: 30000,
            categoria: 'productos',
          },
        ]),
      }));

      mockRepositorioImagenProducto.find.mockResolvedValue([
        {
          url: '/uploads/productos/vestido_1.webp',
          producto: { nombre: 'Vestido de Fiesta' },
        },
      ]);

      const archivos = await service.obtenerArchivos();

      expect(archivos).toHaveLength(2);
      const arch1 = archivos.find((a) => a.id === 'arch-1');
      const arch2 = archivos.find((a) => a.id === 'arch-2');

      expect(arch1.enUso).toBe(true);
      expect(arch1.vinculadoA).toContain('Vestido de Fiesta');

      expect(arch2.enUso).toBe(false);
      expect(arch2.vinculadoA).toBeNull();
    });

    it('debe eliminar el registro y llamar a remove en los repositorios', async () => {
      const archivo = {
        id: 'arch-2',
        url: '/uploads/productos/huerfana.webp',
        publicId: 'ecommerce/productos/huerfana_123',
      };
      mockRepositorioArchivo.findOne.mockResolvedValue(archivo);

      const res = await service.eliminarArchivo('arch-2');

      expect(res.exito).toBe(true);
      expect(mockRepositorioArchivo.remove).toHaveBeenCalledWith(archivo);
    });
  });
});

import { BadRequestException } from '@nestjs/common';
import { DynamicReportsService } from '../../src/modules/admin/dynamic-reports/dynamic-reports.service';
import { ProveedorIA } from '../../src/modules/admin/dynamic-reports/dto/dynamic-reports.dto';

describe('DynamicReportsService (Unit Tests)', () => {
  let service: DynamicReportsService;
  let mockDataSource: any;
  let mockConfigService: any;

  beforeEach(() => {
    mockDataSource = {
      query: jest.fn(),
    };

    mockConfigService = {
      get: jest.fn((key: string) => {
        if (key === 'GROQ_API_KEY') return '';
        if (key === 'GROQ_MODEL') return 'llama-3.3-70b-versatile';
        if (key === 'OLLAMA_URL') return 'http://localhost:11434';
        return undefined;
      }),
    };

    service = new DynamicReportsService(mockDataSource, mockConfigService);
  });

  describe('Seguridad y Sanitización SQL', () => {
    it('debe rechazar consultas con sentencias prohibidas como DROP', async () => {
      await expect(
        service.ejecutarSqlDirecto('DROP TABLE usuario'),
      ).rejects.toThrow(BadRequestException);
    });

    it('debe rechazar consultas con sentencias de modificación INSERT o UPDATE', async () => {
      await expect(
        service.ejecutarSqlDirecto('INSERT INTO usuario (nombre) VALUES (\'Hacker\')'),
      ).rejects.toThrow(BadRequestException);

      await expect(
        service.ejecutarSqlDirecto('UPDATE producto SET precio = 0'),
      ).rejects.toThrow(BadRequestException);
    });

    it('debe rechazar inyección de múltiples sentencias separadas por punto y coma', async () => {
      await expect(
        service.ejecutarSqlDirecto('SELECT * FROM producto; DROP TABLE usuario'),
      ).rejects.toThrow(BadRequestException);
    });

    it('debe rechazar cualquier comando que no empiece con SELECT o WITH', async () => {
      await expect(
        service.ejecutarSqlDirecto('EXEC sp_get_data'),
      ).rejects.toThrow(BadRequestException);
    });

    it('debe forzar LIMIT 100 si la consulta generada no tiene cláusula LIMIT', async () => {
      mockDataSource.query.mockResolvedValueOnce([{ nombre: 'Polera', stock: 10 }]);

      const resultado = await service.ejecutarSqlDirecto('SELECT nombre, stock FROM producto');

      expect(resultado.sql).toContain('LIMIT 100');
      expect(mockDataSource.query).toHaveBeenCalledWith(expect.stringContaining('LIMIT 100'));
    });
  });

  describe('Filtrado de columnas de identificación técnica', () => {
    it('debe excluir columnas que terminen en id o contengan _id para proteger UUIDs técnicos', async () => {
      mockDataSource.query.mockResolvedValueOnce([
        {
          id: 'uuid-1234',
          producto_id: 'uuid-5678',
          nombre: 'Camisa de Seda',
          precio: 120.0,
          stock: 8,
        },
      ]);

      const resultado = await service.ejecutarSqlDirecto(
        'SELECT id, producto_id, nombre, precio, stock FROM producto',
      );

      expect(resultado.columnas).toEqual(['nombre', 'precio', 'stock']);
      expect(resultado.columnas).not.toContain('id');
      expect(resultado.columnas).not.toContain('producto_id');
    });
  });

  describe('Fallback automático y generación de reportes', () => {
    it('debe usar fallback para consultas de "stock" o "inventario" cuando no hay API Key de Groq', async () => {
      mockDataSource.query.mockResolvedValueOnce([
        { producto: 'Polera Algodón', sku: 'POL-1', talla: 'M', color: 'Gris', stock_actual: 50, stock_minimo: 5 },
      ]);

      const resultado = await service.generarYEjecutarReporte({
        prompt: '¿Cuántas camisetas hay en stock?',
        proveedor: ProveedorIA.GROQ,
      });

      expect(resultado).toBeDefined();
      expect(resultado.totalFilas).toBe(1);
      expect(resultado.columnas).toContain('producto');
      expect(resultado.columnas).toContain('stock_actual');
      expect(mockDataSource.query).toHaveBeenCalled();
    });

    it('debe usar fallback para consultas de productos más vendidos / top', async () => {
      mockDataSource.query.mockResolvedValueOnce([
        { producto: 'Vestido Elegante', categoria: 'Vestidos', unidades_vendidas: 15, ingresos_totales: 3750 },
      ]);

      const resultado = await service.generarYEjecutarReporte({
        prompt: 'Dame los productos más vendidos',
        proveedor: ProveedorIA.GROQ,
      });

      expect(resultado.descripcion).toContain('Top productos');
      expect(resultado.totalFilas).toBe(1);
      expect(resultado.filas[0].producto).toBe('Vestido Elegante');
    });

    it('debe interpretar correctamente consultas de stock de vestidos', async () => {
      mockDataSource.query.mockResolvedValueOnce([
        { producto: 'Vestido de Gala', categoria: 'Vestidos de Noche', color: 'Rojo Escarlata', talla: 'M', stock_actual: 15, stock_minimo: 5, precio_unitario: 320.0 },
      ]);

      const resultado = await service.generarYEjecutarReporte({
        prompt: 'muestrame cuanto stock hay de vestidos',
        proveedor: ProveedorIA.GROQ,
      });

      expect(resultado.sql).toContain('vestido');
      expect(resultado.sql).not.toContain('stock <= v.stock_minimo');
      expect(resultado.descripcion).toContain('Vestidos');
      expect(resultado.totalFilas).toBe(1);
    });

    it('debe interpretar correctamente consultas de stock con categoría y color combinado (pantalones azules)', async () => {
      mockDataSource.query.mockResolvedValueOnce([
        { producto: 'Jeans Denim', categoria: 'Pantalones', color: 'Azul Denim', talla: 'M', stock_actual: 15, stock_minimo: 5, precio_unitario: 140.0 },
      ]);

      const resultado = await service.generarYEjecutarReporte({
        prompt: 'muestrame cuanto stock hay de pantalones azules',
        proveedor: ProveedorIA.GROQ,
      });

      expect(resultado.sql).toContain('pantalon');
      expect(resultado.sql).toContain('azul');
      expect(resultado.sql).not.toContain('stock <= v.stock_minimo');
      expect(resultado.totalFilas).toBe(1);
    });

    it('debe filtrar por stock_minimo únicamente cuando se solicita stock agotado o bajo', async () => {
      mockDataSource.query.mockResolvedValueOnce([
        { producto: 'Top Básico', categoria: 'Poleras', color: 'Negro', talla: 'S', stock_actual: 2, stock_minimo: 5, sku: 'TOP-1' },
      ]);

      const resultado = await service.generarYEjecutarReporte({
        prompt: 'prendas con stock agotado o menor al stock mínimo',
        proveedor: ProveedorIA.GROQ,
      });

      expect(resultado.sql).toContain('stock <= v.stock_minimo');
      expect(resultado.totalFilas).toBe(1);
    });

    it('debe devolver totalFilas = 0 y lista vacía sin error cuando no hay registros en la base de datos', async () => {
      mockDataSource.query.mockResolvedValueOnce([]);

      const resultado = await service.generarYEjecutarReporte({
        prompt: 'Reporte de ventas de una fecha sin movimientos',
        proveedor: ProveedorIA.GROQ,
      });

      expect(resultado.totalFilas).toBe(0);
      expect(resultado.filas).toEqual([]);
      expect(resultado.tiempoEjecucionMs).toBeGreaterThanOrEqual(0);
    });
  });
});

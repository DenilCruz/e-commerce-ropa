import {
  Injectable,
  BadRequestException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { GenerarReporteDinamicoDto, ProveedorIA } from './dto/dynamic-reports.dto';

@Injectable()
export class DynamicReportsService {
  private readonly logger = new Logger(DynamicReportsService.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly configService: ConfigService,
  ) {}

  // =========================================================================
  // CONTEXTO DEL ESQUEMA DE BASE DE DATOS POSTGRESQL PARA EL LLM
  // =========================================================================
  private readonly DB_SCHEMA_PROMPT = `
Eres un asistente de inteligencia artificial experto en PostgreSQL y analítica de datos para la tienda de ropa "El Magnífico E-Commerce".
Tu objetivo es traducir peticiones en lenguaje natural o comandos de voz a consultas SQL precisas y seguras.

ESQUEMA DE TABLAS DISPONIBLES EN POSTGRESQL:
1. usuario (
    id UUID PRIMARY KEY,
    rol_id UUID REFERENCES rol(id),
    ci VARCHAR(20),
    nombre VARCHAR(100),
    apellido VARCHAR(100),
    celular VARCHAR(20),
    correo VARCHAR(150),
    email_verificado BOOLEAN,
    activo BOOLEAN,
    ultimo_login TIMESTAMP,
    creado_en TIMESTAMP
)

2. rol (
    id UUID PRIMARY KEY,
    nombre VARCHAR(50) -- 'ADMIN', 'CLIENTE', 'EMPLEADO'
)

3. producto (
    id UUID PRIMARY KEY,
    categoria_id UUID REFERENCES categoria(id),
    marca_id UUID REFERENCES marca(id),
    nombre VARCHAR(150),
    descripcion TEXT,
    precio DECIMAL(10,2),
    activo BOOLEAN,
    destacado BOOLEAN,
    creado_en TIMESTAMP
)

4. producto_variante (
    id UUID PRIMARY KEY,
    producto_id UUID REFERENCES producto(id),
    talla_id UUID REFERENCES talla(id),
    color_id UUID REFERENCES color(id),
    sku VARCHAR(50),
    stock INT,
    stock_minimo INT,
    precio_extra DECIMAL(10,2),
    activa BOOLEAN
)

5. categoria (
    id UUID PRIMARY KEY,
    nombre VARCHAR(100),
    activa BOOLEAN
)

6. marca (
    id UUID PRIMARY KEY,
    nombre VARCHAR(100)
)

7. talla (
    id UUID PRIMARY KEY,
    nombre VARCHAR(20) -- 'XS', 'S', 'M', 'L', 'XL'
)

8. color (
    id UUID PRIMARY KEY,
    nombre VARCHAR(50) -- 'Negro', 'Blanco', 'Azul', etc.
)

9. nota_venta (
    id UUID PRIMARY KEY,
    nro VARCHAR(20) UNIQUE, -- Ej: 'PED-2026-001'
    usuario_id UUID REFERENCES usuario(id),
    cupon_id UUID REFERENCES cupon(id),
    fecha TIMESTAMP,
    subtotal DECIMAL(10,2),
    descuento DECIMAL(10,2),
    costo_envio DECIMAL(10,2),
    total DECIMAL(10,2),
    estado VARCHAR(30) -- 'PENDIENTE', 'PAGADO', 'COMPLETADO', 'ENVIADO', 'ENTREGADO', 'CANCELADO'
)

10. detalle_nota_venta (
    id UUID PRIMARY KEY,
    notaventa_id UUID REFERENCES nota_venta(id),
    producto_id UUID REFERENCES producto(id),
    variante_id UUID REFERENCES producto_variante(id),
    cantidad INT,
    precio DECIMAL(10,2),
    descuento DECIMAL(10,2),
    subtotal DECIMAL(10,2),
    nombre_producto VARCHAR(150),
    talla VARCHAR(20),
    color VARCHAR(50)
)

11. cupon (
    id UUID PRIMARY KEY,
    codigo VARCHAR(50) UNIQUE,
    tipo VARCHAR(20), -- 'PORCENTAJE', 'MONTO_FIJO'
    valor DECIMAL(10,2),
    monto_minimo DECIMAL(10,2),
    usos_actuales INT,
    activo BOOLEAN
)

12. pago (
    id UUID PRIMARY KEY,
    notaventa_id UUID REFERENCES nota_venta(id),
    metodo_pago_id UUID REFERENCES metodo_pago(id),
    monto DECIMAL(10,2),
    estado VARCHAR(30), -- 'APROBADO', 'PENDIENTE', 'RECHAZADO'
    fecha_pago TIMESTAMP
)

13. metodo_pago (
    id UUID PRIMARY KEY,
    nombre VARCHAR(50),
    activo BOOLEAN
)

14. envio (
    id UUID PRIMARY KEY,
    notaventa_id UUID REFERENCES nota_venta(id),
    empresa_transportadora VARCHAR(100),
    numero_tracking VARCHAR(100),
    estado VARCHAR(30), -- 'PREPARANDO', 'EN_CAMINO', 'ENTREGADO'
    fecha_envio TIMESTAMP
)

REGLAS OBLIGATORIAS DE SEGURIDAD Y GENERACIÓN:
1. ÚNICAMENTE debes generar sentencias 'SELECT'.
2. PROHIBIDO terminantemente usar: INSERT, UPDATE, DELETE, DROP, ALTER, TRUNCATE, GRANT, EXEC, CREATE.
3. No incluyas punto y coma (;) al final ni consultas múltiples.
4. Si la consulta involucra agrupar ventas válidas, excluye las canceladas con: estado != 'CANCELADO'.
5. Utiliza nombres de alias claros y legibles para las columnas calculadas (ej: "total_ingresos", "unidades_vendidas", "nombre_cliente").
6. REGLA ESTRICTA DE COLUMNAS: NUNCA selecciones identificadores o UUIDs (como 'id', 'producto_id', 'usuario_id', 'variante_id', 'cupon_id', 'categoria_id', etc.) en la cláusula SELECT final. Muestra únicamente datos legibles como nombres de productos, categorías, tallas, colores, nombres de clientes, correos, cantidades, precios, subtotales, totales, fechas y estados.
7. Siempre que no se indique un límite específico, añade 'LIMIT 50' para optimizar la consulta.
8. Devuelve SIEMPRE la respuesta en formato JSON estrictamente válido con la estructura:
{
  "sql": "SELECT ...",
  "descripcion": "Explicación clara en español de qué datos extrae la consulta",
  "sugerenciaVisualizacion": "TABLA | METRICA | BARRAS"
}
`;

  // Helper para filtrar columnas de identificación técnica
  private esColumnaSinId(col: string): boolean {
    const c = col.toLowerCase().trim();
    if (c === 'id' || c === '_id' || c.endsWith('_id') || c.endsWith('id') || c.includes('_id_')) {
      return false;
    }
    return true;
  }

  // =========================================================================
  // HU PRINCIPAL: GENERACIÓN Y EJECUCIÓN DINÁMICA DE REPORTES
  // =========================================================================
  async generarYEjecutarReporte(dto: GenerarReporteDinamicoDto) {
    this.logger.log(`🎙️ Solicitud de reporte dinámico recibida: "${dto.prompt}" (Proveedor: ${dto.proveedor})`);

    // 1. Obtener SQL generado por IA (Groq u Ollama)
    const { sqlGenerado, descripcion, sugerenciaVisualizacion } = await this.obtenerSqlDesdeLLM(
      dto.prompt,
      dto.proveedor || ProveedorIA.GROQ,
    );

    // 2. Validar y Sanitizar la consulta SQL generada
    const sqlSanitizado = this.validarYSanitizarSql(sqlGenerado);

    // 3. Ejecutar la consulta en PostgreSQL
    const inicioMs = Date.now();
    let filas: any[] = [];
    try {
      filas = await this.dataSource.query(sqlSanitizado);
    } catch (dbError: any) {
      this.logger.error(`❌ Error SQL en consulta generada: ${sqlSanitizado} -> ${dbError.message}`);
      throw new BadRequestException(
        `Error al ejecutar la consulta generada: ${dbError.message || 'Sintaxis SQL inválida'}`,
      );
    }
    const duracionMs = Date.now() - inicioMs;

    // 4. Extraer columnas (filtrando IDs) y dar formato a resultados
    const todasColumnas = filas.length > 0 ? Object.keys(filas[0]) : [];
    const columnas = todasColumnas.filter((col) => this.esColumnaSinId(col));

    return {
      promptOriginal: dto.prompt,
      sql: sqlSanitizado,
      descripcion,
      sugerenciaVisualizacion: sugerenciaVisualizacion || 'TABLA',
      columnas: columnas.length > 0 ? columnas : todasColumnas,
      filas,
      totalFilas: filas.length,
      tiempoEjecucionMs: duracionMs,
    };
  }

  // =========================================================================
  // EJECUCIÓN DIRECTA DE CONSULTA SQL (VALIDADA)
  // =========================================================================
  async ejecutarSqlDirecto(sql: string) {
    const sqlSanitizado = this.validarYSanitizarSql(sql);
    const inicioMs = Date.now();
    const filas = await this.dataSource.query(sqlSanitizado);
    const duracionMs = Date.now() - inicioMs;

    const todasColumnas = filas.length > 0 ? Object.keys(filas[0]) : [];
    const columnas = todasColumnas.filter((col) => this.esColumnaSinId(col));

    return {
      sql: sqlSanitizado,
      columnas: columnas.length > 0 ? columnas : todasColumnas,
      filas,
      totalFilas: filas.length,
      tiempoEjecucionMs: duracionMs,
    };
  }

  // =========================================================================
  // COMUNICACIÓN CON GROQ / OLLAMA LLM
  // =========================================================================
  private async obtenerSqlDesdeLLM(
    promptUsuario: string,
    proveedor: ProveedorIA,
  ): Promise<{ sqlGenerado: string; descripcion: string; sugerenciaVisualizacion?: string }> {
    if (proveedor === ProveedorIA.OLLAMA) {
      return this.consultarOllama(promptUsuario);
    }

    return this.consultarGroq(promptUsuario);
  }

  // 1. Integración con Groq Cloud API
  private async consultarGroq(promptUsuario: string) {
    const apiKey =
      this.configService.get<string>('GROQ_API_KEY') ||
      process.env.GROQ_API_KEY ||
      '';

    const model =
      this.configService.get<string>('GROQ_MODEL') ||
      process.env.GROQ_MODEL ||
      'llama-3.3-70b-versatile';

    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: this.DB_SCHEMA_PROMPT },
            { role: 'user', content: promptUsuario },
          ],
          temperature: 0.1,
          max_tokens: 600,
          response_format: { type: 'json_object' },
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(`Groq API Error (${response.status}): ${errorText}`);
        throw new Error(`Groq API respondió con estado ${response.status}`);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;
      if (!content) {
        throw new Error('La IA no devolvió contenido.');
      }

      const parsed = JSON.parse(content);
      return {
        sqlGenerado: parsed.sql || parsed.query,
        descripcion: parsed.descripcion || 'Reporte generado dinámicamente',
        sugerenciaVisualizacion: parsed.sugerenciaVisualizacion || 'TABLA',
      };
    } catch (error: any) {
      this.logger.warn(`Fallo al consultar Groq: ${error.message}. Intentando fallback local...`);
      return this.fallbackGenerador(promptUsuario);
    }
  }

  // 2. Integración con Ollama Local
  private async consultarOllama(promptUsuario: string) {
    const ollamaUrl =
      this.configService.get<string>('OLLAMA_URL') ||
      process.env.OLLAMA_URL ||
      'http://localhost:11434';

    try {
      const response = await fetch(`${ollamaUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'llama3:latest',
          messages: [
            { role: 'system', content: this.DB_SCHEMA_PROMPT },
            { role: 'user', content: promptUsuario },
          ],
          stream: false,
          format: 'json',
        }),
      });

      if (!response.ok) {
        throw new Error(`Ollama respondió con estado ${response.status}`);
      }

      const data = await response.json();
      const content = data.message?.content;
      const parsed = JSON.parse(content);

      return {
        sqlGenerado: parsed.sql || parsed.query,
        descripcion: parsed.descripcion || 'Reporte generado con Ollama',
        sugerenciaVisualizacion: parsed.sugerenciaVisualizacion || 'TABLA',
      };
    } catch (error: any) {
      this.logger.error(`Error en Ollama: ${error.message}.`);
      throw new InternalServerErrorException(
        `No se pudo conectar con Ollama en ${ollamaUrl}. Asegúrate de que el servicio esté ejecutándose o usa Groq.`,
      );
    }
  }

  // 3. Fallback defensivo para consultas comunes si no hay conexión a internet
  private fallbackGenerador(prompt: string) {
    const p = prompt.toLowerCase();

    if (p.includes('mas vendido') || p.includes('más vendido') || p.includes('top')) {
      return {
        sqlGenerado: `SELECT p.nombre AS producto, c.nombre AS categoria, SUM(d.cantidad) AS unidades_vendidas, SUM(d.subtotal) AS ingresos_totales FROM detalle_nota_venta d JOIN producto p ON d.producto_id = p.id JOIN categoria c ON p.categoria_id = c.id JOIN nota_venta n ON d.notaventa_id = n.id WHERE n.estado != 'CANCELADO' GROUP BY p.nombre, c.nombre ORDER BY unidades_vendidas DESC LIMIT 10`,
        descripcion: 'Top productos con mayor cantidad de unidades vendidas e ingresos',
        sugerenciaVisualizacion: 'TABLA',
      };
    }

    if (p.includes('stock') || p.includes('agotado') || p.includes('inventario')) {
      return {
        sqlGenerado: `SELECT p.nombre AS producto, v.sku, t.nombre AS talla, c.nombre AS color, v.stock AS stock_actual, v.stock_minimo FROM producto_variante v JOIN producto p ON v.producto_id = p.id LEFT JOIN talla t ON v.talla_id = t.id LEFT JOIN color c ON v.color_id = c.id WHERE v.stock <= v.stock_minimo AND v.activa = true ORDER BY v.stock ASC LIMIT 20`,
        descripcion: 'Prendas con stock bajo o agotado en inventario',
        sugerenciaVisualizacion: 'TABLA',
      };
    }

    if (p.includes('cliente') || p.includes('usuario')) {
      return {
        sqlGenerado: `SELECT u.nombre || ' ' || u.apellido AS cliente, u.correo, COUNT(n.id) AS total_pedidos, COALESCE(SUM(n.total), 0) AS total_gastado FROM usuario u LEFT JOIN nota_venta n ON u.id = n.usuario_id WHERE u.activo = true GROUP BY u.id, u.nombre, u.apellido, u.correo ORDER BY total_gastado DESC LIMIT 20`,
        descripcion: 'Clientes y su historial de compras acumuladas',
        sugerenciaVisualizacion: 'TABLA',
      };
    }

    return {
      sqlGenerado: `SELECT n.nro, n.fecha, u.nombre || ' ' || u.apellido AS cliente, n.total, n.estado FROM nota_venta n JOIN usuario u ON n.usuario_id = u.id ORDER BY n.fecha DESC LIMIT 20`,
      descripcion: 'Listado general de pedidos recientes',
      sugerenciaVisualizacion: 'TABLA',
    };
  }

  // =========================================================================
  // PIPELINE DE SEGURIDAD Y SANITIZACIÓN SQL
  // =========================================================================
  private validarYSanitizarSql(sqlBruto: string): string {
    if (!sqlBruto || typeof sqlBruto !== 'string') {
      throw new BadRequestException('Consulta SQL inválida o vacía generada por la IA.');
    }

    // 1. Limpiar bloques de markdown si la IA los incluyó (```sql ... ```)
    let sql = sqlBruto
      .replace(/```sql/gi, '')
      .replace(/```/g, '')
      .trim();

    // 2. Quitar punto y coma al final si existe
    if (sql.endsWith(';')) {
      sql = sql.slice(0, -1).trim();
    }

    // 3. Prohibir múltiples consultas (inyección de punto y coma dentro de la consulta)
    if (sql.includes(';')) {
      throw new BadRequestException(
        'Por razones de seguridad, no se permiten múltiples sentencias SQL en un solo comando.',
      );
    }

    // 4. Verificación Estricta: La consulta DEBE empezar con SELECT o WITH (Common Table Expressions para SELECT)
    const normalized = sql.replace(/\s+/g, ' ').trim();
    const startsWithSelect = /^(SELECT|WITH)\s+/i.test(normalized);
    if (!startsWithSelect) {
      throw new BadRequestException(
        'Seguridad: Únicamente se permiten consultas de lectura (SELECT). Cualquier otra instrucción está bloqueada.',
      );
    }

    // 5. Lista Negra de Palabras Clave Peligrosas
    const palabrasProhibidas = [
      /\bINSERT\b/i,
      /\bUPDATE\b/i,
      /\bDELETE\b/i,
      /\bDROP\b/i,
      /\bALTER\b/i,
      /\bTRUNCATE\b/i,
      /\bGRANT\b/i,
      /\bREVOKE\b/i,
      /\bEXEC\b/i,
      /\bEXECUTE\b/i,
      /\bCREATE\b/i,
      /\bVACUUM\b/i,
      /\bCOPY\b/i,
      /\bRENAME\b/i,
      /\bSET\b/i,
      /\bMERGE\b/i,
      /\bDO\b/i,
      /\bLISTEN\b/i,
      /\bNOTIFY\b/i,
      /\bREINDEX\b/i,
      /\bINTO\b/i, // Evita SELECT ... INTO
    ];

    for (const pattern of palabrasProhibidas) {
      if (pattern.test(sql)) {
        throw new BadRequestException(
          `Seguridad: La consulta contiene la palabra clave no permitida [${pattern.source}]. Solo se permiten lecturas SELECT.`,
        );
      }
    }

    // 6. Enforzar un LIMIT razonable si no está presente para evitar sobrecargar memoria
    if (!/\bLIMIT\s+\d+/i.test(sql)) {
      sql = `${sql} LIMIT 100`;
    }

    return sql;
  }
}

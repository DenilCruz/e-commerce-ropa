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
Eres un asistente de inteligencia artificial experto en PostgreSQL y analítica de datos para la tienda de moda y alta costura "AURA".
Tu objetivo es traducir peticiones en lenguaje natural o comandos de voz a consultas SQL precisas, seguras y altamente optimizadas.

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
    stock INT, -- Cantidad física disponible actualmente en inventario
    stock_minimo INT, -- Umbral mínimo de alerta para reorden o escasez
    precio_extra DECIMAL(10,2),
    activa BOOLEAN
)

5. categoria (
    id UUID PRIMARY KEY,
    padre_id UUID REFERENCES categoria(id), -- Jerarquía: Subcategorías apuntan a su categoría padre
    nombre VARCHAR(100), -- 'Vestidos', 'Vestidos de Noche', 'Pantalones', 'Camisas', 'Poleras', etc.
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
    nombre VARCHAR(50) -- 'Azul Denim', 'Azul Zafiro', 'Negro Azabache', 'Rojo Escarlata', etc.
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

REGLAS CRÍTICAS SOBRE EL STOCK E INVENTARIO:
- REGLA 1 (STOCK ACTUAL DISPONIBLE): Si el usuario solicita consultar cuánto stock hay de una prenda, categoría o color (ej: "cuanto stock hay de vestidos", "stock de pantalones azules", "inventario de camisas"):
  Debes consultar las unidades existentes en inventario con 'v.stock AS stock_actual', uniendo 'producto_variante' con 'producto', 'categoria' (y su padre 'cp'), 'color' y 'talla'.
  NUNCA filtres por 'v.stock <= v.stock_minimo' en consultas de stock general o prendas específicas.
- REGLA 2 (STOCK BAJO O AGOTADO): ÚNICAMENTE filtra por 'v.stock <= v.stock_minimo' o 'v.stock = 0' cuando el usuario use explícitamente palabras como: "agotado", "stock bajo", "por agotarse", "menor al mínimo" o "escasez".
- REGLA 3 (JERARQUÍA DE CATEGORÍAS): Al buscar por categoría, une 'categoria c' y 'LEFT JOIN categoria cp ON c.padre_id = cp.id'. Filtra usando: '(c.nombre ILIKE '%termino%' OR cp.nombre ILIKE '%termino%' OR p.nombre ILIKE '%termino%')'.
- REGLA 4 (BÚSQUEDA INSENSIBLE A MAYÚSCULAS): Usa siempre ILIKE para comparar nombres de productos, categorías y colores.

REGLAS OBLIGATORIAS DE SEGURIDAD Y GENERACIÓN:
1. ÚNICAMENTE debes generar sentencias 'SELECT'.
2. PROHIBIDO terminantemente usar: INSERT, UPDATE, DELETE, DROP, ALTER, TRUNCATE, GRANT, EXEC, CREATE.
3. No incluyas punto y coma (;) al final ni consultas múltiples.
4. Si la consulta involucra agrupar ventas válidas, excluye las canceladas con: n.estado != 'CANCELADO'.
5. Utiliza nombres de alias claros y legibles para las columnas calculadas (ej: "total_ingresos", "unidades_vendidas", "nombre_cliente").
6. REGLA ESTRICTA DE COLUMNAS: NUNCA selecciones identificadores o UUIDs (como 'id', 'producto_id', 'usuario_id', 'variante_id', 'cupon_id', 'categoria_id', etc.) en la cláusula SELECT final. Muestra únicamente datos legibles como nombres de productos, categorías, tallas, colores, nombres de clientes, correos, cantidades, precios, subtotales, totales, fechas y estados.
7. Siempre que no se indique un límite específico, añade 'LIMIT 50' para optimizar la consulta.
8. Devuelve SIEMPRE la respuesta en formato JSON estrictamente válido con la estructura:
{
  "sql": "SELECT ...",
  "descripcion": "Explicación clara en español de qué datos extrae la consulta",
  "sugerenciaVisualizacion": "TABLA | METRICA | BARRAS"
}

EJEMPLOS DE REFERENCIA (FEW-SHOT):
- Usuario: "muestrame cuanto stock hay de vestidos"
  Respuesta: {"sql": "SELECT p.nombre AS producto, c.nombre AS categoria, col.nombre AS color, t.nombre AS talla, v.stock AS stock_actual, v.stock_minimo, p.precio AS precio_unitario FROM producto_variante v JOIN producto p ON v.producto_id = p.id JOIN categoria c ON p.categoria_id = c.id LEFT JOIN categoria cp ON c.padre_id = cp.id LEFT JOIN color col ON v.color_id = col.id LEFT JOIN talla t ON v.talla_id = t.id WHERE (c.nombre ILIKE '%vestido%' OR cp.nombre ILIKE '%vestido%' OR p.nombre ILIKE '%vestido%') AND v.activa = true ORDER BY p.nombre, col.nombre, t.nombre LIMIT 50", "descripcion": "Inventario actual de vestidos clasificado por modelo, color, talla y unidades disponibles", "sugerenciaVisualizacion": "TABLA"}
- Usuario: "muestrame cuanto stock hay de pantalones azules"
  Respuesta: {"sql": "SELECT p.nombre AS producto, c.nombre AS categoria, col.nombre AS color, t.nombre AS talla, v.stock AS stock_actual, v.stock_minimo, p.precio AS precio_unitario FROM producto_variante v JOIN producto p ON v.producto_id = p.id JOIN categoria c ON p.categoria_id = c.id LEFT JOIN categoria cp ON c.padre_id = cp.id LEFT JOIN color col ON v.color_id = col.id LEFT JOIN talla t ON v.talla_id = t.id WHERE (c.nombre ILIKE '%pantalon%' OR cp.nombre ILIKE '%pantalon%' OR p.nombre ILIKE '%pantalon%' OR p.nombre ILIKE '%jean%') AND (col.nombre ILIKE '%azul%' OR col.nombre ILIKE '%denim%' OR col.nombre ILIKE '%indigo%' OR col.nombre ILIKE '%zafiro%' OR p.nombre ILIKE '%azul%') AND v.activa = true ORDER BY p.nombre, col.nombre, t.nombre LIMIT 50", "descripcion": "Inventario de pantalones en tonos azules detallado por modelo, color y tallas", "sugerenciaVisualizacion": "TABLA"}
- Usuario: "Prendas con stock agotado o menor al stock mínimo"
  Respuesta: {"sql": "SELECT p.nombre AS producto, v.sku, t.nombre AS talla, c.nombre AS color, v.stock AS stock_actual, v.stock_minimo FROM producto_variante v JOIN producto p ON v.producto_id = p.id LEFT JOIN talla t ON v.talla_id = t.id LEFT JOIN color c ON v.color_id = c.id WHERE v.stock <= v.stock_minimo AND v.activa = true ORDER BY v.stock ASC LIMIT 50", "descripcion": "Prendas con stock bajo o agotado en inventario", "sugerenciaVisualizacion": "TABLA"}
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
    const groqKey =
      this.configService.get<string>('GROQ_API_KEY') ||
      process.env.GROQ_API_KEY ||
      '';
    const geminiKey =
      this.configService.get<string>('GEMINI_API_KEY') ||
      process.env.GEMINI_API_KEY ||
      '';

    // 1. Integración con Gemini AI (si fue seleccionado o si no hay Groq pero sí Gemini)
    if (proveedor === ProveedorIA.GEMINI || (proveedor === ProveedorIA.GROQ && !groqKey && geminiKey)) {
      try {
        return await this.consultarGemini(promptUsuario);
      } catch (err: any) {
        this.logger.warn(`Fallo al consultar Gemini: ${err.message}. Activando motor NLP dinámico...`);
      }
    }

    // 2. Integración con Ollama Local
    if (proveedor === ProveedorIA.OLLAMA) {
      try {
        return await this.consultarOllama(promptUsuario);
      } catch (err: any) {
        this.logger.warn(`Fallo al consultar Ollama: ${err.message}. Activando motor NLP dinámico...`);
      }
    }

    // 3. Integración con Groq Cloud API (Llama 3.3)
    if (groqKey) {
      try {
        return await this.consultarGroq(promptUsuario);
      } catch (error: any) {
        this.logger.warn(`Fallo al consultar Groq: ${error.message}. Activando motor NLP dinámico...`);
      }
    }

    // 4. Motor NLP Semántico Integrado (Opera localmente con 0 latencia y máxima precisión)
    this.logger.log(`⚡ Ejecutando Motor NLP de Análisis Semántico para: "${promptUsuario}"`);
    return this.motorReglasNlp(promptUsuario);
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
      descripcion: parsed.descripcion || 'Reporte generado dinámicamente con IA',
      sugerenciaVisualizacion: parsed.sugerenciaVisualizacion || 'TABLA',
    };
  }

  // 2. Integración con Gemini API
  private async consultarGemini(promptUsuario: string) {
    const apiKey =
      this.configService.get<string>('GEMINI_API_KEY') ||
      process.env.GEMINI_API_KEY ||
      '';

    if (!apiKey) {
      throw new Error('GEMINI_API_KEY no configurada');
    }

    const model =
      this.configService.get<string>('GEMINI_MODEL') ||
      process.env.GEMINI_MODEL ||
      'gemini-1.5-flash';

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: {
          parts: [{ text: this.DB_SCHEMA_PROMPT }],
        },
        contents: [
          {
            parts: [{ text: promptUsuario }],
          },
        ],
        generationConfig: {
          response_mime_type: 'application/json',
          temperature: 0.1,
          maxOutputTokens: 800,
        },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Gemini API respondió con estado ${response.status}: ${errText}`);
    }

    const data = await response.json();
    const candidateText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!candidateText) {
      throw new Error('Gemini no devolvió contenido válido.');
    }

    const parsed = JSON.parse(candidateText);
    return {
      sqlGenerado: parsed.sql || parsed.query,
      descripcion: parsed.descripcion || 'Reporte generado con Gemini AI',
      sugerenciaVisualizacion: parsed.sugerenciaVisualizacion || 'TABLA',
    };
  }

  // 3. Integración con Ollama Local
  private async consultarOllama(promptUsuario: string) {
    const ollamaUrl =
      this.configService.get<string>('OLLAMA_URL') ||
      process.env.OLLAMA_URL ||
      'http://localhost:11434';

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
      descripcion: parsed.descripcion || 'Reporte generado con Ollama Local',
      sugerenciaVisualizacion: parsed.sugerenciaVisualizacion || 'TABLA',
    };
  }

  // =========================================================================
  // MOTOR NLP SEMÁNTICO Y GENERADOR INTELIGENTE TEXT-TO-SQL
  // =========================================================================
  public motorReglasNlp(prompt: string): {
    sqlGenerado: string;
    descripcion: string;
    sugerenciaVisualizacion: string;
  } {
    const p = prompt
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, ''); // Sin tildes para búsqueda uniforme

    // --- A. EXTRACCIÓN DE ENTIDADES: CATEGORÍAS ---
    const categorias: { clave: string; sqlName: string; label: string; extraProductKeyword?: string }[] = [];
    if (p.includes('vestid')) {
      categorias.push({ clave: 'vestido', sqlName: 'vestido', label: 'Vestidos' });
    }
    if (p.includes('pantalon') || p.includes('jean')) {
      categorias.push({ clave: 'pantalon', sqlName: 'pantalon', label: 'Pantalones', extraProductKeyword: 'jean' });
    }
    if (p.includes('camis')) {
      categorias.push({ clave: 'camisa', sqlName: 'camisa', label: 'Camisas' });
    }
    if (p.includes('blus')) {
      categorias.push({ clave: 'blusa', sqlName: 'blusa', label: 'Blusas' });
    }
    if (p.includes('poler') || p.includes('top') || p.includes('remer')) {
      categorias.push({ clave: 'polera', sqlName: 'polera', label: 'Poleras y Tops', extraProductKeyword: 'top' });
    }
    if (p.includes('fald')) {
      categorias.push({ clave: 'falda', sqlName: 'falda', label: 'Faldas' });
    }
    if (p.includes('short')) {
      categorias.push({ clave: 'short', sqlName: 'short', label: 'Shorts' });
    }
    if (p.includes('abrig') || p.includes('chaquet') || p.includes('blazer') || p.includes('tapad')) {
      categorias.push({ clave: 'abrigo', sqlName: 'abrigo', label: 'Abrigos y Blazers', extraProductKeyword: 'blazer' });
    }

    // --- B. EXTRACCIÓN DE ENTIDADES: COLORES ---
    const colores: { clave: string; terminos: string[]; label: string }[] = [];
    if (p.includes('azul') || p.includes('denim') || p.includes('indigo') || p.includes('zafiro') || p.includes('marino')) {
      colores.push({ clave: 'azul', terminos: ['azul', 'denim', 'indigo', 'zafiro', 'marino'], label: 'Azul' });
    }
    if (p.includes('roj') || p.includes('escarlat')) {
      colores.push({ clave: 'rojo', terminos: ['rojo', 'escarlata'], label: 'Rojo' });
    }
    if (p.includes('negr') || p.includes('azabach') || p.includes('noir')) {
      colores.push({ clave: 'negro', terminos: ['negro', 'azabache', 'noir'], label: 'Negro' });
    }
    if (p.includes('verd') || p.includes('oliv') || p.includes('esmerald')) {
      colores.push({ clave: 'verde', terminos: ['verde', 'oliva', 'esmeralda'], label: 'Verde' });
    }
    if (p.includes('blanc') || p.includes('marfil') || p.includes('ivory')) {
      colores.push({ clave: 'blanco', terminos: ['blanco', 'marfil', 'ivory'], label: 'Blanco / Marfil' });
    }
    if (p.includes('caf') || p.includes('marron') || p.includes('moca')) {
      colores.push({ clave: 'cafe', terminos: ['cafe', 'moca'], label: 'Café / Moca' });
    }
    if (p.includes('aren') || p.includes('camel') || p.includes('beig')) {
      colores.push({ clave: 'arena', terminos: ['arena', 'camel', 'beige'], label: 'Camel / Arena' });
    }
    if (p.includes('gris') || p.includes('mareng')) {
      colores.push({ clave: 'gris', terminos: ['gris', 'marengo'], label: 'Gris' });
    }
    if (p.includes('champan') || p.includes('satinad')) {
      colores.push({ clave: 'champan', terminos: ['champan', 'satinado'], label: 'Champán' });
    }

    // --- C. EXTRACCIÓN DE MODIFICADORES DE STOCK ---
    const esStockBajoOAgotado =
      p.includes('agotad') ||
      p.includes('bajo') ||
      p.includes('menor al') ||
      p.includes('menor que') ||
      p.includes('acaband') ||
      p.includes('por agotarse') ||
      p.includes('minim') ||
      p.includes('escas') ||
      p.includes('sin stock');

    const esStockTotal =
      p.includes('total') ||
      p.includes('por categoria') ||
      p.includes('resumen') ||
      p.includes('cuanto hay en total') ||
      p.includes('unidades en total') ||
      p.includes('suma');

    const esConsultaStock =
      p.includes('stock') ||
      p.includes('inventari') ||
      p.includes('existenci') ||
      p.includes('cuanto hay') ||
      p.includes('cuantos hay') ||
      p.includes('cuantas hay') ||
      p.includes('quedan') ||
      p.includes('unidades');

    // --- CASO 1: CONSULTAS DE STOCK E INVENTARIO ---
    if (esConsultaStock) {
      // 1.1 Si pide stock bajo o agotado
      if (esStockBajoOAgotado) {
        let filtroCatCol = '';
        if (categorias.length > 0) {
          const cat = categorias[0];
          filtroCatCol += ` AND (c.nombre ILIKE '%${cat.sqlName}%' OR COALESCE(cp.nombre, '') ILIKE '%${cat.sqlName}%' OR p.nombre ILIKE '%${cat.sqlName}%')`;
        }
        if (colores.length > 0) {
          const colConditions = colores[0].terminos.map((t) => `col.nombre ILIKE '%${t}%'`).join(' OR ');
          filtroCatCol += ` AND (${colConditions})`;
        }

        return {
          sqlGenerado: `SELECT p.nombre AS producto, c.nombre AS categoria, col.nombre AS color, t.nombre AS talla, v.stock AS stock_actual, v.stock_minimo, v.sku FROM producto_variante v JOIN producto p ON v.producto_id = p.id JOIN categoria c ON p.categoria_id = c.id LEFT JOIN categoria cp ON c.padre_id = cp.id LEFT JOIN color col ON v.color_id = col.id LEFT JOIN talla t ON v.talla_id = t.id WHERE v.stock <= v.stock_minimo AND v.activa = true${filtroCatCol} ORDER BY v.stock ASC LIMIT 50`,
          descripcion: 'Prendas con stock bajo o agotado en inventario (alerta de reposición)',
          sugerenciaVisualizacion: 'TABLA',
        };
      }

      // 1.2 Si pide stock total agrupado por categoría general
      if (esStockTotal && categorias.length === 0) {
        return {
          sqlGenerado: `SELECT COALESCE(cp.nombre, c.nombre) AS categoria_principal, COUNT(DISTINCT p.id) AS total_modelos, SUM(v.stock) AS unidades_stock_total, ROUND(AVG(p.precio), 2) AS precio_promedio FROM producto_variante v JOIN producto p ON v.producto_id = p.id JOIN categoria c ON p.categoria_id = c.id LEFT JOIN categoria cp ON c.padre_id = cp.id WHERE v.activa = true GROUP BY COALESCE(cp.nombre, c.nombre) ORDER BY unidades_stock_total DESC LIMIT 20`,
          descripcion: 'Resumen consolidado de unidades en stock y modelos por categoría',
          sugerenciaVisualizacion: 'TABLA',
        };
      }

      // 1.3 Consulta de stock específico por Categoría y/o Color
      if (categorias.length > 0 || colores.length > 0) {
        const condiciones: string[] = ['v.activa = true'];

        let labelCat = '';
        if (categorias.length > 0) {
          const cat = categorias[0];
          labelCat = cat.label;
          let catSql = `(c.nombre ILIKE '%${cat.sqlName}%' OR COALESCE(cp.nombre, '') ILIKE '%${cat.sqlName}%' OR p.nombre ILIKE '%${cat.sqlName}%'`;
          if (cat.extraProductKeyword) {
            catSql += ` OR p.nombre ILIKE '%${cat.extraProductKeyword}%'`;
          }
          catSql += `)`;
          condiciones.push(catSql);
        }

        let labelCol = '';
        if (colores.length > 0) {
          const col = colores[0];
          labelCol = col.label;
          const colTerms = col.terminos.map((t) => `col.nombre ILIKE '%${t}%' OR p.nombre ILIKE '%${t}%'`).join(' OR ');
          condiciones.push(`(${colTerms})`);
        }

        const whereClause = condiciones.length > 0 ? `WHERE ${condiciones.join(' AND ')}` : '';
        const descTexto = labelCol
          ? `Inventario disponible de ${labelCat || 'prendas'} en tono ${labelCol} clasificado por modelo, color y tallas`
          : `Inventario disponible de ${labelCat} clasificado por modelo, color, talla y stock actual`;

        return {
          sqlGenerado: `SELECT p.nombre AS producto, c.nombre AS categoria, col.nombre AS color, t.nombre AS talla, v.stock AS stock_actual, v.stock_minimo, p.precio AS precio_unitario FROM producto_variante v JOIN producto p ON v.producto_id = p.id JOIN categoria c ON p.categoria_id = c.id LEFT JOIN categoria cp ON c.padre_id = cp.id LEFT JOIN color col ON v.color_id = col.id LEFT JOIN talla t ON v.talla_id = t.id ${whereClause} ORDER BY p.nombre, col.nombre, t.nombre LIMIT 50`,
          descripcion: descTexto,
          sugerenciaVisualizacion: 'TABLA',
        };
      }

      // 1.4 Inventario general de todas las variantes disponibles
      return {
        sqlGenerado: `SELECT p.nombre AS producto, c.nombre AS categoria, col.nombre AS color, t.nombre AS talla, v.stock AS stock_actual, v.stock_minimo, p.precio AS precio_unitario FROM producto_variante v JOIN producto p ON v.producto_id = p.id JOIN categoria c ON p.categoria_id = c.id LEFT JOIN color col ON v.color_id = col.id LEFT JOIN talla t ON v.talla_id = t.id WHERE v.activa = true ORDER BY p.nombre, col.nombre LIMIT 50`,
        descripcion: 'Inventario general de prendas activas en tienda con stock disponible',
        sugerenciaVisualizacion: 'TABLA',
      };
    }

    // --- CASO 2: PRODUCTOS MÁS VENDIDOS / RANKING ---
    if (p.includes('mas vendid') || p.includes('top') || p.includes('popular') || p.includes('mayor venta') || p.includes('ranking')) {
      return {
        sqlGenerado: `SELECT p.nombre AS producto, c.nombre AS categoria, SUM(d.cantidad) AS unidades_vendidas, SUM(d.subtotal) AS ingresos_totales FROM detalle_nota_venta d JOIN producto p ON d.producto_id = p.id JOIN categoria c ON p.categoria_id = c.id JOIN nota_venta n ON d.notaventa_id = n.id WHERE n.estado != 'CANCELADO' GROUP BY p.nombre, c.nombre ORDER BY unidades_vendidas DESC LIMIT 10`,
        descripcion: 'Top productos con mayor cantidad de unidades vendidas e ingresos',
        sugerenciaVisualizacion: 'TABLA',
      };
    }

    // --- CASO 3: VENTAS POR CATEGORÍA ---
    if ((p.includes('vent') || p.includes('ingres') || p.includes('factur')) && p.includes('categori')) {
      return {
        sqlGenerado: `SELECT c.nombre AS categoria, COUNT(DISTINCT n.id) AS total_pedidos, SUM(d.cantidad) AS unidades_vendidas, SUM(d.subtotal) AS ingresos_totales FROM detalle_nota_venta d JOIN producto p ON d.producto_id = p.id JOIN categoria c ON p.categoria_id = c.id JOIN nota_venta n ON d.notaventa_id = n.id WHERE n.estado != 'CANCELADO' GROUP BY c.nombre ORDER BY ingresos_totales DESC LIMIT 10`,
        descripcion: 'Reporte consolidado de ventas e ingresos agrupados por categoría',
        sugerenciaVisualizacion: 'TABLA',
      };
    }

    // --- CASO 4: VENTAS DE UNA PRENDA O CATEGORÍA ESPECÍFICA ---
    if ((p.includes('vent') || p.includes('vend') || p.includes('ingres')) && categorias.length > 0) {
      const cat = categorias[0];
      return {
        sqlGenerado: `SELECT p.nombre AS producto, c.nombre AS categoria, SUM(d.cantidad) AS unidades_vendidas, SUM(d.subtotal) AS ingresos_totales FROM detalle_nota_venta d JOIN producto p ON d.producto_id = p.id JOIN categoria c ON p.categoria_id = c.id JOIN nota_venta n ON d.notaventa_id = n.id WHERE n.estado != 'CANCELADO' AND (c.nombre ILIKE '%${cat.sqlName}%' OR p.nombre ILIKE '%${cat.sqlName}%') GROUP BY p.nombre, c.nombre ORDER BY unidades_vendidas DESC LIMIT 20`,
        descripcion: `Ventas e ingresos generados por prendas de la categoría ${cat.label}`,
        sugerenciaVisualizacion: 'TABLA',
      };
    }

    // --- CASO 5: CLIENTES Y COMPRADORES FRECUENTES ---
    if (p.includes('client') || p.includes('usuari') || p.includes('comprador')) {
      return {
        sqlGenerado: `SELECT u.nombre || ' ' || u.apellido AS cliente, u.correo, COUNT(n.id) AS total_pedidos, COALESCE(SUM(n.total), 0) AS total_gastado FROM usuario u LEFT JOIN nota_venta n ON u.id = n.usuario_id WHERE u.activo = true GROUP BY u.id, u.nombre, u.apellido, u.correo ORDER BY total_gastado DESC LIMIT 20`,
        descripcion: 'Clientes y su historial de compras acumuladas',
        sugerenciaVisualizacion: 'TABLA',
      };
    }

    // --- CASO 6: ESTADO DE PEDIDOS / ÓRDENES ---
    if (p.includes('pedid') || p.includes('orden')) {
      if (p.includes('estad') || p.includes('resumen') || p.includes('agrup')) {
        return {
          sqlGenerado: `SELECT estado AS estado_pedido, COUNT(*) AS total_pedidos, SUM(total) AS monto_acumulado FROM nota_venta GROUP BY estado ORDER BY total_pedidos DESC LIMIT 20`,
          descripcion: 'Resumen consolidado de pedidos según su estado actual',
          sugerenciaVisualizacion: 'TABLA',
        };
      }

      let estadoWhere = '';
      if (p.includes('pendient')) estadoWhere = " WHERE n.estado = 'PENDIENTE'";
      else if (p.includes('pagad')) estadoWhere = " WHERE n.estado = 'PAGADO'";
      else if (p.includes('completad')) estadoWhere = " WHERE n.estado = 'COMPLETADO'";
      else if (p.includes('enviad')) estadoWhere = " WHERE n.estado = 'ENVIADO'";
      else if (p.includes('entregad')) estadoWhere = " WHERE n.estado = 'ENTREGADO'";

      return {
        sqlGenerado: `SELECT n.nro AS codigo_pedido, n.fecha, u.nombre || ' ' || u.apellido AS cliente, u.correo, n.total, n.estado FROM nota_venta n JOIN usuario u ON n.usuario_id = u.id${estadoWhere} ORDER BY n.fecha DESC LIMIT 25`,
        descripcion: 'Listado detallado de pedidos recientes y su estado de despacho',
        sugerenciaVisualizacion: 'TABLA',
      };
    }

    // --- CASO 7: CUPONES Y DESCUENTOS ---
    if (p.includes('cupon') || p.includes('descuent') || p.includes('promocion')) {
      return {
        sqlGenerado: `SELECT c.codigo, c.tipo, c.valor AS valor_descuento, c.usos_actuales, COALESCE(SUM(n.descuento), 0) AS total_descontado, c.activo FROM cupon c LEFT JOIN nota_venta n ON c.id = n.cupon_id GROUP BY c.id, c.codigo, c.tipo, c.valor, c.usos_actuales, c.activo ORDER BY total_descontado DESC, c.usos_actuales DESC LIMIT 10`,
        descripcion: 'Cupones de descuento más utilizados y monto total bonificado',
        sugerenciaVisualizacion: 'TABLA',
      };
    }

    // --- CASO 8: PRECIOS Y CATÁLOGO ---
    if (p.includes('preci') || p.includes('caro') || p.includes('barat') || p.includes('catalogo')) {
      const orden = p.includes('barat') ? 'ASC' : 'DESC';
      return {
        sqlGenerado: `SELECT p.nombre AS producto, c.nombre AS categoria, p.precio, p.activo, p.destacado FROM producto p JOIN categoria c ON p.categoria_id = c.id WHERE p.activo = true ORDER BY p.precio ${orden} LIMIT 25`,
        descripcion: `Listado de prendas ordenadas por precio (${p.includes('barat') ? 'menor a mayor' : 'mayor a menor'})`,
        sugerenciaVisualizacion: 'TABLA',
      };
    }

    // --- CASO 9: FALLBACK GENERAL ---
    return {
      sqlGenerado: `SELECT n.nro AS codigo_pedido, n.fecha, u.nombre || ' ' || u.apellido AS cliente, n.total, n.estado FROM nota_venta n JOIN usuario u ON n.usuario_id = u.id ORDER BY n.fecha DESC LIMIT 20`,
      descripcion: 'Listado general de pedidos recientes',
      sugerenciaVisualizacion: 'TABLA',
    };
  }

  // Alias para mantener compatibilidad con tests y llamadas previas
  public fallbackGenerador(prompt: string) {
    return this.motorReglasNlp(prompt);
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

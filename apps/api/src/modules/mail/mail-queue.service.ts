import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';

export type EstadoJobCola = 'PENDIENTE' | 'PROCESANDO' | 'COMPLETADO' | 'FALLIDO';

export interface EmailJob {
  id: string;
  tipo: string;
  destinatario: string;
  asunto: string;
  html: string;
  text?: string;
  estado: EstadoJobCola;
  intentos: number;
  maxIntentos: number;
  error?: string;
  messageId?: string;
  creadoEn: Date;
  procesadoEn?: Date;
}

@Injectable()
export class MailQueueService {
  private readonly logger = new Logger(MailQueueService.name);
  private cola: EmailJob[] = [];
  private isProcessing = false;
  private sendFunction?: (opciones: {
    to: string;
    subject: string;
    html: string;
    text?: string;
  }) => Promise<{ messageId?: string; success: boolean }>;

  /**
   * Registra la función de envío real proporcionada por MailService
   */
  registrarEmisor(
    sender: (opciones: {
      to: string;
      subject: string;
      html: string;
      text?: string;
    }) => Promise<{ messageId?: string; success: boolean }>,
  ) {
    this.sendFunction = sender;
  }

  /**
   * HU-87: Encolar un correo para su despacho asíncrono en background sin bloquear la petición HTTP
   */
  encolar(datos: {
    tipo: string;
    destinatario: string;
    asunto: string;
    html: string;
    text?: string;
    maxIntentos?: number;
  }): { jobId: string; estado: EstadoJobCola; mensaje: string } {
    const job: EmailJob = {
      id: crypto.randomUUID(),
      tipo: datos.tipo,
      destinatario: datos.destinatario,
      asunto: datos.asunto,
      html: datos.html,
      text: datos.text,
      estado: 'PENDIENTE',
      intentos: 0,
      maxIntentos: datos.maxIntentos ?? 3,
      creadoEn: new Date(),
    };

    this.cola.unshift(job);
    this.logger.log(`📥 [Cola Background] Job ${job.id} (${job.tipo}) encolado para <${job.destinatario}>`);

    // Disparar procesamiento asíncrono sin bloquear
    setImmediate(() => this.procesarCola());

    return {
      jobId: job.id,
      estado: job.estado,
      mensaje: `Correo (${datos.tipo}) agregado a la cola de envío en background.`,
    };
  }

  /**
   * Bucle del worker de procesamiento en background con control de concurrencia y reintentos
   */
  private async procesarCola() {
    if (this.isProcessing) return;
    this.isProcessing = true;

    try {
      while (true) {
        const job = this.cola.slice().reverse().find((j) => j.estado === 'PENDIENTE');
        if (!job) break;

        job.estado = 'PROCESANDO';
        job.intentos++;
        this.logger.log(`⚙️ [Cola Background] Procesando Job ${job.id} (Intento ${job.intentos}/${job.maxIntentos})...`);

        if (!this.sendFunction) {
          this.logger.warn(`⚠️ [Cola Background] No hay emisor SMTP registrado.`);
          job.estado = 'FALLIDO';
          job.error = 'No se ha configurado el transport SMTP';
          job.procesadoEn = new Date();
          continue;
        }

        try {
          const resultado = await this.sendFunction({
            to: job.destinatario,
            subject: job.asunto,
            html: job.html,
            text: job.text,
          });

          if (resultado.success) {
            job.estado = 'COMPLETADO';
            job.messageId = resultado.messageId;
            job.procesadoEn = new Date();
            this.logger.log(`✅ [Cola Background] Job ${job.id} completado con éxito (MessageId: ${job.messageId})`);
          } else {
            throw new Error('El proveedor SMTP no confirmó el envío del correo');
          }
        } catch (error) {
          job.error = error?.message || 'Error desconocido';
          this.logger.error(`❌ [Cola Background] Error procesando Job ${job.id}: ${job.error}`);

          if (job.intentos < job.maxIntentos) {
            job.estado = 'PENDIENTE';
            this.logger.warn(`🔁 [Cola Background] Reintentando Job ${job.id} en breve...`);
            // Pequeña espera antes del siguiente reintento
            await new Promise((res) => setTimeout(res, 1000 * job.intentos));
          } else {
            job.estado = 'FALLIDO';
            job.procesadoEn = new Date();
            this.logger.error(`💀 [Cola Background] Job ${job.id} superó el límite de ${job.maxIntentos} intentos.`);
          }
        }
      }
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * HU-87: Obtener métricas y estado en tiempo real de la cola
   */
  obtenerEstado() {
    const total = this.cola.length;
    const pendientes = this.cola.filter((j) => j.estado === 'PENDIENTE').length;
    const procesando = this.cola.filter((j) => j.estado === 'PROCESANDO').length;
    const completados = this.cola.filter((j) => j.estado === 'COMPLETADO').length;
    const fallidos = this.cola.filter((j) => j.estado === 'FALLIDO').length;

    return {
      metricas: {
        total,
        pendientes,
        procesando,
        completados,
        fallidos,
      },
      jobsRecientes: this.cola.slice(0, 20).map((j) => ({
        id: j.id,
        tipo: j.tipo,
        destinatario: j.destinatario,
        asunto: j.asunto,
        estado: j.estado,
        intentos: `${j.intentos}/${j.maxIntentos}`,
        messageId: j.messageId || null,
        error: j.error || null,
        creadoEn: j.creadoEn,
        procesadoEn: j.procesadoEn || null,
      })),
    };
  }

  /**
   * Reintentar un job fallido
   */
  reintentarJob(jobId: string) {
    const job = this.cola.find((j) => j.id === jobId);
    if (!job) {
      return { exito: false, mensaje: `Job ${jobId} no encontrado en la cola.` };
    }

    job.estado = 'PENDIENTE';
    job.intentos = 0;
    job.error = undefined;
    job.procesadoEn = undefined;

    setImmediate(() => this.procesarCola());

    return {
      exito: true,
      jobId: job.id,
      mensaje: `Job ${job.id} restablecido a PENDIENTE para reintento.`,
    };
  }
}

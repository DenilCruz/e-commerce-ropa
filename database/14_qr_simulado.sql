BEGIN;

CREATE TABLE IF NOT EXISTS movimiento_qr_simulado (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tienda(id),
    usuario_id UUID REFERENCES usuario(id) ON DELETE SET NULL,
    solicitud_id UUID NOT NULL,
    tipo VARCHAR(6) NOT NULL CHECK (tipo IN ('VENTA', 'RETIRO')),
    monto NUMERIC(14,2) NOT NULL CHECK (monto >= 0 AND (tipo = 'VENTA' OR monto > 0)),
    pedido JSONB,
    creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (tenant_id, tipo, solicitud_id)
);

ALTER TABLE movimiento_qr_simulado ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON movimiento_qr_simulado;
CREATE POLICY tenant_isolation ON movimiento_qr_simulado
    USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
    WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

REVOKE UPDATE, DELETE ON movimiento_qr_simulado FROM aura_app;
GRANT SELECT, INSERT ON movimiento_qr_simulado TO aura_app;

COMMIT;

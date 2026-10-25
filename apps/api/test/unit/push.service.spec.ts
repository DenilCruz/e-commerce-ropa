jest.mock('@nestjs/typeorm', () => ({
  InjectRepository: () => () => {},
}));

import { PushService } from '../../src/modules/notificaciones/push.service';
import { TenantContext } from '../../src/common/tenant/tenant-context';

const sub = (n: number) => ({ id: `s${n}`, usuarioId: 'u1', endpoint: `https://push.example/${n}`, p256dh: `k${n}`, auth: `a${n}` });

describe('PushService', () => {
  let repo: any;
  let sender: { enabled: boolean; publicKey: string; send: jest.Mock };
  let service: PushService;

  beforeEach(() => {
    jest.spyOn(TenantContext, 'require').mockReturnValue('tenant-luna');
    repo = {
      find: jest.fn().mockResolvedValue([sub(1), sub(2)]),
      findOne: jest.fn().mockResolvedValue(null),
      save: jest.fn(async (v) => ({ id: 'new', ...v })),
      delete: jest.fn().mockResolvedValue({ affected: 1 }),
    };
    sender = { enabled: true, publicKey: 'BPUBLIC', send: jest.fn().mockResolvedValue(undefined) };
    service = new PushService(repo, sender as any);
  });

  afterEach(() => jest.restoreAllMocks());

  it('hands out the public key the browser needs to subscribe, and says whether push is configured', () => {
    expect(service.clavePublica()).toEqual({ habilitado: true, clave: 'BPUBLIC' });
    sender.enabled = false;
    expect(service.clavePublica()).toEqual({ habilitado: false, clave: null });
  });

  it('saves a new subscription for the store and the user', async () => {
    await service.suscribir('u1', { endpoint: 'https://push.example/1', keys: { p256dh: 'k', auth: 'a' } });

    expect(repo.save).toHaveBeenCalledWith(
      expect.objectContaining({ usuarioId: 'u1', endpoint: 'https://push.example/1', p256dh: 'k', auth: 'a' }),
    );
  });

  it('updates the subscription of a browser that subscribes again instead of duplicating it', async () => {
    repo.findOne.mockResolvedValue({ id: 'old', usuarioId: 'other', endpoint: 'https://push.example/1', p256dh: 'x', auth: 'y' });

    await service.suscribir('u1', { endpoint: 'https://push.example/1', keys: { p256dh: 'k', auth: 'a' } });

    expect(repo.save).toHaveBeenCalledWith(expect.objectContaining({ id: 'old', usuarioId: 'u1', p256dh: 'k', auth: 'a' }));
  });

  it('removes a subscription on request', async () => {
    await service.cancelar('https://push.example/1');

    expect(repo.delete).toHaveBeenCalledWith({ endpoint: 'https://push.example/1' });
  });

  it('notifies every subscription of the store with the message', async () => {
    const enviadas = await service.notificarTienda({ titulo: 'Venta sincronizada', cuerpo: 'NV-1 por $10', url: '/admin/pedidos' });

    expect(enviadas).toBe(2);
    expect(sender.send).toHaveBeenCalledTimes(2);
    expect(sender.send).toHaveBeenCalledWith(
      expect.objectContaining({ endpoint: 'https://push.example/1', p256dh: 'k1', auth: 'a1' }),
      { titulo: 'Venta sincronizada', cuerpo: 'NV-1 por $10', url: '/admin/pedidos' },
    );
  });

  it('drops a subscription the push service says is gone (404/410) and keeps notifying the others', async () => {
    sender.send.mockRejectedValueOnce(Object.assign(new Error('gone'), { statusCode: 410 }));

    expect(await service.notificarTienda({ titulo: 't', cuerpo: 'c' })).toBe(1);
    expect(repo.delete).toHaveBeenCalledWith({ id: 's1' });
  });

  it('keeps a subscription when the failure may pass, and never throws', async () => {
    sender.send.mockRejectedValue(Object.assign(new Error('boom'), { statusCode: 500 }));

    await expect(service.notificarTienda({ titulo: 't', cuerpo: 'c' })).resolves.toBe(0);
    expect(repo.delete).not.toHaveBeenCalled();
  });

  it('does nothing when push is not configured', async () => {
    sender.enabled = false;

    expect(await service.notificarTienda({ titulo: 't', cuerpo: 'c' })).toBe(0);
    expect(repo.find).not.toHaveBeenCalled();
  });
});

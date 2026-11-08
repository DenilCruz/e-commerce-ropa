import { EXPO_PUSH_URL, ExpoPushSender } from '../../src/modules/notificaciones/expo-push.sender';

const tokens = (n: number) => Array.from({ length: n }, (_, i) => `ExponentPushToken[t${i}]`);
const json = (body: unknown, status = 200) => ({ ok: status < 400, status, json: async () => body }) as any;

describe('ExpoPushSender', () => {
  let fetchMock: jest.Mock;
  let sender: ExpoPushSender;

  beforeEach(() => {
    fetchMock = jest.fn();
    (global as any).fetch = fetchMock;
    sender = new ExpoPushSender({ get: () => undefined } as any);
  });

  it('posts the message to Expo with title, body, url and sound', async () => {
    fetchMock.mockResolvedValue(json({ data: [{ status: 'ok' }] }));

    const res = await sender.sendBatch(tokens(1), { titulo: 'T', cuerpo: 'C', url: '/admin/ventas' });

    expect(fetchMock).toHaveBeenCalledWith(EXPO_PUSH_URL, expect.objectContaining({ method: 'POST' }));
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual([
      { to: 'ExponentPushToken[t0]', title: 'T', body: 'C', data: { url: '/admin/ventas' }, sound: 'default' },
    ]);
    expect(res).toEqual([{ token: 'ExponentPushToken[t0]', ok: true, remove: false }]);
  });

  it('splits more than 100 tokens into batches of at most 100', async () => {
    fetchMock.mockImplementation(async (_u: string, init: any) =>
      json({ data: JSON.parse(init.body).map(() => ({ status: 'ok' })) }),
    );

    const res = await sender.sendBatch(tokens(250), { titulo: 'T', cuerpo: 'C' });

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls.map((c) => JSON.parse(c[1].body).length)).toEqual([100, 100, 50]);
    expect(res).toHaveLength(250);
    expect(res.every((r) => r.ok)).toBe(true);
  });

  it('marks DeviceNotRegistered tickets for removal and keeps other errors', async () => {
    fetchMock.mockResolvedValue(
      json({
        data: [
          { status: 'ok' },
          { status: 'error', details: { error: 'DeviceNotRegistered' } },
          { status: 'error', details: { error: 'MessageRateExceeded' } },
        ],
      }),
    );

    const res = await sender.sendBatch(tokens(3), { titulo: 'T', cuerpo: 'C' });

    expect(res.map((r) => [r.ok, r.remove])).toEqual([
      [true, false],
      [false, true],
      [false, false],
    ]);
  });

  it('tolerates a network failure and an HTTP error without throwing or removing tokens', async () => {
    fetchMock.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(json({}, 503));

    const a = await sender.sendBatch(tokens(2), { titulo: 'T', cuerpo: 'C' });
    const b = await sender.sendBatch(tokens(2), { titulo: 'T', cuerpo: 'C' });

    for (const r of [...a, ...b]) expect(r).toMatchObject({ ok: false, remove: false });
  });

  it('sends the access token when configured', async () => {
    sender = new ExpoPushSender({ get: () => 'secret' } as any);
    fetchMock.mockResolvedValue(json({ data: [{ status: 'ok' }] }));

    await sender.sendBatch(tokens(1), { titulo: 'T', cuerpo: 'C' });

    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe('Bearer secret');
  });
});

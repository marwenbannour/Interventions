import { createHmac } from 'crypto';
import { Permission } from '../../common/enums/permission.enum';
import { Role } from '../../common/enums/role.enum';
import { ApiKeysService } from './api-keys.service';
import { assertWebhookUrl, isPrivateAddress } from './url-guard';
import { signPayload } from './webhooks.service';

describe('Signature des webhooks', () => {
  it('produit t=<ts>,v1=<HMAC-SHA256(secret, "t.body")> vérifiable côté récepteur', () => {
    const body = JSON.stringify({ event: 'task.created', data: { id: 1 } });
    const sig = signPayload('whsec_test', body, 1_790_000_000);
    const [, t, v1] = /^t=(\d+),v1=([0-9a-f]{64})$/.exec(sig)!;
    expect(t).toBe('1790000000');
    expect(v1).toBe(createHmac('sha256', 'whsec_test').update(`${t}.${body}`).digest('hex'));
    expect(signPayload('autre', body, 1_790_000_000)).not.toBe(sig);
  });
});

describe('Protection SSRF', () => {
  it.each(['127.0.0.1', '10.1.2.3', '172.16.0.1', '192.168.1.10', '169.254.169.254', '::1', 'fd00::1', '::ffff:10.0.0.1', '100.64.0.1'])(
    '%s est une adresse privée',
    (ip) => expect(isPrivateAddress(ip)).toBe(true),
  );
  it.each(['8.8.8.8', '172.32.0.1', '2001:4860:4860::8888'])('%s est publique', (ip) => expect(isPrivateAddress(ip)).toBe(false));

  describe('en production', () => {
    const env = { ...process.env };
    beforeAll(() => {
      process.env.NODE_ENV = 'production';
      delete process.env.WEBHOOKS_ALLOW_HTTP;
      delete process.env.WEBHOOKS_ALLOW_PRIVATE;
    });
    afterAll(() => {
      process.env = env;
    });
    it('refuse HTTP, les identifiants et les IP internes', async () => {
      await expect(assertWebhookUrl('http://93.184.216.34/hook')).rejects.toThrow('HTTPS');
      await expect(assertWebhookUrl('https://user:pw@93.184.216.34/')).rejects.toThrow('Identifiants');
      await expect(assertWebhookUrl('https://169.254.169.254/latest/meta-data')).rejects.toThrow('privée');
      await expect(assertWebhookUrl('https://[::1]:8080/')).rejects.toThrow('privée');
    });
    it('accepte une IP publique en HTTPS', async () => {
      await expect(assertWebhookUrl('https://93.184.216.34/hook')).resolves.toBeInstanceOf(URL);
    });
  });
});

describe('Clés API — scopes délégables', () => {
  const svc = new ApiKeysService({} as any);
  it('exclut les permissions sensibles et respecte le rôle plafond', () => {
    const sup = svc.delegableScopes(Role.SUPERVISOR);
    expect(sup).toContain(Permission.TASK_CREATE);
    expect(sup).not.toContain(Permission.USER_MANAGE);
    expect(sup).not.toContain(Permission.INTEGRATION_MANAGE);
    const dir = svc.delegableScopes(Role.DIRECTION);
    expect(dir).not.toContain(Permission.TASK_CREATE);
    expect(dir).toContain(Permission.REPORT_READ);
  });
  it('refuse un scope hors du rôle plafond', async () => {
    await expect(
      svc.create({ id: 'u', organizationId: 'o', role: Role.ADMIN, email: 'a' }, { name: 'bi', role: Role.DIRECTION, scopes: ['task:create'] }),
    ).rejects.toThrow('Scopes non autorisés');
  });
  it('rejette une clé mal formée sans interroger la base', async () => {
    await expect(svc.authenticate('pas-une-cle')).resolves.toBeNull();
  });
});

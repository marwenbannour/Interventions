import { BadRequestException } from '@nestjs/common';
import { lookup } from 'dns/promises';
import { isIP } from 'net';

/**
 * Protection SSRF des webhooks : une URL fournie par un administrateur client ne doit pas
 * permettre d'atteindre le réseau interne (base, Redis, métadonnées cloud 169.254.169.254…).
 * Vérifiée à l'enregistrement ET à chaque envoi (parade au DNS rebinding).
 */
export function webhookPolicy() {
  const prod = process.env.NODE_ENV === 'production';
  return {
    allowHttp: process.env.WEBHOOKS_ALLOW_HTTP ? process.env.WEBHOOKS_ALLOW_HTTP === 'true' : !prod,
    allowPrivate: process.env.WEBHOOKS_ALLOW_PRIVATE ? process.env.WEBHOOKS_ALLOW_PRIVATE === 'true' : !prod,
  };
}

export function isPrivateAddress(ip: string): boolean {
  if (isIP(ip) === 6) {
    const v = ip.toLowerCase();
    if (v === '::1' || v === '::') return true;
    if (v.startsWith('fc') || v.startsWith('fd') || v.startsWith('fe80')) return true;
    const mapped = v.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    return mapped ? isPrivateAddress(mapped[1]) : false;
  }
  const [a, b] = ip.split('.').map(Number);
  return (
    a === 10 || a === 127 || a === 0 ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 100 && b >= 64 && b <= 127) || // CGNAT
    a >= 224 // multicast / réservé
  );
}

export async function assertWebhookUrl(raw: string): Promise<URL> {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new BadRequestException('URL invalide');
  }
  const policy = webhookPolicy();
  if (url.protocol !== 'https:' && !(policy.allowHttp && url.protocol === 'http:')) {
    throw new BadRequestException('HTTPS obligatoire pour les webhooks');
  }
  if (url.username || url.password) throw new BadRequestException("Identifiants interdits dans l'URL");
  if (!policy.allowPrivate) {
    const host = url.hostname.replace(/^\[|\]$/g, '');
    const addresses = isIP(host) ? [host] : (await lookup(host, { all: true }).catch(() => [])).map((r) => r.address);
    if (!addresses.length) throw new BadRequestException(`Hôte injoignable : ${host}`);
    if (addresses.some(isPrivateAddress)) throw new BadRequestException('Adresse réseau privée interdite');
  }
  return url;
}

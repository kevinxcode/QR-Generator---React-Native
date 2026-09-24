export interface UrlSafetyReport {
  url: string;
  protocol: string;
  domain: string;
  warnings: string[];
  /** true when at least one unusual pattern was found. Never implies malware. */
  unusual: boolean;
}

const IPV4 = /^(\d{1,3})(\.\d{1,3}){3}$/;

export function analyzeUrl(raw: string): UrlSafetyReport | null {
  let u: URL;
  try {
    u = new URL(raw.trim());
  } catch {
    return null;
  }
  const protocol = u.protocol.replace(/:$/, '');
  if (protocol !== 'http' && protocol !== 'https') return null;
  const domain = u.hostname.toLowerCase();
  const warnings: string[] = [];

  if (protocol === 'http') warnings.push('Not encrypted (HTTP instead of HTTPS).');
  if (IPV4.test(domain) || domain.startsWith('[')) warnings.push('Uses an IP address instead of a domain name.');
  if (domain.split('.').some((label) => label.startsWith('xn--'))) {
    warnings.push('Domain uses international characters (punycode) that can imitate other sites.');
  }
  if (u.username || u.password) warnings.push('Contains embedded credentials ("@" before the domain).');
  if (raw.length > 200) warnings.push('Very long link that may hide its real destination.');
  const encoded = (raw.match(/%[0-9a-f]{2}/gi) ?? []).length;
  if (encoded > 12) warnings.push('Heavily encoded characters in the link.');
  if (u.port && !['80', '443', ''].includes(u.port)) warnings.push(`Uses an unusual port (${u.port}).`);

  return { url: u.toString(), protocol, domain, warnings, unusual: warnings.length > 0 };
}

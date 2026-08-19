export interface DeviceInfo {
  browser: string;
  os: string;
  deviceType: 'desktop' | 'mobile' | 'tablet' | 'unknown';
  deviceName: string;
}

export function parseUserAgent(uaString?: string, customDeviceName?: string): DeviceInfo {
  if (!uaString) {
    return {
      browser: 'Unknown browser',
      os: 'Unknown OS',
      deviceType: 'unknown',
      deviceName: customDeviceName && customDeviceName !== 'Unknown device' ? customDeviceName : 'Unknown device',
    };
  }

  const ua = uaString.toLowerCase();

  // OS detection
  let os = 'Unknown OS';
  if (ua.includes('windows nt 10.0')) os = 'Windows 10/11';
  else if (ua.includes('windows nt 6.3')) os = 'Windows 8.1';
  else if (ua.includes('windows nt 6.2')) os = 'Windows 8';
  else if (ua.includes('windows nt 6.1')) os = 'Windows 7';
  else if (ua.includes('windows')) os = 'Windows';
  else if (ua.includes('macintosh') || ua.includes('mac os x')) os = 'macOS';
  else if (ua.includes('iphone')) os = 'iOS';
  else if (ua.includes('ipad')) os = 'iPadOS';
  else if (ua.includes('android')) os = 'Android';
  else if (ua.includes('linux')) os = 'Linux';
  else if (ua.includes('cros')) os = 'ChromeOS';

  // Device Type detection
  let deviceType: 'desktop' | 'mobile' | 'tablet' | 'unknown' = 'desktop';
  if (ua.includes('ipad') || (ua.includes('android') && !ua.includes('mobile')) || ua.includes('tablet')) {
    deviceType = 'tablet';
  } else if (ua.includes('mobile') || ua.includes('iphone') || ua.includes('ipod') || ua.includes('android')) {
    deviceType = 'mobile';
  }

  // Browser detection
  let browser = 'Unknown browser';
  if (ua.includes('edg/')) browser = 'Edge';
  else if (ua.includes('opr/') || ua.includes('opera')) browser = 'Opera';
  else if (ua.includes('chrome') && !ua.includes('chromium')) browser = 'Chrome';
  else if (ua.includes('firefox')) browser = 'Firefox';
  else if (ua.includes('safari') && !ua.includes('chrome')) browser = 'Safari';
  else if (ua.includes('brave')) browser = 'Brave';

  // Extract browser version if present
  const browserMatch = uaString.match(/(Firefox|Chrome|Safari|Edge|Edg|Opera|OPR)\/(\d+(\.\d+)?)/i);
  const browserVersion = browserMatch ? ` ${browserMatch[2]}` : '';
  const fullBrowser = `${browser}${browserVersion}`;

  // Formulate device name
  let autoDeviceName = `${os} (${browser})`;
  if (customDeviceName && customDeviceName !== 'Unknown device') {
    autoDeviceName = customDeviceName;
  }

  return {
    browser: fullBrowser,
    os,
    deviceType,
    deviceName: autoDeviceName,
  };
}

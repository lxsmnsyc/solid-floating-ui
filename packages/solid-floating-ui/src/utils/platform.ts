interface NavigatorUAData {
  brands: { brand: string; version: string }[];
  mobile: boolean;
  platform: string;
}

interface NavigatorWithUAData extends Navigator {
  userAgentData?: NavigatorUAData;
}

// Avoid Chrome DevTools blue warning.
export function getPlatform(): string {
  const uaData = (navigator as NavigatorWithUAData).userAgentData;

  if (uaData?.platform) {
    return uaData.platform;
  }

  return navigator.platform;
}

export function getUserAgent(): string {
  const uaData = (navigator as NavigatorWithUAData).userAgentData;

  if (uaData && Array.isArray(uaData.brands)) {
    return uaData.brands.map(({ brand, version }) => `${brand}/${version}`).join(' ');
  }

  return navigator.userAgent;
}

export function isSafari(): boolean {
  // Chrome DevTools does not complain about navigator.vendor
  return /apple/i.test(navigator.vendor);
}

export function isAndroid(): boolean {
  const re = /android/i;
  return re.test(getPlatform()) || re.test(getUserAgent());
}

export function isMac(): boolean {
  return getPlatform().toLowerCase().startsWith('mac') && !navigator.maxTouchPoints;
}

export function isJSDOM(): boolean {
  return getUserAgent().includes('jsdom/');
}

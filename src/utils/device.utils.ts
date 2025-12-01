import UAParser from 'ua-parser-js';

export const parseDevice = (userAgent: string) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const parser = new (UAParser as any)(userAgent);

  const os = parser.getOS();
  const browser = parser.getBrowser();
  const device = parser.getDevice();

  let type: 'desktop' | 'tablet' | 'mobile' = 'desktop';

  if (device.type === 'mobile') type = 'mobile';
  else if (device.type === 'tablet') type = 'tablet';

  return {
    type,
    os: os.name || 'Desconocido',
    browser: browser.name || 'Desconocido',
    deviceName: device.model || os.name || 'Dispositivo',
  };
};
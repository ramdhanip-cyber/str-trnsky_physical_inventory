export const APP_BASE_PATH = '/star-inventory';

export const getAppBasePath = (): string => {
  const pathname = window.location.pathname;
  if (pathname.includes(APP_BASE_PATH)) {
    const prefix = pathname.split(APP_BASE_PATH)[0] || '';
    return prefix + APP_BASE_PATH;
  }
  return APP_BASE_PATH;
};

export const getLoginPath = (): string => `${getAppBasePath()}/login`;

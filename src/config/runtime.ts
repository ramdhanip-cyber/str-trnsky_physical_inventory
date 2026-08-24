export type RuntimeEnvironment = 'SANDBOX' | 'LIVE';

export const getRuntimeEnvironment = (): RuntimeEnvironment => {
  const port = window.location.port;

  if (port === '5312') {
    return 'LIVE';
  }

  return 'SANDBOX';
};

export const getApiPort = (): string => {
  return getRuntimeEnvironment() === 'LIVE' ? '5312' : '5310';
};

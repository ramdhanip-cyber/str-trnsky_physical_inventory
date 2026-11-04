export type RuntimeEnvironment = 'SANDBOX' | 'LIVE' | 'DEVELOPMENT';

export const ENV_PORTS: Record<RuntimeEnvironment, string> = {
  LIVE: '5312',
  DEVELOPMENT: '5314',
  SANDBOX: '5310',
};

export const getRuntimeEnvironment = (): RuntimeEnvironment => {
  const port = window.location.port;

  if (port === ENV_PORTS.LIVE) {
    return 'LIVE';
  }

  if (port === ENV_PORTS.DEVELOPMENT) {
    return 'DEVELOPMENT';
  }

  return 'SANDBOX';
};

export const getApiPort = (): string => ENV_PORTS[getRuntimeEnvironment()];

export const getEnvironmentChipColors = (environment: RuntimeEnvironment) => {
  if (environment === 'LIVE') {
    return {
      color: '#A5D6A7',
      backgroundColor: 'rgba(76,175,80,0.22)',
      border: '1px solid rgba(76,175,80,0.45)',
      paletteKey: 'success' as const,
    };
  }

  if (environment === 'DEVELOPMENT') {
    return {
      color: '#90CAF9',
      backgroundColor: 'rgba(33,150,243,0.22)',
      border: '1px solid rgba(33,150,243,0.45)',
      paletteKey: 'info' as const,
    };
  }

  return {
    color: '#FFD54F',
    backgroundColor: 'rgba(255,193,7,0.18)',
    border: '1px solid rgba(255,193,7,0.38)',
    paletteKey: 'warning' as const,
  };
};

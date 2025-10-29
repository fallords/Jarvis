import type { AppConfig } from './lib/types';

export const APP_CONFIG_DEFAULTS: AppConfig = {
  companyName: 'J.A.R.V.I.S',
  pageTitle: 'J.A.R.V.I.S.',
  pageDescription: 'Your advanced voice agent built by Fadhlan',

  supportsChatInput: true,
  supportsVideoInput: true,
  supportsScreenShare: true,
  isPreConnectBufferEnabled: true,

  logo: '/arcreactor.jpeg',
  accent: '#002cf2',
  logoDark: '/arcreactor.jpeg',
  accentDark: '#1fd5f9',
  startButtonText: 'Talk to J.A.R.V.I.S.',

  agentName: undefined,
};

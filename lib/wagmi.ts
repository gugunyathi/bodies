import { http, createConfig, createStorage, cookieStorage } from 'wagmi';
import { base } from 'wagmi/chains';
import { baseAccount, injected } from 'wagmi/connectors';

export const config = createConfig({
  chains: [base],
  connectors: [
    injected(),
    baseAccount({
      appName: process.env.NEXT_PUBLIC_ONCHAINKIT_PROJECT_NAME || 'Bodies App',
    }),
  ],
  storage: createStorage({ storage: cookieStorage }),
  ssr: true,
  transports: {
    [base.id]: http(
      process.env.NEXT_PUBLIC_RPC_URL || 'https://mainnet.base.org'
    ),
  },
});

declare module 'wagmi' {
  interface Register {
    config: typeof config;
  }
}

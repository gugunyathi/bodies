import { http, createConfig, createStorage, cookieStorage } from 'wagmi';
import { base } from 'wagmi/chains';
import { baseAccount, injected } from 'wagmi/connectors';
import { Attribution } from 'ox/erc8021';

const DATA_SUFFIX = Attribution.toDataSuffix({
  codes: [process.env.NEXT_PUBLIC_BUILDER_CODE || 'bc_m3agyc7l'],
});

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
  dataSuffix: DATA_SUFFIX,
});

declare module 'wagmi' {
  interface Register {
    config: typeof config;
  }
}

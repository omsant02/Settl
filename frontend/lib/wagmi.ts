import { connectorsForWallets } from '@rainbow-me/rainbowkit';
import {
  metaMaskWallet,
  walletConnectWallet,
  coinbaseWallet,
} from '@rainbow-me/rainbowkit/wallets';
import { createConfig, http } from 'wagmi';
import {
  arbitrum,
  base,
  mainnet,
  optimism,
  polygon,
  sepolia,
  filecoin,
  filecoinCalibration,
} from 'wagmi/chains';

const connectors = connectorsForWallets(
  [
    {
      groupName: 'Popular',
      wallets: [metaMaskWallet, walletConnectWallet, coinbaseWallet],
    },
  ],
  {
    appName: 'Settl',
    projectId: '758c4f5906c8bef9bef97b13518af8c3',
  }
);

const chains = [
  mainnet,
  polygon,
  optimism,
  arbitrum,
  base,
  filecoin,
  filecoinCalibration,
  ...(process.env.NODE_ENV === 'development' ? [sepolia] : []),
] as const;

const developmentChains = process.env.NODE_ENV === 'development' ? [sepolia] : [];
const allChains = [mainnet, polygon, optimism, arbitrum, base, filecoin, filecoinCalibration, ...developmentChains];

const transports = allChains.reduce((acc, chain) => {
  acc[chain.id] = http();
  return acc;
}, {} as Record<number, ReturnType<typeof http>>);

export const config = createConfig({
  connectors,
  chains,
  transports,
  ssr: false,
});
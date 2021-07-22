import {
  CosmWasmClient as StargateClient,
  CosmWasmFeeTable,
  SigningCosmWasmClient as StargateSigningClient,
} from "@cosmjs/cosmwasm-stargate";
import { GasLimits, defaultGasLimits as defaultStargateGasLimits } from "@cosmjs/stargate";
import { MsgExecuteContract, MsgInstantiateContract, MsgStoreCode } from "@cosmjs/cosmwasm-stargate/build/codec/cosmwasm/wasm/v1beta1/tx";
import { Bip39, Random } from "@cosmjs/crypto";
import { DirectSecp256k1HdWallet, OfflineDirectSigner, OfflineSigner, Registry } from "@cosmjs/proto-signing";

import TransportWebUSB from "@ledgerhq/hw-transport-webusb";

import { settings } from "../settings";
import { msgExecuteContractTypeUrl, msgInstantiateContractTypeUrl, msgStoreCodeTypeUrl } from "./txs";
import { LedgerSigner } from "@cosmjs/ledger-amino";
import { OfflineAminoSigner, makeCosmoshubPath } from "@cosmjs/amino";

export { StargateClient, StargateSigningClient };

export function isStargateClient(client: StargateClient | null): client is StargateClient {
  return client instanceof StargateClient;
}

export function isStargateSigningClient(
  signingClient: StargateSigningClient | null,
): signingClient is StargateSigningClient {
  return signingClient instanceof StargateSigningClient;
}

export function generateMnemonic(): string {
  return Bip39.encode(Random.getBytes(16)).toString();
}

export function loadOrCreateMnemonic(mnemonic?: string): string {
  const key = "burner-wallet";
  const loaded = localStorage.getItem(key);
  if (loaded && !mnemonic) {
    return loaded;
  }
  const loadedMnemonic = mnemonic || generateMnemonic();
  localStorage.setItem(key, loadedMnemonic);
  return loadedMnemonic;
}

export type WalletLoaderDirect = (addressPrefix: string, mnemonic?: string) => Promise<OfflineDirectSigner|OfflineAminoSigner>;

export async function loadKeplrWallet(client: StargateClient): Promise<WalletLoaderDirect> {
  const chaindId = await client.getChainId();
  
  return async () => {
    await registerLucina();
    const w = window as any;
    await w.keplr.enable(chaindId);

    return w.getOfflineSigner(chaindId);
  }
}

async function registerLucina(): Promise<void> {
  const w = (window as any);
  if (!w.getOfflineSigner || !w.keplr) {
      throw "Please install keplr extension";
  } else {
      if (w.keplr.experimentalSuggestChain) {
          try {
              await w.keplr.experimentalSuggestChain({
                  chainId: "lucina",
                  chainName: "Juno testnet",
                  rpc: "https://rpc.juno.giansalex.dev:443",
                  rest: "https://lcd.juno.giansalex.dev:443",
                  stakeCurrency: {
                      coinDenom: "JUNO",
                      coinMinimalDenom: "ujuno",
                      coinDecimals: 6,
                      // coinGeckoId: ""
                  },
                  // walletUrlForStaking: "",
                  bip44: {
                      coinType: 118,
                  },
                  bech32Config: {
                      bech32PrefixAccAddr: "juno",
                      bech32PrefixAccPub: "junopub",
                      bech32PrefixValAddr: "junovaloper",
                      bech32PrefixValPub: "junovaloperpub",
                      bech32PrefixConsAddr: "junovalcons",
                      bech32PrefixConsPub: "junovalconspub"
                  },
                  currencies: [{
                      coinDenom: "JUNO",
                      coinMinimalDenom: "ujuno",
                      coinDecimals: 6,
                      // coinGeckoId: ""
                  }],
                  feeCurrencies: [{
                      coinDenom: "JUNO",
                      coinMinimalDenom: "ujuno",
                      coinDecimals: 6,
                      // coinGeckoId: ""
                  }],
                  gasPriceStep: {
                      low: 0.01,
                      average: 0.025,
                      high: 0.04
                  },
                  features: ["stargate", 'ibc-transfer'],
                  explorerUrlToTx: 'https://testnet.juno.aneka.io/txs/{txHash}',
              });
          } catch {
              throw "Failed to suggest the chain";
          }
      } else {
          throw "Please use the recent version of keplr extension";
      }
  }
}

export async function loadOrCreateWalletDirect(
  addressPrefix: string,
  mnemonic?: string,
): Promise<OfflineDirectSigner> {
  const loadedMnemonic = loadOrCreateMnemonic(mnemonic);
  const hdPath = makeCosmoshubPath(0);
  return DirectSecp256k1HdWallet.fromMnemonic(loadedMnemonic, {
    hdPaths: [hdPath],
    prefix: addressPrefix
  });
}

export async function loadLedgerWallet(addressPrefix: string): Promise<OfflineAminoSigner> {
  const interactiveTimeout = 120_000;
  const ledgerTransport = await TransportWebUSB.create(interactiveTimeout, interactiveTimeout);

  return new LedgerSigner(ledgerTransport, { hdPaths: [makeCosmoshubPath(0)], prefix: addressPrefix });
}

async function createStargateSigningClient(signer: OfflineSigner): Promise<StargateSigningClient> {
  const { nodeUrls, gasPrice } = settings.backend;
  const endpoint = nodeUrls[0];

  const typeRegistry = new Registry([
    [msgStoreCodeTypeUrl, MsgStoreCode],
    [msgInstantiateContractTypeUrl, MsgInstantiateContract],
    [msgExecuteContractTypeUrl, MsgExecuteContract],
  ]);

  const gasLimits: GasLimits<CosmWasmFeeTable> = {
    ...defaultStargateGasLimits,
    upload: 1500000,
    init: 600000,
    exec: 400000,
    migrate: 600000,
    send: 80000,
    changeAdmin: 80000,
  };

  return StargateSigningClient.connectWithSigner(endpoint, signer, {
    registry: typeRegistry,
    gasPrice: gasPrice,
    gasLimits: gasLimits,
  });
}

export async function getAddressAndStargateSigningClient(
  loadWallet: WalletLoaderDirect,
  mnemonic?: string,
): Promise<[string, StargateSigningClient]> {
  const signer = await loadWallet(settings.backend.addressPrefix, mnemonic);
  const userAddress = (await signer.getAccounts())[0].address;
  const signingClient = await createStargateSigningClient(signer);
  return [userAddress, signingClient];
}

export function webUsbMissing(): boolean {
  const anyNavigator: any = navigator;
  return !anyNavigator?.usb;
}

import {ethers, providers, Wallet} from 'ethers';
import {addVmListener, CallHistory, RecordedCall} from './CallHistory';
import {defaultAccounts} from './defaultAccounts';
import Ganache from 'ganache-core';
import {deployENS, ENS} from '@ethereum-waffle/ens';
import {ConsoleLogs} from './loggerCodes';

export {RecordedCall};

export class MockProvider extends providers.Web3Provider {
  private _callHistory: CallHistory
  private _ens?: ENS;

  constructor(private options?: Ganache.IProviderOptions) {
    super(Ganache.provider({accounts: defaultAccounts, ...options}) as any);
    this._callHistory = new CallHistory();
    this._callHistory.record(this);
    addVmListener(this, 'beforeMessage', (message) => {
      if (message.to?.toString().toLowerCase() === '         console.log') {
        const types = ConsoleLogs[(message.data as Buffer).readUIntBE(0, 4) as keyof typeof ConsoleLogs];
        console.log(
          ethers.utils.defaultAbiCoder
            .decode(types, (message.data as Buffer).slice(4))
            .map(val => val.toString())
            .join('')
        );
      }
    });
  }

  getWallets() {
    const items = this.options?.accounts ?? defaultAccounts;
    return items.map((x: any) => new Wallet(x.secretKey, this));
  }

  createEmptyWallet() {
    return Wallet.createRandom().connect(this);
  }

  clearCallHistory() {
    this._callHistory.clear();
  }

  get callHistory(): readonly RecordedCall[] {
    return this._callHistory.getCalls();
  }

  get ens(): ENS | undefined {
    return this._ens;
  }

  async setupENS(wallet?: Wallet) {
    if (!wallet) {
      const wallets = this.getWallets();
      wallet = wallets[wallets.length - 1];
    }
    const ens = await deployENS(wallet);
    this.network.ensAddress = ens.ens.address;
    this._ens = ens;
  }
}

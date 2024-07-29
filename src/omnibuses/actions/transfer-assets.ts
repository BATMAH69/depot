import { call, event, FormattedEvmCall } from "../../votes";
import { OmnibusHookCtx, OmnibusAction } from "../omnibus-action";
import { BigNumberish } from "ethers";
import { Address } from "../../common/types";
import { ERC20 } from "../../../typechain-types";
import { NamedContract } from "../../contracts";
import { OmnibusActionInput } from "../omnibus-action-meta";

interface TransferAssetsInput extends OmnibusActionInput {
  title: string; // The title is required for the assets transfer action
  to: Address;
  token: NamedContract<ERC20>;
  amount: BigNumberish;
}

export class TransferAssets extends OmnibusAction<TransferAssetsInput> {
  private amountBefore: BigNumberish = 0;

  getEVMCalls(): FormattedEvmCall[] {
    const { to, amount, token } = this.input;
    return [call(this.contracts.finance.newImmediatePayment, [token, to, amount, this.title])];
  }

  getExpectedEvents() {
    const { finance, agent } = this.contracts;
    const { to, amount, token } = this.input;

    return [
      event(finance, "NewTransaction", { args: [undefined, false, to, amount, this.title] }),
      event(token, "Transfer", { args: [agent, to, amount] }),
    ];
  }

  async before(): Promise<void> {
    const { to, token } = this.input;
    this.amountBefore = await token.balanceOf(to);
  }

  async after({ it, assert }: OmnibusHookCtx): Promise<void> {
    const { amount, to, token } = this.input;
    const balanceAfter = await token.balanceOf(to);
    it(`assets was transferred successfully`, async () => {
      const balanceBefore = BigInt(this.amountBefore) + BigInt(amount);
      assert.equal(balanceBefore, balanceAfter);
    });
  }
}
import { call, event, FormattedEvmCall, forward } from "../../votes";

import { OmnibusAction } from "../omnibus-action";
import { Address } from "../../common/types";
import { OmnibusActionInput } from "../omnibus-action-meta";

export interface NewNodeOperatorInput {
  name: string;
  rewardAddress: Address;
}

interface AddNodeOperatorsInput extends OmnibusActionInput {
  operators: NewNodeOperatorInput[];
}

export class AddNodeOperators extends OmnibusAction<AddNodeOperatorsInput> {
  get title(): string {
    return (
      `Add ${this.input.operators.length} node operators:\n` +
      this.input.operators.flatMap((item) => ` - ${item.name}`).join("\n")
    );
  }

  getEVMCalls(): FormattedEvmCall[] {
    const calls = this.input.operators.map((item) => {
      const { name, rewardAddress } = item;
      const { curatedStakingModule } = this.contracts;
      return call(curatedStakingModule.addNodeOperator, [name, rewardAddress]);
    });
    return [forward(this.contracts.agent, calls)];
  }

  getExpectedEvents() {
    const { callsScript, curatedStakingModule, agent, voting } = this.contracts;
    const subItemEvents = this.input.operators.flatMap((item) => {
      const { name, rewardAddress } = item;
      return [
        event(callsScript, "LogScriptCall", { emitter: agent }),
        event(curatedStakingModule, "NodeOperatorAdded", {
          args: [undefined, name, rewardAddress, 0],
        }),
      ];
    });

    return [event(callsScript, "LogScriptCall", { emitter: voting }), ...subItemEvents, event(agent, "ScriptResult")];
  }
}

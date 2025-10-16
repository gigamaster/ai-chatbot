// Using local user types instead of external auth
type UserType = "guest" | "regular";
import type { ChatModel } from "./models";

type Entitlements = {
  maxMessagesPerDay: number;
  availableChatModelIds: ChatModel["id"][];
};


// TODO: this needs to remove users without an account, since we use a local storage per user
export const entitlementsByUserType: Record<UserType, Entitlements> = {
  /*
   * For users without an account
   */
  guest: {
    maxMessagesPerDay: 20,
    availableChatModelIds: ["default-model"],
  },

  /*
   * For users with an account
   */
  regular: {
    maxMessagesPerDay: 100,
    availableChatModelIds: ["default-model"],
  },

  /*
   * TODO: For users with an account and a paid membership
   */
};

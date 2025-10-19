// Using local user types instead of external auth
type UserType = "regular";
import type { ChatModel } from "./models";

type Entitlements = {
  maxMessagesPerDay: number;
  availableChatModelIds: ChatModel["id"][];
};

export const entitlementsByUserType: Record<UserType, Entitlements> = {
  /*
   * For users with an account
   */
  regular: {
    maxMessagesPerDay: 100,
    availableChatModelIds: ["gemini-2.5-flash"],
  },

  /*
   * TODO: For users with an account and a paid membership
   */
};
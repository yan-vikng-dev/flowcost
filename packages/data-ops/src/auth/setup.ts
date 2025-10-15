import { betterAuth, type BetterAuthOptions } from "better-auth";

export const createBetterAuth = (config: {
  database: BetterAuthOptions["database"];
  secret?: BetterAuthOptions["secret"];
  socialProviders?: BetterAuthOptions["socialProviders"];
}): ReturnType<typeof betterAuth> => {
  return betterAuth({
    database: config.database,
    secret: config.secret,
    emailAndPassword: {
      enabled: false,
    },
    socialProviders: config.socialProviders,
    user: {
      modelName: "auth_users",
    },
    session: {
      modelName: "auth_sessions",
    },
    verification: {
      modelName: "auth_verifications",
    },
    account: {
      modelName: "auth_accounts",
    },
  });
};

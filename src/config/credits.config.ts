export interface CreditsConfig {
  enabled: boolean;
  currency: string;

  // Credit consumption rules
  consumption: {
    apiCall: {
      costPerCall: number; // Credits consumed per API call
      freeQuotaCalls: number; // Free quota for paid users (0 = all use credits)
    };
    storage: {
      costPerGBPerMonth: number; // Credits consumed per GB per month
      freeQuotaGB: number; // Free quota for paid users (0 = all use credits)
    };
  };

  // Free user quotas (without credits)
  freeUser: {
    apiCall: {
      freeQuotaCalls: number; // Free API calls per month for free users
    };
    storage: {
      freeQuotaGB: number; // Free storage for free users
    };
  };
}

export const creditsConfig: CreditsConfig = {
  enabled: true,
  currency: 'credits',

  // Consumption rules
  consumption: {
    apiCall: {
      costPerCall: 1, // Each API call costs 1 credit
      freeQuotaCalls: 0, // Paid users have no free quota, all use credits
    },
    storage: {
      costPerGBPerMonth: 10, // Each GB per month costs 10 credits
      freeQuotaGB: 0, // Paid users have no free quota
    },
  },

  // Free user quotas
  freeUser: {
    apiCall: {
      freeQuotaCalls: 100, // Free users get 100 API calls per month
    },
    storage: {
      freeQuotaGB: 1, // Free users get 1GB free storage
    },
  },
};

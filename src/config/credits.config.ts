export interface CreditsConfig {
  enabled: boolean;
  currency: string;

  // Credit consumption rules
  consumption: {
    apiCall: {
      costPerCall: number; // Credits consumed per API call
    };
    storage: {
      costPerGBPerMonth: number; // Credits consumed per GB per month
    };
  };
}

export const creditsConfig: CreditsConfig = {
  enabled: true,
  currency: 'credits',

  // Consumption rules - all users pay credits uniformly
  consumption: {
    apiCall: {
      costPerCall: 1, // Each API call costs 1 credit
    },
    storage: {
      costPerGBPerMonth: 10, // Each GB per month costs 10 credits
    },
  },
};

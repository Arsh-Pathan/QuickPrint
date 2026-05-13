'use client';

import { useQuery } from '@tanstack/react-query';
import type { PricingConfig } from '@quickprint/shared';
import { api } from './api';

const FALLBACK: PricingConfig = {
  bwPaise: 200,
  colorPaise: 1000,
  duplexDiscountPct: 10,
};

export interface ShopPublic {
  shopName: string;
  acceptingJobs: boolean;
  defaultPaperSize: string;
  pricing: PricingConfig;
}

export function usePublicShop() {
  return useQuery<ShopPublic>({
    queryKey: ['public-shop'],
    queryFn: async () => {
      const s = await api.publicSettings();
      return {
        shopName: s.shopName,
        acceptingJobs: s.acceptingJobs,
        defaultPaperSize: s.defaultPaperSize,
        pricing: {
          bwPaise: s.bwPaise,
          colorPaise: s.colorPaise,
          duplexDiscountPct: s.duplexDiscountPct,
        },
      };
    },
    staleTime: 5 * 60_000,
  });
}

export function usePricingConfig(): PricingConfig {
  const { data } = usePublicShop();
  return data?.pricing ?? FALLBACK;
}

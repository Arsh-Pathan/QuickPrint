/**
 * Single-shop deployment config. QuickPrint is designed to run as one
 * instance per print shop, so SHOP_ID is a build-time constant set via
 * NEXT_PUBLIC_SHOP_ID. Falls back to the dev shop when unset.
 */
export const SHOP_ID =
  process.env.NEXT_PUBLIC_SHOP_ID && process.env.NEXT_PUBLIC_SHOP_ID.length > 0
    ? process.env.NEXT_PUBLIC_SHOP_ID
    : 'shop_local_dev';

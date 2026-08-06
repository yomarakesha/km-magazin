// Shop kill-switch. NEXT_PUBLIC_SHOP_ENABLED=0 hides the nav link and 404s
// every /shop route; any other value (or unset) keeps the shop on.
// NEXT_PUBLIC_ so the same flag works in server layouts and client components.
export const SHOP_ENABLED = process.env.NEXT_PUBLIC_SHOP_ENABLED !== "0";

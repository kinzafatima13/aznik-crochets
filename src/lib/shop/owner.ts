export const SHOP_OWNER_EMAIL = "kinzafatima1301@gmail.com";

export function isShopOwner(email: string | null | undefined): boolean {
  return (email ?? "").trim().toLowerCase() === SHOP_OWNER_EMAIL;
}

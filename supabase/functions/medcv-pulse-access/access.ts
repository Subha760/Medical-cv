export const OWNER_EMAIL = "subhajitsatpathi6@gmail.com";
export const ACCESS_ISSUER = "https://toolinger-owner.cloudflareaccess.com";
export const ACCESS_AUDIENCE =
  "339bcda326f68af4f1abd73ef19237e2f9df3726665f381be918a14ba0ef5d47";
export function validateOwnerClaims(p: Record<string, unknown>, now: number) {
  if (
    p.email !== OWNER_EMAIL ||
    p.type !== "app" ||
    typeof p.sub !== "string" ||
    !p.sub ||
    typeof p.exp !== "number" ||
    typeof p.iat !== "number" ||
    p.exp <= now ||
    p.iat > now + 10 ||
    p.iat < now - 1800 ||
    p.exp - p.iat > 1810
  )
    throw new Error("A fresh owner email verification is required.");
  return new Date(Math.min(p.exp * 1000, (now + 1800) * 1000)).toISOString();
}

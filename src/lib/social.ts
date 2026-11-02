// Kinshasa Label's public accounts (2026-11-02). One place to change them:
// footer and contact icons, Google's "sameAs" data, emails.
// null = no account yet → the icon is hidden everywhere.
export const SOCIAL_URLS: Record<'facebook' | 'instagram' | 'tiktok', string | null> = {
  facebook: 'https://www.facebook.com/share/19txsmAqiz/',
  instagram: 'https://www.instagram.com/kinshasalabel',
  tiktok: 'https://www.tiktok.com/@kinshasalabel',
};

export const CONTACT_EMAIL = 'contact@kinshasalabel.com';

/** Live account URLs, for schema.org "sameAs". */
export const SOCIAL_SAME_AS: string[] = Object.values(SOCIAL_URLS).filter((u): u is string => !!u);

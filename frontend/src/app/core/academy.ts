// The academy's public contact details and official accounts (shown on the contact page and in the footer).
export const ACADEMY = {
  name: 'مجمع الملك سلمان العالمي للغة العربية',
  email: 'info@ksaa.gov.sa',
  phone: '+966115207777',
  phoneDisplay: '+966 11 520 7777',
  address: ['حي الورود، الرياض 12251', 'المملكة العربية السعودية'],
};

export interface SocialLink { name: string; icon: string; url: string; }

export const SOCIAL: SocialLink[] = [
  { name: 'إكس (تويتر)', icon: 'new-twitter', url: 'https://x.com/KSGAFAL' },
  { name: 'إنستغرام', icon: 'instagram', url: 'https://www.instagram.com/ksgafal/' },
  { name: 'فيسبوك', icon: 'facebook-01', url: 'https://www.facebook.com/KSGAFAL/' },
  { name: 'يوتيوب', icon: 'youtube', url: 'https://www.youtube.com/@ksgafal' },
  { name: 'لينكدإن', icon: 'linkedin-01', url: 'https://www.linkedin.com/company/ksgafal/' },
  { name: 'قناة واتساب', icon: 'whatsapp', url: 'https://www.whatsapp.com/channel/0029Vb6luvS42Dcd4Mi8rE0T' },
  { name: 'البريد الإلكتروني', icon: 'mail-01', url: 'mailto:info@ksaa.gov.sa' },
];

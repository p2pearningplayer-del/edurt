// =============================================================================
// LEARNUP INDIA (learnupindia.com) — Production & Hostinger Configuration
// =============================================================================

export const PLATFORM_CONFIG = {
  websiteName: process.env.WEBSITE_NAME || 'learnupindia.com',
  brandName: process.env.BRAND_NAME || 'LearnUp India',
  brandDomain: process.env.BRAND_DOMAIN || 'https://learnupindia.com',
  supportEmail: process.env.SUPPORT_EMAIL || 'team@learnupindia.com',
  primaryCurrency: 'INR',

  // Hostinger MySQL Database Configuration
  mysql: {
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT || 3306),
    database: process.env.DB_NAME || 'u591469534_educ',
    user: process.env.DB_USER || 'u591469534_educt',
    password: process.env.DB_PASSWORD || 'Q5w^tt5EY>',
    connectionLimit: 10,
  },

  // Hostinger SMTP Mail Configuration
  smtp: {
    host: process.env.SMTP_HOST || 'smtp.hostinger.com',
    port: Number(process.env.SMTP_PORT || 465),
    secure: process.env.SMTP_SECURE !== 'false',
    user: process.env.SMTP_USER || 'team@learnupindia.com',
    pass: process.env.SMTP_PASS || 'Owner@team4',
    fromName: process.env.SMTP_FROM_NAME || 'LearnUp India',
    fromEmail: process.env.SMTP_FROM_EMAIL || 'team@learnupindia.com',
  },
};

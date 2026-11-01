/**
 * Predefined demo accounts and personas for Financial Decision Lab (FDL).
 * Used for one-click demo logins, synthetic statements, and zero-egress offline testing.
 */

export interface DemoAccountConfig {
  id: string;
  email: string;
  password: string;
  full_name: string;
  mobile_number: string;
  country: string;
  preferred_currency: string;
}

export const DEMO_ACCOUNTS: Record<string, DemoAccountConfig> = {
  'aarav.kumar@example.com': {
    id: 'usr_aarav_001',
    email: 'aarav.kumar@example.com',
    password: 'Password123!',
    full_name: 'Aarav Kumar',
    mobile_number: '+91 98765 43210',
    country: 'India',
    preferred_currency: 'INR',
  },
  'priya.sharma@example.com': {
    id: 'usr_priya_002',
    email: 'priya.sharma@example.com',
    password: 'Password123!',
    full_name: 'Priya Sharma',
    mobile_number: '+91 98123 45678',
    country: 'India',
    preferred_currency: 'INR',
  },
};

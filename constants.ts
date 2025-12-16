
import { LayoutDashboard, Users, FileText, BarChart3, Layers, Receipt } from 'lucide-react';
import { ServiceDefinition } from './types';

export const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'clients', label: 'Clients', icon: Users },
  { id: 'services', label: 'Services', icon: Layers },
  { id: 'expenses', label: 'Expenses', icon: Receipt },
  { id: 'billing', label: 'Billing & Invoices', icon: FileText },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
];

export const AGENCY_DETAILS = {
  name: "Your Digital Agency Name",
  address: "123, Tech Park, Bangalore, India - 560001",
  phone: "+91 98765 43210",
  email: "billing@youragency.com",
  gstIn: "29ABCDE1234F1Z5", // Example GST
  pan: "ABCDE1234F"
};

export const formatCurrency = (amount: number) => {
  // Guard against crashes due to division by zero or invalid inputs
  if (amount === undefined || amount === null || isNaN(amount) || !isFinite(amount)) {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0,
    }).format(0);
  }

  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
};

export const DEFAULT_SERVICES: ServiceDefinition[] = [
  { 
    id: '1', 
    name: 'Meta Ads (FB/Insta)', 
    description: 'Campaign setup, ad creatives, and weekly optimization.', 
    price: 25000, 
    notes: 'Ad spend is separate.' 
  },
  { 
    id: '2', 
    name: 'Google Ads', 
    description: 'Search and Display network campaigns with keyword research.', 
    price: 30000,
    notes: 'Includes monthly reporting.'
  },
  { 
    id: '3', 
    name: 'SEO Standard', 
    description: 'On-page and Off-page optimization, 5 blogs/month.', 
    price: 20000 
  },
  { 
    id: '4', 
    name: 'Website Development', 
    description: '5-page responsive website on WordPress or React.', 
    price: 50000,
    notes: 'One-time cost.'
  },
  { 
    id: '5', 
    name: 'Social Media Mgmt', 
    description: '12 posts per month + Community management.', 
    price: 15000 
  }
];

export const EXPENSE_CATEGORIES = [
  'Office Rent',
  'Software Subscriptions',
  'Employee Salaries',
  'Marketing/Ads',
  'Freelancer Payouts',
  'Utilities (Internet/Power)',
  'Equipment',
  'Travel/Food',
  'Miscellaneous'
];

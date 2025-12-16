
export interface ServiceDefinition {
  id: string;
  name: string;
  description: string;
  price: number;
  notes?: string;
}

export interface Payment {
  id: string;
  amount: number;
  date: string;
  note?: string;
}

export type ClientStatus = 'ACTIVE' | 'CLOSED' | 'PAUSED' | 'STOPPED' | 'LEAD';

export interface Client {
  id: string;
  name: string;
  businessName: string;
  phone: string;
  email: string;
  address?: string;
  gstIn?: string; // For Indian Billing
  services: string[]; // Changed from enum to string[] to support dynamic services
  dealAmount: number; // Total Deal Value
  startDate: string;
  endDate?: string;
  payments: Payment[];
  status: ClientStatus;
  notes?: string;
}

export interface InvoiceDetails {
  invoiceNumber: string;
  date: string;
  dueDate: string;
  items: { description: string; amount: number }[];
  gstRate: number; // Percentage (e.g., 18)
}

export interface Expense {
  id: string;
  title: string;
  amount: number;
  category: string;
  date: string;
  notes?: string;
}

export interface AgencyProfile {
  name: string;
  address: string;
  phone: string;
  email: string;
  gstIn: string;
  website?: string;
  logoUrl?: string;
  customInvoiceTemplate?: string; // Custom HTML/CSS Template
}

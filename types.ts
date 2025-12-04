export interface User {
  email: string;
}

export type Page = 'DASHBOARD' | 'FORM' | 'UPLOAD';

export enum InvoiceType {
  ADVANCE = 'Advance payment',
  OUTSTANDING = 'Bill payment for outstanding invoice not specific',
  SPECIFIC = 'Bill payment for specific invoice'
}

export interface PaymentDetail {
  id: string;
  bankReferenceNumber: string;
  amount: number | null;
  paymentDate: string;
}

export interface InvoiceDetail {
  id:string;
  invoiceNumber: string;
  invoiceAmount: number | null;
  invoiceAmountPaid: number | null;
  tdsAmount: number | null;
  gstWithheldAmount: number | null;
  invoiceAmountDeducted: number | null;
}

export interface FormSubmission {
  id: string;
  submittedAt: Date;
  invoiceType: InvoiceType;
  customerCode?: string;
  customerName?: string;
  entityCode: string;
  divisionCode?: string;
  caseType?: 'Domestic' | 'Import' | 'Export';
  bankAccount: string;
  creditControlArea?: string;
  profitCenter?: string;
  remark?: string;
  paymentDetails: PaymentDetail[];
  invoiceDetails?: InvoiceDetail[];
}

export type ExtractedData = Partial<Omit<FormSubmission, 'id' | 'submittedAt'>>;

export interface Customer {
  code: string;
  name: string;
}

export interface Entity {
  code: string;
  name: string;
}

export interface Division {
  code: string;
  name: string;
  entityCode: string;
}

export interface BankAccount {
  name: string;
  glCode: string;
  entityCode: string;
}
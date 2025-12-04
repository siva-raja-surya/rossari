
import { Customer, Entity, Division, BankAccount } from './types';

export const MOCK_USER: { email: string } = { email: 'user@example.com' };

export const CUSTOMERS: Customer[] = [
  { code: '10000001', name: 'Global Tech Inc.' },
  { code: '10000002', name: 'Innovate Solutions Ltd.' },
  { code: '10000003', name: 'Pioneer Industries' },
  { code: '10000004', name: 'Quantum Logistics' },
  { code: '10000005', name: 'Stellar Retail Group' },
];

export const ENTITIES: Entity[] = [
  { code: '1000', name: 'Reliance Industries Ltd' },
  { code: '2000', name: 'Tata Motors' },
  { code: '3000', name: 'Infosys Technologies' },
];

export const DIVISIONS: Division[] = [
  { code: '10', name: 'Petrochemicals', entityCode: '1000' },
  { code: '20', name: 'Retail', entityCode: '1000' },
  { code: '30', name: 'Passenger Vehicles', entityCode: '2000' },
  { code: '40', name: 'Commercial Vehicles', entityCode: '2000' },
  { code: '50', name: 'Financial Services', entityCode: '3000' },
];

export const BANK_ACCOUNTS: BankAccount[] = [
  { name: 'AXIS', glCode: '11001101', entityCode: '1000' },
  { name: 'HDFC', glCode: '11001102', entityCode: '1000' },
  { name: 'ICICI', glCode: '21001101', entityCode: '2000' },
  { name: 'HDFC CC R', glCode: '31001101', entityCode: '3000' },
];

export const CREDIT_CONTROL_AREAS: string[] = ['A001', 'A002', 'B001', 'B002'];
export const PROFIT_CENTERS: { [key: string]: string[] } = {
  '1000': ['PC1000-A', 'PC1000-B'],
  '2000': ['PC2000-A', 'PC2000-C'],
  '3000': ['PC3000-D', 'PC3000-E'],
};

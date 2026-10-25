export interface User {
  id: string;
  email: string;
  fullName: string;
  companyName: string;
}

export interface Session {
  token: string;
  expiresAt: string;
  user: User;
}

export interface RegisterInput {
  email: string;
  fullName: string;
  companyName: string;
  password: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface MaterialInput {
  description: string;
  unit: string;
  quantityPerUnit: number;
  unitPrice: number;
}

export interface LaborInput {
  description: string;
  unit: string;
  quantityPerUnit: number;
  unitRate: number;
}

export interface WorkItemInput {
  name: string;
  unit: string;
  quantity: number;
  wastePercent: number;
  notes: string;
  materials: MaterialInput[];
  labors: LaborInput[];
}

export interface WorkInput {
  name: string;
  clientName: string;
  location: string;
  description: string;
  items: WorkItemInput[];
}

export interface WorkSummary {
  id: string;
  name: string;
  clientName: string;
  location: string;
  currency: string;
  itemCount: number;
  materialTotal: number;
  laborTotal: number;
  total: number;
  updatedAt: string;
}

export interface MaterialCalculation {
  id: string;
  description: string;
  unit: string;
  quantityPerUnit: number;
  unitPrice: number;
  wastePercent: number;
  totalQuantity: number;
  lineTotal: number;
}

export interface LaborCalculation {
  id: string;
  description: string;
  unit: string;
  quantityPerUnit: number;
  unitRate: number;
  totalQuantity: number;
  lineTotal: number;
}

export interface ItemCalculation {
  id: string;
  name: string;
  unit: string;
  quantity: number;
  wastePercent: number;
  notes: string;
  materials: MaterialCalculation[];
  labors: LaborCalculation[];
  materialTotal: number;
  laborTotal: number;
  total: number;
  unitTotal: number;
}

export interface WorkCalculation {
  items: ItemCalculation[];
  materialTotal: number;
  laborTotal: number;
  total: number;
  materialShare: number;
  laborShare: number;
  itemCount: number;
}

export interface WorkDetail extends WorkCalculation {
  id: string;
  name: string;
  clientName: string;
  location: string;
  description: string;
  currency: string;
  createdAt: string;
  updatedAt: string;
}

import {
  ItemCalculation,
  LaborCalculation,
  MaterialCalculation,
  WorkInput,
  WorkCalculation,
  WorkItemInput
} from './models';

const toNumber = (value: unknown): number => {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const roundTo = (value: number, decimals: number): number => {
  const factor = 10 ** decimals;
  return Math.round((value + Number.EPSILON) * factor) / factor;
};

export const roundMoney = (value: number): number => roundTo(toNumber(value), 2);
export const roundQuantity = (value: number): number => roundTo(toNumber(value), 4);

const percentOf = (part: number, total: number): number =>
  total <= 0 ? 0 : roundTo((part / total) * 100, 2);

function calculateItem(item: WorkItemInput): ItemCalculation {
  const quantity = Math.max(0, toNumber(item.quantity));
  const wastePercent = Math.min(100, Math.max(0, toNumber(item.wastePercent)));
  const factor = 1 + wastePercent / 100;

  const materials: MaterialCalculation[] = (item.materials ?? []).map((material) => {
    const quantityPerUnit = toNumber(material.quantityPerUnit);
    const unitPrice = toNumber(material.unitPrice);
    const totalQuantity = roundQuantity(quantity * quantityPerUnit * factor);

    return {
      id: '',
      description: material.description,
      unit: material.unit,
      quantityPerUnit,
      unitPrice,
      wastePercent,
      totalQuantity,
      lineTotal: roundMoney(totalQuantity * unitPrice)
    };
  });

  const labors: LaborCalculation[] = (item.labors ?? []).map((labor) => {
    const quantityPerUnit = toNumber(labor.quantityPerUnit);
    const unitRate = toNumber(labor.unitRate);
    const totalQuantity = roundQuantity(quantity * quantityPerUnit);

    return {
      id: '',
      description: labor.description,
      unit: labor.unit,
      quantityPerUnit,
      unitRate,
      totalQuantity,
      lineTotal: roundMoney(totalQuantity * unitRate)
    };
  });

  const materialTotal = roundMoney(materials.reduce((sum, material) => sum + material.lineTotal, 0));
  const laborTotal = roundMoney(labors.reduce((sum, labor) => sum + labor.lineTotal, 0));
  const total = roundMoney(materialTotal + laborTotal);

  return {
    id: '',
    name: item.name,
    unit: item.unit,
    quantity,
    wastePercent,
    notes: item.notes,
    materials,
    labors,
    materialTotal,
    laborTotal,
    total,
    unitTotal: quantity <= 0 ? 0 : roundMoney(total / quantity)
  };
}

export function calculateWork(input: WorkInput): WorkCalculation {
  const items = (input.items ?? []).map(calculateItem);
  const materialTotal = roundMoney(items.reduce((sum, item) => sum + item.materialTotal, 0));
  const laborTotal = roundMoney(items.reduce((sum, item) => sum + item.laborTotal, 0));
  const total = roundMoney(materialTotal + laborTotal);

  return {
    items,
    materialTotal,
    laborTotal,
    total,
    materialShare: percentOf(materialTotal, total),
    laborShare: percentOf(laborTotal, total),
    itemCount: items.length
  };
}

export function emptyWorkInput(): WorkInput {
  return {
    name: '',
    clientName: '',
    location: '',
    description: '',
    items: []
  };
}

export function formatMoney(value: number | null | undefined, prefix = true): string {
  const formatted = new Intl.NumberFormat('es-CO', {
    maximumFractionDigits: 0
  }).format(Math.round(toNumber(value)));

  return prefix ? `$ ${formatted}` : formatted;
}

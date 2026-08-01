import type { EntityId, IsoDateTime } from "../core/domain";
import type { IngredientAmount } from "../cooking/domain";

export type InventoryLocation =
  | "pantry"
  | "refrigerator"
  | "freezer"
  | "counter";

export interface InventoryItem {
  id: EntityId;
  householdId: EntityId;
  ingredientId: EntityId;
  label: string;
  quantity: number;
  unit: IngredientAmount["unit"];
  location: InventoryLocation;
  bestBefore?: string;
  openedAt?: IsoDateTime;
  capturedAt: IsoDateTime;
  captureSource: "manual" | "photo" | "receipt" | "shopping-list" | "cooking-session";
  confidence: number;
}

export interface InventorySnapshot {
  householdId: EntityId;
  items: InventoryItem[];
  generatedAt: IsoDateTime;
}

export interface InventoryConsumption {
  ingredientId: EntityId;
  quantity: number;
  unit: IngredientAmount["unit"];
}

export const validateInventory = (snapshot: InventorySnapshot): string[] => {
  const errors: string[] = [];

  for (const item of snapshot.items) {
    if (item.householdId !== snapshot.householdId) {
      errors.push(`inventory-household-mismatch:${item.id}`);
    }
    if (item.quantity < 0) {
      errors.push(`negative-inventory-quantity:${item.id}`);
    }
    if (item.confidence < 0 || item.confidence > 1) {
      errors.push(`invalid-inventory-confidence:${item.id}`);
    }
  }

  return errors;
};

export const availableIngredientIds = (
  snapshot: InventorySnapshot,
  minimumConfidence = 0.6,
): EntityId[] =>
  snapshot.items
    .filter((item) => item.quantity > 0 && item.confidence >= minimumConfidence)
    .map((item) => item.ingredientId);

export const consumeInventory = (
  snapshot: InventorySnapshot,
  consumptions: InventoryConsumption[],
  generatedAt: IsoDateTime,
): InventorySnapshot => {
  const quantities = new Map(
    consumptions.map((item) => [
      `${item.ingredientId}:${item.unit}`,
      item.quantity,
    ]),
  );

  return {
    ...snapshot,
    generatedAt,
    items: snapshot.items.map((item) => {
      const key = `${item.ingredientId}:${item.unit}`;
      const required = quantities.get(key) ?? 0;
      if (required === 0) return item;

      const consumed = Math.min(item.quantity, required);
      quantities.set(key, required - consumed);

      return {
        ...item,
        quantity: item.quantity - consumed,
        capturedAt: generatedAt,
        captureSource: "cooking-session",
        confidence: 1,
      };
    }),
  };
};

export const prioritizeExpiringInventory = (
  snapshot: InventorySnapshot,
  today: string,
): InventoryItem[] =>
  snapshot.items
    .filter((item) => item.quantity > 0 && item.bestBefore !== undefined)
    .sort((left, right) => {
      const leftDays = Date.parse(left.bestBefore ?? today) - Date.parse(today);
      const rightDays = Date.parse(right.bestBefore ?? today) - Date.parse(today);
      return leftDays - rightDays;
    });

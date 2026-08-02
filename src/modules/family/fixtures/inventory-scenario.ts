import { planFamilyMeal } from "../cooking/planning";
import {
  availableIngredientIds,
  consumeInventory,
  prioritizeExpiringInventory,
  type InventorySnapshot,
} from "../household/inventory";
import { demoFamilyContext } from "./demo-family";
import { demoRecipeCandidates } from "./demo-recipes";

export const demoInventory: InventorySnapshot = {
  householdId: demoFamilyContext.household.id,
  generatedAt: "2026-08-01T21:45:00.000Z",
  items: [
    {
      id: "inventory-carrot",
      householdId: demoFamilyContext.household.id,
      ingredientId: "carrot",
      label: "Karotten",
      quantity: 500,
      unit: "g",
      location: "refrigerator",
      bestBefore: "2026-08-03",
      capturedAt: "2026-08-01T21:45:00.000Z",
      captureSource: "manual",
      confidence: 1,
    },
    {
      id: "inventory-zucchini",
      householdId: demoFamilyContext.household.id,
      ingredientId: "zucchini",
      label: "Zucchini",
      quantity: 300,
      unit: "g",
      location: "refrigerator",
      bestBefore: "2026-08-02",
      capturedAt: "2026-08-01T21:45:00.000Z",
      captureSource: "photo",
      confidence: 0.9,
    },
    {
      id: "inventory-water",
      householdId: demoFamilyContext.household.id,
      ingredientId: "water",
      label: "Wasser",
      quantity: 5000,
      unit: "ml",
      location: "pantry",
      capturedAt: "2026-08-01T21:45:00.000Z",
      captureSource: "manual",
      confidence: 1,
    },
  ],
};

export const runInventoryScenario = () => {
  const ingredientIds = availableIngredientIds(demoInventory);
  const expiring = prioritizeExpiringInventory(demoInventory, "2026-08-01");

  const plan = planFamilyMeal({
    context: demoFamilyContext,
    date: "2026-08-02",
    slot: "dinner",
    candidates: demoRecipeCandidates,
    availableIngredientIds: ingredientIds,
    maximumMinutes: 35,
  });

  const afterCooking = consumeInventory(
    demoInventory,
    [
      { ingredientId: "carrot", quantity: 300, unit: "g" },
      { ingredientId: "zucchini", quantity: 250, unit: "g" },
      { ingredientId: "water", quantity: 700, unit: "ml" },
    ],
    "2026-08-02T18:15:00.000Z",
  );

  return {
    ingredientIds,
    expiringIngredientIds: expiring.map((item) => item.ingredientId),
    plan,
    afterCooking,
  };
};

import { validateInventory } from "../household/inventory";
import { demoInventory, runInventoryScenario } from "./inventory-scenario";

export const runInventoryAcceptance = () => {
  const scenario = runInventoryScenario();
  const carrot = scenario.afterCooking.items.find(
    (item) => item.ingredientId === "carrot",
  );
  const zucchini = scenario.afterCooking.items.find(
    (item) => item.ingredientId === "zucchini",
  );
  const water = scenario.afterCooking.items.find(
    (item) => item.ingredientId === "water",
  );

  return {
    inventoryValid: validateInventory(demoInventory).length === 0,
    availableIngredientsDetected:
      scenario.ingredientIds.includes("carrot") &&
      scenario.ingredientIds.includes("zucchini") &&
      scenario.ingredientIds.includes("water"),
    expiringInventoryPrioritized:
      scenario.expiringIngredientIds[0] === "zucchini",
    planningUsesInventory:
      scenario.plan.entry !== undefined &&
      scenario.plan.shoppingList.length > 0,
    consumptionApplied:
      carrot?.quantity === 200 &&
      zucchini?.quantity === 50 &&
      water?.quantity === 4300,
    scenario,
  };
};

export const assertInventoryAcceptance = (): void => {
  const result = runInventoryAcceptance();
  const failures: string[] = [];

  if (!result.inventoryValid) failures.push("inventory-invalid");
  if (!result.availableIngredientsDetected) {
    failures.push("available-inventory-not-detected");
  }
  if (!result.expiringInventoryPrioritized) {
    failures.push("expiring-inventory-not-prioritized");
  }
  if (!result.planningUsesInventory) {
    failures.push("planning-did-not-use-inventory");
  }
  if (!result.consumptionApplied) {
    failures.push("inventory-consumption-not-applied");
  }

  if (failures.length > 0) throw new Error(failures.join("\n"));
};

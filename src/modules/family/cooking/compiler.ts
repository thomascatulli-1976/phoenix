import type {
  IngredientAmount,
  MealPlanEntry,
  ThermomixModel,
  ThermomixStep,
} from "./domain";

export interface RecipeOperation {
  id: string;
  title: string;
  action: "add" | "chop" | "mix" | "heat" | "steam" | "rest" | "serve";
  ingredients?: IngredientAmount[];
  durationSeconds?: number;
  temperatureCelsius?: number;
  speed?: number | "spoon";
  reverse?: boolean;
  vessel?: ThermomixStep["vessel"];
  measuringCup?: ThermomixStep["measuringCup"];
  expectedResult: string;
  recoveryInstruction?: string;
  safetyNote?: string;
}

export interface RecipeDefinition {
  id: string;
  title: string;
  supportedModels: ThermomixModel[];
  operations: RecipeOperation[];
}

export interface CompileRequest {
  meal: MealPlanEntry;
  recipe: RecipeDefinition;
  model: ThermomixModel;
}

export interface CompileResult {
  steps: ThermomixStep[];
  errors: string[];
  warnings: string[];
}

const MODEL_LIMITS: Record<
  ThermomixModel,
  { maxTemperature: number; maxSpeed: number; supportsGuidedCooking: boolean }
> = {
  TM5: { maxTemperature: 120, maxSpeed: 10, supportsGuidedCooking: false },
  TM6: { maxTemperature: 160, maxSpeed: 10, supportsGuidedCooking: true },
  TM7: { maxTemperature: 160, maxSpeed: 10, supportsGuidedCooking: true },
  unknown: { maxTemperature: 100, maxSpeed: 6, supportsGuidedCooking: false },
};

const defaultVessel = (
  operation: RecipeOperation,
): ThermomixStep["vessel"] => {
  if (operation.action === "steam") return "varoma";
  if (operation.action === "serve") return "external-bowl";
  return "mixing-bowl";
};

const defaultMeasuringCup = (
  operation: RecipeOperation,
): ThermomixStep["measuringCup"] => {
  if (operation.action === "steam") return "removed";
  if (operation.action === "serve") return "not-applicable";
  return "inserted";
};

export const compileThermomixRecipe = (
  request: CompileRequest,
): CompileResult => {
  const errors: string[] = [];
  const warnings: string[] = [];
  const limits = MODEL_LIMITS[request.model];

  if (request.meal.approvalState !== "approved") {
    errors.push("meal-must-be-approved-before-compilation");
  }

  if (!request.recipe.supportedModels.includes(request.model)) {
    errors.push(`recipe-not-supported-for-model:${request.model}`);
  }

  const steps = request.recipe.operations.map((operation, index) => {
    if (
      operation.temperatureCelsius !== undefined &&
      operation.temperatureCelsius > limits.maxTemperature
    ) {
      errors.push(`temperature-exceeds-model-limit:${operation.id}`);
    }

    if (
      typeof operation.speed === "number" &&
      operation.speed > limits.maxSpeed
    ) {
      errors.push(`speed-exceeds-model-limit:${operation.id}`);
    }

    if (operation.action === "heat" && operation.durationSeconds === undefined) {
      errors.push(`heated-step-requires-duration:${operation.id}`);
    }

    if (operation.action === "steam" && operation.vessel === "mixing-bowl") {
      errors.push(`steam-step-requires-varoma-or-basket:${operation.id}`);
    }

    if (!limits.supportsGuidedCooking) {
      warnings.push(`manual-confirmation-required:${operation.id}`);
    }

    return {
      id: operation.id,
      sequence: index + 1,
      title: operation.title,
      instruction: buildInstruction(operation),
      ingredients: operation.ingredients ?? [],
      vessel: operation.vessel ?? defaultVessel(operation),
      durationSeconds: operation.durationSeconds,
      temperatureCelsius: operation.temperatureCelsius,
      speed: operation.speed,
      reverse: operation.reverse,
      measuringCup:
        operation.measuringCup ?? defaultMeasuringCup(operation),
      expectedResult: operation.expectedResult,
      recoveryInstruction: operation.recoveryInstruction,
      safetyNote: operation.safetyNote,
    } satisfies ThermomixStep;
  });

  return { steps, errors, warnings };
};

const buildInstruction = (operation: RecipeOperation): string => {
  const ingredientText =
    operation.ingredients && operation.ingredients.length > 0
      ? operation.ingredients
          .map((item) => `${item.quantity} ${item.unit} ${item.label}`)
          .join(", ")
      : "";

  switch (operation.action) {
    case "add":
      return `Gib ${ingredientText} in den Mixtopf.`;
    case "chop":
      return `Gib ${ingredientText} in den Mixtopf und zerkleinere alles.`;
    case "mix":
      return `Vermische ${ingredientText || "den Inhalt"} gleichmäßig.`;
    case "heat":
      return `Erhitze ${ingredientText || "den Inhalt"} mit den angegebenen Einstellungen.`;
    case "steam":
      return `Gare ${ingredientText || "die Zutaten"} im Varoma.`;
    case "rest":
      return "Lasse den Inhalt für die angegebene Zeit ruhen.";
    case "serve":
      return "Richte das Gericht an und verteile die vorgesehenen Familienvarianten.";
  }
};

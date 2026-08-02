import type {
  CookingSession,
  MealPlanEntry,
  ThermomixModel,
  ThermomixStep,
} from "./domain";

export interface ThermomixWorkflowInput {
  entry: MealPlanEntry;
  model: ThermomixModel;
  steps: ThermomixStep[];
}

export interface WorkflowValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

const supportedTemperature = (
  model: ThermomixModel,
  temperature?: number,
): boolean => {
  if (temperature === undefined) return true;
  if (model === "unknown") return false;
  return temperature >= 37 && temperature <= 160;
};

export const validateThermomixWorkflow = (
  input: ThermomixWorkflowInput,
): WorkflowValidationResult => {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (input.model === "unknown") {
    errors.push("A concrete Thermomix model is required before execution.");
  }

  if (input.steps.length === 0) {
    errors.push("A cooking workflow must contain at least one step.");
  }

  const sequences = input.steps.map((step) => step.sequence);
  const expected = input.steps.map((_, index) => index + 1);
  if (sequences.some((value, index) => value !== expected[index])) {
    errors.push("Thermomix steps must use a continuous one-based sequence.");
  }

  for (const step of input.steps) {
    if (!step.instruction.trim()) {
      errors.push(`Step ${step.sequence} has no instruction.`);
    }
    if (!step.expectedResult.trim()) {
      errors.push(`Step ${step.sequence} has no expected result.`);
    }
    if (!supportedTemperature(input.model, step.temperatureCelsius)) {
      errors.push(
        `Step ${step.sequence} contains an unsupported or unverified temperature.`,
      );
    }
    if (
      typeof step.speed === "number" &&
      (step.speed < 0 || step.speed > 10)
    ) {
      errors.push(`Step ${step.sequence} contains an invalid speed.`);
    }
    if (step.durationSeconds !== undefined && step.durationSeconds <= 0) {
      errors.push(`Step ${step.sequence} must use a positive duration.`);
    }
    if (
      step.temperatureCelsius !== undefined &&
      step.durationSeconds === undefined
    ) {
      warnings.push(
        `Step ${step.sequence} uses heat without an explicit duration.`,
      );
    }
    if (
      step.vessel === "varoma" &&
      step.measuringCup === "inserted"
    ) {
      errors.push(
        `Step ${step.sequence} cannot use Varoma with the measuring cup inserted.`,
      );
    }
    if (
      step.temperatureCelsius !== undefined &&
      !step.safetyNote &&
      step.temperatureCelsius >= 100
    ) {
      warnings.push(
        `Step ${step.sequence} should include a safety note for high-temperature handling.`,
      );
    }
  }

  return { valid: errors.length === 0, errors, warnings };
};

export const createCookingSession = (
  input: ThermomixWorkflowInput,
): CookingSession => {
  const validation = validateThermomixWorkflow(input);
  if (!validation.valid) {
    throw new Error(
      `Invalid Thermomix workflow: ${validation.errors.join(" ")}`,
    );
  }

  if (input.entry.approvalState !== "approved") {
    throw new Error("The meal plan entry must be approved before cooking starts.");
  }

  return {
    id: `session-${input.entry.id}`,
    householdId: input.entry.householdId,
    mealPlanEntryId: input.entry.id,
    model: input.model,
    status: "planned",
    currentStep: 1,
    steps: input.steps,
  };
};

export const advanceCookingSession = (
  session: CookingSession,
  completedAt: string,
): CookingSession => {
  if (session.status === "aborted" || session.status === "completed") {
    throw new Error(`Cannot advance a ${session.status} cooking session.`);
  }

  const finalStep = session.currentStep >= session.steps.length;
  if (finalStep) {
    return {
      ...session,
      status: "completed",
      completedAt,
    };
  }

  return {
    ...session,
    status: "active",
    currentStep: session.currentStep + 1,
  };
};

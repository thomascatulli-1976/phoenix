import type { CookingSession, ThermomixStep } from "./domain";

export interface SessionTransitionResult {
  session: CookingSession;
  errors: string[];
}

export const startCookingSession = (
  session: CookingSession,
  startedAt: string,
): SessionTransitionResult => {
  if (session.status !== "planned") {
    return { session, errors: ["session-must-be-planned-to-start"] };
  }
  if (session.steps.length === 0) {
    return { session, errors: ["session-requires-at-least-one-step"] };
  }

  return {
    session: { ...session, status: "active", currentStep: 1, startedAt },
    errors: [],
  };
};

export const pauseCookingSession = (
  session: CookingSession,
): SessionTransitionResult =>
  session.status === "active"
    ? { session: { ...session, status: "paused" }, errors: [] }
    : { session, errors: ["only-active-session-can-be-paused"] };

export const resumeCookingSession = (
  session: CookingSession,
): SessionTransitionResult =>
  session.status === "paused"
    ? { session: { ...session, status: "active" }, errors: [] }
    : { session, errors: ["only-paused-session-can-be-resumed"] };

export const completeCurrentStep = (
  session: CookingSession,
  completedAt: string,
): SessionTransitionResult => {
  if (session.status !== "active") {
    return { session, errors: ["session-must-be-active"] };
  }

  if (session.currentStep < 1 || session.currentStep > session.steps.length) {
    return { session, errors: ["current-step-out-of-range"] };
  }

  if (session.currentStep === session.steps.length) {
    return {
      session: { ...session, status: "completed", completedAt },
      errors: [],
    };
  }

  return {
    session: { ...session, currentStep: session.currentStep + 1 },
    errors: [],
  };
};

export const abortCookingSession = (
  session: CookingSession,
  completedAt: string,
): SessionTransitionResult => {
  if (session.status === "completed" || session.status === "aborted") {
    return { session, errors: ["session-is-already-terminal"] };
  }

  return {
    session: { ...session, status: "aborted", completedAt },
    errors: [],
  };
};

export const currentThermomixStep = (
  session: CookingSession,
): ThermomixStep | undefined =>
  session.status === "active" || session.status === "paused"
    ? session.steps[session.currentStep - 1]
    : undefined;

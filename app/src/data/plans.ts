import trainingPlanJson from "./training-plan.json";
import type { TrainingPlan } from "../types";

export const trainingPlan = trainingPlanJson as unknown as TrainingPlan;

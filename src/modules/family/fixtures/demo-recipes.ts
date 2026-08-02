import type { RecipeDefinition } from "../cooking/compiler";
import type { RecipeCandidate } from "../cooking/planning";

export const mildVegetableSoupCandidate: RecipeCandidate = {
  id: "recipe-mild-vegetable-soup",
  title: "Milde Gemüsecremesuppe",
  estimatedMinutes: 30,
  tags: ["vegetarian", "family", "thermomix", "mild"],
  ingredients: [
    { ingredientId: "potato", label: "Kartoffeln", quantity: 500, unit: "g", preparation: "geschält und geviertelt" },
    { ingredientId: "carrot", label: "Karotten", quantity: 300, unit: "g", preparation: "in Stücken" },
    { ingredientId: "zucchini", label: "Zucchini", quantity: 250, unit: "g", preparation: "in Stücken" },
    { ingredientId: "water", label: "Wasser", quantity: 700, unit: "ml" },
    { ingredientId: "cream-cheese", label: "Frischkäse", quantity: 100, unit: "g" },
  ],
};

export const mildVegetableSoupRecipe: RecipeDefinition = {
  id: mildVegetableSoupCandidate.id,
  title: mildVegetableSoupCandidate.title,
  supportedModels: ["TM5", "TM6", "TM7"],
  operations: [
    {
      id: "step-add-vegetables",
      title: "Gemüse einfüllen",
      action: "add",
      ingredients: mildVegetableSoupCandidate.ingredients.slice(0, 3),
      expectedResult: "Das vorbereitete Gemüse befindet sich vollständig im Mixtopf.",
    },
    {
      id: "step-chop-vegetables",
      title: "Gemüse zerkleinern",
      action: "chop",
      durationSeconds: 5,
      speed: 5,
      expectedResult: "Das Gemüse ist gleichmäßig grob zerkleinert.",
      recoveryInstruction: "Mit dem Spatel nach unten schieben und weitere 2 Sekunden auf Stufe 5 zerkleinern.",
    },
    {
      id: "step-add-water",
      title: "Wasser hinzufügen",
      action: "add",
      ingredients: [mildVegetableSoupCandidate.ingredients[3]],
      expectedResult: "Das Gemüse ist mit Wasser bedeckt.",
    },
    {
      id: "step-cook",
      title: "Suppe garen",
      action: "heat",
      durationSeconds: 1200,
      temperatureCelsius: 100,
      speed: "spoon",
      expectedResult: "Das Gemüse ist vollständig weich gegart.",
      safetyNote: "Beim Öffnen nach dem Garen Abstand zum aufsteigenden Dampf halten.",
    },
    {
      id: "step-add-cream-cheese",
      title: "Frischkäse ergänzen",
      action: "add",
      ingredients: [mildVegetableSoupCandidate.ingredients[4]],
      expectedResult: "Der Frischkäse liegt auf dem gegarten Gemüse.",
    },
    {
      id: "step-blend",
      title: "Suppe pürieren",
      action: "mix",
      durationSeconds: 45,
      speed: 8,
      expectedResult: "Die Suppe ist glatt und cremig.",
      recoveryInstruction: "Weitere 15 Sekunden auf Stufe 8 pürieren.",
      safetyNote: "Heiße Flüssigkeit nur mit eingesetztem Messbecher pürieren.",
    },
    {
      id: "step-serve",
      title: "Familienvarianten anrichten",
      action: "serve",
      expectedResult: "Die gemeinsame Basis ist portioniert und die vorgesehenen Varianten sind ergänzt.",
    },
  ],
};

export const demoRecipeCandidates: RecipeCandidate[] = [
  mildVegetableSoupCandidate,
  {
    id: "recipe-meat-potato-stew",
    title: "Fleisch-Kartoffel-Eintopf",
    estimatedMinutes: 45,
    tags: ["thermomix"],
    ingredients: [
      { ingredientId: "meat", label: "Fleisch", quantity: 400, unit: "g" },
      { ingredientId: "potato", label: "Kartoffeln", quantity: 600, unit: "g" },
    ],
  },
];

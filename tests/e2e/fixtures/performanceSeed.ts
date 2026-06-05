type IngredientUnit = 'g' | 'kg' | 'ml';
type PreservationCondition = 'room_temperature' | 'cool_dry' | 'fridge' | 'freezer';

type PerfIngredient = {
  id: string;
  name: string;
  category?: string;
  shelfLife?: 'very_short' | 'short' | 'medium' | 'long' | 'very_long';
  preservationCondition?: PreservationCondition;
  alwaysAvailable?: boolean;
  baseUnit?: IngredientUnit;
  inventoryUnits?: IngredientUnit[];
  recipeUnitConversions?: Partial<Record<IngredientUnit, number>>;
  priceEstimate?: {
    min: number;
    max: number;
    amount: number;
    unit: IngredientUnit;
    currency: 'VND';
  };
};

type PerfDishIngredient = {
  ingredientId: string;
  unit: IngredientUnit;
  amount: string;
  dishesId: string;
  required: boolean;
  prepare?: string[];
  dish?: {
    id: string;
    name: string;
    baseServings?: number;
    targetServings?: number;
  };
};

type PerfDish = {
  id: string;
  name: string;
  baseServings: number;
  ingredients: PerfDishIngredient[];
  note: string;
  includeDishes: string[];
  steps: Array<{ id: string; content: string; order: number; isDone: boolean; required: boolean }>;
  isCompleted: boolean;
  duration: { unfreeze: number; prepare: number; cooking: number; serve: number; cooldown: number };
  image?: string;
  tags?: string[];
};

type PerfSeed = {
  shared: {
    ingredient: { ingredients: PerfIngredient[] };
    dishes: { dishes: PerfDish[]; searchText: string; currentPage: number };
  };
  personal: {
    appContext: { loading: boolean; currentFeatureName: string };
    inventory: { items: Record<string, unknown> };
    shoppingList: { shoppingLists: Array<Record<string, unknown>> };
    scheduledMeal: { scheduledMeals: Array<Record<string, unknown>>; selectedMeals: string[] };
    cookingSession: { sessions: Array<Record<string, unknown>> };
  };
};

export const PERFORMANCE_DATASET_SIZES = {
  daily: { ingredients: 200, dishes: 150, shoppingLists: 100 },
  stress: { ingredients: 1000, dishes: 750, shoppingLists: 500 },
} as const;

export type PerformanceDatasetName = keyof typeof PERFORMANCE_DATASET_SIZES;

const BASE_DATE = new Date('2026-06-05T12:00:00.000Z');
const MASS_CONVERSIONS = { g: 1, kg: 1000 } as const;
const VOLUME_CONVERSIONS = { ml: 1 } as const;

const formatNumber = (index: number) => String(index + 1).padStart(4, '0');
const dateOffset = (days: number): string => {
  const date = new Date(BASE_DATE);
  date.setDate(date.getDate() + days);
  return date.toISOString();
};

const ingredientId = (dataset: PerformanceDatasetName, index: number) => `perf-${dataset}-ing-${formatNumber(index)}`;
const dishId = (dataset: PerformanceDatasetName, index: number) => `perf-${dataset}-dish-${formatNumber(index)}`;
const shoppingListId = (dataset: PerformanceDatasetName, index: number) => `perf-${dataset}-sl-${formatNumber(index)}`;
const scheduledMealId = (dataset: PerformanceDatasetName, index: number) => `perf-${dataset}-meal-${formatNumber(index)}`;

const ingredientUnit = (index: number): IngredientUnit => (index % 5 === 0 ? 'ml' : 'g');

const createIngredients = (dataset: PerformanceDatasetName): PerfIngredient[] => {
  const size = PERFORMANCE_DATASET_SIZES[dataset].ingredients;

  return Array.from({ length: size }, (_, index) => {
    const unit = ingredientUnit(index);
    const isLiquid = unit === 'ml';
    const number = formatNumber(index);

    return {
      id: ingredientId(dataset, index),
      name: `Perf ${dataset} ingredient ${number}`,
      category: isLiquid ? 'Perf liquid' : index % 3 === 0 ? 'Perf protein' : 'Perf pantry',
      shelfLife: index % 17 === 0 ? 'short' : index % 7 === 0 ? 'medium' : 'very_long',
      preservationCondition: index % 17 === 0 ? 'fridge' : index % 11 === 0 ? 'freezer' : 'cool_dry',
      alwaysAvailable: index % 29 === 0,
      baseUnit: unit,
      inventoryUnits: isLiquid ? ['ml'] : ['g', 'kg'],
      recipeUnitConversions: isLiquid ? VOLUME_CONVERSIONS : MASS_CONVERSIONS,
      priceEstimate: {
        min: 2_000 + (index % 25) * 1_000,
        max: 4_000 + (index % 25) * 1_200,
        amount: isLiquid ? 1000 : 100,
        unit,
        currency: 'VND',
      },
    };
  });
};

const imageForDish = (dataset: PerformanceDatasetName, index: number): string | undefined => {
  if (index % 25 === 0) return `https://images.unsplash.com/photo-${1500000000000 + index}?auto=format&fit=crop&w=320&q=60`;
  if (index % 25 === 1) return 'data:image/gif;base64,R0lGODlhAQABAAAAACw=';
  if (index % 25 === 2) return `/my-recipes/perf-${dataset}-local-image-${formatNumber(index)}.png`;
  return undefined;
};

const createDishIngredient = (
  dataset: PerformanceDatasetName,
  dishIndex: number,
  ingredientIndex: number,
  amountIndex: number,
  dishName: string,
): PerfDishIngredient => {
  const unit = ingredientUnit(ingredientIndex);

  return {
    ingredientId: ingredientId(dataset, ingredientIndex),
    unit,
    amount: String(unit === 'ml' ? 50 + amountIndex * 25 : 10 + amountIndex * 5),
    dishesId: dishId(dataset, dishIndex),
    required: amountIndex !== 3,
    prepare: amountIndex === 0 ? ['Cut'] : undefined,
    dish: {
      id: dishId(dataset, dishIndex),
      name: dishName,
      baseServings: 2,
      targetServings: 2,
    },
  };
};

const createDishes = (dataset: PerformanceDatasetName): PerfDish[] => {
  const sizes = PERFORMANCE_DATASET_SIZES[dataset];

  return Array.from({ length: sizes.dishes }, (_, index) => {
    const number = formatNumber(index);
    const name = `Perf ${dataset} dish ${number}`;
    const ingredientIndexes = [0, 1, 2, 3].map(offset => (index * 3 + offset * 13) % sizes.ingredients);

    return {
      id: dishId(dataset, index),
      name,
      baseServings: 2,
      ingredients: ingredientIndexes.map((ingredientIndex, amountIndex) =>
        createDishIngredient(dataset, index, ingredientIndex, amountIndex, name),
      ),
      note: `Generated ${dataset} performance dish ${number}.`,
      includeDishes: index > 0 && index % 10 === 0 ? [dishId(dataset, index - 1)] : [],
      steps: [
        { id: `${dishId(dataset, index)}-step-1`, content: 'Prepare ingredients.', order: 1, isDone: false, required: true },
        { id: `${dishId(dataset, index)}-step-2`, content: 'Cook and serve.', order: 2, isDone: false, required: true },
      ],
      isCompleted: true,
      duration: { unfreeze: 0, prepare: 10 + (index % 12), cooking: 15 + (index % 25), serve: 5, cooldown: 0 },
      image: imageForDish(dataset, index),
      tags: [index % 2 === 0 ? 'Main' : 'Side'],
    };
  });
};

const createInventory = (dataset: PerformanceDatasetName, ingredients: PerfIngredient[]) => {
  return ingredients.reduce<Record<string, unknown>>((items, ingredient, index) => {
    if (index % 3 !== 0) return items;
    const unit = ingredient.baseUnit ?? 'g';

    items[ingredient.id] = {
      unit,
      lastUpdated: dateOffset(-1),
      batches: [
        {
          id: `${ingredient.id}-batch-1`,
          amount: unit === 'ml' ? 500 + (index % 5) * 100 : 100 + (index % 8) * 25,
          unit,
          purchasedAt: dateOffset(-3 - (index % 5)),
          expiresAt: index % 12 === 0 ? dateOffset(-1) : dateOffset(3 + (index % 10)),
          preservationCondition: ingredient.preservationCondition,
        },
        {
          id: `${ingredient.id}-batch-2`,
          amount: unit === 'ml' ? 250 : 50,
          unit,
          purchasedAt: dateOffset(-1),
          expiresAt: dateOffset(7 + (index % 9)),
          preservationCondition: ingredient.preservationCondition,
        },
      ],
    };

    return items;
  }, {});
};

const createScheduledMeals = (dataset: PerformanceDatasetName) => {
  const sizes = PERFORMANCE_DATASET_SIZES[dataset];

  return Array.from({ length: sizes.shoppingLists }, (_, index) => ({
    id: scheduledMealId(dataset, index),
    name: `Perf ${dataset} meal ${formatNumber(index)}`,
    plannedDate: dateOffset(index % 21),
    meals: {
      breakfast: [dishId(dataset, index % sizes.dishes)],
      lunch: [dishId(dataset, (index + 17) % sizes.dishes)],
      dinner: [dishId(dataset, (index + 37) % sizes.dishes)],
    },
    createdDate: dateOffset(-2),
  }));
};

const pushAmount = (
  groups: Map<string, Array<Record<string, unknown>>>,
  dataset: PerformanceDatasetName,
  shoppingListIndex: number,
  dish: PerfDish,
  amount: PerfDishIngredient,
) => {
  const items = groups.get(amount.ingredientId) ?? [];
  items.push({
    ...amount,
    id: `${shoppingListId(dataset, shoppingListIndex)}-${amount.ingredientId}-${items.length}`,
    isDone: shoppingListIndex % 5 === 0,
    dish: {
      id: dish.id,
      name: dish.name,
      baseServings: dish.baseServings,
      targetServings: 2,
    },
  });
  groups.set(amount.ingredientId, items);
};

const createShoppingLists = (
  dataset: PerformanceDatasetName,
  dishes: PerfDish[],
  scheduledMeals: Array<Record<string, any>>,
) => {
  const sizes = PERFORMANCE_DATASET_SIZES[dataset];

  return Array.from({ length: sizes.shoppingLists }, (_, index) => {
    const id = shoppingListId(dataset, index);
    const directDishes = [0, 1, 2].map(offset => dishId(dataset, (index * 5 + offset * 11) % sizes.dishes));
    const meal = scheduledMeals[index];
    const mealDishes = [...meal.meals.breakfast, ...meal.meals.lunch, ...meal.meals.dinner];
    const selectedDishIds = [...directDishes, ...mealDishes];
    const groups = new Map<string, Array<Record<string, unknown>>>();

    selectedDishIds.forEach(selectedId => {
      const dish = dishes.find(item => item.id === selectedId);
      dish?.ingredients.forEach(amount => pushAmount(groups, dataset, index, dish, amount));
    });

    const ingredients = Array.from(groups.entries()).map(([groupIngredientId, amounts], groupIndex) => ({
      id: `${id}-group-${groupIngredientId}`,
      ingredientId: groupIngredientId,
      amounts,
      isDone: groupIndex % 7 === 0,
      boughtAmount: groupIndex % 9 === 0 ? 25 + groupIndex : undefined,
      boughtUnit: groupIndex % 9 === 0 ? amounts[0]?.unit : undefined,
    }));

    return {
      id,
      name: `Perf ${dataset} shopping list ${formatNumber(index)}`,
      dishes: directDishes,
      dishServings: Object.fromEntries(directDishes.map(directDishId => [directDishId, 2 + (index % 3)])),
      ingredients,
      scheduledMeals: [meal.id],
      createdDate: dateOffset(-1 - (index % 14)),
      plannedDate: dateOffset(index % 21),
    };
  });
};

const createCookingSessions = (dataset: PerformanceDatasetName, dishes: PerfDish[]) => {
  const count = Math.min(dataset === 'stress' ? 80 : 30, dishes.length);

  return Array.from({ length: count }, (_, index) => {
    const dish = dishes[(index * 7) % dishes.length];

    return {
      id: `perf-${dataset}-session-${formatNumber(index)}`,
      dishId: dish.id,
      dishName: dish.name,
      baseServings: dish.baseServings,
      targetServings: 2 + (index % 3),
      startedAt: dateOffset(-index % 10),
      finishedAt: index % 3 === 0 ? dateOffset((-index % 10) + 1) : undefined,
      status: index % 3 === 0 ? 'finished' : 'cooking',
      steps: dish.steps.map(step => step.content),
      currentStepIndex: index % dish.steps.length,
    };
  });
};

export const createPerformanceSeed = (datasetName: PerformanceDatasetName): PerfSeed => {
  const ingredients = createIngredients(datasetName);
  const dishes = createDishes(datasetName);
  const scheduledMeals = createScheduledMeals(datasetName);
  const shoppingLists = createShoppingLists(datasetName, dishes, scheduledMeals);

  return {
    shared: {
      ingredient: { ingredients },
      dishes: { dishes, searchText: '', currentPage: 1 },
    },
    personal: {
      appContext: { loading: false, currentFeatureName: '' },
      inventory: { items: createInventory(datasetName, ingredients) },
      shoppingList: { shoppingLists },
      scheduledMeal: { scheduledMeals, selectedMeals: [] },
      cookingSession: { sessions: createCookingSessions(datasetName, dishes) },
    },
  };
};

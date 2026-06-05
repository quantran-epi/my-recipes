type IngredientUnit = 'g' | 'kg' | 'ml';
type PreservationCondition = 'room_temperature' | 'cool_dry' | 'fridge' | 'freezer';

type TestIngredient = {
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

type TestDishIngredient = {
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
  id?: string;
  isDone?: boolean;
};

type TestDish = {
  id: string;
  name: string;
  baseServings: number;
  ingredients: TestDishIngredient[];
  note: string;
  includeDishes: string[];
  steps: Array<{ id: string; content: string; order: number; isDone: boolean; required: boolean }>;
  isCompleted: boolean;
  duration: { unfreeze: number; prepare: number; cooking: number; serve: number; cooldown: number };
  image?: string;
  tags?: string[];
};

export const TEST_IDS = {
  ingredients: {
    chicken: 'ing-chicken',
    rice: 'ing-rice',
    water: 'ing-water',
    salt: 'ing-salt',
    sauce: 'ing-sauce',
    expired: 'ing-expired',
    scrollLast: 'ing-scroll-12',
    pagedLast: 'ing-scroll-52',
  },
  dishes: {
    comGa: 'dish-com-ga',
    salad: 'dish-salad-ga',
    waterSoup: 'dish-water-soup',
  },
  shoppingLists: {
    regression: 'sl-regression',
  },
  scheduledMeals: {
    today: 'meal-today-regression',
  },
} as const;

const todayAtNoon = (offsetDays = 0): string => {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() + offsetDays);
  return date.toISOString();
};

const massConversions = { g: 1, kg: 1000 } as const;
const volumeConversions = { ml: 1 } as const;

const scrollIngredients: TestIngredient[] = Array.from({ length: 52 }, (_, index) => {
  const number = String(index + 1).padStart(2, '0');
  return {
    id: `ing-scroll-${number}`,
    name: `Scroll regression ingredient ${number}`,
    category: 'Regression scroll',
    alwaysAvailable: true,
    shelfLife: 'very_long',
    preservationCondition: 'room_temperature',
    baseUnit: 'g',
    inventoryUnits: ['g'],
    recipeUnitConversions: { g: 1 },
  };
});

const ingredients: TestIngredient[] = [
  {
    id: TEST_IDS.ingredients.chicken,
    name: 'Ga regression thit dui',
    category: 'Regression protein',
    shelfLife: 'short',
    preservationCondition: 'fridge',
    baseUnit: 'g',
    inventoryUnits: ['g', 'kg'],
    recipeUnitConversions: massConversions,
    priceEstimate: { min: 80_000, max: 100_000, amount: 1000, unit: 'g', currency: 'VND' },
  },
  {
    id: TEST_IDS.ingredients.rice,
    name: 'Gao regression jasmine',
    category: 'Regression pantry',
    shelfLife: 'very_long',
    preservationCondition: 'cool_dry',
    baseUnit: 'g',
    inventoryUnits: ['g', 'kg'],
    recipeUnitConversions: massConversions,
    priceEstimate: { min: 20_000, max: 30_000, amount: 1000, unit: 'g', currency: 'VND' },
  },
  {
    id: TEST_IDS.ingredients.water,
    name: 'Nuoc regression always available',
    category: 'Regression pantry',
    alwaysAvailable: true,
    shelfLife: 'very_long',
    preservationCondition: 'room_temperature',
    baseUnit: 'ml',
    inventoryUnits: ['ml'],
    recipeUnitConversions: volumeConversions,
  },
  {
    id: TEST_IDS.ingredients.salt,
    name: 'Muoi regression',
    category: 'Regression pantry',
    shelfLife: 'very_long',
    preservationCondition: 'cool_dry',
    baseUnit: 'g',
    inventoryUnits: ['g'],
    recipeUnitConversions: { g: 1 },
    priceEstimate: { min: 1_000, max: 2_000, amount: 100, unit: 'g', currency: 'VND' },
  },
  {
    id: TEST_IDS.ingredients.sauce,
    name: 'Tuong ot regression',
    category: 'Regression pantry',
    shelfLife: 'very_long',
    preservationCondition: 'cool_dry',
    baseUnit: 'g',
    inventoryUnits: ['g'],
    recipeUnitConversions: { g: 1 },
    priceEstimate: { min: 15_000, max: 25_000, amount: 250, unit: 'g', currency: 'VND' },
  },
  {
    id: TEST_IDS.ingredients.expired,
    name: 'Sua chua expired regression',
    category: 'Regression dairy',
    shelfLife: 'short',
    preservationCondition: 'fridge',
    baseUnit: 'g',
    inventoryUnits: ['g'],
    recipeUnitConversions: { g: 1 },
    priceEstimate: { min: 8_000, max: 12_000, amount: 100, unit: 'g', currency: 'VND' },
  },
  ...scrollIngredients,
];

const dishIngredient = (
  dishId: string,
  ingredientId: string,
  amount: string,
  unit: IngredientUnit,
  required = true,
): TestDishIngredient => ({ ingredientId, amount, unit, dishesId: dishId, required });

const checklistScrollIngredients = scrollIngredients.slice(0, 12);

const scrollDishIngredients = checklistScrollIngredients.map(item =>
  dishIngredient(TEST_IDS.dishes.comGa, item.id, '1', 'g', false),
);

const dishes: TestDish[] = [
  {
    id: TEST_IDS.dishes.comGa,
    name: 'Com ga regression',
    baseServings: 2,
    ingredients: [
      dishIngredient(TEST_IDS.dishes.comGa, TEST_IDS.ingredients.chicken, '500', 'g'),
      dishIngredient(TEST_IDS.dishes.comGa, TEST_IDS.ingredients.rice, '200', 'g'),
      dishIngredient(TEST_IDS.dishes.comGa, TEST_IDS.ingredients.water, '300', 'ml'),
      dishIngredient(TEST_IDS.dishes.comGa, TEST_IDS.ingredients.salt, '5', 'g'),
      dishIngredient(TEST_IDS.dishes.comGa, TEST_IDS.ingredients.sauce, '100', 'g', false),
      ...scrollDishIngredients,
    ],
    note: 'Seed dish for regression tests.',
    includeDishes: [],
    steps: [
      { id: 'step-com-ga-1', content: 'So che ga va uop gia vi.', order: 1, isDone: false, required: true },
      { id: 'step-com-ga-2', content: 'Nau com va ap chao ga den khi chin.', order: 2, isDone: false, required: true },
    ],
    isCompleted: true,
    duration: { unfreeze: 0, prepare: 15, cooking: 30, serve: 5, cooldown: 0 },
    image: 'https://images.unsplash.com/photo-1603133872878-684f208fb84b',
    tags: ['Mon chinh'],
  },
  {
    id: TEST_IDS.dishes.salad,
    name: 'Goi ga regression',
    baseServings: 2,
    ingredients: [dishIngredient(TEST_IDS.dishes.salad, TEST_IDS.ingredients.chicken, '200', 'g')],
    note: 'Second dish sharing chicken to test grouped shopping-list amounts.',
    includeDishes: [],
    steps: [{ id: 'step-goi-ga-1', content: 'Tron ga voi rau va sot.', order: 1, isDone: false, required: true }],
    isCompleted: true,
    duration: { unfreeze: 0, prepare: 10, cooking: 0, serve: 5, cooldown: 0 },
    image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c',
    tags: ['Salad'],
  },
  {
    id: TEST_IDS.dishes.waterSoup,
    name: 'Canh nuoc regression',
    baseServings: 2,
    ingredients: [dishIngredient(TEST_IDS.dishes.waterSoup, TEST_IDS.ingredients.water, '500', 'ml')],
    note: 'Always-available ingredient coverage seed.',
    includeDishes: [],
    steps: [{ id: 'step-water-1', content: 'Dun soi nuoc.', order: 1, isDone: false, required: true }],
    isCompleted: true,
    duration: { unfreeze: 0, prepare: 0, cooking: 5, serve: 0, cooldown: 0 },
    image: 'https://images.unsplash.com/photo-1547592180-85f173990554',
    tags: ['Canh'],
  },
];

const amountForGroup = (
  ingredientId: string,
  dishId: string,
  dishName: string,
  amount: string,
  unit: IngredientUnit,
  isDone: boolean,
  required = true,
) => ({
  id: `${TEST_IDS.shoppingLists.regression}-${ingredientId}-${dishId}`,
  ingredientId,
  unit,
  amount,
  dishesId: dishId,
  required,
  isDone,
  dish: { id: dishId, name: dishName, baseServings: 2, targetServings: 2 },
});

const group = (
  ingredientId: string,
  amounts: ReturnType<typeof amountForGroup>[],
  isDone: boolean,
  boughtAmount?: number,
  boughtUnit?: IngredientUnit,
) => ({
  id: `${TEST_IDS.shoppingLists.regression}-group-${ingredientId}`,
  ingredientId,
  amounts,
  isDone,
  boughtAmount,
  boughtUnit,
});

const scrollShoppingGroups = checklistScrollIngredients.map(item => group(
  item.id,
  [amountForGroup(item.id, TEST_IDS.dishes.comGa, 'Com ga regression', '1', 'g', true, false)],
  true,
));

const shoppingList = {
  id: TEST_IDS.shoppingLists.regression,
  name: 'Regression shopping list',
  dishes: [TEST_IDS.dishes.comGa, TEST_IDS.dishes.salad],
  dishServings: {
    [TEST_IDS.dishes.comGa]: 2,
    [TEST_IDS.dishes.salad]: 2,
  },
  ingredients: [
    group(TEST_IDS.ingredients.chicken, [
      amountForGroup(TEST_IDS.ingredients.chicken, TEST_IDS.dishes.comGa, 'Com ga regression', '500', 'g', false),
      amountForGroup(TEST_IDS.ingredients.chicken, TEST_IDS.dishes.salad, 'Goi ga regression', '200', 'g', false),
    ], false, 200, 'g'),
    group(TEST_IDS.ingredients.rice, [
      amountForGroup(TEST_IDS.ingredients.rice, TEST_IDS.dishes.comGa, 'Com ga regression', '200', 'g', false),
    ], false),
    group(TEST_IDS.ingredients.water, [
      amountForGroup(TEST_IDS.ingredients.water, TEST_IDS.dishes.comGa, 'Com ga regression', '300', 'ml', true),
    ], true),
    group(TEST_IDS.ingredients.salt, [
      amountForGroup(TEST_IDS.ingredients.salt, TEST_IDS.dishes.comGa, 'Com ga regression', '5', 'g', true),
    ], true),
    group(TEST_IDS.ingredients.sauce, [
      amountForGroup(TEST_IDS.ingredients.sauce, TEST_IDS.dishes.comGa, 'Com ga regression', '100', 'g', false, false),
    ], false),
    ...scrollShoppingGroups,
  ],
  scheduledMeals: [TEST_IDS.scheduledMeals.today],
  createdDate: todayAtNoon(-1),
  plannedDate: todayAtNoon(0),
};

export const createRegressionSeed = () => {
  const today = todayAtNoon(0);

  return {
    shared: {
      ingredient: { ingredients },
      dishes: { dishes, searchText: '', currentPage: 1 },
    },
    personal: {
      appContext: { loading: false, currentFeatureName: '' },
      inventory: {
        items: {
          [TEST_IDS.ingredients.chicken]: {
            unit: 'g',
            lastUpdated: today,
            batches: [{ id: 'batch-chicken-100g', amount: 100, unit: 'g', purchasedAt: todayAtNoon(-1), expiresAt: todayAtNoon(3), preservationCondition: 'fridge' }],
          },
          [TEST_IDS.ingredients.salt]: {
            unit: 'g',
            lastUpdated: today,
            batches: [{ id: 'batch-salt-100g', amount: 100, unit: 'g', purchasedAt: todayAtNoon(-30), preservationCondition: 'cool_dry' }],
          },
          [TEST_IDS.ingredients.expired]: {
            unit: 'g',
            lastUpdated: today,
            batches: [{ id: 'batch-expired-yogurt', amount: 100, unit: 'g', purchasedAt: todayAtNoon(-5), expiresAt: todayAtNoon(-1), preservationCondition: 'fridge' }],
          },
        },
      },
      shoppingList: { shoppingLists: [shoppingList] },
      scheduledMeal: {
        scheduledMeals: [{
          id: TEST_IDS.scheduledMeals.today,
          name: 'Regression meal today',
          plannedDate: today,
          meals: { breakfast: [], lunch: [TEST_IDS.dishes.comGa], dinner: [] },
          createdDate: todayAtNoon(-1),
        }],
        selectedMeals: [],
      },
      cookingSession: { sessions: [] },
    },
  };
};

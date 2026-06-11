import { combineReducers, configureStore } from '@reduxjs/toolkit';
import React from 'react';
import { Provider } from 'react-redux';
import { useLocation, useNavigate } from 'react-router-dom';
import { Box } from '@components/Layout/Box';
import { DashboardScreen } from './Dashboard.screen';
import { IngredientListScreen } from '@modules/Ingredient/Screens/IngredientList.screen';
import { DishesListScreen } from '@modules/Dishes/Screens/DishesList.screen';
import { DishSuggesterScreen } from '@modules/DishSuggester/Screens/DishSuggester.screen';
import { ShoppingListScreen } from '@modules/ShoppingList/Screens/ShoppingList.screen';
import { ScheduledMealListScreen } from '@modules/ScheduledMeal/Screens/ScheduledMealList.screen';
import IngredientReducer from '@store/Reducers/IngredientReducer';
import DishesReducer from '@store/Reducers/DishesReducer';
import SharedConfigReducer from '@store/Reducers/SharedConfigReducer';
import AppContextReducer from '@store/Reducers/AppContextReducer';
import InventoryReducer from '@store/Reducers/InventoryReducer';
import ShoppingListReducer from '@store/Reducers/ShoppingListReducer';
import ScheduledMealReducer from '@store/Reducers/ScheduledMealReducer';
import CookingSessionReducer from '@store/Reducers/CookingSessionReducer';
import HouseholdHealthReducer from '@store/Reducers/HouseholdHealthReducer';
import { Dishes } from '@store/Models/Dishes';
import { Ingredient, IngredientInventory } from '@store/Models/Ingredient';
import { ScheduledMeal } from '@store/Models/ScheduledMeal';
import { ShoppingList } from '@store/Models/ShoppingList';
import { DEFAULT_SHARED_CONFIG } from '@store/Models/SharedConfig';
import { CookingSession } from '@store/Models/CookingSession';
import { WeeklyMealTemplate, ShoppingListTemplate } from '@store/Reducers/AppContextReducer';

export type GuidePreviewScreenKey = 'dashboard' | 'inventory' | 'dishes' | 'suggestions' | 'shopping' | 'meals';

const sharedReducer = combineReducers({
    ingredient: IngredientReducer,
    dishes: DishesReducer,
    config: SharedConfigReducer,
});

const personalReducer = combineReducers({
    appContext: AppContextReducer,
    inventory: InventoryReducer,
    shoppingList: ShoppingListReducer,
    scheduledMeal: ScheduledMealReducer,
    cookingSession: CookingSessionReducer,
    householdHealth: HouseholdHealthReducer,
});

const rootReducer = combineReducers({
    shared: sharedReducer,
    personal: personalReducer,
});

type GuidePreviewState = ReturnType<typeof rootReducer>;

const dateAt = (dayOffset: number, hour = 8) => {
    const value = new Date();
    value.setHours(hour, 0, 0, 0);
    value.setDate(value.getDate() + dayOffset);
    return value;
};

const purchasedAt = (dayOffset: number) => dateAt(dayOffset, 7).toISOString();
const expiresAt = (dayOffset: number) => dateAt(dayOffset, 20).toISOString();

const INGREDIENTS: Ingredient[] = [
    {
        id: 'guide-chicken',
        name: 'Ức gà phi lê',
        category: 'Thịt',
        shelfLife: 'short',
        preservationCondition: 'fridge',
        baseUnit: 'g',
        inventoryUnits: ['g', 'kg'],
        priceEstimate: { min: 28000, max: 36000, amount: 500, unit: 'g', currency: 'VND' },
        nutrition: { amount: 100, unit: 'g', calories: 165, protein: 31, carbs: 0, fat: 3.6, fiber: 0, sodium: 74 },
    },
    {
        id: 'guide-rice',
        name: 'Gạo jasmine',
        category: 'Tinh bột',
        shelfLife: 'very_long',
        preservationCondition: 'cool_dry',
        baseUnit: 'g',
        inventoryUnits: ['g', 'kg'],
        priceEstimate: { min: 18000, max: 26000, amount: 1000, unit: 'g', currency: 'VND' },
        nutrition: { amount: 100, unit: 'g', calories: 130, protein: 2.7, carbs: 28, fat: 0.3, fiber: 0.4 },
    },
    {
        id: 'guide-greens',
        name: 'Rau cải xanh',
        category: 'Rau củ',
        shelfLife: 'very_short',
        preservationCondition: 'fridge',
        baseUnit: 'g',
        inventoryUnits: ['g'],
        priceEstimate: { min: 9000, max: 14000, amount: 300, unit: 'g', currency: 'VND' },
        nutrition: { amount: 100, unit: 'g', calories: 22, protein: 1.7, carbs: 3.8, fat: 0.2, fiber: 2.8, vitaminC: 45 },
    },
    {
        id: 'guide-egg',
        name: 'Trứng gà',
        category: 'Sữa & trứng',
        shelfLife: 'medium',
        preservationCondition: 'fridge',
        baseUnit: 'quả',
        inventoryUnits: ['quả'],
        priceEstimate: { min: 30000, max: 38000, amount: 10, unit: 'quả', currency: 'VND' },
        nutrition: { amount: 1, unit: 'quả', calories: 70, protein: 6, carbs: 0.6, fat: 5, fiber: 0 },
    },
    {
        id: 'guide-tofu',
        name: 'Đậu hũ non',
        category: 'Đồ hộp',
        shelfLife: 'short',
        preservationCondition: 'fridge',
        baseUnit: 'g',
        inventoryUnits: ['g', 'thanh'],
        recipeUnitConversions: { g: 1, thanh: 250 },
        priceEstimate: { min: 8000, max: 12000, amount: 1, unit: 'thanh', currency: 'VND' },
        nutrition: { amount: 100, unit: 'g', calories: 76, protein: 8, carbs: 1.9, fat: 4.8, fiber: 0.3, calcium: 350 },
    },
    {
        id: 'guide-oat',
        name: 'Yến mạch cán dẹt',
        category: 'Tinh bột',
        shelfLife: 'very_long',
        preservationCondition: 'cool_dry',
        baseUnit: 'g',
        inventoryUnits: ['g', 'kg'],
        priceEstimate: { min: 45000, max: 65000, amount: 500, unit: 'g', currency: 'VND' },
        nutrition: { amount: 100, unit: 'g', calories: 389, protein: 16.9, carbs: 66.3, fat: 6.9, fiber: 10.6 },
    },
    {
        id: 'guide-milk',
        name: 'Sữa tươi không đường',
        category: 'Sữa & trứng',
        shelfLife: 'short',
        preservationCondition: 'fridge',
        baseUnit: 'ml',
        inventoryUnits: ['ml', 'lít'],
        priceEstimate: { min: 32000, max: 42000, amount: 1, unit: 'lít', currency: 'VND' },
        nutrition: { amount: 100, unit: 'ml', calories: 62, protein: 3.2, carbs: 4.8, fat: 3.3, calcium: 120 },
    },
    {
        id: 'guide-scallion',
        name: 'Hành lá',
        category: 'Rau củ',
        shelfLife: 'very_short',
        preservationCondition: 'fridge',
        baseUnit: 'g',
        inventoryUnits: ['g', 'bó'],
        recipeUnitConversions: { g: 1, bó: 100 },
        priceEstimate: { min: 5000, max: 8000, amount: 1, unit: 'bó', currency: 'VND' },
        nutrition: { amount: 100, unit: 'g', calories: 32, protein: 1.8, carbs: 7.3, fat: 0.2, fiber: 2.6, vitaminC: 18 },
    },
    {
        id: 'guide-soy',
        name: 'Nước tương',
        category: 'Nước chấm',
        shelfLife: 'very_long',
        preservationCondition: 'cool_dry',
        alwaysAvailable: true,
        baseUnit: 'ml',
        inventoryUnits: ['ml', 'lít'],
        nutrition: { amount: 15, unit: 'ml', calories: 10, protein: 1, carbs: 1, sodium: 900 },
    },
];

const DISHES: Dishes[] = [
    {
        id: 'guide-dish-chicken-rice',
        name: 'Cơm gà áp chảo rau cải',
        baseServings: 2,
        tags: ['Món chính', 'Áp chảo', 'Giàu đạm'],
        note: 'Bữa trưa nhanh, dùng được rau cải sắp hết hạn.',
        includeDishes: [],
        isCompleted: true,
        duration: { unfreeze: null, prepare: 12, cooking: 18, serve: 2, cooldown: null },
        ingredients: [
            { ingredientId: 'guide-chicken', amount: '320', unit: 'g', dishesId: 'guide-dish-chicken-rice', required: true, prepare: ['Thái miếng vuông'] },
            { ingredientId: 'guide-rice', amount: '260', unit: 'g', dishesId: 'guide-dish-chicken-rice', required: true },
            { ingredientId: 'guide-greens', amount: '250', unit: 'g', dishesId: 'guide-dish-chicken-rice', required: true, prepare: ['Cắt khúc'] },
            { ingredientId: 'guide-soy', amount: '20', unit: 'ml', dishesId: 'guide-dish-chicken-rice', required: false },
            { ingredientId: 'guide-scallion', amount: '30', unit: 'g', dishesId: 'guide-dish-chicken-rice', required: false, prepare: ['Thái nhỏ'] },
        ],
        steps: [
            { id: 'guide-step-chicken-1', order: 1, content: 'Ướp gà với nước tương và tiêu trong 10 phút.', required: true, isDone: false },
            { id: 'guide-step-chicken-2', order: 2, content: 'Áp chảo gà đến khi vàng mặt, thêm rau cải xào nhanh.', required: true, isDone: false },
            { id: 'guide-step-chicken-3', order: 3, content: 'Dọn với cơm nóng và hành lá.', required: true, isDone: false },
        ],
    },
    {
        id: 'guide-dish-oat-egg',
        name: 'Cháo yến mạch trứng sữa',
        baseServings: 1,
        tags: ['Ăn sáng', 'Nhanh', 'Nhẹ kcal'],
        note: 'Món sáng ấm bụng, chuẩn bị nhanh trước khi đi làm.',
        includeDishes: [],
        isCompleted: true,
        duration: { unfreeze: null, prepare: 4, cooking: 8, serve: 1, cooldown: null },
        ingredients: [
            { ingredientId: 'guide-oat', amount: '45', unit: 'g', dishesId: 'guide-dish-oat-egg', required: true },
            { ingredientId: 'guide-milk', amount: '180', unit: 'ml', dishesId: 'guide-dish-oat-egg', required: true },
            { ingredientId: 'guide-egg', amount: '1', unit: 'quả', dishesId: 'guide-dish-oat-egg', required: true },
        ],
        steps: [
            { id: 'guide-step-oat-1', order: 1, content: 'Nấu yến mạch với sữa đến khi mềm.', required: true, isDone: false },
            { id: 'guide-step-oat-2', order: 2, content: 'Khuấy trứng vào cuối cùng để cháo mịn.', required: true, isDone: false },
        ],
    },
    {
        id: 'guide-dish-tofu-soup',
        name: 'Canh rau cải đậu hũ',
        baseServings: 3,
        tags: ['Canh', 'Rau củ', 'Nhẹ'],
        note: 'Món tối nhẹ, tận dụng rau cải và đậu hũ.',
        includeDishes: [],
        isCompleted: true,
        duration: { unfreeze: null, prepare: 8, cooking: 14, serve: 2, cooldown: null },
        ingredients: [
            { ingredientId: 'guide-greens', amount: '300', unit: 'g', dishesId: 'guide-dish-tofu-soup', required: true, prepare: ['Cắt khúc'] },
            { ingredientId: 'guide-tofu', amount: '1', unit: 'thanh', dishesId: 'guide-dish-tofu-soup', required: true, prepare: ['Thái miếng vuông'] },
            { ingredientId: 'guide-scallion', amount: '20', unit: 'g', dishesId: 'guide-dish-tofu-soup', required: false },
        ],
        steps: [
            { id: 'guide-step-soup-1', order: 1, content: 'Đun nước dùng nhẹ, cho đậu hũ vào trước.', required: true, isDone: false },
            { id: 'guide-step-soup-2', order: 2, content: 'Thêm rau cải, nêm vừa ăn và tắt bếp.', required: true, isDone: false },
        ],
    },
    {
        id: 'guide-dish-egg-rice',
        name: 'Cơm chiên trứng hành',
        baseServings: 2,
        tags: ['Món chính', 'Nhanh', 'Chiên'],
        note: 'Dùng cơm nguội và trứng khi cần món nhanh.',
        includeDishes: [],
        isCompleted: true,
        duration: { unfreeze: null, prepare: 7, cooking: 10, serve: 2, cooldown: null },
        ingredients: [
            { ingredientId: 'guide-rice', amount: '300', unit: 'g', dishesId: 'guide-dish-egg-rice', required: true },
            { ingredientId: 'guide-egg', amount: '2', unit: 'quả', dishesId: 'guide-dish-egg-rice', required: true },
            { ingredientId: 'guide-scallion', amount: '30', unit: 'g', dishesId: 'guide-dish-egg-rice', required: true },
            { ingredientId: 'guide-soy', amount: '15', unit: 'ml', dishesId: 'guide-dish-egg-rice', required: false },
        ],
        steps: [
            { id: 'guide-step-fried-rice-1', order: 1, content: 'Đánh trứng, đảo với cơm và hành lá.', required: true, isDone: false },
        ],
    },
    {
        id: 'guide-dish-salad',
        name: 'Salad rau cải gà xé',
        baseServings: 2,
        tags: ['Salad', 'Giàu đạm'],
        note: 'Cần bổ sung sốt và bước trộn chi tiết.',
        includeDishes: [],
        isCompleted: false,
        duration: { unfreeze: null, prepare: 15, cooking: null, serve: 2, cooldown: null },
        ingredients: [
            { ingredientId: 'guide-chicken', amount: '220', unit: 'g', dishesId: 'guide-dish-salad', required: true },
            { ingredientId: 'guide-greens', amount: '180', unit: 'g', dishesId: 'guide-dish-salad', required: true },
        ],
        steps: [],
    },
];

const INVENTORY: Record<string, IngredientInventory> = {
    'guide-chicken': { unit: 'g', lastUpdated: dateAt(-1), batches: [{ id: 'guide-batch-chicken', amount: 520, unit: 'g', purchasedAt: purchasedAt(-1), expiresAt: expiresAt(3), preservationCondition: 'fridge' }] },
    'guide-rice': { unit: 'g', lastUpdated: dateAt(-5), batches: [{ id: 'guide-batch-rice', amount: 1600, unit: 'g', purchasedAt: purchasedAt(-12), preservationCondition: 'cool_dry' }] },
    'guide-greens': { unit: 'g', lastUpdated: dateAt(-2), batches: [{ id: 'guide-batch-greens', amount: 420, unit: 'g', purchasedAt: purchasedAt(-2), expiresAt: expiresAt(1), preservationCondition: 'fridge' }] },
    'guide-egg': { unit: 'quả', lastUpdated: dateAt(-3), batches: [{ id: 'guide-batch-egg', amount: 8, unit: 'quả', purchasedAt: purchasedAt(-3), expiresAt: expiresAt(7), preservationCondition: 'fridge' }] },
    'guide-tofu': { unit: 'thanh', lastUpdated: dateAt(-1), batches: [{ id: 'guide-batch-tofu', amount: 1, unit: 'thanh', purchasedAt: purchasedAt(-1), expiresAt: expiresAt(2), preservationCondition: 'fridge' }] },
    'guide-oat': { unit: 'g', lastUpdated: dateAt(-8), batches: [{ id: 'guide-batch-oat', amount: 700, unit: 'g', purchasedAt: purchasedAt(-30), preservationCondition: 'cool_dry' }] },
    'guide-milk': { unit: 'ml', lastUpdated: dateAt(-1), batches: [{ id: 'guide-batch-milk', amount: 300, unit: 'ml', purchasedAt: purchasedAt(-1), expiresAt: expiresAt(2), preservationCondition: 'fridge' }] },
};

const SCHEDULED_MEALS: ScheduledMeal[] = [
    {
        id: 'guide-meal-today',
        name: 'Ngày làm việc nhẹ nhàng',
        plannedDate: dateAt(0),
        createdDate: dateAt(-2),
        meals: { breakfast: ['guide-dish-oat-egg'], lunch: ['guide-dish-chicken-rice'], dinner: ['guide-dish-tofu-soup'] },
        dishServings: { 'guide-dish-oat-egg': 1, 'guide-dish-chicken-rice': 2, 'guide-dish-tofu-soup': 3 },
    },
    {
        id: 'guide-meal-tomorrow',
        name: 'Chuẩn bị cơm hộp',
        plannedDate: dateAt(1),
        createdDate: dateAt(-1),
        meals: { breakfast: ['guide-dish-egg-rice'], lunch: ['guide-dish-chicken-rice'], dinner: ['guide-dish-tofu-soup'] },
        dishServings: { 'guide-dish-egg-rice': 2, 'guide-dish-chicken-rice': 2, 'guide-dish-tofu-soup': 2 },
    },
];

const SHOPPING_LISTS: ShoppingList[] = [
    {
        id: 'guide-shopping-weekend',
        name: 'Giỏ cuối tuần từ thực đơn',
        dishes: ['guide-dish-chicken-rice', 'guide-dish-tofu-soup', 'guide-dish-oat-egg'],
        dishServings: { 'guide-dish-chicken-rice': 2, 'guide-dish-tofu-soup': 3, 'guide-dish-oat-egg': 1 },
        scheduledMeals: ['guide-meal-today', 'guide-meal-tomorrow'],
        createdDate: dateAt(-1),
        plannedDate: dateAt(1),
        ingredients: [
            { id: 'guide-shopping-scallion', ingredientId: 'guide-scallion', isDone: false, amounts: [{ id: 'guide-shopping-scallion-a', ingredientId: 'guide-scallion', amount: '100', unit: 'g', dishesId: 'guide-dish-chicken-rice', required: true }] },
            { id: 'guide-shopping-milk', ingredientId: 'guide-milk', isDone: true, boughtAmount: 1, boughtUnit: 'lít', amounts: [{ id: 'guide-shopping-milk-a', ingredientId: 'guide-milk', amount: '700', unit: 'ml', dishesId: 'guide-dish-oat-egg', required: true }] },
            { id: 'guide-shopping-tofu', ingredientId: 'guide-tofu', isDone: false, amounts: [{ id: 'guide-shopping-tofu-a', ingredientId: 'guide-tofu', amount: '2', unit: 'thanh', dishesId: 'guide-dish-tofu-soup', required: true }] },
            { id: 'guide-shopping-greens', ingredientId: 'guide-greens', isDone: false, amounts: [{ id: 'guide-shopping-greens-a', ingredientId: 'guide-greens', amount: '500', unit: 'g', dishesId: 'guide-dish-tofu-soup', required: true }] },
        ],
    },
    {
        id: 'guide-shopping-pantry',
        name: 'Bổ sung đồ khô tháng này',
        dishes: ['guide-dish-egg-rice'],
        scheduledMeals: [],
        createdDate: dateAt(-4),
        plannedDate: dateAt(0),
        ingredients: [
            { id: 'guide-shopping-rice', ingredientId: 'guide-rice', isDone: true, amounts: [{ id: 'guide-shopping-rice-a', ingredientId: 'guide-rice', amount: '2', unit: 'kg', dishesId: 'guide-dish-egg-rice', required: true }] },
            { id: 'guide-shopping-egg', ingredientId: 'guide-egg', isDone: false, amounts: [{ id: 'guide-shopping-egg-a', ingredientId: 'guide-egg', amount: '10', unit: 'quả', dishesId: 'guide-dish-egg-rice', required: true }] },
        ],
    },
];

const WEEKLY_TEMPLATES: WeeklyMealTemplate[] = [
    {
        id: 'guide-template-workweek',
        name: 'Tuần đi làm cân bằng',
        scope: 'week',
        createdAt: dateAt(-20).toISOString(),
        updatedAt: dateAt(-2).toISOString(),
        days: [
            { offset: 0, meals: SCHEDULED_MEALS[0].meals, dishServings: SCHEDULED_MEALS[0].dishServings },
            { offset: 1, meals: SCHEDULED_MEALS[1].meals, dishServings: SCHEDULED_MEALS[1].dishServings },
        ],
    },
];

const SHOPPING_TEMPLATES: ShoppingListTemplate[] = [
    {
        id: 'guide-template-shopping-core',
        name: 'Đồ cơ bản mỗi tuần',
        source: 'scratch',
        dishes: ['guide-dish-chicken-rice', 'guide-dish-oat-egg'],
        dishServings: { 'guide-dish-chicken-rice': 2, 'guide-dish-oat-egg': 2 },
        createdAt: dateAt(-20).toISOString(),
        updatedAt: dateAt(-2).toISOString(),
    },
];

const COOKING_SESSIONS: CookingSession[] = [
    {
        id: 'guide-cooking-session',
        dishId: 'guide-dish-chicken-rice',
        dishName: 'Cơm gà áp chảo rau cải',
        baseServings: 2,
        targetServings: 2,
        startedAt: dateAt(0, 10).toISOString(),
        status: 'cooking',
        steps: ['Ướp gà', 'Áp chảo gà', 'Xào rau cải', 'Dọn cơm'],
        currentStepIndex: 1,
    },
];

const createGuidePreviewState = (): GuidePreviewState => ({
    shared: {
        ingredient: { ingredients: INGREDIENTS },
        dishes: { dishes: DISHES, searchText: '', currentPage: 1 },
        config: { config: DEFAULT_SHARED_CONFIG },
    },
    personal: {
        appContext: {
            loading: false,
            currentFeatureName: 'Tổng quan',
            shoppingListNameHistory: ['Giỏ cuối tuần từ thực đơn', 'Bổ sung đồ khô tháng này'],
            scheduledMealNameHistory: ['Ngày làm việc nhẹ nhàng', 'Chuẩn bị cơm hộp'],
            weeklyMealTemplates: WEEKLY_TEMPLATES,
            shoppingListTemplates: SHOPPING_TEMPLATES,
        },
        inventory: { items: INVENTORY },
        shoppingList: { shoppingLists: SHOPPING_LISTS },
        scheduledMeal: { scheduledMeals: SCHEDULED_MEALS, selectedMeals: ['guide-meal-today'] },
        cookingSession: { sessions: COOKING_SESSIONS },
        householdHealth: { profiles: {}, records: [] },
    },
});

const createGuidePreviewStore = () => configureStore({
    reducer: rootReducer,
    preloadedState: createGuidePreviewState(),
    devTools: false,
    middleware: getDefaultMiddleware => getDefaultMiddleware({ serializableCheck: false }),
});

export const GuidePreviewProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
    const store = React.useMemo(createGuidePreviewStore, []);
    return <Provider store={store}>{children}</Provider>;
};

const useGuideNavigationTrap = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const guidePath = React.useRef(`${location.pathname}${location.search}`);

    React.useEffect(() => {
        if (location.pathname.startsWith('/guide')) return;
        navigate(guidePath.current, { replace: true });
    }, [location.pathname, navigate]);
};

export const GuideRealPreviewScreen: React.FC<{ screen: GuidePreviewScreenKey; compact?: boolean }> = ({ screen, compact }) => {
    useGuideNavigationTrap();
    const content = (() => {
        switch (screen) {
            case 'dashboard': return <DashboardScreen />;
            case 'inventory': return <IngredientListScreen />;
            case 'dishes': return <DishesListScreen />;
            case 'suggestions': return <DishSuggesterScreen open={true} onClose={() => undefined} initialMode="inventory" previewInline />;
            case 'shopping': return <ShoppingListScreen />;
            case 'meals': return <ScheduledMealListScreen />;
            default: return <DashboardScreen />;
        }
    })();

    return <GuidePreviewProvider>
        <Box
            className={compact ? 'guide-real-preview guide-real-preview-compact' : 'guide-real-preview'}
            data-guide-real-preview={screen}
            style={{ height: '100%', minHeight: 0, overflow: compact ? 'hidden' : 'auto', pointerEvents: compact ? 'none' : undefined }}
        >
            {content}
        </Box>
    </GuidePreviewProvider>;
};

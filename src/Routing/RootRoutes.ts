import IngredientRoutes from '@modules/Ingredient/Routing/IngredientRouteConfig';
import DishesRoutes from '@modules/Dishes/Routing/DishesRouteConfig';
import ShoppingListRoutes from '@modules/ShoppingList/Routing/ShoppingListRouteConfig';
import ScheduledMealRoutes from '@modules/ScheduledMeal/Routing/ScheduledMealRouteConfig';
import { RouteHelpers } from '@common/Helpers/RouteHelper';

const ExpensePlanner = (dishId?: string | string[], targetServings?: number) => {
    if (Array.isArray(dishId)) {
        const dishIds = dishId.filter(Boolean);
        if (dishIds.length === 0) return RouteHelpers.CreateRoute('/expense-planner');
        return RouteHelpers.CreateRoute('/expense-planner', [], { dishes: dishIds.join(',') });
    }

    if (!dishId) return RouteHelpers.CreateRoute('/expense-planner');
    return RouteHelpers.CreateRoute('/expense-planner', [], {
        dish: dishId,
        ...(targetServings ? { servings: String(targetServings) } : {}),
    });
}

type NutritionCalculatorSource = 'dishes' | 'shoppingLists' | 'scheduledMeals';

type NutritionGoalsRouteParams = {
    calculator?: boolean;
    source?: NutritionCalculatorSource;
    dishes?: string[];
    shoppingLists?: string[];
    scheduledMeals?: string[];
}

const NutritionGoals = (params?: NutritionGoalsRouteParams) => {
    if (!params) return RouteHelpers.CreateRoute('/nutrition-goals');

    const query: Record<string, string> = {};
    if (params.calculator) query.calculator = '1';
    if (params.source) query.source = params.source;
    if (params.dishes?.length) query.dishes = params.dishes.filter(Boolean).join(',');
    if (params.shoppingLists?.length) query.shoppingLists = params.shoppingLists.filter(Boolean).join(',');
    if (params.scheduledMeals?.length) query.scheduledMeals = params.scheduledMeals.filter(Boolean).join(',');

    return RouteHelpers.CreateRoute('/nutrition-goals', [], Object.keys(query).length > 0 ? query : undefined);
}

const AuthorizedRoutes = {
    Root: () => "/",
    Analytics: () => RouteHelpers.CreateRoute('/analytics'),
    NutritionGoals,
    UserGuide: () => RouteHelpers.CreateRoute('/guide'),
    Templates: () => RouteHelpers.CreateRoute('/templates'),
    SyncBackupHealth: () => RouteHelpers.CreateRoute('/sync-backup-health'),
    ExpensePlanner,
    IngredientRoutes,
    DishesRoutes,
    ShoppingListRoutes,
    ScheduledMealRoutes
}

export const RootRoutes = {
    AuthorizedRoutes,
    StaticRoutes: {
        Error: '/error',
        NotFound: '*',
        Unauthorized: "/unauthorized"
    }
}

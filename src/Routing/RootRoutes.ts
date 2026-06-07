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

const AuthorizedRoutes = {
    Root: () => "/",
    Analytics: () => RouteHelpers.CreateRoute('/analytics'),
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

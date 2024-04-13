import IngredientRoutes from '@modules/Ingredient/Routing/IngredientRouteConfig';
import DishesRoutes from '@modules/Dishes/Routing/DishesRouteConfig';
import ShoppingListRoutes from '@modules/ShoppingList/Routing/ShoppingListRouteConfig';
import ScheduledMealRoutes from '@modules/ScheduledMeal/Routing/ScheduledMealRouteConfig';

const AuthorizedRoutes = {
    Root: () => "/",
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
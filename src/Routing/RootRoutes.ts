import IngredientRoutes from '@modules/Ingredient/Routing/IngredientRouteConfig';
import DishesRoutes from '@modules/Dishes/Routing/DishesRouteConfig';
import ShoppingListRoutes from '@modules/ShoppingList/Routing/ShoppingListRouteConfig';

const AuthorizedRoutes = {
    Root: () => "/",
    IngredientRoutes,
    DishesRoutes,
    ShoppingListRoutes
}

export const RootRoutes = {
    AuthorizedRoutes,
    StaticRoutes: {
        Error: '/error',
        NotFound: '*',
        Unauthorized: "/unauthorized"
    }
}
import IngredientRoutes from '@modules/Ingredient/Routing/IngredientRouteConfig';

const AuthorizedRoutes = {
    Root: () => "/",
    IngredientRoutes
}

export const RootRoutes = {
    AuthorizedRoutes,
    StaticRoutes: {
        Error: '/error',
        NotFound: '*',
        Unauthorized: "/unauthorized"
    }
}
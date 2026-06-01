import { RouteHelpers } from "@common/Helpers/RouteHelper"

const IngredientRoutes = RouteHelpers.CreateRoutes('/ingredient', (ingredientRoot) => ({
    List: () => RouteHelpers.CreateRoute(ingredientRoot, ["list"]),
    Detail: (id?: string) => id
        ? RouteHelpers.CreateRoute(ingredientRoot, ["detail"], { ingredient: id })
        : RouteHelpers.CreateRoute(ingredientRoot, ["detail"])
}))

export default IngredientRoutes

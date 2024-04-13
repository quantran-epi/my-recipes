import { RouteHelpers } from "@common/Helpers/RouteHelper"

const IngredientRoutes = RouteHelpers.CreateRoutes('/ingredient', (ingredientRoot) => ({
    List: () => RouteHelpers.CreateRoute(ingredientRoot, ["list"])
}))

export default IngredientRoutes
import { RouteHelpers } from "@common/Helpers/RouteHelper"

const ShoppingListRoutes = RouteHelpers.CreateRoutes('/shoppingList', (shoppingListRoot) => ({
    List: () => RouteHelpers.CreateRoute(shoppingListRoot, ["list"])
}))

export default ShoppingListRoutes
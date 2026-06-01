import { RouteHelpers } from "@common/Helpers/RouteHelper"

const ShoppingListRoutes = RouteHelpers.CreateRoutes('/shoppingList', (shoppingListRoot) => ({
    List: () => RouteHelpers.CreateRoute(shoppingListRoot, ["list"]),
    Detail: (id?: string) => id
        ? RouteHelpers.CreateRoute(shoppingListRoot, ["detail"], { shoppingList: id })
        : RouteHelpers.CreateRoute(shoppingListRoot, ["detail"])
}))

export default ShoppingListRoutes

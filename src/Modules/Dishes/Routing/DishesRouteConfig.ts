import { RouteHelpers } from "@common/Helpers/RouteHelper";

const DishesRoutes = RouteHelpers.CreateRoutes('/dishes', (dishes) => ({
    List: () => RouteHelpers.CreateRoute(dishes, ["list"]),
    ManageIngredient: (id?: string) => id ? RouteHelpers.CreateRoute(dishes, ["manage-ingredient"], { dishes: id })
        : RouteHelpers.CreateRoute(dishes, ["manage-ingredient"]),
}))

export default DishesRoutes
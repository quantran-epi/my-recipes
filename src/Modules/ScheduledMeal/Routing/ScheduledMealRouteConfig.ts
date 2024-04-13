import { RouteHelpers } from "@common/Helpers/RouteHelper"

const ScheduledMealRoutes = RouteHelpers.CreateRoutes('/scheduledMeal', (scheduledMealRoot) => ({
    List: () => RouteHelpers.CreateRoute(scheduledMealRoot, ["list"])
}))

export default ScheduledMealRoutes
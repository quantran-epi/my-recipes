import { RouteHelpers } from "@common/Helpers/RouteHelper"

const ScheduledMealRoutes = RouteHelpers.CreateRoutes('/scheduledMeal', (scheduledMealRoot) => ({
    List: () => RouteHelpers.CreateRoute(scheduledMealRoot, ["list"]),
    FeedbackHistory: () => RouteHelpers.CreateRoute(scheduledMealRoot, ["feedback-history"]),
    Leftovers: () => RouteHelpers.CreateRoute(scheduledMealRoot, ["leftovers"]),
    PrepTasks: () => RouteHelpers.CreateRoute(scheduledMealRoot, ["prep-tasks"]),
    Templates: () => RouteHelpers.CreateRoute(scheduledMealRoot, ["dish-count-templates"])
}))

export default ScheduledMealRoutes

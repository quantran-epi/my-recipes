import {
    BrowserRouter, Route, Routes
} from "react-router-dom";
import { RootRoutes } from "./RootRoutes";
import { IngredientRouter } from "@modules/Ingredient/Routing/IngredientRouter";
import { IngredientDetailScreen } from "@modules/Ingredient/Screens/IngredientDetail.screen";
import { IngredientListScreen } from "@modules/Ingredient/Screens/IngredientList.screen";
import { MasterPage } from "./MasterPage";
import { DishesRouter } from "@modules/Dishes/Routing/DishesRouter";
import { DishesListScreen } from "@modules/Dishes/Screens/DishesList.screen";
import { DishesDetailScreen } from "@modules/Dishes/Screens/DishesManageIngredient/DishesDetail.screen";
import { ShoppingListRouter } from "@modules/ShoppingList/Routing/ShoppingListRouter";
import { ShoppingListDetailScreen } from "@modules/ShoppingList/Screens/ShoppingListDetail.screen";
import { ShoppingListScreen } from "@modules/ShoppingList/Screens/ShoppingList.screen";
import { DashboardScreen } from "@modules/Home/Screens/Dashboard.screen";
import { DashboardAnalyticsScreen } from "@modules/Home/Screens/DashboardAnalytics.screen";
import { ScheduledMealRouter } from "@modules/ScheduledMeal/Routing/ScheduledMealRouter";
import { ScheduledMealListScreen } from "@modules/ScheduledMeal/Screens/ScheduledMealList.screen";
import { DishExpensePlannerScreen } from "@modules/Dishes/Screens/DishExpensePlanner.screen";

export const RootRouter = () => {
    return <BrowserRouter basename="/my-recipes">
        <Routes>
            <Route path={RootRoutes.AuthorizedRoutes.Root()} element={<MasterPage />}>
                <Route index element={<DashboardScreen />} />
                <Route path={RootRoutes.AuthorizedRoutes.Analytics()} element={<DashboardAnalyticsScreen />} />
                <Route path={RootRoutes.AuthorizedRoutes.ExpensePlanner()} element={<DishExpensePlannerScreen />} />
                <Route path={RootRoutes.AuthorizedRoutes.IngredientRoutes.Root()} element={<IngredientRouter />}>
                    <Route path={RootRoutes.AuthorizedRoutes.IngredientRoutes.List()} element={<IngredientListScreen />} />
                    <Route path={RootRoutes.AuthorizedRoutes.IngredientRoutes.Detail()} element={<IngredientDetailScreen />} />
                </Route>
                <Route path={RootRoutes.AuthorizedRoutes.DishesRoutes.Root()} element={<DishesRouter />}>
                    <Route path={RootRoutes.AuthorizedRoutes.DishesRoutes.List()} element={<DishesListScreen />} />
                    <Route path={RootRoutes.AuthorizedRoutes.DishesRoutes.ManageIngredient()} element={<DishesDetailScreen />} />
                </Route>
                <Route path={RootRoutes.AuthorizedRoutes.ShoppingListRoutes.Root()} element={<ShoppingListRouter />}>
                    <Route path={RootRoutes.AuthorizedRoutes.ShoppingListRoutes.List()} element={<ShoppingListScreen />} />
                    <Route path={RootRoutes.AuthorizedRoutes.ShoppingListRoutes.Detail()} element={<ShoppingListDetailScreen />} />
                </Route>
                <Route path={RootRoutes.AuthorizedRoutes.ScheduledMealRoutes.Root()} element={<ScheduledMealRouter />}>
                    <Route path={RootRoutes.AuthorizedRoutes.ScheduledMealRoutes.List()} element={<ScheduledMealListScreen />} />
                </Route>
            </Route>
        </Routes>
    </BrowserRouter>
}

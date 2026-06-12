import {
    BrowserRouter, Route, Routes
} from "react-router-dom";
import React from "react";
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
import { NutritionGoalsScreen } from "@modules/Home/Screens/NutritionGoals.screen";
import { SyncBackupHealthScreen } from "@modules/Home/Screens/SyncBackupHealth.screen";
import { TemplatesScreen } from "@modules/Home/Screens/Templates.screen";
import { UserGuideScreen } from "@modules/Home/Screens/UserGuide.screen";
import { ScheduledMealRouter } from "@modules/ScheduledMeal/Routing/ScheduledMealRouter";
import { ScheduledMealListScreen } from "@modules/ScheduledMeal/Screens/ScheduledMealList.screen";
import { MemberDishFeedbackHistoryScreen } from "@modules/ScheduledMeal/Screens/MemberDishFeedbackHistory.screen";
import { DishExpensePlannerScreen } from "@modules/Dishes/Screens/DishExpensePlanner.screen";
import { DishSuggesterPageScreen } from "@modules/DishSuggester/Screens/DishSuggesterPage.screen";
import { HouseholdProfilesScreen } from "@modules/Home/Screens/HouseholdProfiles.screen";
import { SmartMealPlannerScreen } from "@modules/ScheduledMeal/Screens/SmartMealPlanner.screen";

const UserGuideTourScreen = React.lazy(() => import("@modules/Home/Screens/UserGuideTour.screen"));
const UserGuideWelcomeScreen = React.lazy(() => import("@modules/Home/Screens/UserGuideWelcome.screen"));

const RouteLoadingFallback = () => <div style={{ padding: 12, color: '#6b6478', fontSize: 13 }}>Đang mở hướng dẫn...</div>;

export const RootRouter = () => {
    return <BrowserRouter basename="/my-recipes">
        <Routes>
            <Route path={RootRoutes.AuthorizedRoutes.UserGuideWelcome()} element={<React.Suspense fallback={<RouteLoadingFallback />}><UserGuideWelcomeScreen /></React.Suspense>} />
            <Route path={RootRoutes.AuthorizedRoutes.UserGuideTour()} element={<React.Suspense fallback={<RouteLoadingFallback />}><UserGuideTourScreen /></React.Suspense>} />
            <Route path={RootRoutes.AuthorizedRoutes.Root()} element={<MasterPage />}>
                <Route index element={<DashboardScreen />} />
                <Route path={RootRoutes.AuthorizedRoutes.Analytics()} element={<DashboardAnalyticsScreen />} />
                <Route path={RootRoutes.AuthorizedRoutes.DishSuggester()} element={<DishSuggesterPageScreen />} />
                <Route path={RootRoutes.AuthorizedRoutes.HouseholdProfiles()} element={<HouseholdProfilesScreen />} />
                <Route path={RootRoutes.AuthorizedRoutes.SmartMealPlanner()} element={<SmartMealPlannerScreen />} />
                <Route path={RootRoutes.AuthorizedRoutes.NutritionGoals()} element={<NutritionGoalsScreen />} />
                <Route path={RootRoutes.AuthorizedRoutes.UserGuide()} element={<UserGuideScreen />} />
                <Route path={RootRoutes.AuthorizedRoutes.Templates()} element={<TemplatesScreen />} />
                <Route path={RootRoutes.AuthorizedRoutes.SyncBackupHealth()} element={<SyncBackupHealthScreen />} />
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
                    <Route path={RootRoutes.AuthorizedRoutes.ScheduledMealRoutes.FeedbackHistory()} element={<MemberDishFeedbackHistoryScreen />} />
                </Route>
            </Route>
        </Routes>
    </BrowserRouter>
}

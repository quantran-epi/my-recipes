import {
    BrowserRouter, Route, Routes
} from "react-router-dom";
import { RootRoutes } from "./RootRoutes";
import { IngredientRouter } from "@modules/Ingredient/Routing/IngredientRouter";
import { IngredientListScreen } from "@modules/Ingredient/Screens/IngredientList.screen";
import { MasterPage } from "./MasterPage";
import { DishesRouter } from "@modules/Dishes/Routing/DishesRouter";
import { DishesListScreen } from "@modules/Dishes/Screens/DishesList.screen";
import { DishesManageIngredientScreen } from "@modules/Dishes/Screens/DishesManageIngredient/DishesManageIngredient.screen";

export const RootRouter = () => {
    return <BrowserRouter>
        <Routes>
            <Route path={RootRoutes.AuthorizedRoutes.Root()} element={<MasterPage />}>
                <Route path={RootRoutes.AuthorizedRoutes.IngredientRoutes.Root()} element={<IngredientRouter />}>
                    <Route path={RootRoutes.AuthorizedRoutes.IngredientRoutes.List()} element={<IngredientListScreen />} />
                </Route>
                <Route path={RootRoutes.AuthorizedRoutes.DishesRoutes.Root()} element={<DishesRouter />}>
                    <Route path={RootRoutes.AuthorizedRoutes.DishesRoutes.List()} element={<DishesListScreen />} />
                    <Route path={RootRoutes.AuthorizedRoutes.DishesRoutes.ManageIngredient()} element={<DishesManageIngredientScreen />} />
                </Route>
            </Route>
        </Routes>
    </BrowserRouter>
}
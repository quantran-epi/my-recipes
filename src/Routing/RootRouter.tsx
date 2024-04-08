import {
    BrowserRouter, Route, Routes
} from "react-router-dom";
import { RootRoutes } from "./RootRoutes";
import { IngredientRouter } from "@modules/Ingredient/Routing/IngredientRouter";
import { IngredientListScreen } from "@modules/Ingredient/Screens/IngredientList.screen";
import { MasterPage } from "./MasterPage";

export const RootRouter = () => {
    return <BrowserRouter>
        <Routes>
            <Route path={RootRoutes.AuthorizedRoutes.Root()} element={<MasterPage />}>
                <Route path={RootRoutes.AuthorizedRoutes.IngredientRoutes.Root()} element={<IngredientRouter />}>
                    <Route path={RootRoutes.AuthorizedRoutes.IngredientRoutes.List()} element={<IngredientListScreen />} />
                </Route>
            </Route>
        </Routes>
    </BrowserRouter>
}
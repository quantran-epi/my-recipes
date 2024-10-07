import { RootRoutes } from "@routing/RootRoutes";
import { Navigate } from "react-router-dom";

export const DashboardScreen = () => {
    return <Navigate to={RootRoutes.AuthorizedRoutes.DishesRoutes.List()} />
}
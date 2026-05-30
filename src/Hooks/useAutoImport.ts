import { useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import { addDishes, resetDishes } from "@store/Reducers/DishesReducer";
import { addIngredient, resetIngredient } from "@store/Reducers/IngredientReducer";
import { addScheduledMeal, resetScheduleMeals } from "@store/Reducers/ScheduledMealReducer";
import { addShoppingList, resetShoppingList } from "@store/Reducers/ShoppingListReducer";

const DATA_URL = "https://raw.githubusercontent.com/quantran-epi/my-recipes/refs/heads/main/docs/data.txt";

export type AutoImportStatus = "idle" | "loading" | "done" | "error";

export interface UseAutoImportResult {
    status: AutoImportStatus;
    error: string | null;
}

export const useAutoImport = (): UseAutoImportResult => {
    const dispatch = useDispatch();
    const [status, setStatus] = useState<AutoImportStatus>("loading");
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const run = async () => {
            try {
                const res = await fetch(DATA_URL + "?t=" + Date.now()); // bust cache
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                const text = await res.text();
                const parseValues = JSON.parse(text);

                dispatch(resetIngredient());
                dispatch(resetDishes());
                dispatch(resetScheduleMeals());
                dispatch(resetShoppingList());

                JSON.parse(parseValues.dishes).dishes.forEach(dish => dispatch(addDishes(dish)));
                JSON.parse(parseValues.ingredient).ingredients.forEach(ingre => dispatch(addIngredient(ingre)));
                JSON.parse(parseValues.scheduledMeal).scheduledMeals.forEach(meal => dispatch(addScheduledMeal(meal)));
                JSON.parse(parseValues.shoppingList).shoppingLists.forEach(shplist => dispatch(addShoppingList(shplist)));

                setStatus("done");
            } catch (err: any) {
                console.error("[AutoImport] Failed:", err);
                setError(err?.message || "Unknown error");
                setStatus("error");
            }
        };

        run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return { status, error };
};

import { createSlice } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'
import { Dishes, DishesIngredientAmount } from '@store/Models/Dishes';

export type DishesIngredientAddParams = { dishId: string, ingres: DishesIngredientAmount[] };

export interface DishesState {
    dishes: Dishes[];
}

const initialState: DishesState = {
    dishes: []
}

export const DishesSlice = createSlice({
    name: 'dishes',
    initialState,
    reducers: {
        add: (state, action: PayloadAction<Dishes>) => {
            state.dishes.push(action.payload);
        },
        edit: (state, action: PayloadAction<Dishes>) => {
            state.dishes = state.dishes.map(e => {
                if (e.id === action.payload.id) return action.payload;
                return e;
            })
        },
        remove: (state, action: PayloadAction<string[]>) => {
            state.dishes = state.dishes.filter(dish => !action.payload.includes(dish.id));
        },
        addIngredientsToDish: (state, action: PayloadAction<DishesIngredientAddParams>) => {
            state.dishes = state.dishes.map(e => {
                if (e.id === action.payload.dishId) {
                    return {
                        ...e,
                        ingredients: [...e.ingredients, ...action.payload.ingres]
                    }
                }
                return e;
            })
        },
        removeIngredientsFromDish: (state, action: PayloadAction<DishesIngredientAddParams>) => {
            state.dishes = state.dishes.map(e => {
                if (e.id === action.payload.dishId) {
                    return {
                        ...e,
                        ingredients: e.ingredients.filter(ingre => !action.payload.ingres.map(t => t.ingredientId).includes(ingre.ingredientId))
                    }
                }
                return e;
            })
        }
    }
})

// Action creators are generated for each case reducer function
export const { add: addDishes, edit: editDishes, remove: removeDishes, addIngredientsToDish, removeIngredientsFromDish } = DishesSlice.actions

export default DishesSlice.reducer
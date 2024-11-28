import { createSlice } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'
import { Ingredient } from '@store/Models/Ingredient'

export interface IngredientState {
    ingredients: Ingredient[];
}

const initialState: IngredientState = {
    ingredients: []
}

export const ingredientSlice = createSlice({
    name: 'ingredient',
    initialState,
    reducers: {
        add: (state, action: PayloadAction<Ingredient>) => {
            state.ingredients.push(action.payload);
        },
        edit: (state, action: PayloadAction<Ingredient>) => {
            state.ingredients = state.ingredients.map(e => {
                if (e.id === action.payload.id) return action.payload;
                return e;
            })
        },
        remove: (state, action: PayloadAction<string[]>) => {
            state.ingredients = state.ingredients.filter(ingre => !action.payload.includes(ingre.id));
        },
        reset: (state) => {
            state.ingredients = [];
        }
    },
    extraReducers: (builder) => {
        // builder.addCase(fetchUserById.pending, (state, action) => {
        //     state.loading = true;
        //     state.whoseDataIsLoading = action.payload;
        // })
    }
})

// Action creators are generated for each case reducer function
export const { add: addIngredient, edit: editIngredient, remove: removeIngredient, reset: resetIngredient } = ingredientSlice.actions

export default ingredientSlice.reducer
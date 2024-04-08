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
        remove: (state, action: PayloadAction<string[]>) => {
            state.ingredients = state.ingredients.filter(ingre => !action.payload.includes(ingre.id));
        },
    },
    extraReducers: (builder) => {
        // builder.addCase(fetchUserById.pending, (state, action) => {
        //     state.loading = true;
        //     state.whoseDataIsLoading = action.payload;
        // })
    }
})

// Action creators are generated for each case reducer function
export const { add: addIngredient, remove: removeIngredient } = ingredientSlice.actions

export default ingredientSlice.reducer
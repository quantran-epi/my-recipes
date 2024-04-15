import { createSlice } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'
import { Dishes, DishesIngredientAmount, DishesStep } from '@store/Models/Dishes';
import { max } from 'lodash';

export type DishesIngredientAddParams = { dishId: string, ingres: DishesIngredientAmount[] };
export type DishesIngredientEditParams = { dishId: string, ingres: DishesIngredientAmount };
export type DishesStepAddParams = { dishId: string, steps: Omit<DishesStep, "order">[] };
export type DishesStepAddNextParams = { dishId: string, steps: Omit<DishesStep, "order">[], order: number };
export type DishesStepAddPrevParams = { dishId: string, steps: Omit<DishesStep, "order">[], order: number };
export type DishStepAddType = "prev" | "next" | "default";

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
        editIngredientFromDish: (state, action: PayloadAction<DishesIngredientEditParams>) => {
            state.dishes = state.dishes.map(e => {
                if (e.id === action.payload.dishId) {
                    return {
                        ...e,
                        ingredients: e.ingredients.map(ingre => {
                            if (ingre.ingredientId === action.payload.ingres.ingredientId) {
                                return action.payload.ingres;
                            }
                            return ingre;
                        })
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
        },
        addStepsToDish: (state, action: PayloadAction<DishesStepAddParams>) => {
            state.dishes = state.dishes.map(e => {
                if (e.id === action.payload.dishId) {
                    let lastOrder = e.steps.length === 0 ? 0 : max(e.steps.map(i => i.order));
                    let stepsToAdd = action.payload.steps.map(st => ({
                        ...st,
                        order: ++lastOrder
                    }));
                    return {
                        ...e,
                        steps: [...e.steps, ...stepsToAdd]
                    }
                }
                return e;
            })
        },
        addStepToDishNext: (state, action: PayloadAction<DishesStepAddNextParams>) => {
            state.dishes = state.dishes.map(e => {
                if (e.id === action.payload.dishId) {
                    let curOrder = action.payload.order;
                    let stepsToAdd = action.payload.steps.map(st => ({
                        ...st,
                        order: ++curOrder
                    }));
                    return {
                        ...e,
                        steps: [...e.steps.map(st => {
                            if (st.order <= action.payload.order) return st;
                            return {
                                ...st,
                                order: st.order + 1
                            }
                        }), ...stepsToAdd]
                    }
                }
                return e;
            })
        },
        adStepToDishPrev: (state, action: PayloadAction<DishesStepAddPrevParams>) => {
            state.dishes = state.dishes.map(e => {
                if (e.id === action.payload.dishId) {
                    let curOrder = action.payload.order;
                    let stepsToAdd = action.payload.steps.map(st => ({
                        ...st,
                        order: --curOrder
                    }));
                    return {
                        ...e,
                        steps: [...e.steps.map(st => {
                            if (st.order >= action.payload.order) return st;
                            return {
                                ...st,
                                order: st.order - 1
                            }
                        }), ...stepsToAdd]
                    }
                }
                return e;
            })
        },
        removeStepsFromDish: (state, action: PayloadAction<DishesStepAddParams>) => {
            state.dishes = state.dishes.map(e => {
                if (e.id === action.payload.dishId) {
                    return {
                        ...e,
                        steps: e.steps.filter(step => !action.payload.steps.map(t => t.id).includes(step.id))
                    }
                }
                return e;
            })
        },
    }
})

// Action creators are generated for each case reducer function
export const {
    add: addDishes, edit: editDishes, remove: removeDishes, addIngredientsToDish, removeIngredientsFromDish, editIngredientFromDish, addStepsToDish, adStepToDishPrev, addStepToDishNext, removeStepsFromDish
} = DishesSlice.actions

export default DishesSlice.reducer
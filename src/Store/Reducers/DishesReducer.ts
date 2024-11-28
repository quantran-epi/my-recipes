import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice } from '@reduxjs/toolkit';
import { DishDuration, Dishes, DishesIngredientAmount, DishesStep } from '@store/Models/Dishes';
import { max } from 'lodash';

export type DishesIngredientAddParams = { dishId: string, ingres: DishesIngredientAmount[] };
export type DishesIngredientEditParams = { dishId: string, ingres: DishesIngredientAmount };
export type DishesStepAddParams = { dishId: string, steps: Omit<DishesStep, "order">[] };
export type DishesStepEditParams = { dishId: string, step: DishesStep };
export type DishesStepAddNextParams = { dishId: string, steps: Omit<DishesStep, "order">[], order: number };
export type DishesStepAddPrevParams = { dishId: string, steps: Omit<DishesStep, "order">[], order: number };
export type DishStepAddType = "prev" | "next" | "default";
export type DishesDurationEditParams = { dishId: string, duration: DishDuration };

export interface DishesState {
    dishes: Dishes[];
    searchText: string;
    currentPage: number;
}

const initialState: DishesState = {
    dishes: [],
    searchText: "",
    currentPage: 1
}

export const DishesSlice = createSlice({
    name: 'dishes',
    initialState,
    reducers: {
        search: (state, action: PayloadAction<string>) => {
            state.searchText = action.payload;
        },
        changePage: (state, action: PayloadAction<number>) => {
            state.currentPage = action.payload;
        },
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
        editStepFromDish: (state, action: PayloadAction<DishesStepEditParams>) => {
            state.dishes = state.dishes.map(e => {
                if (e.id === action.payload.dishId) {
                    return {
                        ...e,
                        steps: e.steps.map(st => {
                            if (st.id === action.payload.step.id) {
                                return action.payload.step;
                            }
                            return st;
                        })
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
        updateDishDuration: (state, action: PayloadAction<DishesDurationEditParams>) => {
            state.dishes = state.dishes.map(e => {
                if (e.id === action.payload.dishId) {
                    return {
                        ...e,
                        duration: action.payload.duration
                    }
                }
                return e;
            })
        },
        reset: (state) => {
            state.dishes = [];
        },
        test: (state) => {
            state.dishes = state.dishes.map(e => ({
                ...e,
                duration: {
                    unfreeze: null,
                    prepare: null,
                    cooking: null,
                    serve: null,
                    cooldown: null
                }
            }))
        }
    }
})

// Action creators are generated for each case reducer function
export const {
    add: addDishes, edit: editDishes, remove: removeDishes, addIngredientsToDish, removeIngredientsFromDish, editIngredientFromDish,
    addStepsToDish, editStepFromDish, adStepToDishPrev, addStepToDishNext, removeStepsFromDish, search: searchDishes, changePage,
    updateDishDuration,
    reset: resetDishes,
    test
} = DishesSlice.actions

export default DishesSlice.reducer
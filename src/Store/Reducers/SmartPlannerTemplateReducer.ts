import { PayloadAction, createSlice } from '@reduxjs/toolkit';
import { SmartPlannerTemplate, SmartPlannerTemplateState } from '@store/Models/SmartPlannerTemplate';

// Cap the saved-template list so the persisted blob can't grow unbounded.
const MAX_TEMPLATES = 30;

const initialState: SmartPlannerTemplateState = {
    templates: [],
};

const normalizeTemplate = (template?: Partial<SmartPlannerTemplate> | null): SmartPlannerTemplate | null => {
    const id = String(template?.id ?? '').trim();
    const name = String(template?.name ?? '').trim();
    if (!id || !name) return null;
    if (!template?.mealSlotDishRanges || !template?.mealSlotTagRequirements) return null;
    return {
        id,
        name,
        createdAt: String(template?.createdAt ?? '').trim() || new Date().toISOString(),
        mealSlotDishRanges: template.mealSlotDishRanges,
        mealSlotTagRequirements: template.mealSlotTagRequirements,
    };
};

export const smartPlannerTemplateSlice = createSlice({
    name: 'smartPlannerTemplate',
    initialState,
    reducers: {
        addSmartPlannerTemplate: (state, action: PayloadAction<SmartPlannerTemplate>) => {
            const next = normalizeTemplate(action.payload);
            if (!next) return;
            state.templates = [next, ...state.templates.filter(template => template.id !== next.id)].slice(0, MAX_TEMPLATES);
        },
        // Replace the matching template in place (preserving its list position) so editing a saved
        // template doesn't reorder the list the way addSmartPlannerTemplate's prepend would.
        updateSmartPlannerTemplate: (state, action: PayloadAction<SmartPlannerTemplate>) => {
            const next = normalizeTemplate(action.payload);
            if (!next) return;
            const index = state.templates.findIndex(template => template.id === next.id);
            if (index < 0) {
                state.templates = [next, ...state.templates].slice(0, MAX_TEMPLATES);
                return;
            }
            state.templates[index] = next;
        },
        removeSmartPlannerTemplate: (state, action: PayloadAction<{ id: string }>) => {
            state.templates = state.templates.filter(template => template.id !== action.payload.id);
        },
    },
});

export const {
    addSmartPlannerTemplate,
    updateSmartPlannerTemplate,
    removeSmartPlannerTemplate,
} = smartPlannerTemplateSlice.actions;

export default smartPlannerTemplateSlice.reducer;

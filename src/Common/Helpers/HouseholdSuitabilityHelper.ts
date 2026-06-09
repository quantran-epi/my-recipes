import { DishNutritionHelper } from '@common/Helpers/DishNutritionHelper';
import { DishServingHelper } from '@common/Helpers/DishServingHelper';
import { NutritionGoalHelper } from '@common/Helpers/NutritionGoalHelper';
import { Dishes } from '@store/Models/Dishes';
import { Ingredient } from '@store/Models/Ingredient';
import { NutritionGoal } from '@store/Models/SharedConfig';
import { HouseholdMemberProfile } from '@store/Reducers/AppContextReducer';

export type HouseholdMemberSuitability = {
    member: HouseholdMemberProfile;
    score: number;
    tone: 'success' | 'warning' | 'neutral';
    positives: string[];
    warnings: string[];
    notes: string[];
}

export type HouseholdDishSuitability = {
    dish: Dishes;
    members: HouseholdMemberSuitability[];
    averageScore: number;
    warningCount: number;
    positiveCount: number;
}

const clampScore = (value: number) => Math.max(0, Math.min(100, Math.round(value)));

const unique = (items: string[]) => Array.from(new Set(items.filter(Boolean)));

const getDishIngredientIds = (dish: Dishes, allDishes: Dishes[]): string[] => {
    return unique(DishServingHelper.collectIngredientAmounts(dish, allDishes).map(item => item.ingredientId));
};

const getIngredientName = (ingredientsById: Map<string, Ingredient>, id: string) => ingredientsById.get(id)?.name ?? id;

const getTone = (score: number, warningCount: number): HouseholdMemberSuitability['tone'] => {
    if (warningCount > 0 || score < 58) return 'warning';
    if (score >= 76) return 'success';
    return 'neutral';
};

export const HouseholdSuitabilityHelper = {
    evaluateDishForMember(
        dish: Dishes,
        member: HouseholdMemberProfile,
        allDishes: Dishes[],
        ingredientsById: Map<string, Ingredient>,
        nutritionGoals: NutritionGoal[] = [],
    ): HouseholdMemberSuitability {
        const tags = dish.tags ?? [];
        const ingredientIds = getDishIngredientIds(dish, allDishes);
        const positives: string[] = [];
        const warnings: string[] = [];
        const notes: string[] = [];
        let score = 72;

        if (member.favoriteDishIds.includes(dish.id)) {
            score += 20;
            positives.push('Món yêu thích');
        }
        if (member.avoidedDishIds.includes(dish.id)) {
            score -= 55;
            warnings.push('Thành viên này đang tránh món này');
        }

        const preferredTags = member.preferredTags.filter(tag => tags.includes(tag));
        if (preferredTags.length > 0) {
            score += Math.min(14, preferredTags.length * 7);
            positives.push(`Hợp kiểu ${preferredTags.slice(0, 3).join(', ')}`);
        }

        const avoidedTags = member.avoidedTags.filter(tag => tags.includes(tag));
        if (avoidedTags.length > 0) {
            score -= Math.min(36, avoidedTags.length * 18);
            warnings.push(`Ít hợp kiểu ${avoidedTags.slice(0, 3).join(', ')}`);
        }

        const favoriteIngredients = member.favoriteIngredientIds
            .filter(id => ingredientIds.includes(id))
            .map(id => getIngredientName(ingredientsById, id));
        if (favoriteIngredients.length > 0) {
            score += Math.min(14, favoriteIngredients.length * 5);
            positives.push(`Có ${favoriteIngredients.slice(0, 3).join(', ')}`);
        }

        const avoidedIngredients = member.avoidedIngredientIds
            .filter(id => ingredientIds.includes(id))
            .map(id => getIngredientName(ingredientsById, id));
        if (avoidedIngredients.length > 0) {
            score -= Math.min(48, avoidedIngredients.length * 20);
            warnings.push(`Cần tránh ${avoidedIngredients.slice(0, 3).join(', ')}`);
        }

        const nutritionGoal = member.nutritionGoalId
            ? nutritionGoals.find(goal => goal.id === member.nutritionGoalId)
            : undefined;
        if (nutritionGoal) {
            const nutrition = DishNutritionHelper.calculateDishNutrition(dish, allDishes, ingredientsById);
            if (nutrition.hasNutrition) {
                const match = NutritionGoalHelper.score(nutrition, nutritionGoal);
                score += Math.round((match.score - 0.5) * 18);
                if (match.score >= 0.72) positives.push(`Hợp ${nutritionGoal.name}`);
                if (match.score < 0.42) warnings.push(`Chưa hợp ${nutritionGoal.name}`);
            } else {
                notes.push(`Chưa đủ dữ liệu dinh dưỡng cho ${nutritionGoal.name}`);
            }
        }

        if (member.portionPreference && member.portionPreference !== 1) {
            notes.push(`${member.portionPreference} phần ăn`);
        }
        if (member.notes) notes.push(member.notes);

        const finalScore = clampScore(score);
        return {
            member,
            score: finalScore,
            tone: getTone(finalScore, warnings.length),
            positives: positives.slice(0, 4),
            warnings: warnings.slice(0, 4),
            notes: notes.slice(0, 3),
        };
    },

    evaluateDishForMembers(
        dish: Dishes,
        members: HouseholdMemberProfile[],
        allDishes: Dishes[],
        ingredientsById: Map<string, Ingredient>,
        nutritionGoals: NutritionGoal[] = [],
    ): HouseholdDishSuitability {
        const memberResults = members.map(member => HouseholdSuitabilityHelper.evaluateDishForMember(dish, member, allDishes, ingredientsById, nutritionGoals));
        const averageScore = memberResults.length > 0
            ? clampScore(memberResults.reduce((sum, item) => sum + item.score, 0) / memberResults.length)
            : 0;
        return {
            dish,
            members: memberResults,
            averageScore,
            warningCount: memberResults.reduce((sum, item) => sum + item.warnings.length, 0),
            positiveCount: memberResults.reduce((sum, item) => sum + item.positives.length, 0),
        };
    },
};

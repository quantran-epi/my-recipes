import { DishServingHelper } from '@common/Helpers/DishServingHelper';
import { ServingSizeInput } from '@components/Form/ServingSizeInput';
import { Box } from '@components/Layout/Box';
import { Stack } from '@components/Layout/Stack';
import { Typography } from '@components/Typography';
import { Dishes } from '@store/Models/Dishes';
import React from 'react';

type DishServingSelectorProps = {
    selectedDishIds: string[];
    dishes: Dishes[];
    value: Record<string, number>;
    onChange: (value: Record<string, number>) => void;
}

type DishLookup = Dishes[] | Map<string, Dishes>;

const getDishById = (dishes: DishLookup, dishId: string): Dishes | undefined => {
    return dishes instanceof Map ? dishes.get(dishId) : dishes.find(item => item.id === dishId);
};

export const normalizeDishServings = (
    selectedDishIds: string[],
    dishes: DishLookup,
    current: Record<string, number> = {},
): Record<string, number> => {
    return selectedDishIds.reduce((result, dishId) => {
        const dish = getDishById(dishes, dishId);
        const baseServings = DishServingHelper.getBaseServings(dish);
        result[dishId] = DishServingHelper.normalizeTargetServings(current[dishId], baseServings);
        return result;
    }, {} as Record<string, number>);
};

export const DishServingSelector: React.FunctionComponent<DishServingSelectorProps> = ({ selectedDishIds, dishes, value, onChange }) => {
    const dishesById = React.useMemo(() => new Map(dishes.map(item => [item.id, item])), [dishes]);
    const selectedDishes = React.useMemo(() => selectedDishIds
        .map(id => dishesById.get(id))
        .filter(Boolean) as Dishes[], [selectedDishIds, dishesById]);

    if (selectedDishes.length === 0) return null;

    const _onServingChange = (dishId: string, nextValue: number | string | null) => {
        const dish = dishesById.get(dishId);
        const baseServings = DishServingHelper.getBaseServings(dish);
        onChange(normalizeDishServings(selectedDishIds, dishesById, {
            ...value,
            [dishId]: DishServingHelper.normalizeTargetServings(nextValue, baseServings),
        }));
    };

    return <Box style={{
        padding: 10,
        border: '1px solid #f0f0f0',
        borderRadius: 8,
        background: '#fafafa',
        marginBottom: 12,
    }}>
        <Typography.Text strong style={{ display: 'block', marginBottom: 8 }}>Khẩu phần</Typography.Text>
        <Stack direction='column' gap={8} align='stretch'>
            {selectedDishes.map(dish => {
                const baseServings = DishServingHelper.getBaseServings(dish);
                const targetServings = DishServingHelper.normalizeTargetServings(value[dish.id], baseServings);

                return <div key={dish.id} style={{
                    display: 'grid',
                    gridTemplateColumns: 'minmax(0, 1fr) 178px',
                    gap: 8,
                    alignItems: 'center',
                }}>
                    <div style={{ minWidth: 0 }}>
                        <Typography.Text style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {dish.name}
                        </Typography.Text>
                        <Typography.Text type='secondary' style={{ fontSize: 12 }}>
                            Gốc {baseServings} phần
                        </Typography.Text>
                    </div>
                    <ServingSizeInput
                        value={targetServings}
                        onChange={(nextValue) => _onServingChange(dish.id, nextValue)}
                        style={{ width: '100%' }}
                    />
                </div>
            })}
        </Stack>
    </Box>;
};

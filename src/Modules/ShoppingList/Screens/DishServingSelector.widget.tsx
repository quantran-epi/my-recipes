import { DishServingHelper } from '@common/Helpers/DishServingHelper';
import { Box } from '@components/Layout/Box';
import { Stack } from '@components/Layout/Stack';
import { Typography } from '@components/Typography';
import { Dishes } from '@store/Models/Dishes';
import { InputNumber } from 'antd';
import React from 'react';

type DishServingSelectorProps = {
    selectedDishIds: string[];
    dishes: Dishes[];
    value: Record<string, number>;
    onChange: (value: Record<string, number>) => void;
}

export const normalizeDishServings = (
    selectedDishIds: string[],
    dishes: Dishes[],
    current: Record<string, number> = {},
): Record<string, number> => {
    return selectedDishIds.reduce((result, dishId) => {
        const dish = dishes.find(item => item.id === dishId);
        const baseServings = DishServingHelper.getBaseServings(dish);
        result[dishId] = DishServingHelper.normalizeTargetServings(current[dishId], baseServings);
        return result;
    }, {} as Record<string, number>);
};

export const DishServingSelector: React.FunctionComponent<DishServingSelectorProps> = ({ selectedDishIds, dishes, value, onChange }) => {
    const selectedDishes = selectedDishIds
        .map(id => dishes.find(item => item.id === id))
        .filter(Boolean) as Dishes[];

    if (selectedDishes.length === 0) return null;

    const _onServingChange = (dishId: string, nextValue: number | string | null) => {
        const dish = dishes.find(item => item.id === dishId);
        const baseServings = DishServingHelper.getBaseServings(dish);
        onChange(normalizeDishServings(selectedDishIds, dishes, {
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
                    gridTemplateColumns: 'minmax(0, 1fr) 104px',
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
                    <InputNumber
                        min={1}
                        precision={0}
                        value={targetServings}
                        onChange={(nextValue) => _onServingChange(dish.id, nextValue)}
                        addonAfter='phần'
                        style={{ width: '100%' }}
                    />
                </div>
            })}
        </Stack>
    </Box>;
};

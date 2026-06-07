import { DishServingHelper } from '@common/Helpers/DishServingHelper';
import { ServingSizeInput } from '@components/Form/ServingSizeInput';
import { Box } from '@components/Layout/Box';
import { Stack } from '@components/Layout/Stack';
import { Tag } from '@components/Tag';
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

const uniqueDishIds = (dishIds: string[]): string[] => Array.from(new Set(dishIds));

const getDishById = (dishes: DishLookup, dishId: string): Dishes | undefined => {
    return dishes instanceof Map ? dishes.get(dishId) : dishes.find(item => item.id === dishId);
};

export const normalizeDishServings = (
    selectedDishIds: string[],
    dishes: DishLookup,
    current: Record<string, number> = {},
): Record<string, number> => {
    return uniqueDishIds(selectedDishIds).reduce((result, dishId) => {
        const dish = getDishById(dishes, dishId);
        const baseServings = DishServingHelper.getBaseServings(dish);
        result[dishId] = DishServingHelper.normalizeTargetServings(current[dishId], baseServings);
        return result;
    }, {} as Record<string, number>);
};

const getPresetValues = (baseServings: number): number[] => {
    return Array.from(new Set([
        Math.max(1, baseServings - 1),
        baseServings,
        baseServings + 1,
        Math.max(baseServings + 1, baseServings * 2),
    ])).slice(0, 4);
};

export const DishServingSelector: React.FunctionComponent<DishServingSelectorProps> = ({ selectedDishIds, dishes, value, onChange }) => {
    const dishesById = React.useMemo(() => new Map(dishes.map(item => [item.id, item])), [dishes]);
    const selectedDishes = React.useMemo(() => selectedDishIds
        .filter((id, index, source) => source.indexOf(id) === index)
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

    const _onPresetClick = (dishId: string, targetServings: number) => {
        onChange(normalizeDishServings(selectedDishIds, dishesById, {
            ...value,
            [dishId]: targetServings,
        }));
    };

    return <Box style={{
        padding: 12,
        border: '1px solid #e6f4ff',
        borderRadius: 8,
        background: '#f7fbff',
        marginBottom: 12,
    }}>
        <Stack justify='space-between' align='center' gap={8} style={{ marginBottom: 10 }}>
            <div style={{ minWidth: 0 }}>
                <Typography.Text strong style={{ display: 'block', lineHeight: '19px' }}>Khẩu phần từng món</Typography.Text>
                <Typography.Text type='secondary' style={{ display: 'block', fontSize: 12, lineHeight: '16px' }}>{selectedDishes.length} món đã chọn</Typography.Text>
            </div>
            <Tag color='blue' style={{ marginInlineEnd: 0 }}>{selectedDishes.reduce((sum, dish) => sum + DishServingHelper.normalizeTargetServings(value[dish.id], DishServingHelper.getBaseServings(dish)), 0)} phần</Tag>
        </Stack>
        <Stack direction='column' gap={10} align='stretch'>
            {selectedDishes.map(dish => {
                const baseServings = DishServingHelper.getBaseServings(dish);
                const targetServings = DishServingHelper.normalizeTargetServings(value[dish.id], baseServings);
                const scale = targetServings / baseServings;
                const presets = getPresetValues(baseServings);

                return <div key={dish.id} style={{
                    border: '1px solid #d6ecff',
                    borderRadius: 8,
                    background: '#fff',
                    padding: 10,
                    boxShadow: '0 2px 8px rgba(24, 144, 255, 0.06)',
                }}>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap' }}>
                        <div style={{ minWidth: 170, flex: '1 1 190px' }}>
                            <Typography.Text strong style={{ display: 'block', lineHeight: '19px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {dish.name}
                            </Typography.Text>
                            <Stack wrap='wrap' gap={5} style={{ marginTop: 5 }}>
                                <Tag style={{ marginInlineEnd: 0 }}>Gốc {baseServings}</Tag>
                                <Tag color={scale === 1 ? 'green' : scale > 1 ? 'orange' : 'blue'} style={{ marginInlineEnd: 0 }}>{scale === 1 ? 'Giữ nguyên' : `${scale.toFixed(1)}x`}</Tag>
                            </Stack>
                        </div>
                        <div style={{ flex: '0 1 210px', minWidth: 168 }}>
                            <ServingSizeInput
                                value={targetServings}
                                onChange={(nextValue) => _onServingChange(dish.id, nextValue)}
                                min={1}
                                max={99}
                                style={{ width: '100%' }}
                            />
                        </div>
                    </div>
                    <Stack wrap='wrap' gap={6} style={{ marginTop: 9 }}>
                        {presets.map(preset => {
                            const active = preset === targetServings;
                            return <button
                                key={preset}
                                type='button'
                                onClick={() => _onPresetClick(dish.id, preset)}
                                style={{
                                    border: active ? '1px solid #1677ff' : '1px solid #e5e7eb',
                                    background: active ? '#e6f4ff' : '#fff',
                                    color: active ? '#0958d9' : '#4b5563',
                                    borderRadius: 999,
                                    padding: '4px 10px',
                                    fontSize: 12,
                                    fontWeight: active ? 700 : 500,
                                    lineHeight: '18px',
                                    cursor: 'pointer',
                                }}
                            >{preset} phần</button>
                        })}
                    </Stack>
                </div>
            })}
        </Stack>
    </Box>;
};

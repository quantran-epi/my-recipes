/**
 * SharedSyncModal — lets the user selectively sync individual ingredients/dishes
 * from the shared-data.json snapshot. Shows impact warnings for removed/modified items.
 */
import React, { useEffect, useMemo, useState } from "react";
import { Badge, Checkbox, Divider, Flex, Spin, Tag, Typography } from "antd";
import { CloudDownloadOutlined, InfoCircleOutlined, WarningOutlined } from "@ant-design/icons";
import { Modal } from "@components/Modal";
import { Button } from "@components/Button";
import { useDispatch, useSelector } from "react-redux";
import { addIngredient, editIngredient, removeIngredient } from "@store/Reducers/IngredientReducer";
import { addDishes, editDishes, removeDishes } from "@store/Reducers/DishesReducer";
import { selectDishes, selectIngredients, selectScheduledMeals, selectShoppingLists } from "@store/Selectors";
import { SharedData, SharedItemChange, SharedManifest } from "../../Hooks/useSharedPublish";
import { SyncedVersions } from "../../Hooks/useSharedDataSync";
import { Ingredient } from "@store/Models/Ingredient";
import { Dishes } from "@store/Models/Dishes";

const SHARED_DATA_URL =
    "https://raw.githubusercontent.com/quantran-epi/my-recipes/refs/heads/main/docs/shared-data.json";

interface Props {
    open: boolean;
    manifest: SharedManifest;
    hasIngredientChanges: boolean;
    hasDishChanges: boolean;
    onDone: (synced: SyncedVersions) => void;
    onCancel: () => void;
}

const actionLabel = (action: SharedItemChange["action"]) => {
    if (action === "added") return <Tag color="green">Mới</Tag>;
    if (action === "modified") return <Tag color="blue">Thay đổi</Tag>;
    return <Tag color="red">Đã xoá</Tag>;
};

const defaultChecked = (action: SharedItemChange["action"]) => action !== "removed";

export const SharedSyncModal: React.FC<Props> = ({
    open,
    manifest,
    hasIngredientChanges,
    hasDishChanges,
    onDone,
    onCancel,
}) => {
    const dispatch = useDispatch();
    const existingIngredients = useSelector(selectIngredients);
    const existingDishes = useSelector(selectDishes);
    const shoppingLists = useSelector(selectShoppingLists);
    const scheduledMeals = useSelector(selectScheduledMeals);

    const [isFetching, setIsFetching] = useState(false);
    const [fetchError, setFetchError] = useState<string | null>(null);
    const [sharedData, setSharedData] = useState<SharedData | null>(null);

    const [selectedIngredients, setSelectedIngredients] = useState<Set<string>>(new Set());
    const [selectedDishes, setSelectedDishes] = useState<Set<string>>(new Set());

    // Initialise checkboxes from manifest defaults
    useEffect(() => {
        if (!open) return;
        setSelectedIngredients(new Set(
            manifest.ingredientChanges.filter(c => defaultChecked(c.action)).map(c => c.id)
        ));
        setSelectedDishes(new Set(
            manifest.dishChanges.filter(c => defaultChecked(c.action)).map(c => c.id)
        ));
    }, [open, manifest]);

    // Fetch shared-data.json when modal opens
    useEffect(() => {
        if (!open) return;
        setFetchError(null);
        setSharedData(null);
        setIsFetching(true);
        fetch(SHARED_DATA_URL + "?t=" + Date.now())
            .then(r => {
                if (!r.ok) throw new Error(`HTTP ${r.status}`);
                return r.json() as Promise<SharedData>;
            })
            .then(data => setSharedData(data))
            .catch(e => setFetchError(e?.message ?? "Lỗi không xác định"))
            .finally(() => setIsFetching(false));
    }, [open]);

    // Impact analysis: shopping lists / scheduled meals that reference a dish being removed/modified
    const dishImpacts = useMemo(() => {
        const impacts: Record<string, string[]> = {};
        manifest.dishChanges
            .filter(c => c.action === "removed" || c.action === "modified")
            .forEach(c => {
                const refs: string[] = [];
                shoppingLists.forEach(sl => {
                    if (sl.dishes?.includes(c.id)) refs.push(`Lịch mua sắm: ${sl.name}`);
                });
                scheduledMeals.forEach(sm => {
                    const allDishIds = [
                        ...(sm.meals?.breakfast ?? []),
                        ...(sm.meals?.lunch ?? []),
                        ...(sm.meals?.dinner ?? []),
                    ];
                    if (allDishIds.includes(c.id)) refs.push(`Thực đơn: ${sm.name}`);
                });
                if (refs.length > 0) impacts[c.id] = refs;
            });
        return impacts;
    }, [manifest, shoppingLists, scheduledMeals]);

    const toggleIngredient = (id: string, checked: boolean) => {
        setSelectedIngredients(prev => {
            const next = new Set(prev);
            checked ? next.add(id) : next.delete(id);
            return next;
        });
    };

    const toggleDish = (id: string, checked: boolean) => {
        setSelectedDishes(prev => {
            const next = new Set(prev);
            checked ? next.add(id) : next.delete(id);
            return next;
        });
    };

    const handleSync = () => {
        if (!sharedData) return;

        // ── Ingredients ──────────────────────────────────────────────────────
        manifest.ingredientChanges
            .filter(c => selectedIngredients.has(c.id))
            .forEach(c => {
                if (c.action === "removed") {
                    dispatch(removeIngredient([c.id]));
                } else {
                    const item = sharedData.ingredients.find((i: Ingredient) => i.id === c.id);
                    if (!item) return;
                    const exists = existingIngredients.some(i => i.id === c.id);
                    exists ? dispatch(editIngredient(item)) : dispatch(addIngredient(item));
                }
            });

        // ── Dishes ───────────────────────────────────────────────────────────
        manifest.dishChanges
            .filter(c => selectedDishes.has(c.id))
            .forEach(c => {
                if (c.action === "removed") {
                    dispatch(removeDishes([c.id]));
                } else {
                    const item = sharedData.dishes.find((d: Dishes) => d.id === c.id);
                    if (!item) return;
                    const exists = existingDishes.some(d => d.id === c.id);
                    exists ? dispatch(editDishes(item)) : dispatch(addDishes(item));
                }
            });

        onDone({
            ingredientsVersion: hasIngredientChanges ? manifest.ingredientsVersion : "",
            dishesVersion: hasDishChanges ? manifest.dishesVersion : "",
        });
    };

    const totalSelected = selectedIngredients.size + selectedDishes.size;

    return (
        <Modal
            open={open}
            title={
                <Flex align="center" gap={8}>
                    <CloudDownloadOutlined style={{ color: "#1677ff", fontSize: 18 }} />
                    <span>Có dữ liệu dùng chung mới</span>
                </Flex>
            }
            onCancel={onCancel}
            destroyOnClose
            footer={
                <Flex justify="flex-end" gap={8}>
                    <Button onClick={onCancel}>Để sau</Button>
                    <Button
                        type="primary"
                        loading={isFetching}
                        disabled={totalSelected === 0 || !!fetchError}
                        onClick={handleSync}
                    >
                        Đồng bộ {totalSelected > 0 ? `(${totalSelected})` : ""}
                    </Button>
                </Flex>
            }
            width={520}
        >
            {isFetching && (
                <Flex justify="center" style={{ padding: 32 }}>
                    <Spin tip="Đang tải dữ liệu..." />
                </Flex>
            )}
            {fetchError && (
                <Typography.Text type="danger">
                    <InfoCircleOutlined /> Không thể tải dữ liệu: {fetchError}
                </Typography.Text>
            )}
            {!isFetching && !fetchError && (
                <>
                    <Typography.Text type="secondary" style={{ fontSize: 13 }}>
                        Chọn những mục bạn muốn cập nhật vào thiết bị này:
                    </Typography.Text>

                    {/* ── Ingredients ──────────────────────────────────────── */}
                    {hasIngredientChanges && (
                        <>
                            <Divider orientation="left" style={{ marginTop: 16, marginBottom: 8 }}>
                                <Typography.Text strong>Nguyên liệu</Typography.Text>
                                <Badge count={manifest.ingredientChanges.length} style={{ marginLeft: 8, backgroundColor: "#1677ff" }} />
                            </Divider>
                            <Flex vertical gap={6}>
                                {manifest.ingredientChanges.map(c => (
                                    <Flex key={c.id} align="center" gap={8}>
                                        <Checkbox
                                            checked={selectedIngredients.has(c.id)}
                                            onChange={e => toggleIngredient(c.id, e.target.checked)}
                                        />
                                        {actionLabel(c.action)}
                                        <Typography.Text>{c.name}</Typography.Text>
                                    </Flex>
                                ))}
                            </Flex>
                        </>
                    )}

                    {/* ── Dishes ───────────────────────────────────────────── */}
                    {hasDishChanges && (
                        <>
                            <Divider orientation="left" style={{ marginTop: 16, marginBottom: 8 }}>
                                <Typography.Text strong>Món ăn</Typography.Text>
                                <Badge count={manifest.dishChanges.length} style={{ marginLeft: 8, backgroundColor: "#1677ff" }} />
                            </Divider>
                            <Flex vertical gap={6}>
                                {manifest.dishChanges.map(c => (
                                    <Flex key={c.id} vertical gap={4}>
                                        <Flex align="center" gap={8}>
                                            <Checkbox
                                                checked={selectedDishes.has(c.id)}
                                                onChange={e => toggleDish(c.id, e.target.checked)}
                                            />
                                            {actionLabel(c.action)}
                                            <Typography.Text>{c.name}</Typography.Text>
                                        </Flex>
                                        {dishImpacts[c.id] && (
                                            <Flex vertical style={{ paddingLeft: 28 }}>
                                                {dishImpacts[c.id].map((ref, i) => (
                                                    <Typography.Text key={i} type="warning" style={{ fontSize: 12 }}>
                                                        <WarningOutlined /> {ref}
                                                    </Typography.Text>
                                                ))}
                                            </Flex>
                                        )}
                                    </Flex>
                                ))}
                            </Flex>
                        </>
                    )}
                </>
            )}
        </Modal>
    );
};

/**
 * SharedSyncModal — lets the user selectively sync individual ingredients/dishes
 * from the shared-data.json snapshot. Shows impact warnings for removed/modified items.
 */
import React, { useEffect, useState } from "react";
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

type ImpactStatus = "pending" | "ready";

const scheduleAfterPaint = (callback: () => void) => {
    let timerHandle: number | null = null;
    const frameHandle = window.requestAnimationFrame(() => {
        timerHandle = window.setTimeout(callback, 0);
    });

    return () => {
        window.cancelAnimationFrame(frameHandle);
        if (timerHandle !== null) window.clearTimeout(timerHandle);
    };
};

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
    const [impactStatus, setImpactStatus] = useState<ImpactStatus>("ready");
    const [dishImpacts, setDishImpacts] = useState<Record<string, string[]>>({});

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

    // Fetch shared-data.json after the manifest-driven modal shell has painted.
    useEffect(() => {
        if (!open) return;
        let cancelled = false;
        let cancelSchedule: (() => void) | null = null;

        setFetchError(null);
        setSharedData(null);
        setIsFetching(false);

        cancelSchedule = scheduleAfterPaint(() => {
            if (cancelled) return;
            setIsFetching(true);
            fetch(SHARED_DATA_URL + "?t=" + Date.now())
                .then(r => {
                    if (!r.ok) throw new Error(`HTTP ${r.status}`);
                    return r.text();
                })
                .then(text => {
                    if (!text || !text.trim()) throw new Error("Dữ liệu chia sẻ trống");
                    return JSON.parse(text) as SharedData;
                })
                .then(data => {
                    if (!cancelled) setSharedData(data);
                })
                .catch(e => {
                    if (!cancelled) setFetchError(e?.message ?? "Lỗi không xác định");
                })
                .finally(() => {
                    if (!cancelled) setIsFetching(false);
                });
        });

        return () => {
            cancelled = true;
            cancelSchedule?.();
        };
    }, [open]);

    // Impact analysis is scheduled so warnings can fill in after selectable rows appear.
    useEffect(() => {
        if (!open) return;
        const impactCandidates = manifest.dishChanges.filter(c => c.action === "removed" || c.action === "modified");
        if (impactCandidates.length === 0) {
            setDishImpacts({});
            setImpactStatus("ready");
            return;
        }

        let cancelled = false;
        setDishImpacts({});
        setImpactStatus("pending");

        const cancelSchedule = scheduleAfterPaint(() => {
            const impacts: Record<string, string[]> = {};
            impactCandidates.forEach(c => {
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

            if (cancelled) return;
            setDishImpacts(impacts);
            setImpactStatus("ready");
        });

        return () => {
            cancelled = true;
            cancelSchedule();
        };
    }, [open, manifest, shoppingLists, scheduledMeals]);

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

        const syncedIngredients = manifest.ingredientChanges.some(c => selectedIngredients.has(c.id));
        const syncedDishes = manifest.dishChanges.some(c => selectedDishes.has(c.id));

        onDone({
            ingredientsVersion: syncedIngredients ? manifest.ingredientsVersion : "",
            dishesVersion: syncedDishes ? manifest.dishesVersion : "",
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
                        disabled={totalSelected === 0 || sharedData === null || isFetching || !!fetchError}
                        onClick={handleSync}
                    >
                        Đồng bộ {totalSelected > 0 ? `(${totalSelected})` : ""}
                    </Button>
                </Flex>
            }
            width={520}
        >
            <Typography.Text type="secondary" style={{ fontSize: 13 }}>
                Chọn những mục bạn muốn cập nhật vào thiết bị này:
            </Typography.Text>

            {isFetching && (
                <Flex align="center" gap={8} style={{ marginTop: 12, padding: "8px 10px", border: "1px solid #f0f0f0", borderRadius: 8, background: "#fafafa" }}>
                    <Spin size="small" />
                    <Typography.Text type="secondary" style={{ fontSize: 12 }}>Đang tải dữ liệu...</Typography.Text>
                </Flex>
            )}
            {fetchError && (
                <Typography.Text type="danger" style={{ display: "block", marginTop: 12 }}>
                    <InfoCircleOutlined /> Không thể tải dữ liệu: {fetchError}
                </Typography.Text>
            )}

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
                    {impactStatus === "pending" && (
                        <Flex align="center" gap={8} style={{ marginBottom: 8 }}>
                            <Spin size="small" />
                            <Typography.Text type="secondary" style={{ fontSize: 12 }}>Đang kiểm tra ảnh hưởng...</Typography.Text>
                        </Flex>
                    )}
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
        </Modal>
    );
};

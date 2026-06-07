/**
 * SharedSyncModal — lets the user selectively sync individual ingredients/dishes
 * from split shared snapshots. Shows impact warnings for removed/modified items.
 */
import React, { useEffect, useMemo, useState } from "react";
import { Badge, Checkbox, Divider, Flex, Spin, Tag, Typography } from "antd";
import { CloudDownloadOutlined, InfoCircleOutlined, WarningOutlined } from "@ant-design/icons";
import { Modal } from "@components/Modal";
import { useModal } from "@components/Modal/ModalProvider";
import { Button } from "@components/Button";
import { useDispatch, useSelector } from "react-redux";
import { addIngredient, editIngredient, removeIngredient } from "@store/Reducers/IngredientReducer";
import { addDishes, editDishes, removeDishes } from "@store/Reducers/DishesReducer";
import { selectDishes, selectIngredients, selectScheduledMeals, selectSharedConfig, selectShoppingLists } from "@store/Selectors";
import { getSharedConfigUrl, getSharedDishesUrl, getSharedIngredientsUrl, SharedData, SharedItemChange, SharedManifest } from "../../Hooks/useSharedPublish";
import { SyncedVersions } from "../../Hooks/useSharedDataSync";
import { Ingredient } from "@store/Models/Ingredient";
import { Dishes } from "@store/Models/Dishes";
import { normalizeSharedConfig, SharedConfig } from "@store/Models/SharedConfig";
import { replaceSharedConfig } from "@store/Reducers/SharedConfigReducer";

interface Props {
    open: boolean;
    manifest: SharedManifest;
    hasIngredientChanges: boolean;
    hasDishChanges: boolean;
    hasConfigChanges: boolean;
    force?: boolean;
    onDone: (synced: SyncedVersions) => void;
    onCancel: () => void;
}

const actionLabel = (action: SharedItemChange["action"]) => {
    if (action === "added") return <Tag color="green">Mới</Tag>;
    if (action === "modified") return <Tag color="blue">Thay đổi</Tag>;
    if (action === "removed") return <Tag color="red">Đã xoá</Tag>;
    return <Tag color="geekblue">Đồng bộ</Tag>;
};

const defaultChecked = (action: SharedItemChange["action"]) => action !== "removed";

type ImpactStatus = "pending" | "ready";
const APP_CONFIRM_Z_INDEX = 5200;

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

export const deriveSnapshotChanges = <T extends { id: string; name: string }>(
    remoteItems: T[],
    localItems: T[],
    manifestChanges: SharedItemChange[],
    force?: boolean,
): SharedItemChange[] => {
    const localById = new Map(localItems.map(item => [item.id, item]));
    const remoteById = new Map(remoteItems.map(item => [item.id, item]));
    const changesById = new Map<string, SharedItemChange>();

    manifestChanges.forEach(change => {
        const remoteItem = remoteById.get(change.id);
        const localItem = localById.get(change.id);

        if (!localItem && remoteItem) {
            changesById.set(change.id, { id: change.id, name: change.name, action: "added" });
            return;
        }

        if (!remoteItem && localItem) {
            changesById.set(change.id, { id: change.id, name: change.name, action: "removed" });
            return;
        }

        changesById.set(change.id, change);
    });

    remoteItems.forEach(item => {
        if (changesById.has(item.id)) return;
        const localItem = localById.get(item.id);
        if (!localItem) {
            changesById.set(item.id, { id: item.id, name: item.name, action: "added" });
            return;
        }
        if (JSON.stringify(localItem) !== JSON.stringify(item)) {
            changesById.set(item.id, { id: item.id, name: item.name, action: "modified" });
        }
    });

    localItems.forEach(item => {
        if (remoteById.has(item.id) || changesById.has(item.id)) return;
        changesById.set(item.id, { id: item.id, name: item.name, action: "removed" });
    });

    const changes = Array.from(changesById.values());
    if (force && changes.length === 0) {
        return remoteItems.map(item => ({ id: item.id, name: item.name, action: "sync" }));
    }

    return changes;
};

const deriveConfigChanges = (
    remoteConfig: SharedConfig | undefined,
    localConfig: SharedConfig,
    manifestChanges: SharedItemChange[],
    force?: boolean,
): SharedItemChange[] => {
    if (!remoteConfig) return manifestChanges;
    const normalizedRemote = normalizeSharedConfig(remoteConfig);
    const normalizedLocal = normalizeSharedConfig(localConfig);
    if (JSON.stringify(normalizedRemote) !== JSON.stringify(normalizedLocal)) {
        return manifestChanges.length > 0
            ? manifestChanges
            : [{ id: "inventory-config", name: "Cấu hình tồn kho", action: "modified" }];
    }
    if (force) return [{ id: "inventory-config", name: "Cấu hình tồn kho", action: "sync" }];
    return [];
};

export const SharedSyncModal: React.FC<Props> = ({
    open,
    manifest,
    hasIngredientChanges,
    hasDishChanges,
    hasConfigChanges,
    force,
    onDone,
    onCancel,
}) => {
    const dispatch = useDispatch();
    const modal = useModal();
    const existingIngredients = useSelector(selectIngredients);
    const existingDishes = useSelector(selectDishes);
    const existingConfig = useSelector(selectSharedConfig);
    const shoppingLists = useSelector(selectShoppingLists);
    const scheduledMeals = useSelector(selectScheduledMeals);

    const [isFetching, setIsFetching] = useState(false);
    const [fetchError, setFetchError] = useState<string | null>(null);
    const [sharedData, setSharedData] = useState<Partial<SharedData>>({});
    const [impactStatus, setImpactStatus] = useState<ImpactStatus>("ready");
    const [dishImpacts, setDishImpacts] = useState<Record<string, string[]>>({});

    const [selectedIngredients, setSelectedIngredients] = useState<Set<string>>(new Set());
    const [selectedDishes, setSelectedDishes] = useState<Set<string>>(new Set());
    const [selectedConfig, setSelectedConfig] = useState(false);
    const shouldFetchIngredients = force || hasIngredientChanges || (manifest.ingredientChanges?.length ?? 0) > 0;
    const shouldFetchDishes = force || hasDishChanges || (manifest.dishChanges?.length ?? 0) > 0;
    const shouldFetchConfig = Boolean(manifest.configVersion || manifest.parts.config.version) && (force || hasConfigChanges || (manifest.configChanges?.length ?? 0) > 0);
    const requiredPartsLoaded =
        (!shouldFetchIngredients || !!sharedData.ingredients) &&
        (!shouldFetchDishes || !!sharedData.dishes) &&
        (!shouldFetchConfig || !!sharedData.config);

    const ingredientChanges = useMemo(() => {
        if (!sharedData.ingredients) return manifest.ingredientChanges;
        return deriveSnapshotChanges(sharedData.ingredients, existingIngredients, manifest.ingredientChanges, force);
    }, [sharedData.ingredients, existingIngredients, manifest.ingredientChanges, force]);

    const dishChanges = useMemo(() => {
        if (!sharedData.dishes) return manifest.dishChanges;
        return deriveSnapshotChanges(sharedData.dishes, existingDishes, manifest.dishChanges, force);
    }, [sharedData.dishes, existingDishes, manifest.dishChanges, force]);

    const configChanges = useMemo(() => {
        return deriveConfigChanges(sharedData.config, existingConfig, manifest.configChanges, force);
    }, [sharedData.config, existingConfig, manifest.configChanges, force]);

    const hasIngredientRows = ingredientChanges.length > 0;
    const hasDishRows = dishChanges.length > 0;
    const hasConfigRows = configChanges.length > 0;
    const hasManifestChanges = hasIngredientChanges || hasDishChanges || hasConfigChanges;

    // Initialise checkboxes from manifest defaults
    useEffect(() => {
        if (!open) return;
        setSelectedIngredients(new Set(
            ingredientChanges.filter(c => defaultChecked(c.action)).map(c => c.id)
        ));
        setSelectedDishes(new Set(
            dishChanges.filter(c => defaultChecked(c.action)).map(c => c.id)
        ));
        setSelectedConfig(configChanges.some(c => defaultChecked(c.action)));
    }, [open, ingredientChanges, dishChanges, configChanges]);

    // Fetch only the split data parts needed by this sync after the modal shell has painted.
    useEffect(() => {
        if (!open) return;
        let cancelled = false;
        let cancelSchedule: (() => void) | null = null;

        setFetchError(null);
        setSharedData({});
        setIsFetching(false);

        cancelSchedule = scheduleAfterPaint(() => {
            if (cancelled) return;
            if (!shouldFetchIngredients && !shouldFetchDishes && !shouldFetchConfig) return;
            setIsFetching(true);
            const fetchPart = async <T,>(url: string): Promise<T> => {
                const res = await fetch(url + "?t=" + Date.now());
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                const text = await res.text();
                if (!text || !text.trim()) throw new Error("Dữ liệu chia sẻ trống");
                return JSON.parse(text) as T;
            };

            Promise.all([
                shouldFetchIngredients ? fetchPart<Ingredient[]>(getSharedIngredientsUrl()) : Promise.resolve(undefined),
                shouldFetchDishes ? fetchPart<Dishes[]>(getSharedDishesUrl()) : Promise.resolve(undefined),
                shouldFetchConfig ? fetchPart<SharedConfig>(getSharedConfigUrl()) : Promise.resolve(undefined),
            ])
                .then(([ingredients, dishes, config]) => {
                    if (!cancelled) setSharedData({ ingredients, dishes, config: config ? normalizeSharedConfig(config) : undefined });
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
    }, [open, shouldFetchIngredients, shouldFetchDishes, shouldFetchConfig]);

    // Impact analysis is scheduled so warnings can fill in after selectable rows appear.
    useEffect(() => {
        if (!open) return;
        const impactCandidates = dishChanges.filter(c => c.action === "removed" || c.action === "modified");
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
    }, [open, dishChanges, shoppingLists, scheduledMeals]);

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
        if (!requiredPartsLoaded) return;

        // ── Ingredients ──────────────────────────────────────────────────────
        ingredientChanges
            .filter(c => selectedIngredients.has(c.id))
            .forEach(c => {
                if (c.action === "removed") {
                    dispatch(removeIngredient([c.id]));
                } else {
                    const item = sharedData.ingredients?.find((i: Ingredient) => i.id === c.id);
                    if (!item) return;
                    const exists = existingIngredients.some(i => i.id === c.id);
                    exists ? dispatch(editIngredient(item)) : dispatch(addIngredient(item));
                }
            });

        // ── Dishes ───────────────────────────────────────────────────────────
        dishChanges
            .filter(c => selectedDishes.has(c.id))
            .forEach(c => {
                if (c.action === "removed") {
                    dispatch(removeDishes([c.id]));
                } else {
                    const item = sharedData.dishes?.find((d: Dishes) => d.id === c.id);
                    if (!item) return;
                    const exists = existingDishes.some(d => d.id === c.id);
                    exists ? dispatch(editDishes(item)) : dispatch(addDishes(item));
                }
            });

        // ── Shared config ───────────────────────────────────────────────────
        if (selectedConfig && sharedData.config) {
            dispatch(replaceSharedConfig(sharedData.config));
        }

        const syncedIngredients = ingredientChanges.some(c => selectedIngredients.has(c.id));
        const syncedDishes = dishChanges.some(c => selectedDishes.has(c.id));
        const syncedConfig = selectedConfig && configChanges.length > 0;

        onDone({
            ingredientsVersion: syncedIngredients ? manifest.ingredientsVersion : "",
            dishesVersion: syncedDishes ? manifest.dishesVersion : "",
            configVersion: syncedConfig ? manifest.configVersion : "",
        });
    };

    const confirmSync = () => {
        modal.confirm({
            title: "Xác nhận đồng bộ dữ liệu dùng chung",
            content: `Thao tác này sẽ cập nhật ${selectedIngredients.size} nguyên liệu, ${selectedDishes.size} món ăn${selectedConfig ? " và cấu hình tồn kho" : ""} đã chọn trên thiết bị này. Bạn có chắc muốn đồng bộ?`,
            okText: "Đồng bộ",
            cancelText: "Hủy",
            centered: true,
            zIndex: APP_CONFIRM_Z_INDEX,
            onOk: handleSync,
        });
    };

    const totalSelected = selectedIngredients.size + selectedDishes.size + (selectedConfig ? 1 : 0);

    return (
        <Modal
            open={open}
            title={
                <Flex align="center" gap={8}>
                    <CloudDownloadOutlined style={{ color: "#1677ff", fontSize: 18 }} />
                    <span>{hasManifestChanges ? "Có dữ liệu dùng chung mới" : "Đồng bộ dữ liệu dùng chung"}</span>
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
                        disabled={totalSelected === 0 || !requiredPartsLoaded || isFetching || !!fetchError}
                        onClick={confirmSync}
                    >
                        Đồng bộ {totalSelected > 0 ? `(${totalSelected})` : ""}
                    </Button>
                </Flex>
            }
            width={520}
        >
            <Typography.Text type="secondary" style={{ fontSize: 13 }}>
                {hasManifestChanges
                    ? "Chọn những mục bạn muốn cập nhật vào thiết bị này:"
                    : "Không có thay đổi mới trong manifest. Bạn vẫn có thể ép đồng bộ dữ liệu từ bản dùng chung:"}
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
            {hasIngredientRows && (
                <>
                    <Divider orientation="left" style={{ marginTop: 16, marginBottom: 8 }}>
                        <Typography.Text strong>Nguyên liệu</Typography.Text>
                        <Badge count={ingredientChanges.length} style={{ marginLeft: 8, backgroundColor: "#1677ff" }} />
                    </Divider>
                    <Flex vertical gap={6}>
                        {ingredientChanges.map(c => (
                            <Flex key={c.id} data-testid={`shared-sync-ingredient-${c.id}`} align="center" gap={8}>
                                <Checkbox
                                    data-testid={`shared-sync-ingredient-checkbox-${c.id}`}
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
            {hasDishRows && (
                <>
                    <Divider orientation="left" style={{ marginTop: 16, marginBottom: 8 }}>
                        <Typography.Text strong>Món ăn</Typography.Text>
                        <Badge count={dishChanges.length} style={{ marginLeft: 8, backgroundColor: "#1677ff" }} />
                    </Divider>
                    {impactStatus === "pending" && (
                        <Flex align="center" gap={8} style={{ marginBottom: 8 }}>
                            <Spin size="small" />
                            <Typography.Text type="secondary" style={{ fontSize: 12 }}>Đang kiểm tra ảnh hưởng...</Typography.Text>
                        </Flex>
                    )}
                    <Flex vertical gap={6}>
                        {dishChanges.map(c => (
                            <Flex key={c.id} data-testid={`shared-sync-dish-${c.id}`} vertical gap={4}>
                                <Flex align="center" gap={8}>
                                    <Checkbox
                                        data-testid={`shared-sync-dish-checkbox-${c.id}`}
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

            {/* ── Shared config ───────────────────────────────────── */}
            {hasConfigRows && (
                <>
                    <Divider orientation="left" style={{ marginTop: 16, marginBottom: 8 }}>
                        <Typography.Text strong>Cấu hình dùng chung</Typography.Text>
                        <Badge count={configChanges.length} style={{ marginLeft: 8, backgroundColor: "#722ed1" }} />
                    </Divider>
                    <Flex vertical gap={6}>
                        {configChanges.map(c => (
                            <Flex key={c.id} data-testid={`shared-sync-config-${c.id}`} align="center" gap={8}>
                                <Checkbox
                                    data-testid={`shared-sync-config-checkbox-${c.id}`}
                                    checked={selectedConfig}
                                    onChange={e => setSelectedConfig(e.target.checked)}
                                />
                                {actionLabel(c.action)}
                                <Typography.Text>{c.name}</Typography.Text>
                            </Flex>
                        ))}
                    </Flex>
                </>
            )}
            {!isFetching && sharedData && !hasIngredientRows && !hasDishRows && !hasConfigRows && (
                <Typography.Text type="secondary" style={{ display: "block", marginTop: 12, fontSize: 12 }}>
                    Không có mục dùng chung nào để đồng bộ.
                </Typography.Text>
            )}
        </Modal>
    );
};

import { DeleteOutlined, EditOutlined, PlusOutlined, DatabaseOutlined, FireOutlined, BarChartOutlined } from "@ant-design/icons";
import { Button } from "@components/Button";
import { Input } from "@components/Form/Input";
import { Image } from "@components/Image";
import { Space } from "@components/Layout/Space";
import { Stack } from "@components/Layout/Stack";
import { List } from "@components/List";
import { Modal } from "@components/Modal";
import { Popconfirm } from "@components/Popconfirm";
import { Tooltip } from "@components/Tootip";
import { Typography } from "@components/Typography";
import { useScreenTitle, useToggle, useAdminMode } from "@hooks";
import { InventoryHelper } from "@common/Helpers/InventoryHelper";
import { Ingredient, INGREDIENT_SHELF_LIFE_OPTIONS } from "@store/Models/Ingredient";
import { removeIngredient } from "@store/Reducers/IngredientReducer";
import { selectIngredients, selectInventoryById } from "@store/Selectors";
import { RootState } from "@store/Store";
import { debounce, sortBy } from "lodash";
import React, { useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { List as VirtualList, type RowComponentProps } from "react-window";
import VegetablesIcon from "../../../../assets/icons/vegetable.png";
import { IngredientAddWidget } from "./IngredientAdd.widget";
import { IngredientEditWidget } from "./IngredientEdit.widget";
import { IngredientInventoryWidget } from "./IngredientInventory.widget";
import { UseFirstWidget } from "./UseFirst.widget";
import { IngredientStatsWidget } from "./IngredientStats.widget";
import { DishSuggesterScreen } from "@modules/DishSuggester/Screens/DishSuggester.screen";

type IngredientRowProps = { items: Ingredient[]; onDelete: (item: Ingredient) => void; isAdmin: boolean; onSuggest: (ids: string[]) => void; };

const IngredientRow = ({ index, style, items, onDelete, isAdmin, onSuggest }: RowComponentProps<IngredientRowProps>) => {
    if (!items[index]) return null;
    return <div style={style}><IngredientItem item={items[index]} onDelete={onDelete} isAdmin={isAdmin} onSuggest={onSuggest} /></div>;
};

export const IngredientListScreen = () => {
    const ingredients = useSelector((state: RootState) => state.shared.ingredient.ingredients);    const toggleAddModal = useToggle({ defaultValue: false });
    const dispatch = useDispatch();
    const { } = useScreenTitle({ value: "Nguyên liệu", deps: [] });
    const [searchText, setSearchText] = useState("");
    const { isAdmin } = useAdminMode();

    const toggleUseFirst = useToggle({ defaultValue: false });
    const toggleStats = useToggle({ defaultValue: false });
    const toggleSuggester = useToggle({ defaultValue: false });
    const [suggestIds, setSuggestIds] = useState<string[]>([]);

    const _onSuggest = (ids: string[]) => {
        setSuggestIds(ids);
        toggleSuggester.show();
    };

    const filteredIngredients = useMemo(() => {
        return sortBy(ingredients.filter(e => e.name.trim().toLowerCase().includes(searchText.trim().toLowerCase())), "name");
    }, [ingredients, searchText])

    const _onAdd = () => {
        toggleAddModal.show();
    }

    const _onDelete = (item) => {
        dispatch(removeIngredient([item.id]));
    }

    return <React.Fragment>
        <Stack.Compact style={{ marginBottom: 8 }}>
            <Input allowClear placeholder="Tìm kiếm" onChange={debounce((e) => setSearchText(e.target.value), 350)} />
            {isAdmin && <Button onClick={_onAdd} icon={<PlusOutlined />} />}
            <Tooltip title="Dùng trước hết hạn">
                <Button onClick={toggleUseFirst.show} icon={<FireOutlined style={{ color: "#ff4d4f" }} />} />
            </Tooltip>
            <Tooltip title="Thống kê nguyên liệu">
                <Button onClick={toggleStats.show} icon={<BarChartOutlined style={{ color: "#1677ff" }} />} />
            </Tooltip>
        </Stack.Compact>
        <VirtualList
            rowComponent={IngredientRow}
            rowCount={filteredIngredients.length}
            rowHeight={57}
            rowProps={{ items: filteredIngredients, onDelete: _onDelete, isAdmin, onSuggest: _onSuggest }}
            style={{ height: window.screen.availHeight - 210 - 80 }}
        />
        <Modal open={toggleAddModal.value} title={
            <Space>
                <Image src={VegetablesIcon} preview={false} width={24} style={{ marginBottom: 3 }} />
                Thêm nguyên liệu
            </Space>
        } destroyOnClose={true} onCancel={toggleAddModal.hide} footer={null}>
            <IngredientAddWidget />
        </Modal>
        <UseFirstWidget
            open={toggleUseFirst.value}
            onClose={toggleUseFirst.hide}
            onSuggest={_onSuggest}
        />
        <IngredientStatsWidget
            open={toggleStats.value}
            onClose={toggleStats.hide}
        />
        <DishSuggesterScreen
            open={toggleSuggester.value}
            onClose={toggleSuggester.hide}
            initialIngredientIds={suggestIds}
        />
    </React.Fragment>
}

type IngredientItemProps = {
    item: Ingredient;
    onDelete: (item: Ingredient) => void;
    isAdmin: boolean;
    onSuggest: (ids: string[]) => void;
}

export const IngredientItem: React.FunctionComponent<IngredientItemProps> = (props) => {
    const toggleEdit = useToggle({ defaultValue: false });
    const toggleInventory = useToggle({ defaultValue: false });

    const inv = useSelector(selectInventoryById(props.item.id));
    const totalAmt = InventoryHelper.totalAmount(inv);
    const invLabel = inv ? `${totalAmt} ${inv.unit}` : null;
    const invColor = !inv ? "#aaa" : totalAmt <= 0 ? "#ff4d4f" : totalAmt <= 2 ? "#faad14" : "#52c41a";

    return <React.Fragment>
        <div style={{ display: 'flex', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid rgba(5,5,5,0.06)', gap: 10 }}>
            {/* Name */}
            <div style={{ flex: 1, minWidth: 0 }}>
                <Tooltip title={props.item.name}>
                    <Typography.Paragraph style={{ width: 160, marginBottom: 0 }} ellipsis>{props.item.name}</Typography.Paragraph>
                </Tooltip>
                <Stack gap={4} align="center">
                    {props.item.category && (
                        <Typography.Text type="secondary" style={{ fontSize: 11 }}>{props.item.category}</Typography.Text>
                    )}
                    {props.item.shelfLife && (() => {
                        const opt = INGREDIENT_SHELF_LIFE_OPTIONS.find(o => o.value === props.item.shelfLife);
                        return opt ? (
                            <Tooltip title={opt.description}>
                                <span style={{ fontSize: 11, color: opt.color, fontWeight: 500, cursor: "default" }}>
                                    {opt.emoji} {opt.label}
                                </span>
                            </Tooltip>
                        ) : null;
                    })()}
                </Stack>
            </div>

            {/* Inventory badge */}
            <Tooltip title={inv ? `Tồn kho: ${totalAmt} ${inv.unit}` : "Chưa cập nhật tồn kho"}>
                <div
                    onClick={toggleInventory.show}
                    style={{
                        padding: "2px 10px", borderRadius: 12, fontSize: 12, fontWeight: 600,
                        background: invColor + "22", color: invColor, cursor: "pointer",
                        border: `1px solid ${invColor}44`, whiteSpace: "nowrap", flexShrink: 0,
                    }}
                >
                    {invLabel ?? "—"}
                </div>
            </Tooltip>

            {/* Action buttons */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                {props.isAdmin && <Button size="small" onClick={toggleEdit.show} icon={<EditOutlined />} />}
                {props.isAdmin && (
                    <Popconfirm title="Xóa?" onConfirm={() => props.onDelete(props.item)}>
                        <Button size="small" danger icon={<DeleteOutlined />} />
                    </Popconfirm>
                )}
            </div>
        </div>

        {/* Edit modal */}
        <Modal open={toggleEdit.value} title={
            <Space>
                <Image src={VegetablesIcon} preview={false} width={24} style={{ marginBottom: 3 }} />
                Chỉnh sửa nguyên liệu
            </Space>
        } destroyOnClose={true} onCancel={toggleEdit.hide} footer={null}>
            <IngredientEditWidget item={props.item} onDone={() => toggleEdit.hide()} />
        </Modal>

        {/* Inventory modal */}
        <Modal open={toggleInventory.value} title={
            <Space>
                <DatabaseOutlined />
                Tồn kho — {props.item.name}
            </Space>
        } destroyOnClose={true} onCancel={toggleInventory.hide} footer={null}>
            <IngredientInventoryWidget item={props.item} onDone={toggleInventory.hide} onSuggest={props.onSuggest} />
        </Modal>
    </React.Fragment>
}


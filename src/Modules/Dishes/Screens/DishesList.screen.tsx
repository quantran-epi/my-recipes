import { CheckCircleOutlined, ClockCircleOutlined, CopyOutlined, DeleteOutlined, EditOutlined, ExclamationCircleOutlined, FileTextOutlined, HolderOutlined, PlusOutlined, QuestionCircleOutlined, FireOutlined } from "@ant-design/icons";
import { Button } from "@components/Button";
import { Dropdown } from "@components/Dropdown";
import { Input } from "@components/Form/Input";
import { Image } from "@components/Image";
import { Box } from "@components/Layout/Box";
import { Space } from "@components/Layout/Space";
import { Stack } from "@components/Layout/Stack";
import { List } from "@components/List";
import { useMessage } from "@components/Message";
import { Modal } from "@components/Modal";
import { Popover } from "@components/Popover";
import { Tag } from "@components/Tag";
import { Tooltip } from "@components/Tootip";
import { Typography } from "@components/Typography";
import { useScreenTitle, useToggle, useAdminMode } from "@hooks";
import { DISH_TAGS, DishDuration, Dishes } from "@store/Models/Dishes";
import { DishesDurationEditParams, duplicateDish, removeDishes, updateDishDuration } from "@store/Reducers/DishesReducer";
import { RootState } from "@store/Store";
import { RootRoutes } from "@routing/RootRoutes";
import { debounce, orderBy, sortBy } from "lodash";
import React, { useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { List as VirtualList, useDynamicRowHeight, type RowComponentProps } from "react-window";
import Clock2Icon from "../../../../assets/icons/clock (2).png";
import NoodlesIcon from "../../../../assets/icons/noodles.png";
import StepsIcon from "../../../../assets/icons/process.png";
import VegetablesIcon from "../../../../assets/icons/vegetable.png";
import { DishesAddWidget } from "./DishesAdd.widget";
import { DishesExportWidget } from "./DishesExport.widget";
import { DishesEditWidget } from "./DishesEdit.widget";
import { DishesDetailWidget } from "./DishesManageIngredient/DishDetail.widget";
import { DishImageWidget } from "./DishesManageIngredient/DishImage.widget";
import { DishDurationWidget } from "./DishesManageIngredient/DishDuration.widget";
import { CookingSessionWidget } from "./CookingSession.widget";
import moment from "moment";
import 'moment/locale/vi';

type DishRowProps = { dishes: Dishes[]; onDelete: (item: Dishes) => void; onDuplicate: (item: Dishes) => void; isAdmin: boolean; };

const DishRow = ({ index, style, dishes, onDelete, onDuplicate, isAdmin }: RowComponentProps<DishRowProps>) => {
    if (!dishes[index]) return null;
    return <div style={style}><DishesItem item={dishes[index]} onDelete={onDelete} onDuplicate={onDuplicate} isAdmin={isAdmin} /></div>;
};

export const DishesListScreen = () => {
    const dishes = useSelector((state: RootState) => state.shared.dishes.dishes);
    const toggleAddModal = useToggle({ defaultValue: false });
    const [searchText, setSearchText] = useState<string>("");
    const [activeTag, setActiveTag] = useState<string | null>(null);
    const dispatch = useDispatch();
    const { } = useScreenTitle({ value: "Món ăn", deps: [] });
    const rowHeight = useDynamicRowHeight({ defaultRowHeight: 204, key: searchText + (activeTag ?? "") });
    const { isAdmin } = useAdminMode();

    const allTags = useMemo<string[]>(() => {
        const tagSet = new Set<string>();
        dishes.forEach(d => d.tags?.forEach(t => tagSet.add(t)));
        return DISH_TAGS.filter(t => tagSet.has(t));
    }, [dishes]);

    const filteredDishes = useMemo<Dishes[]>(() => {
        return sortBy(
            dishes.filter(e =>
                e.name.trim().toLowerCase().includes(searchText?.trim().toLowerCase()) &&
                (activeTag === null || e.tags?.includes(activeTag))
            ),
            "name"
        );
    }, [dishes, searchText, activeTag]);

    const _onDelete = (item: Dishes) => {
        dispatch(removeDishes([item.id]));
    }

    const _onDuplicate = (item: Dishes) => {
        dispatch(duplicateDish(item.id));
    }

    return <React.Fragment>
        <Stack.Compact>
            <Input allowClear placeholder="Tìm kiếm" onChange={debounce((e) => setSearchText(e.target.value), 350)} />
            {isAdmin && <Button onClick={toggleAddModal.show} icon={<PlusOutlined />} />}
        </Stack.Compact>
        {allTags.length > 0 && (
            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', padding: '6px 0' }}>
                <Tag
                    onClick={() => setActiveTag(null)}
                    color={activeTag === null ? "blue" : undefined}
                    style={{ cursor: 'pointer', userSelect: 'none' }}
                    
                >
                    Tất cả
                </Tag>
                {allTags.map(tag => (
                    <Tag
                        key={tag}
                        onClick={() => setActiveTag(activeTag === tag ? null : tag)}
                        color={activeTag === tag ? "blue" : undefined}
                        style={{ cursor: 'pointer', userSelect: 'none' }}
                    >
                        {tag}
                    </Tag>
                ))}
            </div>
        )}
        <VirtualList
            rowComponent={DishRow}
            rowCount={filteredDishes.length}
            rowHeight={rowHeight}
            rowProps={{ dishes: filteredDishes, onDelete: _onDelete, onDuplicate: _onDuplicate, isAdmin }}
            style={{ height: window.screen.availHeight - 210 - 80 }}
        />
        <Modal open={toggleAddModal.value} title={
            <Space>
                <Image src={NoodlesIcon} preview={false} width={24} style={{ marginBottom: 3 }} />
                Thêm món ăn
            </Space>
        } destroyOnClose={true} onCancel={toggleAddModal.hide} footer={null}>
            <DishesAddWidget />
        </Modal>
    </React.Fragment>
}

type DishesItemProps = {
    item: Dishes;
    onDelete: (item: Dishes) => void;
    onDuplicate: (item: Dishes) => void;
    isAdmin: boolean;
}

moment.relativeTimeRounding((v) => parseFloat(v.toFixed(1)));
moment.relativeTimeThreshold('m', 60);

export const DishesItem: React.FunctionComponent<DishesItemProps> = (props) => {
    const toggleEdit = useToggle({ defaultValue: false });
    const toggleIngredientsOverview = useToggle();
    const toggleStepsOverview = useToggle();
    const toggleDishesDetail = useToggle();
    const toggleCooking = useToggle();
    const dishes = useSelector((state: RootState) => state.shared.dishes.dishes);
    const ingredients = useSelector((state: RootState) => state.shared.ingredient.ingredients);
    const toggleEditDuration = useToggle();
    const message = useMessage();
    const dispatch = useDispatch();
    const navigate = useNavigate();

    const _onEdit = () => toggleEdit.show();
    const _onEditDuration = () => toggleEditDuration.show();
    const _onOpenDetailPage = () => {
        toggleDishesDetail.hide();
        navigate(RootRoutes.AuthorizedRoutes.DishesRoutes.ManageIngredient(props.item.id));
    }

    const _sumDuration = () => {
        return moment.duration(Object.values(props.item.duration).reduce((prev, cur) => prev + cur || 0, 0), "minutes").locale("vi").humanize();
    }

    const _hasDuration = () => {
        return Object.values(props.item.duration).some(e => e !== null);
    }

    const _allIngredients = (): typeof props.item.ingredients => {
        const collect = (dish: Dishes, visited = new Set<string>()): typeof props.item.ingredients => {
            if (visited.has(dish.id)) return [];
            visited.add(dish.id);
            const own = dish.ingredients ?? [];
            const fromIncluded = (dish.includeDishes ?? []).flatMap(id => {
                const found = dishes.find(d => d.id === id);
                return found ? collect(found, visited) : [];
            });
            return [...own, ...fromIncluded];
        };
        return collect(props.item);
    };

    const _allSteps = (): typeof props.item.steps => {
        const collect = (dish: Dishes, visited = new Set<string>()): typeof props.item.steps => {
            if (visited.has(dish.id)) return [];
            visited.add(dish.id);
            const fromIncluded = (dish.includeDishes ?? []).flatMap(id => {
                const found = dishes.find(d => d.id === id);
                return found ? collect(found, visited) : [];
            });
            return [...fromIncluded, ...(dish.steps ?? [])];
        };
        return collect(props.item);
    };

    const toggleExport = useToggle();
    const toggleDeleteConfirm = useToggle();

    const _referencingDishes = () => {
        return dishes.filter(d => d.id !== props.item.id && d.includeDishes?.includes(props.item.id));
    }

    const _onMoreActionClick = (e) => {
        switch (e.key) {
            case "edit": _onEdit(); break;
            case "duration": _onEditDuration(); break;
            case "duplicate": props.onDuplicate(props.item); break;
            case "cook": toggleCooking.show(); break;
            case "delete": {
                const refs = _referencingDishes();
                if (refs.length > 0) {
                    message.error(`Không thể xóa! Món ăn này đang được dùng trong: ${refs.map(d => d.name).join(", ")}.`);
                } else {
                    toggleDeleteConfirm.show();
                }
                break;
            }
        }
    }

    const _onSaveDuration = (value: DishesDurationEditParams) => {
        dispatch(updateDishDuration(value));
        toggleEditDuration.hide();
        message.success("Đã lưu thời gian món ăn");
    }

    const allDishIngredients = _allIngredients();
    const allDishSteps = _allSteps();
    const requiredIngredientCount = allDishIngredients.filter(item => item.required !== false).length;
    const optionalIngredientCount = allDishIngredients.length - requiredIngredientCount;
    const includedDishCount = props.item.includeDishes.filter(id => dishes.find(e => e.id === id)).length;
    const hasDuration = _hasDuration();
    const hasIngredients = allDishIngredients.length > 0;
    const hasSteps = allDishSteps.length > 0;
    const visibleTags = props.item.tags?.slice(0, 3) ?? [];
    const extraTagCount = Math.max(0, (props.item.tags?.length ?? 0) - visibleTags.length);
    const baseServings = props.item.baseServings ?? 2;

    return <React.Fragment>
        <div style={{ padding: "6px 0 8px", boxSizing: "border-box" }}>
            <Box style={{
                display: "grid",
                gridTemplateColumns: "88px minmax(0, 1fr)",
                gap: 10,
                minHeight: 146,
                padding: 10,
                border: "1px solid #e8e8e8",
                borderRadius: 8,
                background: "#fff",
                boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
                boxSizing: "border-box",
            }}>
                <div onClick={toggleDishesDetail.show} style={{ position: "relative", cursor: "pointer", width: 88, height: 122 }}>
                    <DishImageWidget src={props.item.image} width={88} height={122} borderRadius={8} fallbackIconSize={34} showBrokenLabel={false} />
                    <div style={{
                        position: "absolute",
                        left: 6,
                        right: 6,
                        bottom: 6,
                        padding: "2px 6px",
                        borderRadius: 8,
                        background: props.item.isCompleted ? "rgba(82,196,26,0.92)" : "rgba(250,140,22,0.94)",
                        color: "#fff",
                        fontSize: 11,
                        lineHeight: "16px",
                        textAlign: "center",
                        whiteSpace: "nowrap",
                    }}>
                        {props.item.isCompleted ? "Hoàn thiện" : "Cần cập nhật"}
                    </div>
                </div>

                <div style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: 7 }}>
                    <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) auto", gap: 8, alignItems: "start" }}>
                        <div style={{ minWidth: 0 }}>
                            <Typography.Paragraph
                                onClick={toggleDishesDetail.show}
                                style={{ marginBottom: 2, color: !props.item.isCompleted ? "#d46b08" : undefined, cursor: "pointer", fontWeight: 650, lineHeight: "21px" }}
                                ellipsis={{ rows: 2, tooltip: props.item.name }}
                            >
                                {props.item.name}
                            </Typography.Paragraph>
                            <Space size={[4, 4]} wrap>
                                {visibleTags.map(tag => <Tag key={tag} color="geekblue" style={{ fontSize: 11, padding: "0 5px", marginInlineEnd: 0 }}>{tag}</Tag>)}
                                {extraTagCount > 0 && <Tag style={{ fontSize: 11, padding: "0 5px", marginInlineEnd: 0 }}>+{extraTagCount}</Tag>}
                                <Tag color="blue" style={{ fontSize: 11, padding: "0 5px", marginInlineEnd: 0 }}>{baseServings} phần</Tag>
                            </Space>
                        </div>

                        <Dropdown menu={{
                            items: [
                                { label: "Bắt đầu nấu", key: "cook", icon: <FireOutlined /> },
                                { label: "Export", key: "export", icon: <FileTextOutlined /> },
                                ...(props.isAdmin ? [
                                    { type: "divider" as const },
                                    { label: "Sửa món ăn", key: "edit", icon: <EditOutlined /> },
                                    { label: "Thời lượng", key: "duration", icon: <ClockCircleOutlined /> },
                                    { label: "Nhân bản", key: "duplicate", icon: <CopyOutlined /> },
                                    { type: "divider" as const },
                                    { label: "Xóa", key: "delete", icon: <DeleteOutlined />, danger: true },
                                ] : []),
                            ],
                            onClick: (e) => e.key === "export" ? toggleExport.show() : _onMoreActionClick(e)
                        }} placement="bottomRight">
                            <Button type="text" icon={<HolderOutlined />} style={{ width: 32, paddingInline: 0 }} />
                        </Dropdown>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 6 }}>
                        <button type="button" onClick={hasIngredients ? toggleIngredientsOverview.show : undefined} style={{ border: "1px solid #f0f0f0", background: "#fafafa", borderRadius: 8, padding: "6px 7px", textAlign: "left", cursor: hasIngredients ? "pointer" : "default", minWidth: 0 }}>
                            <Typography.Text type="secondary" style={{ display: "block", fontSize: 11, lineHeight: "14px" }}>Nguyên liệu</Typography.Text>
                            <Typography.Text strong style={{ display: "block", fontSize: 13, lineHeight: "18px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                {hasIngredients ? `${allDishIngredients.length} nguyên liệu` : "Chưa có"}
                            </Typography.Text>
                            {optionalIngredientCount > 0 && <Typography.Text type="secondary" style={{ display: "block", fontSize: 11, lineHeight: "14px" }}>{optionalIngredientCount} tùy chọn</Typography.Text>}
                        </button>

                        <Popover title="Thời lượng" content={<List size="small" dataSource={Object.entries(props.item.duration)} renderItem={item => {
                            let processName = "";
                            switch (item[0] as keyof DishDuration) {
                                case "unfreeze": processName = "Rã đông"; break;
                                case "prepare": processName = "Sơ chế"; break;
                                case "cooking": processName = "Nấu nướng"; break;
                                case "serve": processName = "Trình bày"; break;
                                case "cooldown": processName = "Để nguội"; break;
                            }
                            return <List.Item style={{ paddingInline: 0 }}>
                                <Stack fullwidth justify="space-between">
                                    <Typography.Text style={{ fontSize: 16 }}>{processName}:</Typography.Text>
                                    {Boolean(item[1]) && <Tag>{moment.duration(item[1], "minutes").locale("vi").humanize()}</Tag>}
                                </Stack>
                            </List.Item>
                        }} />}>
                            <button type="button" style={{ border: "1px solid #f0f0f0", background: "#fafafa", borderRadius: 8, padding: "6px 7px", textAlign: "left", cursor: hasDuration ? "pointer" : "default", minWidth: 0 }}>
                                <Typography.Text type="secondary" style={{ display: "block", fontSize: 11, lineHeight: "14px" }}>Thời gian</Typography.Text>
                                <Typography.Text strong style={{ display: "block", fontSize: 13, lineHeight: "18px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                    {hasDuration ? _sumDuration() : "Chưa set"}
                                </Typography.Text>
                            </button>
                        </Popover>

                        <button type="button" onClick={hasSteps ? toggleStepsOverview.show : undefined} style={{ border: "1px solid #f0f0f0", background: "#fafafa", borderRadius: 8, padding: "6px 7px", textAlign: "left", cursor: hasSteps ? "pointer" : "default", minWidth: 0 }}>
                            <Typography.Text type="secondary" style={{ display: "block", fontSize: 11, lineHeight: "14px" }}>Quy trình</Typography.Text>
                            <Typography.Text strong style={{ display: "block", fontSize: 13, lineHeight: "18px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                {hasSteps ? `${allDishSteps.length} bước` : "Chưa có"}
                            </Typography.Text>
                            {includedDishCount > 0 && <Typography.Text type="secondary" style={{ display: "block", fontSize: 11, lineHeight: "14px" }}>{includedDishCount} món kèm</Typography.Text>}
                        </button>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginTop: "auto", flexWrap: "wrap" }}>
                        <Space size={6} style={{ minWidth: 0 }}>
                            {props.item.isCompleted
                                ? <Typography.Text style={{ color: "#389e0d", fontSize: 12 }}><CheckCircleOutlined /> Sẵn sàng</Typography.Text>
                                : <Typography.Text style={{ color: "#d46b08", fontSize: 12 }}><ExclamationCircleOutlined /> Cần cập nhật</Typography.Text>}
                            {requiredIngredientCount > 0 && <Typography.Text type="secondary" style={{ fontSize: 12 }}>{requiredIngredientCount} bắt buộc</Typography.Text>}
                        </Space>
                        <Space size={6}>
                            <Button type="primary" icon={<FireOutlined />} onClick={toggleCooking.show}>Nấu</Button>
                            <Button onClick={toggleDishesDetail.show}>Chi tiết</Button>
                        </Space>
                    </div>
                </div>
            </Box>
        </div>
        <Modal style={{ top: 50 }} open={toggleDishesDetail.value} title={
            <Space>
                <Image src={NoodlesIcon} preview={false} width={24} style={{ marginBottom: 3 }} />
                {props.item.name}
            </Space>
        } destroyOnClose={true} onCancel={toggleDishesDetail.hide} footer={<Space>
            <Button onClick={toggleDishesDetail.hide}>Đóng</Button>
            <Button type="primary" icon={<EditOutlined />} onClick={_onOpenDetailPage}>Mở trang chi tiết</Button>
        </Space>}>
            <Box style={{ maxHeight: 550, overflowY: "auto" }}>
                <DishesDetailWidget dish={props.item} />
            </Box>
        </Modal>
        <Modal open={toggleEdit.value} title={
            <Space>
                <Image src={NoodlesIcon} preview={false} width={24} style={{ marginBottom: 3 }} />
                Chỉnh sửa món ăn
            </Space>
        } destroyOnClose={true} onCancel={toggleEdit.hide} footer={null}>
            <DishesEditWidget item={props.item} onDone={() => toggleEdit.hide()} />
        </Modal>
        <Modal open={toggleIngredientsOverview.value} title={
            <Space>
                <Image src={VegetablesIcon} preview={false} width={24} style={{ marginBottom: 3 }} />
                Bao gồm các nguyên liệu
            </Space>
        } destroyOnClose={true} onCancel={toggleIngredientsOverview.hide} footer={null}>
            <Box style={{ overflowY: "auto", maxHeight: 550 }}>
                <List
                    dataSource={orderBy(_allIngredients(), [obj => obj.required], ['desc'])}
                    renderItem={(item) => <List.Item>
                        <Space>
                            <Typography.Text>{ingredients.find(ingre => ingre.id === item.ingredientId).name} - {item.amount} {item.unit}</Typography.Text>
                            {!item.required && <Tooltip title="Tùy chọn">
                                <Tag color="gold" icon={<QuestionCircleOutlined />} />
                            </Tooltip>}
                        </Space>
                    </List.Item>} />
            </Box>
        </Modal>
        <Modal open={toggleStepsOverview.value} title={<Space>
            <Image src={StepsIcon} preview={false} width={18} style={{ marginBottom: 3 }} />
            Bao gồm các bước
        </Space>} destroyOnClose={true} onCancel={toggleStepsOverview.hide} footer={null}>
            <Box style={{ overflowY: "auto", maxHeight: 550 }}>
                <List
                    dataSource={_allSteps()}
                    renderItem={(item) => <List.Item>
                        <Stack fullwidth justify="space-between">
                            <Typography.Paragraph style={{ maxWidth: 250 }} ellipsis={{ rows: 3, expandable: true, symbol: "Xem thêm" }}>
                                {item.content}
                            </Typography.Paragraph>
                            {!item.required && <Tooltip title="Tùy chọn">
                                <Tag color="gold" icon={<QuestionCircleOutlined />} />
                            </Tooltip>}
                        </Stack>
                    </List.Item>} />
            </Box>
        </Modal>
        <Modal open={toggleEditDuration.value} title={<Stack gap={0} direction="column" align="flex-start">
            <Space>
                <Image src={Clock2Icon} preview={false} width={24} style={{ marginBottom: 3 }} />
                <Typography.Title level={5} style={{ margin: 0 }}>Thời lượng</Typography.Title>
            </Space>
            <Typography.Text type="secondary">{props.item.name}</Typography.Text>
        </Stack>} destroyOnClose={true} onCancel={toggleEditDuration.hide} footer={null}>
            <DishDurationWidget dish={props.item} onSave={_onSaveDuration} />
        </Modal>
        <DishesExportWidget dish={props.item} allIngredients={ingredients} open={toggleExport.value} onClose={toggleExport.hide} />
        <Modal
            open={toggleDeleteConfirm.value}
            title={<Space><DeleteOutlined style={{ color: "red" }} />Xác nhận xóa</Space>}
            onCancel={toggleDeleteConfirm.hide}
            onOk={() => { props.onDelete(props.item); toggleDeleteConfirm.hide(); }}
            okText="Xóa"
            cancelText="Hủy"
            okButtonProps={{ danger: true }}
            destroyOnClose
        >
            Bạn có chắc muốn xóa món <b>{props.item.name}</b> không? Hành động này không thể hoàn tác.
        </Modal>
        <Modal
            open={toggleCooking.value}
            title={<Space><FireOutlined style={{ color: "#fa8c16" }} />{props.item.name} — Bắt đầu nấu</Space>}
            destroyOnClose
            onCancel={toggleCooking.hide}
            footer={null}
        >
            <CookingSessionWidget dish={props.item} onDone={toggleCooking.hide} />
        </Modal>
    </React.Fragment>
}

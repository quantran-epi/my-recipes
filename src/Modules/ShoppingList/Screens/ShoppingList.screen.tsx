import { CalendarOutlined, CheckCircleOutlined, DeleteOutlined, EditOutlined, ExclamationCircleOutlined, FileTextOutlined, HolderOutlined, LoadingOutlined, MonitorOutlined, OrderedListOutlined, PlusOutlined, ReloadOutlined } from "@ant-design/icons";
import { Button } from "@components/Button";
import { Dropdown } from "@components/Dropdown";
import { Input } from "@components/Form/Input";
import { Image } from "@components/Image";
import { Box } from "@components/Layout/Box";
import { scrollVirtualListToTop, VirtualListScrollTopButton } from "@components/List";
import { Space } from "@components/Layout/Space";
import { Stack } from "@components/Layout/Stack";
import { Modal } from "@components/Modal";
import { useMessage } from "@components/Message";
import { useModal } from "@components/Modal/ModalProvider";
import { Tooltip } from "@components/Tootip";
import { Typography } from "@components/Typography";
import { useScreenTitle, useToggle } from "@hooks";
import { ShoppingList } from "@store/Models/ShoppingList";
import { generateIngredient, removeShoppingList } from "@store/Reducers/ShoppingListReducer";
import { RootState } from "@store/Store";
import { debounce, orderBy } from "lodash";
import moment from "moment";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { List as VirtualList, useDynamicRowHeight, type ListImperativeAPI, type RowComponentProps } from "react-window";
import ShoppinglistIcon from "../../../../assets/icons/shoppingList.png";
import { ShoppingListAddWidget } from "./ShoppingListAdd.widget";
import { ShoppingListExportWidget } from "./ShoppingListExport.widget";
import { ShoppingListAddMoreDishesWidget } from "./ShoppingListAddMoreDishes.widget";
import { ShoppingListCalendarWidget } from "./ShoppingListCalendar.widget";
import { ShoppingListDetailWidget } from "./ShoppingListDetail.widget";
import { ShoppingListEditWidget } from "./ShoppingListEdit.widget";
import { DateHelpers } from "@common/Helpers/DateHelper";
import { RootRoutes } from "@routing/RootRoutes";

type ShoppingListStatusFilter = "all" | "buying" | "overdue" | "checklist_done" | "completed" | "empty_checklist";

const SHOPPING_LIST_STATUS_FILTERS: { value: ShoppingListStatusFilter; label: string }[] = [
    { value: "all", label: "Tất cả" },
    { value: "buying", label: "Đang mua" },
    { value: "overdue", label: "Quá hạn" },
    { value: "checklist_done", label: "Checklist xong" },
    { value: "completed", label: "Đã hoàn tất" },
    { value: "empty_checklist", label: "Chưa checklist" },
];

const filterRowStyle: React.CSSProperties = {
    display: "flex",
    gap: 6,
    overflowX: "auto",
    padding: "6px 0 2px",
    scrollbarWidth: "none",
};

const filterChipStyle = (active: boolean): React.CSSProperties => ({
    border: active ? "1px solid #1677ff" : "1px solid #d9d9d9",
    background: active ? "#e6f4ff" : "#fff",
    color: active ? "#0958d9" : "#595959",
    borderRadius: 999,
    padding: "3px 10px",
    fontSize: 12,
    lineHeight: "18px",
    whiteSpace: "nowrap",
    cursor: "pointer",
});

const isShoppingListOverdue = (item: ShoppingList): boolean => {
    return Boolean(item.plannedDate) && !item.completedAt && DateHelpers.calculateDaysBetween(new Date(), item.plannedDate) < 0;
};

const isShoppingListChecklistDone = (item: ShoppingList): boolean => {
    return item.ingredients.length > 0 && item.ingredients.every(ingredient => ingredient.isDone);
};

const shoppingListMatchesSearch = (item: ShoppingList, normalizedSearch: string): boolean => {
    return item.name.trim().toLowerCase().includes(normalizedSearch)
        || moment(item.createdDate).format("DD/MM/YYYY hh:mm:ss A").includes(normalizedSearch);
}

const shoppingListMatchesStatus = (item: ShoppingList, status: ShoppingListStatusFilter): boolean => {
    const checklistDone = isShoppingListChecklistDone(item);
    const isReadonly = Boolean(item.completedAt);
    return status === "all"
        || (status === "buying" && !isReadonly && item.ingredients.length > 0 && !checklistDone)
        || (status === "overdue" && isShoppingListOverdue(item))
        || (status === "checklist_done" && !isReadonly && checklistDone)
        || (status === "completed" && isReadonly)
        || (status === "empty_checklist" && !isReadonly && item.ingredients.length === 0);
}

type ShoppingListRowProps = { items: ShoppingList[]; onDelete: (item: ShoppingList) => void; };

const ShoppingListRow = ({ index, style, items, onDelete }: RowComponentProps<ShoppingListRowProps>) => {
    if (!items[index]) return null;
    return <div style={style}><ShoppingListItem item={items[index]} onDelete={onDelete} /></div>;
};

export const ShoppingListScreen = () => {
    const shoppingLists = useSelector((state: RootState) => state.personal.shoppingList.shoppingLists);
    const toggleCalendarModal = useToggle({ defaultValue: false });
    const toggleAddModal = useToggle({ defaultValue: false });
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const { } = useScreenTitle({ value: "Lịch mua sắm", deps: [] });
    const [searchText, setSearchText] = useState("");
    const [activeStatus, setActiveStatus] = useState<ShoppingListStatusFilter>("all");
    const rowHeight = useDynamicRowHeight({ defaultRowHeight: 164, key: searchText + activeStatus });
    const listRef = useRef<ListImperativeAPI | null>(null);
    const [showScrollTop, setShowScrollTop] = useState(false);
    const normalizedSearch = searchText.trim().toLowerCase();
    const filterData = useMemo(() => {
        const statusCounts = SHOPPING_LIST_STATUS_FILTERS.reduce((result, item) => {
            result[item.value] = 0;
            return result;
        }, {} as Record<ShoppingListStatusFilter, number>);
        const filtered: ShoppingList[] = [];

        shoppingLists.forEach(shoppingList => {
            if (!shoppingListMatchesSearch(shoppingList, normalizedSearch)) return;
            SHOPPING_LIST_STATUS_FILTERS.forEach(item => {
                if (shoppingListMatchesStatus(shoppingList, item.value)) statusCounts[item.value] += 1;
            });
            if (shoppingListMatchesStatus(shoppingList, activeStatus)) filtered.push(shoppingList);
        });

        return {
            filteredShoppingLists: orderBy(filtered, [(obj) => new Date(obj.createdDate)], ['desc']),
            statusCounts,
        };
    }, [shoppingLists, normalizedSearch, activeStatus]);
    const { filteredShoppingLists, statusCounts } = filterData;
    const [selectedDate, setSelectedDate] = useState<Date>();

    const _onAdd = () => {
        toggleAddModal.show();
    }

    const _onDelete = (item) => {
        dispatch(removeShoppingList([item.id]));
    }

    const _onShowCalendar = () => {
        toggleCalendarModal.show();
    }

    const _onAddWithDate = (date: Date) => {
        setSelectedDate(date);
        _onAdd();
    }

    const _scrollToTop = useCallback(() => {
        const scrolled = scrollVirtualListToTop(listRef.current);
        if (scrolled) setShowScrollTop(false);
        return scrolled;
    }, []);

    useEffect(() => {
        let frameId: number | undefined;
        let retryCount = 0;
        const reset = () => {
            if (!_scrollToTop() && retryCount < 20) {
                retryCount += 1;
                frameId = window.requestAnimationFrame(reset);
            }
        };
        reset();
        return () => {
            if (frameId !== undefined) window.cancelAnimationFrame(frameId);
        };
    }, [_scrollToTop, activeStatus, searchText, filteredShoppingLists.length]);

    return <React.Fragment>
        <div style={{ height: "100%", display: "flex", flexDirection: "column", minHeight: 0 }}>
            <Stack.Compact>
                <Input allowClear placeholder="Tìm kiếm" onChange={debounce((e) => setSearchText(e.target.value), 350)} />
                <Button onClick={_onAdd} icon={<PlusOutlined />} />
                <Button onClick={_onShowCalendar} icon={<CalendarOutlined />} />
            </Stack.Compact>
            <div style={filterRowStyle}>
                {SHOPPING_LIST_STATUS_FILTERS.map(item => (
                    <button key={item.value} type="button" onClick={() => setActiveStatus(item.value)} style={filterChipStyle(activeStatus === item.value)}>
                        {item.label} ({statusCounts[item.value] ?? 0})
                    </button>
                ))}
            </div>
            <div style={{ flex: 1, minHeight: 0, position: "relative" }}>
                <VirtualList
                    listRef={listRef}
                    rowComponent={ShoppingListRow}
                    rowCount={filteredShoppingLists.length}
                    rowHeight={rowHeight}
                    onScroll={(event) => setShowScrollTop(event.currentTarget.scrollTop > 180)}
                    onRowsRendered={(visibleRows) => setShowScrollTop(visibleRows.startIndex > 1)}
                    rowProps={{ items: filteredShoppingLists, onDelete: _onDelete }}
                    style={{ height: "100%" }}
                />
                <VirtualListScrollTopButton listRef={listRef} rowCount={filteredShoppingLists.length} visible={showScrollTop} />
            </div>
        </div>
        <Modal open={toggleAddModal.value} title={<Space>
            <Image src={ShoppinglistIcon} preview={false} width={24} style={{ marginBottom: 3 }} />
            Thêm lịch mua sắm
        </Space>} destroyOnClose={true} onCancel={toggleAddModal.hide} footer={null}>
            <ShoppingListAddWidget
                date={selectedDate}
                onDone={toggleAddModal.hide}
                onCreated={(shoppingList) => navigate(RootRoutes.AuthorizedRoutes.ShoppingListRoutes.Detail(shoppingList.id))}
            />
        </Modal>

        <Modal style={{ top: 50 }} open={toggleCalendarModal.value} title={<Space>
            <Image src={ShoppinglistIcon} preview={false} width={24} style={{ marginBottom: 3 }} />
            Lịch mua sắm
        </Space>} destroyOnClose={true} onCancel={toggleCalendarModal.hide} footer={null}>
            <Box style={{ maxHeight: 550, overflowY: "auto" }}>
                <ShoppingListCalendarWidget onAdd={_onAddWithDate} />
            </Box>
        </Modal>
    </React.Fragment>
}

type ShoppingListItemProps = {
    item: ShoppingList;
    onDelete: (item: ShoppingList) => void;
}

export const ShoppingListItem: React.FunctionComponent<ShoppingListItemProps> = (props) => {
    const toggleIngredient = useToggle({ defaultValue: false });
    const toggleAddMoreDishes = useToggle({ defaultValue: false });
    const navigate = useNavigate();
    const dishes = useSelector((state: RootState) => state.shared.dishes.dishes);
    const scheduledMeals = useSelector((state: RootState) => state.personal.scheduledMeal.scheduledMeals);
    const ingredients = useSelector((state: RootState) => state.shared.ingredient.ingredients);
    const dispatch = useDispatch();
    const message = useMessage();
    const modal = useModal();
    const toggleEditModal = useToggle({ defaultValue: false });
    const toggleLoading = useToggle();
    const toggleExport = useToggle();
    const toggleDeleteConfirm = useToggle();
    const isReadonly = Boolean(props.item.completedAt);

    const _onGenerate = () => {
        if (isReadonly) return;
        dispatch(generateIngredient({
            shoppingListId: props.item.id,
            allDishes: dishes,
            allScheduledMeals: scheduledMeals,
            allIngredients: ingredients,
        }));
        message.success("Đã tạo lại checklist nguyên liệu");
    }

    const _onGenerateAndShow = () => {
        if (isReadonly) {
            _onShow();
            return;
        }
        _onGenerate();
        _onShow();
    }

    const _isAllIngredientDone = () => {
        return props.item.ingredients.length > 0 && props.item.ingredients.every(ingre => ingre.isDone);
    }

    const _onShow = () => {
        toggleLoading.show();
        toggleIngredient.show();
    }

    const _onOpenDetailPage = () => {
        toggleIngredient.hide();
        navigate(RootRoutes.AuthorizedRoutes.ShoppingListRoutes.Detail(props.item.id));
    }

    const _onAddMoreDishes = () => {
        if (isReadonly) return;
        toggleAddMoreDishes.show();
    }

    const _onMoreActionClick = (e) => {
        if (isReadonly && ["reload", "add_dishes", "edit_shopping_list"].includes(e.key)) return;
        switch (e.key) {
            case "reload": modal.confirm({
                content: "Tải lại danh sách nguyên liệu?",
                onOk: () => {
                    _onGenerate();
                }
            }); break;
            case "add_dishes": _onAddMoreDishes(); break;
            case "edit_shopping_list": toggleEditModal.show(); break;
            case "export": toggleExport.show(); break;
            case "delete": toggleDeleteConfirm.show(); break;
        }
    }

    const _isOverdue = () => {
        return Boolean(props.item.plannedDate) && !isReadonly && DateHelpers.calculateDaysBetween(new Date(), props.item.plannedDate) < 0;
    }

    const doneCount = props.item.ingredients.filter(e => e.isDone).length;
    const totalIngredientCount = props.item.ingredients.length;
    const progressPercent = totalIngredientCount > 0 ? Math.round(doneCount / totalIngredientCount * 100) : 0;
    const hasChecklist = totalIngredientCount > 0;
    const isAllIngredientDone = _isAllIngredientDone();
    const isOverdue = _isOverdue();
    const dishCount = props.item.dishes.length;
    const scheduledMealCount = props.item.scheduledMeals?.length ?? 0;
    const status = isReadonly
        ? { label: "Đã hoàn tất", color: "#1677ff", background: "#e6f4ff", border: "#91caff", icon: <CheckCircleOutlined /> }
        : isAllIngredientDone
            ? { label: "Checklist xong", color: "#389e0d", background: "#f6ffed", border: "#b7eb8f", icon: <CheckCircleOutlined /> }
            : isOverdue
                ? { label: "Quá hạn", color: "#cf1322", background: "#fff1f0", border: "#ffa39e", icon: <ExclamationCircleOutlined /> }
                : hasChecklist
                    ? { label: "Đang mua", color: "#d46b08", background: "#fff7e6", border: "#ffd591", icon: <OrderedListOutlined /> }
                    : { label: "Chưa có checklist", color: "#8c8c8c", background: "#fafafa", border: "#d9d9d9", icon: <OrderedListOutlined /> };
    const plannedLabel = props.item.plannedDate ? moment(props.item.plannedDate).format("ddd, DD/MM/YY") : "Chưa đặt";
    const plannedColor = isOverdue ? "#cf1322" : "#595959";
    const createdLabel = moment(props.item.createdDate).format("ddd, DD/MM/YY hh:mm A");
    const completedLabel = props.item.completedAt ? moment(props.item.completedAt).format("DD/MM/YY") : null;

    return <React.Fragment>
        <div style={{ padding: "6px 0 8px", boxSizing: "border-box" }}>
            <div style={{
                display: "grid",
                gridTemplateColumns: "5px minmax(0, 1fr)",
                minHeight: 142,
                border: "1px solid #e8e8e8",
                borderRadius: 8,
                background: "#fff",
                boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
                overflow: "hidden",
                boxSizing: "border-box",
            }}>
                <div style={{ background: status.color }} />
                <div style={{ padding: 10, minWidth: 0, display: "flex", flexDirection: "column", gap: 9 }}>
                    <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) auto", gap: 8, alignItems: "start" }}>
                        <div style={{ minWidth: 0 }}>
                            <Tooltip title={props.item.name}>
                                <Typography.Paragraph
                                    style={{ marginBottom: 3, fontWeight: 650, lineHeight: "21px", textDecorationLine: isAllIngredientDone ? "line-through" : undefined }}
                                    type={isAllIngredientDone ? "secondary" : undefined}
                                    ellipsis={{ rows: 2 }}
                                >
                                    {props.item.name}
                                </Typography.Paragraph>
                            </Tooltip>
                            <div style={{ display: "flex", gap: 5, flexWrap: "wrap", alignItems: "center" }}>
                                <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "1px 7px", borderRadius: 999, background: status.background, color: status.color, border: `1px solid ${status.border}`, fontSize: 11, lineHeight: "18px", fontWeight: 650 }}>
                                    {status.icon} {status.label}
                                </span>
                                <span style={{ padding: "1px 7px", borderRadius: 999, background: "#f0f5ff", color: "#1d39c4", fontSize: 11, lineHeight: "18px", fontWeight: 600 }}>{dishCount} món</span>
                                <span style={{ padding: "1px 7px", borderRadius: 999, background: "#fafafa", color: "#595959", border: "1px solid #f0f0f0", fontSize: 11, lineHeight: "18px" }}>{scheduledMealCount} thực đơn</span>
                                {completedLabel && <span style={{ padding: "1px 7px", borderRadius: 999, background: "#e6f4ff", color: "#0958d9", border: "1px solid #91caff", fontSize: 11, lineHeight: "18px" }}>Xong {completedLabel}</span>}
                            </div>
                        </div>

                        <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
                            {hasChecklist
                                ? <Button onClick={_onShow} icon={toggleLoading.value ? <LoadingOutlined /> : <MonitorOutlined />}>Mở</Button>
                                : <Button onClick={_onGenerateAndShow} icon={toggleLoading.value ? <LoadingOutlined /> : <MonitorOutlined />}>Tạo</Button>}
                            <Dropdown menu={{
                                items: [
                                    { label: 'Xuất danh sách', key: 'export', icon: <FileTextOutlined /> },
                                    { label: 'Tải lại', key: 'reload', icon: <ReloadOutlined />, disabled: isReadonly },
                                    { label: 'Sửa món ăn', key: 'add_dishes', icon: <OrderedListOutlined />, disabled: isReadonly },
                                    { label: 'Sửa lịch mua sắm', key: 'edit_shopping_list', icon: <EditOutlined />, disabled: isReadonly },
                                    { type: 'divider' },
                                    { label: 'Xóa', key: 'delete', icon: <DeleteOutlined />, danger: true },
                                ],
                                onClick: _onMoreActionClick
                            }} placement="bottomRight">
                                <Button type="text" icon={<HolderOutlined />} style={{ width: 34, paddingInline: 0 }} />
                            </Dropdown>
                        </div>
                    </div>

                    <div>
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center", marginBottom: 5 }}>
                            <Typography.Text type="secondary" style={{ fontSize: 12 }}>Checklist</Typography.Text>
                            <Typography.Text strong style={{ fontSize: 12, color: status.color }}>{doneCount}/{totalIngredientCount} nguyên liệu</Typography.Text>
                        </div>
                        <div style={{ height: 7, borderRadius: 999, background: "#f0f0f0", overflow: "hidden" }}>
                            <div style={{ width: `${progressPercent}%`, height: "100%", background: status.color, borderRadius: 999, transition: "width 0.2s ease" }} />
                        </div>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 8 }}>
                        <div style={{ minWidth: 0 }}>
                            <Typography.Text type="secondary" style={{ display: "block", fontSize: 11, lineHeight: "14px" }}>Ngày mua</Typography.Text>
                            {isOverdue ? <Tooltip title={moment(props.item.plannedDate).startOf("day").from(moment().startOf("day"))}>
                                <Typography.Text strong style={{ display: "block", color: plannedColor, fontSize: 13, lineHeight: "18px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{plannedLabel}</Typography.Text>
                            </Tooltip> : <Typography.Text strong style={{ display: "block", color: plannedColor, fontSize: 13, lineHeight: "18px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{plannedLabel}</Typography.Text>}
                        </div>
                        <div style={{ minWidth: 0 }}>
                            <Typography.Text type="secondary" style={{ display: "block", fontSize: 11, lineHeight: "14px" }}>Ngày tạo</Typography.Text>
                            <Typography.Text strong style={{ display: "block", fontSize: 13, lineHeight: "18px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{createdLabel}</Typography.Text>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        <Modal style={{ top: 50 }} open={toggleIngredient.value} title={<Space>
            <Image src={ShoppinglistIcon} preview={false} width={24} style={{ marginBottom: 3 }} />
            {props.item.name}
        </Space>} destroyOnClose={true} onCancel={toggleIngredient.hide} footer={<Space>
            <Button onClick={toggleIngredient.hide}>Đóng</Button>
            <Button type="primary" icon={<EditOutlined />} onClick={_onOpenDetailPage}>Mở trang chi tiết</Button>
        </Space>} afterOpenChange={() => toggleLoading.hide()}>
            <ShoppingListDetailWidget shoppingList={props.item} />
        </Modal>
        <Modal style={{ top: 50 }} open={toggleAddMoreDishes.value} title={<Space>
            <Image src={ShoppinglistIcon} preview={false} width={24} style={{ marginBottom: 3 }} />
            Sửa món ăn
        </Space>} destroyOnClose={true} onCancel={toggleAddMoreDishes.hide} footer={null}>
            <Box style={{ maxHeight: 550, overflowY: "auto" }}>
                <ShoppingListAddMoreDishesWidget shoppingList={props.item} onDone={() => {
                    toggleAddMoreDishes.hide();
                    modal.confirm({
                        content: "Tải lại danh sách nguyên liệu?",
                        okText: "Đồng ý",
                        cancelText: "Hủy",
                        onOk: () => {
                            _onGenerate();
                        }
                    })
                }} />
            </Box>
        </Modal>
        <Modal open={toggleEditModal.value} title={
            <Space>
                <Image src={ShoppinglistIcon} preview={false} width={24} style={{ marginBottom: 3 }} />
                Sửa lịch mua sắm
            </Space>
        } destroyOnClose={true} onCancel={toggleEditModal.hide} footer={null}>
            <ShoppingListEditWidget item={props.item} onDone={toggleEditModal.hide} />
        </Modal>
        <ShoppingListExportWidget shoppingList={props.item} allIngredients={ingredients} open={toggleExport.value} onClose={toggleExport.hide} />
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
            Bạn có chắc muốn xóa lịch <b>{props.item.name}</b> không? Hành động này không thể hoàn tác.
        </Modal>
    </React.Fragment >
}

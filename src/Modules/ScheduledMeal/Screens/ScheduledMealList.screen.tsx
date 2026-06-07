import {
    CalendarOutlined, CopyOutlined, DeleteOutlined, EditOutlined,
    HolderOutlined, LeftOutlined, PlusOutlined, RightOutlined, ShoppingCartOutlined
} from "@ant-design/icons";
import { Badge } from "@components/Badge";
import { Button } from "@components/Button";
import { Dropdown } from "@components/Dropdown";
import { Space } from "@components/Layout/Space";
import { Stack } from "@components/Layout/Stack";
import { DeferredModalContent, Modal } from "@components/Modal";
import { useMessage } from "@components/Message";
import { Tooltip } from "@components/Tootip";
import { Typography } from "@components/Typography";
import { useScreenTitle, useToggle } from "@hooks";
import { ScheduledMeal } from "@store/Models/ScheduledMeal";
import { rememberScheduledMealName, WeeklyMealTemplate } from "@store/Reducers/AppContextReducer";
import { addScheduledMeal, removeScheduledMeal, toggleSelectedMeals } from "@store/Reducers/ScheduledMealReducer";
import { selectDishNameById, selectScheduledMeals, selectSelectedMealIds, selectWeeklyMealTemplates } from "@store/Selectors";
import { Calendar, DatePicker, Select, Tag } from "antd";
import { SelectInfo } from "antd/es/calendar/generateCalendar";
import dayjs, { Dayjs } from "dayjs";
import { nanoid } from "nanoid";
import { orderBy } from "lodash";
import moment from "moment";
import React, { useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { ScheduledMealAddWidget } from "./ScheduledMealAdd.widget";
import { ScheduledMealEditWidget } from "./ScheduledMealEdit.widget";
import MorningIcon from "../../../../assets/icons/sunrise.png";
import NightIcon from "../../../../assets/icons/night.png";
import NoonIcon from "../../../../assets/icons/time.png";
import MealsIcon from "../../../../assets/icons/meals.png";
import { Image } from "@components/Image";
import { Box } from "@components/Layout/Box";
import { ShoppingListMealDetailWidget } from "@modules/ShoppingList/Screens/ShoppingListMealDetail.widget";
import { ShoppingListAddWidget } from "@modules/ShoppingList/Screens/ShoppingListAdd.widget";
import { Checkbox } from "@components/Form/Checkbox";
import { CheckboxChangeEvent } from "antd/es/checkbox";
import { RootRoutes } from "@routing/RootRoutes";

const getMealDateKey = (value: Date | string) => moment(value).format("YYYY-MM-DD");

const getPrimaryRangeDate = (start: Dayjs, end?: Dayjs) => {
    if (!end || start.isSame(end, "month")) return start;

    const monthCounts = new Map<string, { count: number; firstDate: Dayjs }>();
    let cursor = start.startOf("day");
    const lastDate = end.startOf("day");
    while (cursor.isBefore(lastDate, "day") || cursor.isSame(lastDate, "day")) {
        const key = cursor.format("YYYY-MM");
        const current = monthCounts.get(key);
        monthCounts.set(key, {
            count: (current?.count ?? 0) + 1,
            firstDate: current?.firstDate ?? cursor,
        });
        cursor = cursor.add(1, "day");
    }

    return Array.from(monthCounts.values()).sort((a, b) => b.count - a.count)[0]?.firstDate ?? start;
};

const getVietnameseWeekShoppingListName = (start: Dayjs, end?: Dayjs) => {
    const date = getPrimaryRangeDate(start, end);
    const weekOfMonth = Math.floor((date.date() - 1) / 7) + 1;
    return `Tuần ${weekOfMonth}, ${date.format("MM/YY")}`;
};

type MealTemplateScope = 'day' | 'week';

const getMondayStart = (value: Dayjs) => value.startOf("week").startOf("day");

const getTemplateScope = (template: WeeklyMealTemplate): MealTemplateScope => template.scope ?? (template.days.length > 1 ? 'week' : 'day');

const topToolCardStyle: React.CSSProperties = {
    background: "#fff",
    border: "1px solid #f0f0f0",
    borderRadius: 0,
    padding: 10,
    boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
};

const topActionRowStyle: React.CSSProperties = {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)",
    gap: 8,
    alignItems: "center",
};

const topActionButtonStyle: React.CSSProperties = {
    width: "100%",
    minWidth: 0,
    whiteSpace: "nowrap",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 700,
};

const dayNavigatorCardStyle: React.CSSProperties = {
    display: "grid",
    gridTemplateColumns: "42px minmax(0, 1fr) 42px",
    gap: 8,
    alignItems: "center",
    border: "1px solid rgba(116,54,220,0.10)",
    borderRadius: 8,
    background: "linear-gradient(135deg, #ffffff 0%, #fbf9ff 100%)",
    padding: 10,
    boxShadow: "0 10px 28px rgba(74,48,130,0.09)",
};

const dayArrowButtonStyle: React.CSSProperties = {
    width: 42,
    height: 42,
    paddingInline: 0,
    borderRadius: 8,
    color: "#7436dc",
    borderColor: "rgba(116,54,220,0.18)",
    background: "#fff",
    boxShadow: "0 8px 18px rgba(74,48,130,0.09)",
};

const scheduledMealCss = `
.scheduled-meal-card {
    transition: border-color 160ms ease, box-shadow 160ms ease, transform 160ms ease;
}
.scheduled-meal-card:hover {
    border-color: rgba(116,54,220,0.20);
    box-shadow: 0 14px 34px rgba(74,48,130,0.13);
}
.scheduled-meal-day-arrow:hover {
    border-color: rgba(116,54,220,0.30) !important;
    transform: translateY(-1px);
}
`;

// ─── Main screen ─────────────────────────────────────────────────────────────
export const ScheduledMealListScreen = () => {
    const [selectedDate, setSelectedDate] = useState<Date>(() => dayjs().startOf("day").toDate());
    const [calendarVisible, setCalendarVisible] = useState(false);
    const [rangePickerOpen, setRangePickerOpen] = useState(false);
    const [selectedRange, setSelectedRange] = useState<[Dayjs, Dayjs] | null>(null);
    const [shoppingRangeMealIds, setShoppingRangeMealIds] = useState<string[]>([]);
    const [shoppingRangeOpen, setShoppingRangeOpen] = useState(false);
    const [templateModalOpen, setTemplateModalOpen] = useState(false);
    const [templateApplyMode, setTemplateApplyMode] = useState<MealTemplateScope>('day');
    const [templateApplyWeek, setTemplateApplyWeek] = useState<Dayjs>(getMondayStart(dayjs()));
    const [selectedTemplateId, setSelectedTemplateId] = useState<string | undefined>();

    const scheduledMeals = useSelector(selectScheduledMeals);
    const selectedMealIds = useSelector(selectSelectedMealIds);
    const dishNameById = useSelector(selectDishNameById);
    const mealTemplates = useSelector(selectWeeklyMealTemplates);
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const message = useMessage();
    useScreenTitle({ value: "Thực đơn", deps: [] });
    const toggleAddModal = useToggle({ defaultValue: false });

    const scheduledMealsByDate = useMemo(() => {
        return scheduledMeals.reduce((result, item) => {
            const key = getMealDateKey(item.plannedDate);
            result[key] = [...(result[key] ?? []), item];
            return result;
        }, {} as Record<string, ScheduledMeal[]>);
    }, [scheduledMeals]);

    const scheduledMealDateKeys = useMemo(() => new Set(Object.keys(scheduledMealsByDate)), [scheduledMealsByDate]);
    const _onSelect = (d, selectInfo?: SelectInfo) => {
        setSelectedDate(d.toDate());
        setCalendarVisible(false);
    };

    const _cellRender = (d, info) => {
        const date = d.toDate() as Date;
        if (_hasScheduledMeal(date)) return <Badge dot status="success" />;
    };

    const _onDelete = (item) => dispatch(removeScheduledMeal([item.id]));

    const _hasScheduledMeal = (date: Date) => scheduledMealDateKeys.has(getMealDateKey(date));

    const _findScheduledMealsByDate = (date: Date) =>
        orderBy(
            scheduledMealsByDate[getMealDateKey(date)] ?? [],
            [obj => obj.createdDate],
            ["desc"]
        );

    const _onOpenRangeShopping = () => setRangePickerOpen(true);

    const _changeSelectedDay = (amount: number) => {
        setSelectedDate(current => dayjs(current).add(amount, "day").startOf("day").toDate());
    };

    const _goToday = () => setSelectedDate(dayjs().startOf("day").toDate());

    const _onOpenTemplateApply = () => {
        setTemplateApplyMode('day');
        setTemplateApplyWeek(getMondayStart(dayjs(selectedDate)));
        setSelectedTemplateId(undefined);
        setTemplateModalOpen(true);
    };

    const _onRangeConfirm = () => {
        if (!selectedRange) return;
        const [start, end] = selectedRange;
        const ids = scheduledMeals
            .filter(m => {
                const d = dayjs(m.plannedDate);
                return (d.isAfter(start, "day") || d.isSame(start, "day"))
                    && (d.isBefore(end, "day") || d.isSame(end, "day"));
            })
            .map(m => m.id);
        setShoppingRangeMealIds(ids);
        setRangePickerOpen(false);
        setShoppingRangeOpen(true);
    };

    const mealsToday = _findScheduledMealsByDate(selectedDate);
    const availableTemplates = useMemo(() => mealTemplates.filter(template => getTemplateScope(template) === templateApplyMode), [mealTemplates, templateApplyMode]);
    const selectedTemplate = availableTemplates.find(template => template.id === selectedTemplateId) ?? availableTemplates[0];
    const _applySelectedTemplate = () => {
        if (!selectedTemplate) return;
        const baseDate = templateApplyMode === 'week' ? getMondayStart(templateApplyWeek) : dayjs(selectedDate).startOf('day');
        selectedTemplate.days.forEach(day => {
            const plannedDate = baseDate.add(templateApplyMode === 'week' ? day.offset : 0, 'day').toDate();
            const name = `${selectedTemplate.name} - ${moment(plannedDate).format('DD/MM')}`;
            dispatch(addScheduledMeal({
                id: `${selectedTemplate.id}-${nanoid(8)}`,
                name,
                meals: day.meals,
                dishServings: day.dishServings ?? {},
                plannedDate,
                createdDate: new Date(),
            }));
            dispatch(rememberScheduledMealName(name));
        });
        message.success(`Đã tạo ${selectedTemplate.days.length} thực đơn từ mẫu`);
        setTemplateModalOpen(false);
    };
    const selectedDayStatus = dayjs(selectedDate).isSame(dayjs(), "day")
        ? { label: "Hôm nay", color: "#1677ff", background: "#e6f4ff", border: "#91caff" }
        : dayjs(selectedDate).isBefore(dayjs(), "day")
            ? { label: "Đã qua", color: "#8c8c8c", background: "#fafafa", border: "#d9d9d9" }
            : { label: "Sắp tới", color: "#389e0d", background: "#f6ffed", border: "#b7eb8f" };

    return (
        <React.Fragment>
            <style>{scheduledMealCss}</style>
            <Box style={{ padding: "4px 0 0", marginBottom: 8 }}>
                <Box style={topToolCardStyle}>
                    <div style={topActionRowStyle}>
                        <Button icon={<CalendarOutlined />} onClick={_onOpenTemplateApply} style={topActionButtonStyle}>
                            Từ mẫu
                        </Button>
                        <Tooltip title="Tạo danh sách mua theo khoảng ngày">
                            <Button icon={<ShoppingCartOutlined />} onClick={_onOpenRangeShopping} style={topActionButtonStyle}>
                                Tạo giỏ
                            </Button>
                        </Tooltip>
                    </div>
                </Box>
            </Box>

            <Box style={{ padding: 0 }}>
                <Box style={dayNavigatorCardStyle}>
                    <Button
                        aria-label="Ngày trước"
                        className="scheduled-meal-day-arrow"
                        icon={<LeftOutlined />}
                        onClick={() => _changeSelectedDay(-1)}
                        style={dayArrowButtonStyle}
                    />
                    <div style={{ minWidth: 0, textAlign: "center" }}>
                        <Typography.Text strong style={{ display: "block", color: "#111827", fontSize: 18, lineHeight: "24px", overflowWrap: "anywhere" }}>
                            {moment(selectedDate).format("dddd, DD/MM/YYYY")}
                        </Typography.Text>
                        <Space size={5} wrap style={{ justifyContent: "center", marginTop: 4 }}>
                            <span style={{ padding: "1px 8px", borderRadius: 999, background: selectedDayStatus.background, color: selectedDayStatus.color, border: `1px solid ${selectedDayStatus.border}`, fontSize: 11, lineHeight: "18px", fontWeight: 700 }}>{selectedDayStatus.label}</span>
                            <Typography.Text type="secondary" style={{ fontSize: 12 }}>{mealsToday.length} thực đơn</Typography.Text>
                        </Space>
                        <Space size={6} wrap style={{ justifyContent: "center", marginTop: 8 }}>
                            <Button onClick={() => setCalendarVisible(value => !value)} icon={<CalendarOutlined />} style={{ borderRadius: 999, fontWeight: 650 }}>
                                {calendarVisible ? "Ẩn lịch" : "Chọn ngày"}
                            </Button>
                            {!dayjs(selectedDate).isSame(dayjs(), "day") && <Button onClick={_goToday} style={{ borderRadius: 999, fontWeight: 650 }}>Hôm nay</Button>}
                        </Space>
                    </div>
                    <Button
                        aria-label="Ngày sau"
                        className="scheduled-meal-day-arrow"
                        icon={<RightOutlined />}
                        onClick={() => _changeSelectedDay(1)}
                        style={dayArrowButtonStyle}
                    />
                </Box>
            </Box>

            {calendarVisible && <Box style={{ padding: "8px 0 0" }}>
                <Box style={{ border: "1px solid rgba(116,54,220,0.10)", borderRadius: 8, background: "#fff", padding: 8, boxShadow: "0 8px 22px rgba(74,48,130,0.08)" }}>
                    <Calendar fullscreen={false} value={dayjs(selectedDate)} onSelect={_onSelect} cellRender={_cellRender} />
                </Box>
            </Box>}

            <Box style={{ padding: "8px 0 0" }}>
                <Box style={{
                    display: "grid",
                    gridTemplateColumns: "minmax(0, 1fr) auto",
                    gap: 8,
                    alignItems: "center",
                    border: "1px solid rgba(116,54,220,0.10)",
                    borderRadius: 8,
                    background: "#fff",
                    padding: "11px 12px",
                    boxShadow: "0 8px 22px rgba(74,48,130,0.07)",
                }}>
                    <div style={{ minWidth: 0 }}>
                        <Typography.Text strong style={{ display: "block", color: "#111827", fontSize: 16, lineHeight: "21px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            Thực đơn trong ngày
                        </Typography.Text>
                        <Typography.Text type="secondary" style={{ display: "block", fontSize: 12, lineHeight: "17px", marginTop: 2 }}>
                            {moment(selectedDate).format("DD/MM/YYYY")} · {mealsToday.length} thực đơn
                        </Typography.Text>
                    </div>
                    <Button onClick={toggleAddModal.show} icon={<PlusOutlined />}>Thêm</Button>
                </Box>
            </Box>

            <Box style={{ padding: "8px 0 16px" }}>
                {mealsToday.length === 0 ? (
                    <Box style={{ textAlign: "center", padding: "24px 0", border: "1px dashed #d9d9d9", borderRadius: 8, background: "#fafafa" }}>
                        <Typography.Text type="secondary">Chưa có thực đơn trong ngày này</Typography.Text>
                    </Box>
                ) : (
                    mealsToday.map(item => (
                        <ScheduledMealItem key={item.id} item={item} selected={selectedMealIds.has(item.id)} dishNameById={dishNameById} onDelete={_onDelete} />
                    ))
                )}
            </Box>

            {/* Add modal */}
            <Modal
                open={toggleAddModal.value}
                title={<Space>
                    <Image src={MealsIcon} preview={false} width={24} style={{ marginBottom: 3 }} />
                    Thêm thực đơn
                </Space>}
                destroyOnClose
                onCancel={toggleAddModal.hide}
                footer={null}
            >
                <DeferredModalContent active={toggleAddModal.value}>
                    <ScheduledMealAddWidget date={selectedDate} onDone={toggleAddModal.hide} />
                </DeferredModalContent>
            </Modal>

            {/* Range picker modal */}
            <Modal
                open={templateModalOpen}
                title={<Space>
                    <CalendarOutlined />
                    Tạo thực đơn từ mẫu
                </Space>}
                onCancel={() => setTemplateModalOpen(false)}
                onOk={_applySelectedTemplate}
                okText="Tạo"
                cancelText="Huỷ"
                destroyOnClose
                okButtonProps={{ disabled: availableTemplates.length === 0 }}
            >
                <DeferredModalContent active={templateModalOpen} minHeight={160}>
                    <Stack direction="column" align="stretch" gap={10}>
                        <div>
                            <Typography.Text strong style={{ display: "block", fontSize: 12, marginBottom: 5 }}>Tạo cho</Typography.Text>
                            <Select
                                value={templateApplyMode}
                                onChange={(value) => { setTemplateApplyMode(value); setSelectedTemplateId(undefined); }}
                                style={{ width: "100%" }}
                            >
                                <Select.Option value="day">Một ngày</Select.Option>
                                <Select.Option value="week">Một tuần</Select.Option>
                            </Select>
                        </div>
                        {templateApplyMode === 'week' && <div>
                            <Typography.Text strong style={{ display: "block", fontSize: 12, marginBottom: 5 }}>Tuần áp dụng</Typography.Text>
                            <DatePicker picker="week" value={templateApplyWeek} onChange={value => value && setTemplateApplyWeek(getMondayStart(value))} format="DD/MM/YYYY" style={{ width: "100%" }} />
                        </div>}
                        <div>
                            <Typography.Text strong style={{ display: "block", fontSize: 12, marginBottom: 5 }}>Mẫu</Typography.Text>
                            <Select
                                value={selectedTemplate?.id}
                                onChange={setSelectedTemplateId}
                                placeholder={templateApplyMode === 'day' ? 'Chọn mẫu ngày' : 'Chọn mẫu tuần'}
                                style={{ width: "100%" }}
                                disabled={availableTemplates.length === 0}
                            >
                                {availableTemplates.map(template => <Select.Option key={template.id} value={template.id}>{template.name}</Select.Option>)}
                            </Select>
                            {availableTemplates.length === 0 && <Typography.Text type="secondary" style={{ display: "block", fontSize: 12, marginTop: 6 }}>
                                Chưa có mẫu phù hợp. Vào trang Mẫu dùng lại để tạo mẫu {templateApplyMode === 'day' ? 'ngày' : 'tuần'}.
                            </Typography.Text>}
                        </div>
                    </Stack>
                </DeferredModalContent>
            </Modal>

            <Modal
                open={rangePickerOpen}
                title={<Space>
                    <ShoppingCartOutlined />
                    Chọn khoảng ngày để tạo giỏ hàng
                </Space>}
                onCancel={() => setRangePickerOpen(false)}
                onOk={_onRangeConfirm}
                okText="Tạo giỏ hàng"
                cancelText="Huỷ"
                destroyOnClose
                okButtonProps={{ disabled: !selectedRange }}
            >
                <DeferredModalContent active={rangePickerOpen} minHeight={96}>
                <Box style={{ padding: "12px 0" }}>
                    <DatePicker.RangePicker
                        style={{ width: "100%" }}
                        format="DD/MM/YYYY"
                        placeholder={["Từ ngày", "Đến ngày"]}
                        onChange={(vals) => setSelectedRange(vals as [Dayjs, Dayjs] | null)}
                        presets={[
                            { label: "7 ngày tới", value: [dayjs(), dayjs().add(6, "day")] },
                            { label: "Tuần này", value: [getMondayStart(dayjs()), getMondayStart(dayjs()).add(6, "day")] },
                            { label: "Tuần tới", value: [getMondayStart(dayjs()).add(1, "week"), getMondayStart(dayjs()).add(1, "week").add(6, "day")] },
                        ]}
                    />
                    {selectedRange && (() => {
                        const count = scheduledMeals.filter(m => {
                            const d = dayjs(m.plannedDate);
                            return (d.isAfter(selectedRange[0], "day") || d.isSame(selectedRange[0], "day"))
                                && (d.isBefore(selectedRange[1], "day") || d.isSame(selectedRange[1], "day"));
                        }).length;
                        return (
                            <Typography.Text type="secondary" style={{ fontSize: 12, display: "block", marginTop: 10 }}>
                                Tìm thấy <strong>{count}</strong> thực đơn trong khoảng ngày đã chọn
                            </Typography.Text>
                        );
                    })()}
                </Box>
                </DeferredModalContent>
            </Modal>

            {/* Range shopping list add */}
            <Modal
                open={shoppingRangeOpen}
                title={<Space>
                    <Image src={MealsIcon} preview={false} width={24} style={{ marginBottom: 3 }} />
                    Tạo lịch mua sắm
                </Space>}
                destroyOnClose
                onCancel={() => setShoppingRangeOpen(false)}
                footer={null}
            >
                <DeferredModalContent active={shoppingRangeOpen} minHeight={180}>
                {shoppingRangeMealIds.length === 0 ? (
                    <Box style={{ textAlign: "center", padding: "24px 0" }}>
                        <Typography.Text type="secondary">Không có thực đơn nào trong khoảng ngày đã chọn</Typography.Text>
                    </Box>
                ) : (
                    <ShoppingListAddWidget
                        date={selectedRange ? selectedRange[0].toDate() : new Date()}
                        initialName={selectedRange ? getVietnameseWeekShoppingListName(selectedRange[0], selectedRange[1]) : undefined}
                        scheduledMealIds={shoppingRangeMealIds}
                        onDone={() => setShoppingRangeOpen(false)}
                        onCreated={(shoppingList) => navigate(RootRoutes.AuthorizedRoutes.ShoppingListRoutes.Detail(shoppingList.id))}
                    />
                )}
                </DeferredModalContent>
            </Modal>
        </React.Fragment>
    );
};

// ─── Meal item ────────────────────────────────────────────────────────────────
export const ScheduledMealItem = ({ item, selected, dishNameById, onDelete }: { item: ScheduledMeal; selected: boolean; dishNameById: Map<string, string>; onDelete: (item: ScheduledMeal) => void }) => {
    const toggleEditModal = useToggle({ defaultValue: false });
    const toggleMealModal = useToggle({ defaultValue: false });
    const toggleCopyModal = useToggle({ defaultValue: false });
    const toggleDeleteConfirm = useToggle({ defaultValue: false });
    const [copyDate, setCopyDate] = useState<Dayjs | null>(null);
    const dispatch = useDispatch();

    const _dishName = (id: string) => dishNameById.get(id) ?? id;
    const _dishLabel = (id: string) => {
        const servings = item.dishServings?.[id];
        return servings ? `${_dishName(id)} (${servings} phần)` : _dishName(id);
    };

    const _onToggleSelect = (e: CheckboxChangeEvent) => {
        dispatch(toggleSelectedMeals({ ids: [item.id], selected: e.target.checked }));
    };

    const _onCopyConfirm = () => {
        if (!copyDate) return;
        dispatch(addScheduledMeal({
            ...item,
            id: item.name + nanoid(10),
            plannedDate: copyDate.toDate(),
            createdDate: new Date(),
        }));
        dispatch(rememberScheduledMealName(item.name));
        toggleCopyModal.hide();
        setCopyDate(null);
    };

    const _onMoreActionClick = (e) => {
        switch (e.key) {
            case "copy": toggleCopyModal.show(); break;
            case "edit": toggleEditModal.show(); break;
            case "delete": toggleDeleteConfirm.show(); break;
        }
    };

    const mealGroups = [
        { icon: MorningIcon, label: "Sáng", dishIds: item.meals.breakfast, color: "#faad14", background: "#fffbe6", border: "#ffe58f" },
        { icon: NoonIcon, label: "Trưa", dishIds: item.meals.lunch, color: "#d46b08", background: "#fff7e6", border: "#ffd591" },
        { icon: NightIcon, label: "Tối", dishIds: item.meals.dinner, color: "#531dab", background: "#f9f0ff", border: "#efdbff" },
    ];
    const allDishIds = mealGroups.flatMap(group => group.dishIds);
    const totalDishCount = allDishIds.length;
    const uniqueDishCount = new Set(allDishIds).size;
    const plannedStatus = dayjs(item.plannedDate).isSame(dayjs(), "day")
        ? { label: "Hôm nay", color: "#1677ff", background: "#e6f4ff", border: "#91caff" }
        : dayjs(item.plannedDate).isBefore(dayjs(), "day")
            ? { label: "Đã qua", color: "#8c8c8c", background: "#fafafa", border: "#d9d9d9" }
            : { label: "Sắp tới", color: "#389e0d", background: "#f6ffed", border: "#b7eb8f" };
    const railColor = selected ? "#1677ff" : plannedStatus.color;

    const MealRow = ({ icon, label, dishIds, color, background, border }: { icon: string; label: string; dishIds: string[]; color: string; background: string; border: string }) => (
        <Box style={{ border: `1px solid ${border}`, borderRadius: 8, background, padding: "8px 9px", minWidth: 0 }}>
            <div style={{ display: "grid", gridTemplateColumns: "auto minmax(0, 1fr) auto", gap: 7, alignItems: "center", marginBottom: 6 }}>
                <Image src={icon} preview={false} width={15} style={{ marginBottom: 2 }} />
                <Typography.Text strong style={{ fontSize: 13, color, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{label}</Typography.Text>
                <Typography.Text type="secondary" style={{ fontSize: 11, whiteSpace: "nowrap" }}>{dishIds.length} món</Typography.Text>
            </div>
            {dishIds.length === 0 ? (
                <Typography.Text type="secondary" style={{ display: "block", fontSize: 12, lineHeight: "18px" }}>Chưa chọn</Typography.Text>
            ) : (
                <Stack wrap="wrap" gap={4}>
                    {dishIds.slice(0, 3).map((id, index) => (
                        <Tag key={`${id}-${index}`} style={{ maxWidth: "100%", fontSize: 11, padding: "1px 7px", margin: 0, borderRadius: 10, overflow: "hidden", textOverflow: "ellipsis" }}>
                            {_dishLabel(id)}
                        </Tag>
                    ))}
                    {dishIds.length > 3 && <Tag style={{ fontSize: 11, padding: "1px 7px", margin: 0, borderRadius: 10 }}>+{dishIds.length - 3}</Tag>}
                </Stack>
            )}
        </Box>
    );

    return (
        <React.Fragment>
            <Box className="scheduled-meal-card" style={{
                borderRadius: 8,
                border: `1px solid ${selected ? "rgba(22,119,255,0.42)" : "rgba(116,54,220,0.10)"}`,
                background: selected ? "#f0f7ff" : "#fff",
                marginBottom: 10,
                overflow: "hidden",
                boxShadow: "0 10px 28px rgba(74,48,130,0.10)",
            }}>
                <div style={{ display: "grid", gridTemplateColumns: "5px minmax(0, 1fr)", background: `linear-gradient(90deg, ${railColor}14 0%, rgba(255,255,255,0.96) 74%)`, borderBottom: "1px solid rgba(116,54,220,0.09)" }}>
                    <div style={{ background: railColor }} />
                    <div style={{ padding: "12px 12px 10px", minWidth: 0 }}>
                    <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) auto", gap: 8, alignItems: "start" }}>
                        <Stack gap={7} align="flex-start" style={{ minWidth: 0 }}>
                            <Checkbox checked={selected} onChange={_onToggleSelect} style={{ marginTop: 2, marginRight: 0 }} />
                            <div style={{ minWidth: 0 }}>
                                <Tooltip title={item.name}>
                                    <Typography.Paragraph style={{ marginBottom: 2, color: "#111827", fontWeight: 800, lineHeight: "22px", fontSize: 15.5 }} ellipsis={{ rows: 2 }}>
                                        {item.name}
                                    </Typography.Paragraph>
                                </Tooltip>
                                <Space size={5} wrap>
                                    <span style={{ padding: "1px 7px", borderRadius: 999, background: plannedStatus.background, color: plannedStatus.color, border: `1px solid ${plannedStatus.border}`, fontSize: 11, lineHeight: "18px", fontWeight: 650 }}>{plannedStatus.label}</span>
                                    <Typography.Text type="secondary" style={{ fontSize: 12 }}>{moment(item.plannedDate).format("DD/MM/YYYY")}</Typography.Text>
                                    <Typography.Text type="secondary" style={{ fontSize: 12 }}>{totalDishCount} lượt món</Typography.Text>
                                    {uniqueDishCount !== totalDishCount && <Typography.Text type="secondary" style={{ fontSize: 12 }}>{uniqueDishCount} món khác nhau</Typography.Text>}
                                </Space>
                            </div>
                        </Stack>

                        <Stack gap={4} align="center">
                            <Button onClick={toggleMealModal.show}>Chi tiết</Button>
                            <Dropdown menu={{
                                items: [
                                    { label: "Sao chép", key: "copy", icon: <CopyOutlined /> },
                                    { label: "Sửa", key: "edit", icon: <EditOutlined /> },
                                    { type: "divider" },
                                    { label: "Xóa", key: "delete", icon: <DeleteOutlined />, danger: true },
                                ],
                                onClick: _onMoreActionClick,
                            }} placement="bottomRight">
                                <Button type="text" icon={<HolderOutlined />} style={{ width: 34, paddingInline: 0 }} />
                            </Dropdown>
                        </Stack>
                    </div>
                    </div>
                </div>

                <div style={{ padding: 10, minWidth: 0, display: "flex", flexDirection: "column", gap: 9 }}>
                    <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr)", gap: 7 }}>
                        {mealGroups.map(group => <MealRow key={group.label} icon={group.icon} label={group.label} dishIds={group.dishIds} color={group.color} background={group.background} border={group.border} />)}
                    </div>
                </div>
            </Box>

            {/* Edit */}
            {toggleEditModal.value && <Modal
                open={toggleEditModal.value}
                title={<Space>
                    <Image src={MealsIcon} preview={false} width={24} style={{ marginBottom: 3 }} />
                    Sửa thực đơn
                </Space>}
                destroyOnClose
                onCancel={toggleEditModal.hide}
                footer={null}
            >
                <DeferredModalContent active={toggleEditModal.value}>
                    <ScheduledMealEditWidget item={item} onDone={toggleEditModal.hide} />
                </DeferredModalContent>
            </Modal>}

            {/* Meal detail */}
            {toggleMealModal.value && <Modal
                style={{ top: 50 }}
                open={toggleMealModal.value}
                title={<Space>
                    <Image src={MealsIcon} preview={false} width={24} style={{ marginBottom: 3 }} />
                    Thực đơn
                </Space>}
                destroyOnClose
                onCancel={toggleMealModal.hide}
                footer={null}
            >
                <DeferredModalContent active={toggleMealModal.value} minHeight={220}>
                    <Box style={{ maxHeight: 550, overflowY: "auto" }}>
                        <ShoppingListMealDetailWidget mealId={item.id} />
                    </Box>
                </DeferredModalContent>
            </Modal>}

            {/* Copy to another day */}
            {toggleCopyModal.value && <Modal
                open={toggleCopyModal.value}
                title={<Space>
                    <CopyOutlined />
                    Sao chép sang ngày khác
                </Space>}
                onOk={_onCopyConfirm}
                onCancel={() => { toggleCopyModal.hide(); setCopyDate(null); }}
                okText="Sao chép"
                cancelText="Huỷ"
                okButtonProps={{ disabled: !copyDate }}
                destroyOnClose
            >
                <DeferredModalContent active={toggleCopyModal.value} minHeight={96}>
                <Box style={{ padding: "12px 0" }}>
                    <Typography.Text style={{ display: "block", marginBottom: 10 }}>
                        Chọn ngày muốn sao chép thực đơn <strong>"{item.name}"</strong> sang:
                    </Typography.Text>
                    <DatePicker
                        style={{ width: "100%" }}
                        format="DD/MM/YYYY"
                        placeholder="Chọn ngày"
                        onChange={setCopyDate}
                        disabledDate={d => d.isSame(dayjs(item.plannedDate), "day")}
                    />
                </Box>
                </DeferredModalContent>
            </Modal>}
            {toggleDeleteConfirm.value && <Modal
                open={toggleDeleteConfirm.value}
                title={<Space><DeleteOutlined style={{ color: "red" }} />Xác nhận xóa</Space>}
                onCancel={toggleDeleteConfirm.hide}
                onOk={() => { onDelete(item); toggleDeleteConfirm.hide(); }}
                okText="Xóa"
                cancelText="Hủy"
                okButtonProps={{ danger: true }}
                destroyOnClose
            >
                Bạn có chắc muốn xóa thực đơn <b>{item.name}</b> không? Hành động này không thể hoàn tác.
            </Modal>}
        </React.Fragment>
    );
};

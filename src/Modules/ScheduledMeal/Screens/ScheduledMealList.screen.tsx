import {
    CalendarOutlined, CopyOutlined, DeleteOutlined, EditOutlined,
    FireOutlined, LeftOutlined, MoreOutlined, PlusOutlined, RightOutlined, ShoppingCartOutlined, TeamOutlined
} from "@ant-design/icons";
import { DateHelpers } from "@common/Helpers/DateHelper";
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
import { ScheduledMeal, ScheduledMealSlotKey } from "@store/Models/ScheduledMeal";
import { rememberScheduledMealName, WeeklyMealTemplate } from "@store/Reducers/AppContextReducer";
import { addScheduledMeal, removeScheduledMeal, toggleSelectedMeals } from "@store/Reducers/ScheduledMealReducer";
import { selectAvailableServingsByDishKind, selectDishNameById, selectHouseholdMembers, selectScheduledMeals, selectSelectedMealIds, selectWeeklyMealTemplates } from "@store/Selectors";
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
import DietPlanIcon from "../../../../assets/icons/diet-plan.png";
import { Image } from "@components/Image";
import { Box } from "@components/Layout/Box";
import { ShoppingListMealDetailWidget } from "@modules/ShoppingList/Screens/ShoppingListMealDetail.widget";
import { ShoppingListAddWidget } from "@modules/ShoppingList/Screens/ShoppingListAdd.widget";
import { Checkbox } from "@components/Form/Checkbox";
import { CheckboxChangeEvent } from "antd/es/checkbox";
import { RootRoutes } from "@routing/RootRoutes";
import { ScheduledMealCookingModal, getScheduledMealDishIds } from "./ScheduledMealCooking.widget";
import { MemberDishFeedbackHistoryWidget } from "./MemberDishFeedbackHistory.widget";
import { ScheduledMealSlotStateHelper, buildDaySlotAggregates, DaySlotAggregate } from "../Helpers/ScheduledMealSlotStateHelper";
import { ScheduledMealSlotDetailModal, SLOT_META } from "./ScheduledMealSlotDetail.modal";

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

const mealSlotKeys: ScheduledMealSlotKey[] = ['breakfast', 'lunch', 'dinner'];

const topToolCardStyle: React.CSSProperties = {
    background: "linear-gradient(135deg, #ffffff 0%, #fbf9ff 100%)",
    border: "1px solid rgba(116,54,220,0.10)",
    borderRadius: 8,
    padding: 8,
    boxShadow: "0 8px 20px rgba(74,48,130,0.06)",
};

const topActionRowStyle: React.CSSProperties = {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(104px, 1fr))",
    gap: 8,
    alignItems: "center",
};

const topActionButtonStyle: React.CSSProperties = {
    width: "100%",
    height: 38,
    minWidth: 0,
    whiteSpace: "nowrap",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 12,
    lineHeight: "16px",
    fontWeight: 560,
    borderRadius: 8,
    color: "#3f315f",
    borderColor: "rgba(116,54,220,0.14)",
    background: "rgba(255,255,255,0.86)",
    boxShadow: "none",
};

const dayNavigatorCardStyle: React.CSSProperties = {
    display: "grid",
    gridTemplateColumns: "42px minmax(0, 1fr) 42px",
    gap: 8,
    alignItems: "center",
    border: "1px solid rgba(116,54,220,0.18)",
    borderRadius: 8,
    background: "linear-gradient(135deg, #f3efff 0%, #eaf6ff 54%, #ffffff 100%)",
    padding: 10,
    boxShadow: "0 14px 32px rgba(74,48,130,0.14), inset 0 1px 0 rgba(255,255,255,0.78)",
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

const dayPickerControlRowStyle: React.CSSProperties = {
    minHeight: 28,
    display: "grid",
    gridTemplateColumns: "32px minmax(0, 72px)",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
    width: "min(100%, 110px)",
    margin: "7px auto 0",
};

const dayPickerButtonStyle: React.CSSProperties = {
    width: "100%",
    minWidth: 0,
    height: 28,
    borderRadius: 999,
    fontSize: 12,
    lineHeight: "16px",
    fontWeight: 500,
    paddingInline: 8,
    color: "#5e2bbf",
    borderColor: "rgba(116,54,220,0.18)",
    background: "rgba(255,255,255,0.86)",
    boxShadow: "none",
    overflow: "hidden",
};

const daySummaryIconButtonStyle: React.CSSProperties = {
    width: 38,
    height: 38,
    paddingInline: 0,
    borderRadius: 10,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
};

const mealItemMenuButtonStyle: React.CSSProperties = {
    width: 36,
    height: 36,
    paddingInline: 0,
    borderRadius: 10,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
};

const dayPickerIconButtonStyle: React.CSSProperties = {
    ...dayPickerButtonStyle,
    width: 32,
    paddingInline: 0,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
};

const dayPickerSingleControlRowStyle: React.CSSProperties = {
    ...dayPickerControlRowStyle,
    gridTemplateColumns: "32px",
    width: 32,
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
.scheduled-meal-top-action:hover {
    border-color: rgba(116,54,220,0.28) !important;
    color: #5e2bbf !important;
    background: #fff !important;
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
    const [dayCookingOpen, setDayCookingOpen] = useState(false);
    const [dayCookingToken, setDayCookingToken] = useState(0);
    const [templateModalOpen, setTemplateModalOpen] = useState(false);
    const [templateApplyMode, setTemplateApplyMode] = useState<MealTemplateScope>('day');
    const [templateApplyWeek, setTemplateApplyWeek] = useState<Dayjs>(getMondayStart(dayjs()));
    const [selectedTemplateId, setSelectedTemplateId] = useState<string | undefined>();
    const [detailSlot, setDetailSlot] = useState<ScheduledMealSlotKey>();
    const [planListOpen, setPlanListOpen] = useState(false);

    const scheduledMeals = useSelector(selectScheduledMeals);
    const selectedMealIds = useSelector(selectSelectedMealIds);
    const dishNameById = useSelector(selectDishNameById);
    const mealTemplates = useSelector(selectWeeklyMealTemplates);
    const servingsByDishKind = useSelector(selectAvailableServingsByDishKind);
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
    const slotAggregates = useMemo(() => buildDaySlotAggregates(mealsToday), [mealsToday]);
    const allDayDishIds = useMemo(() => getScheduledMealDishIds(mealsToday.flatMap(meal => mealSlotKeys.flatMap(slot => (
        ScheduledMealSlotStateHelper.getSlotState(meal, slot) === 'skipped' ? [] : meal.meals[slot]
    )))), [mealsToday]);
    const allDayDishServings = useMemo(() => mealsToday.reduce((result, meal) => ({
        ...result,
        ...(meal.dishServings ?? {}),
    }), {} as Record<string, number>), [mealsToday]);
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
                memberIds: selectedTemplate.memberIds ?? [],
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
    const smartPlannerForSelectedDate = RootRoutes.AuthorizedRoutes.SmartMealPlanner({ date: selectedDate });

    const _onStartDayCooking = () => {
        setDayCookingToken(Date.now());
        setDayCookingOpen(true);
    };

    return (
        <React.Fragment>
            <style>{scheduledMealCss}</style>
            <Box style={{ padding: "4px 0 0", marginBottom: 8 }}>
                <Box style={topToolCardStyle}>
                    <div style={topActionRowStyle}>
                        <Tooltip title="Tự gợi ý thực đơn theo ngân sách, dinh dưỡng và nhà mình">
                            <Button className="scheduled-meal-top-action" icon={<Image src={DietPlanIcon} preview={false} width={18} alt="" />} onClick={() => navigate(smartPlannerForSelectedDate)} style={topActionButtonStyle}>
                                Gợi ý
                            </Button>
                        </Tooltip>
                        <Button className="scheduled-meal-top-action" icon={<CalendarOutlined />} onClick={_onOpenTemplateApply} style={topActionButtonStyle}>
                            Từ mẫu
                        </Button>
                        <Tooltip title="Tạo danh sách mua theo khoảng ngày">
                            <Button className="scheduled-meal-top-action" icon={<ShoppingCartOutlined />} onClick={_onOpenRangeShopping} style={topActionButtonStyle}>
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
                        <Typography.Text strong style={{ display: "block", color: "#111827", fontSize: 18, lineHeight: "24px", overflowWrap: "anywhere", textTransform: "capitalize" }}>
                            {DateHelpers.formatWithCapitalizedWeekday(selectedDate, "dddd, DD/MM/YYYY")}
                        </Typography.Text>
                        <Space size={5} wrap style={{ justifyContent: "center", marginTop: 4 }}>
                            <span style={{ padding: "1px 8px", borderRadius: 999, background: selectedDayStatus.background, color: selectedDayStatus.color, border: `1px solid ${selectedDayStatus.border}`, fontSize: 11, lineHeight: "18px", fontWeight: 700 }}>{selectedDayStatus.label}</span>
                            <Typography.Text type="secondary" style={{ fontSize: 12 }}>{mealsToday.length} thực đơn</Typography.Text>
                        </Space>
                        <div style={dayjs(selectedDate).isSame(dayjs(), "day") ? dayPickerSingleControlRowStyle : dayPickerControlRowStyle}>
                            <Button
                                aria-label={calendarVisible ? "Ẩn lịch" : "Chọn ngày"}
                                onClick={() => setCalendarVisible(value => !value)}
                                icon={<CalendarOutlined />}
                                style={dayPickerIconButtonStyle}
                            />
                            {!dayjs(selectedDate).isSame(dayjs(), "day") && <Button onClick={_goToday} style={dayPickerButtonStyle}>Hôm nay</Button>}
                        </div>
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
                    <Stack gap={6} align="center" style={{ flexShrink: 0 }}>
                        <Tooltip title="Lập thực đơn thông minh">
                            <Button aria-label="Lập thực đơn thông minh" onClick={() => navigate(smartPlannerForSelectedDate)} icon={<Image src={DietPlanIcon} preview={false} width={19} alt="" />} style={daySummaryIconButtonStyle} />
                        </Tooltip>
                        <Tooltip title="Nấu cả ngày">
                            <Button aria-label="Nấu cả ngày" disabled={allDayDishIds.length === 0} onClick={_onStartDayCooking} icon={<FireOutlined />} style={{ ...daySummaryIconButtonStyle, color: allDayDishIds.length > 0 ? '#fa8c16' : undefined }} />
                        </Tooltip>
                        <Tooltip title="Thêm thực đơn">
                            <Button aria-label="Thêm thực đơn" onClick={toggleAddModal.show} icon={<PlusOutlined />} style={daySummaryIconButtonStyle} />
                        </Tooltip>
                    </Stack>
                </Box>
            </Box>

            <Box style={{ padding: "8px 0 16px" }}>
                {mealsToday.length === 0 ? (
                    <Box style={{ textAlign: "center", padding: "24px 0", border: "1px dashed #d9d9d9", borderRadius: 8, background: "#fafafa" }}>
                        <Typography.Text type="secondary">Chưa có thực đơn trong ngày này</Typography.Text>
                    </Box>
                ) : (
                    <React.Fragment>
                        <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr)", gap: 8 }}>
                            {mealSlotKeys.map(slot => (
                                <SlotSummaryCard
                                    key={slot}
                                    aggregate={slotAggregates[slot]}
                                    dishNameById={dishNameById}
                                    servingsByDishKind={servingsByDishKind}
                                    onOpen={() => setDetailSlot(slot)}
                                />
                            ))}
                        </div>

                        <Box style={{ marginTop: 10 }}>
                            <Button
                                type="text"
                                icon={<TeamOutlined />}
                                onClick={() => setPlanListOpen(value => !value)}
                                style={{ width: "100%", justifyContent: "center", color: "#5e2bbf", borderRadius: 8, border: "1px solid rgba(116,54,220,0.14)", background: "rgba(255,255,255,0.86)" }}
                            >
                                {planListOpen ? "Ẩn danh sách kế hoạch" : `Xem theo kế hoạch (${mealsToday.length})`}
                            </Button>
                            {planListOpen && <Stack direction="column" align="stretch" gap={8} style={{ marginTop: 8 }}>
                                {mealsToday.map(item => (
                                    <ScheduledMealPlanRow key={item.id} item={item} selected={selectedMealIds.has(item.id)} dishNameById={dishNameById} onDelete={_onDelete} />
                                ))}
                            </Stack>}
                        </Box>
                    </React.Fragment>
                )}
            </Box>

            {/* Add modal */}
            <Modal
                open={toggleAddModal.value}
                title={<Space>
                    <Image src={DietPlanIcon} preview={false} width={24} style={{ marginBottom: 3 }} />
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

            <ScheduledMealCookingModal
                open={dayCookingOpen}
                title={`Nấu cả ngày - ${moment(selectedDate).format("DD/MM/YYYY")}`}
                dishIds={allDayDishIds}
                dishServings={allDayDishServings}
                autoStartToken={dayCookingToken}
                mealSlot="day"
                mealDate={selectedDate}
                onClose={() => setDayCookingOpen(false)}
            />

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
                    <Image src={DietPlanIcon} preview={false} width={24} style={{ marginBottom: 3 }} />
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

            {detailSlot && <ScheduledMealSlotDetailModal
                open={Boolean(detailSlot)}
                date={selectedDate}
                slot={detailSlot}
                meals={mealsToday}
                onClose={() => setDetailSlot(undefined)}
            />}
        </React.Fragment>
    );
};

// ─── Slot summary card ──────────────────────────────────────────────────────
const SlotSummaryCard = ({ aggregate, dishNameById, servingsByDishKind, onOpen }: {
    aggregate: DaySlotAggregate;
    dishNameById: Map<string, string>;
    servingsByDishKind: Map<string, { fresh: number; leftover: number }>;
    onOpen: () => void;
}) => {
    const meta = SLOT_META[aggregate.slot];
    const dishIds = aggregate.allDishIds;
    const _dishName = (id: string) => dishNameById.get(id) ?? id;
    const _formatStock = (id: string): string | null => {
        const stock = servingsByDishKind.get(id);
        if (!stock) return null;
        const total = stock.fresh + stock.leftover;
        if (total <= 0) return null;
        if (stock.fresh > 0 && stock.leftover > 0) return `${stock.fresh} mới · ${stock.leftover} dư`;
        return `${total} phần`;
    };

    return <Box
        onClick={onOpen}
        className="scheduled-meal-card"
        style={{ cursor: "pointer", border: `1px solid ${meta.border}`, borderRadius: 8, background: `linear-gradient(135deg, #fff 0%, ${meta.background} 100%)`, padding: 12, boxShadow: "0 6px 18px rgba(15,23,42,0.06)" }}
    >
        <div style={{ display: "grid", gridTemplateColumns: "auto minmax(0, 1fr) auto", gap: 9, alignItems: "center", marginBottom: dishIds.length > 0 || aggregate.skippedCount > 0 ? 9 : 0 }}>
            <span style={{ width: 34, height: 34, borderRadius: 8, display: "inline-flex", alignItems: "center", justifyContent: "center", background: "rgba(255,255,255,0.86)", border: `1px solid ${meta.border}`, flexShrink: 0 }}>
                <Image src={meta.icon} preview={false} width={19} style={{ marginBottom: 2 }} />
            </span>
            <div style={{ minWidth: 0 }}>
                <Typography.Text strong style={{ display: "block", color: meta.color, fontSize: 15, lineHeight: "20px" }}>{meta.label}</Typography.Text>
                <Typography.Text type="secondary" style={{ display: "block", fontSize: 12, lineHeight: "16px" }}>
                    {dishIds.length} món · {aggregate.planCount} kế hoạch
                </Typography.Text>
            </div>
            <RightOutlined style={{ color: meta.color, fontSize: 13 }} />
        </div>

        {(dishIds.length > 0 || aggregate.cookedCount > 0 || aggregate.eatenCount > 0 || aggregate.skippedCount > 0) && <Stack wrap="wrap" gap={5} style={{ marginBottom: dishIds.length > 0 ? 8 : 0 }}>
            {aggregate.cookedCount > 0 && <Tag color="orange" style={{ marginInlineEnd: 0, fontSize: 11 }}>{aggregate.cookedCount}/{aggregate.planCount} đã nấu</Tag>}
            {aggregate.eatenCount > 0 && <Tag color="green" style={{ marginInlineEnd: 0, fontSize: 11 }}>{aggregate.eatenCount}/{aggregate.planCount} đã ăn</Tag>}
            {aggregate.skippedCount > 0 && <Tag style={{ marginInlineEnd: 0, fontSize: 11 }}>{aggregate.skippedCount} không nấu</Tag>}
        </Stack>}

        {dishIds.length === 0 ? (
            <Typography.Text type="secondary" style={{ display: "block", fontSize: 12 }}>Chưa có món</Typography.Text>
        ) : <Stack wrap="wrap" gap={5}>
            {dishIds.slice(0, 4).map((id, index) => {
                const stock = _formatStock(id);
                return <Tag key={`${id}-${index}`} style={{ marginInlineEnd: 0, fontSize: 11, borderRadius: 10, maxWidth: "100%", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {_dishName(id)}{stock ? ` · còn ${stock}` : ""}
                </Tag>;
            })}
            {dishIds.length > 4 && <Tag style={{ marginInlineEnd: 0, fontSize: 11, borderRadius: 10 }}>+{dishIds.length - 4}</Tag>}
        </Stack>}
    </Box>;
};

// ─── Slim plan row (toggleable list) ─────────────────────────────────────────
// One compact row per meal plan: name, member chips, per-slot dish counts, and the
// management dropdown (detail / copy / edit / delete). Cooking, completion and skip
// actions now live in the slot detail modal, scoped per plan-item.
const slotCountLabels: Array<{ slot: ScheduledMealSlotKey; label: string }> = [
    { slot: 'breakfast', label: 'Sáng' },
    { slot: 'lunch', label: 'Trưa' },
    { slot: 'dinner', label: 'Tối' },
];

const ScheduledMealPlanRow = ({ item, selected, dishNameById, onDelete }: { item: ScheduledMeal; selected: boolean; dishNameById: Map<string, string>; onDelete: (item: ScheduledMeal) => void }) => {
    const toggleEditModal = useToggle({ defaultValue: false });
    const toggleMealModal = useToggle({ defaultValue: false });
    const toggleCopyModal = useToggle({ defaultValue: false });
    const toggleDeleteConfirm = useToggle({ defaultValue: false });
    const [copyDate, setCopyDate] = useState<Dayjs | null>(null);
    const householdMembers = useSelector(selectHouseholdMembers);
    const dispatch = useDispatch();

    const memberNameById = useMemo(() => new Map(householdMembers.map(member => [member.id, member.name])), [householdMembers]);
    const memberIds = (item.memberIds ?? []).filter(id => memberNameById.has(id));

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
            case "detail": toggleMealModal.show(); break;
            case "copy": toggleCopyModal.show(); break;
            case "edit": toggleEditModal.show(); break;
            case "delete": toggleDeleteConfirm.show(); break;
        }
    };

    return (
        <React.Fragment>
            <Box className="scheduled-meal-card" style={{
                borderRadius: 8,
                border: `1px solid ${selected ? "rgba(22,119,255,0.42)" : "rgba(116,54,220,0.12)"}`,
                background: selected ? "#f0f7ff" : "#fff",
                padding: "10px 11px",
                boxShadow: "0 6px 16px rgba(74,48,130,0.06)",
            }}>
                <div style={{ display: "grid", gridTemplateColumns: "auto minmax(0, 1fr) auto", gap: 8, alignItems: "start" }}>
                    <Checkbox checked={selected} onChange={_onToggleSelect} style={{ marginTop: 2, marginRight: 0 }} />
                    <div style={{ minWidth: 0 }}>
                        <Typography.Text strong style={{ display: "block", color: "#111827", fontSize: 14, lineHeight: "19px", overflowWrap: "anywhere" }}>{item.name}</Typography.Text>
                        <Stack wrap="wrap" gap={5} style={{ marginTop: 5 }}>
                            {memberIds.length === 0
                                ? <Tag icon={<TeamOutlined />} style={{ marginInlineEnd: 0, fontSize: 11 }}>Cả nhà</Tag>
                                : memberIds.map(id => <Tag key={id} color="purple" style={{ marginInlineEnd: 0, fontSize: 11 }}>{memberNameById.get(id)}</Tag>)}
                        </Stack>
                        <Stack wrap="wrap" gap={6} style={{ marginTop: 6 }}>
                            {slotCountLabels.map(({ slot, label }) => {
                                const skipped = Boolean(item.skipMeals?.[slot]);
                                const count = (item.meals?.[slot] ?? []).length;
                                return <Typography.Text key={slot} type="secondary" style={{ fontSize: 12 }}>
                                    {label}: {skipped ? "không nấu" : `${count} món`}
                                </Typography.Text>;
                            })}
                        </Stack>
                    </div>
                    <Dropdown menu={{
                        items: [
                            { label: "Chi tiết", key: "detail", icon: <CalendarOutlined /> },
                            { label: "Sao chép", key: "copy", icon: <CopyOutlined /> },
                            { label: "Sửa", key: "edit", icon: <EditOutlined /> },
                            { type: "divider" },
                            { label: "Xóa", key: "delete", icon: <DeleteOutlined />, danger: true },
                        ],
                        onClick: _onMoreActionClick,
                    }} placement="bottomRight">
                        <Button aria-label="Thao tác thực đơn" type="text" icon={<MoreOutlined />} style={mealItemMenuButtonStyle} />
                    </Dropdown>
                </div>
            </Box>

            {toggleEditModal.value && <Modal
                open={toggleEditModal.value}
                title={<Space>
                    <Image src={DietPlanIcon} preview={false} width={24} style={{ marginBottom: 3 }} />
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

            {toggleMealModal.value && <Modal
                style={{ top: 50 }}
                open={toggleMealModal.value}
                title={<Space>
                    <Image src={DietPlanIcon} preview={false} width={24} style={{ marginBottom: 3 }} />
                    Thực đơn
                </Space>}
                destroyOnClose
                onCancel={toggleMealModal.hide}
                footer={null}
            >
                <DeferredModalContent active={toggleMealModal.value} minHeight={220}>
                    <Box style={{ maxHeight: 550, overflowY: "auto" }}>
                        <ShoppingListMealDetailWidget mealId={item.id} />
                        <Box style={{ marginTop: 10 }}>
                            <MemberDishFeedbackHistoryWidget lockedDate={item.plannedDate} compact maxRows={8} />
                        </Box>
                    </Box>
                </DeferredModalContent>
            </Modal>}

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

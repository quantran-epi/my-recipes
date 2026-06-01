import {
    CopyOutlined, DeleteOutlined, EditOutlined,
    PlusOutlined, ShoppingCartOutlined
} from "@ant-design/icons";
import { Badge } from "@components/Badge";
import { Button } from "@components/Button";
import { Space } from "@components/Layout/Space";
import { Stack } from "@components/Layout/Stack";
import { Modal } from "@components/Modal";
import { Popconfirm } from "@components/Popconfirm";
import { Typography } from "@components/Typography";
import { useScreenTitle, useTheme, useToggle } from "@hooks";
import { ScheduledMeal } from "@store/Models/ScheduledMeal";
import { addScheduledMeal, removeScheduledMeal, toggleSelectedMeals } from "@store/Reducers/ScheduledMealReducer";
import { RootState } from "@store/Store";
import { Calendar, DatePicker, Divider, Tag } from "antd";
import { SelectInfo } from "antd/es/calendar/generateCalendar";
import dayjs, { Dayjs } from "dayjs";
import { nanoid } from "nanoid";
import { orderBy } from "lodash";
import moment from "moment";
import React, { useState } from "react";
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

// ─── Main screen ─────────────────────────────────────────────────────────────
export const ScheduledMealListScreen = () => {
    const [selectedDate, setSelectedDate] = useState<Date>(new Date());
    const [rangePickerOpen, setRangePickerOpen] = useState(false);
    const [selectedRange, setSelectedRange] = useState<[Dayjs, Dayjs] | null>(null);
    const [shoppingRangeMealIds, setShoppingRangeMealIds] = useState<string[]>([]);
    const [shoppingRangeOpen, setShoppingRangeOpen] = useState(false);

    const scheduledMeals = useSelector((state: RootState) => state.personal.scheduledMeal.scheduledMeals);
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const { } = useScreenTitle({ value: "Thực đơn", deps: [] });
    const toggleAddModal = useToggle({ defaultValue: false });

    const _onSelect = (d, selectInfo?: SelectInfo) => {
        setSelectedDate(d.toDate());
    };

    const _cellRender = (d, info) => {
        const date = d.toDate() as Date;
        if (_hasScheduledMeal(date)) return <Badge dot status="success" />;
    };

    const _onDelete = (item) => dispatch(removeScheduledMeal([item.id]));

    const _hasScheduledMeal = (date: Date) =>
        scheduledMeals.some(e => moment(e.plannedDate).format("DD/MM/YYYY") === moment(date).format("DD/MM/YYYY"));

    const _findScheduledMealsByDate = (date: Date) =>
        orderBy(
            scheduledMeals.filter(e => moment(e.plannedDate).format("DD/MM/YYYY") === moment(date).format("DD/MM/YYYY")),
            [obj => obj.createdDate],
            ["desc"]
        );

    const _onOpenRangeShopping = () => setRangePickerOpen(true);

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

    return (
        <React.Fragment>
            {/* ── Range shopping button ── */}
            <Stack justify="flex-end" style={{ padding: "8px 12px 0", marginBottom: 10 }}>
                <Button
                    icon={<ShoppingCartOutlined />}
                    onClick={_onOpenRangeShopping}
                    style={{ borderRadius: 16 }}
                >
                    Giỏ hàng theo khoảng ngày
                </Button>
            </Stack>

            <Calendar fullscreen={false} onSelect={_onSelect} cellRender={_cellRender} />

            <Divider orientation="left" style={{ marginTop: 4 }}>
                Thực đơn {moment(selectedDate).format("DD/MM/YYYY")}
            </Divider>
            <Box style={{ padding: "0 12px" }}>
                <Button fullwidth onClick={toggleAddModal.show} icon={<PlusOutlined />} />
            </Box>

            <Box style={{ padding: "0 12px", marginTop: 15 }}>
                {mealsToday.length === 0 ? (
                    <Box style={{ textAlign: "center", padding: "24px 0" }}>
                        <Typography.Text type="secondary">Chưa có thực đơn trong ngày này</Typography.Text>
                    </Box>
                ) : (
                    mealsToday.map(item => (
                        <ScheduledMealItem key={item.id} item={item} onDelete={_onDelete} />
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
                <ScheduledMealAddWidget date={selectedDate} onDone={toggleAddModal.hide} />
            </Modal>

            {/* Range picker modal */}
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
                <Box style={{ padding: "12px 0" }}>
                    <DatePicker.RangePicker
                        style={{ width: "100%" }}
                        format="DD/MM/YYYY"
                        placeholder={["Từ ngày", "Đến ngày"]}
                        onChange={(vals) => setSelectedRange(vals as [Dayjs, Dayjs] | null)}
                        presets={[
                            { label: "7 ngày tới", value: [dayjs(), dayjs().add(6, "day")] },
                            { label: "Tuần này", value: [dayjs().startOf("week"), dayjs().endOf("week")] },
                            { label: "Tuần tới", value: [dayjs().add(1, "week").startOf("week"), dayjs().add(1, "week").endOf("week")] },
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
                {shoppingRangeMealIds.length === 0 ? (
                    <Box style={{ textAlign: "center", padding: "24px 0" }}>
                        <Typography.Text type="secondary">Không có thực đơn nào trong khoảng ngày đã chọn</Typography.Text>
                    </Box>
                ) : (
                    <ShoppingListAddWidget
                        date={selectedRange ? selectedRange[0].toDate() : new Date()}
                        scheduledMealIds={shoppingRangeMealIds}
                        onDone={() => setShoppingRangeOpen(false)}
                        onCreated={(shoppingList) => navigate(RootRoutes.AuthorizedRoutes.ShoppingListRoutes.Detail(shoppingList.id))}
                    />
                )}
            </Modal>
        </React.Fragment>
    );
};

// ─── Meal item ────────────────────────────────────────────────────────────────
export const ScheduledMealItem = ({ item, onDelete }: { item: ScheduledMeal; onDelete: (item: ScheduledMeal) => void }) => {
    const toggleEditModal = useToggle({ defaultValue: false });
    const toggleMealModal = useToggle({ defaultValue: false });
    const toggleCopyModal = useToggle({ defaultValue: false });
    const [copyDate, setCopyDate] = useState<Dayjs | null>(null);
    const selectedMeals = useSelector((state: RootState) => state.personal.scheduledMeal.selectedMeals);
    const dishes = useSelector((state: RootState) => state.shared.dishes.dishes);
    const dispatch = useDispatch();
    const theme = useTheme();

    const _dishName = (id: string) => dishes.find(d => d.id === id)?.name ?? id;

    const _isSelected = () => selectedMeals.includes(item.id);

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
        toggleCopyModal.hide();
        setCopyDate(null);
    };

    const MealRow = ({ icon, label, dishIds }: { icon: string; label: string; dishIds: string[] }) => (
        <Box style={{ marginBottom: dishIds.length > 0 ? 6 : 2 }}>
            <Stack gap={6} align="center" style={{ marginBottom: dishIds.length > 0 ? 3 : 0 }}>
                <Image src={icon} preview={false} width={14} style={{ marginBottom: 2 }} />
                <Typography.Text style={{ fontSize: 12, color: "#888" }}>{label}</Typography.Text>
                {dishIds.length === 0 && (
                    <Typography.Text style={{ fontSize: 12, color: "#bbb" }}>—</Typography.Text>
                )}
            </Stack>
            {dishIds.length > 0 && (
                <Stack wrap="wrap" gap={4} style={{ paddingLeft: 20 }}>
                    {dishIds.map(id => (
                        <Tag key={id} style={{ fontSize: 11, padding: "1px 7px", margin: 0, borderRadius: 10 }}>
                            {_dishName(id)}
                        </Tag>
                    ))}
                </Stack>
            )}
        </Box>
    );

    return (
        <React.Fragment>
            <Box style={{
                borderRadius: 10,
                border: `1px solid ${_isSelected() ? "#1677ff" : theme.token.colorBorder}`,
                background: _isSelected() ? "#e6f4ff" : "#fafafa",
                padding: "10px 12px",
                marginBottom: 8,
                transition: "all 0.15s",
            }}>
                {/* Header row */}
                <Stack justify="space-between" align="center" style={{ marginBottom: 8 }}>
                    <Stack gap={6} align="center">
                        <Checkbox checked={_isSelected()} onChange={_onToggleSelect} style={{ marginRight: 0 }} />
                        <Button
                            style={{ paddingInline: 4, height: "auto" }}
                            type="text"
                            onClick={toggleMealModal.show}
                        >
                            <Typography.Text strong style={{ fontSize: 14 }}>{item.name}</Typography.Text>
                        </Button>
                    </Stack>
                    <Stack gap={4}>
                        <Button size="small" type="text" icon={<CopyOutlined />} onClick={toggleCopyModal.show} />
                        <Button size="small" type="text" icon={<EditOutlined />} onClick={toggleEditModal.show} />
                        <Popconfirm title="Xóa?" onConfirm={() => onDelete(item)}>
                            <Button size="small" type="text" danger icon={<DeleteOutlined />} />
                        </Popconfirm>
                    </Stack>
                </Stack>

                {/* Inline dish names */}
                <MealRow icon={MorningIcon} label="Sáng" dishIds={item.meals.breakfast} />
                <MealRow icon={NoonIcon} label="Trưa" dishIds={item.meals.lunch} />
                <MealRow icon={NightIcon} label="Tối" dishIds={item.meals.dinner} />
            </Box>

            {/* Edit */}
            <Modal
                open={toggleEditModal.value}
                title={<Space>
                    <Image src={MealsIcon} preview={false} width={24} style={{ marginBottom: 3 }} />
                    Sửa thực đơn
                </Space>}
                destroyOnClose
                onCancel={toggleEditModal.hide}
                footer={null}
            >
                <ScheduledMealEditWidget item={item} onDone={toggleEditModal.hide} />
            </Modal>

            {/* Meal detail */}
            <Modal
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
                <Box style={{ maxHeight: 550, overflowY: "auto" }}>
                    <ShoppingListMealDetailWidget mealId={item.id} />
                </Box>
            </Modal>

            {/* Copy to another day */}
            <Modal
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
            </Modal>
        </React.Fragment>
    );
};

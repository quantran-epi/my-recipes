import { ClockCircleOutlined, DeleteOutlined, EditOutlined, FileTextOutlined, HolderOutlined, PictureOutlined, PlusOutlined, QuestionCircleOutlined } from "@ant-design/icons";
import { Button } from "@components/Button";
import { Dropdown } from "@components/Dropdown";
import { Input } from "@components/Form/Input";
import { Image } from "@components/Image";
import { Avatar } from "@components/Avatar";
import { Box } from "@components/Layout/Box";
import { Space } from "@components/Layout/Space";
import { Stack } from "@components/Layout/Stack";
import { List } from "@components/List";
import { useMessage } from "@components/Message";
import { Modal } from "@components/Modal";
import { Popconfirm } from "@components/Popconfirm";
import { Popover } from "@components/Popover";
import { Tag } from "@components/Tag";
import { Tooltip } from "@components/Tootip";
import { Typography } from "@components/Typography";
import { useScreenTitle, useToggle } from "@hooks";
import { DishDuration, Dishes } from "@store/Models/Dishes";
import { DishesDurationEditParams, removeDishes, updateDishDuration } from "@store/Reducers/DishesReducer";
import { RootState } from "@store/Store";
import { debounce, orderBy, sortBy } from "lodash";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import Clock2Icon from "../../../../assets/icons/clock (2).png";
import NoodlesIcon from "../../../../assets/icons/noodles.png";
import StepsIcon from "../../../../assets/icons/process.png";
import VegetablesIcon from "../../../../assets/icons/vegetable.png";
import { DishesAddWidget } from "./DishesAdd.widget";
import { DishesExportWidget } from "./DishesExport.widget";
import { DishesEditWidget } from "./DishesEdit.widget";
import { DishesDetailWidget } from "./DishesManageIngredient/DishDetail.widget";
import { DishDurationWidget } from "./DishesManageIngredient/DishDuration.widget";
import moment from "moment";
import 'moment/locale/vi';

export const DishesListScreen = () => {
    const dishes = useSelector((state: RootState) => state.dishes.dishes);
    const toggleAddModal = useToggle({ defaultValue: false });
    const [searchText, setSearchText] = useState<string>("");
    const [visibleCount, setVisibleCount] = useState<number>(10);
    const loaderRef = useRef<HTMLDivElement>(null);
    const dispatch = useDispatch();
    const { } = useScreenTitle({ value: "Món ăn", deps: [] });

    const filteredDishes = useMemo<Dishes[]>(() => {
        return sortBy(dishes.filter(e => e.name.trim().toLowerCase().includes(searchText?.trim().toLowerCase())), "name")
    }, [dishes, searchText]);

    const visibleDishes = useMemo(() => filteredDishes.slice(0, visibleCount), [filteredDishes, visibleCount]);

    useEffect(() => {
        setVisibleCount(10);
    }, [searchText]);

    useEffect(() => {
        const observer = new IntersectionObserver((entries) => {
            if (entries[0].isIntersecting) {
                setVisibleCount(prev => prev + 10);
            }
        }, { threshold: 1 });
        if (loaderRef.current) observer.observe(loaderRef.current);
        return () => observer.disconnect();
    }, []);

    const _onDelete = (item) => {
        dispatch(removeDishes([item.id]));
    }

    return <React.Fragment>
        <Stack.Compact>
            <Input allowClear placeholder="Tìm kiếm" onChange={debounce((e) => setSearchText(e.target.value), 350)} />
            <Button onClick={toggleAddModal.show} icon={<PlusOutlined />} />
        </Stack.Compact>
        <List
            itemLayout="horizontal"
            dataSource={visibleDishes}
            renderItem={(item) => <DishesItem item={item} onDelete={_onDelete} />}
        />
        {visibleCount < filteredDishes.length && (
            <div ref={loaderRef} style={{ textAlign: "center", padding: 12, color: "#aaa", fontSize: 13 }}>
                Đang tải thêm...
            </div>
        )}
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
}

moment.relativeTimeRounding((v) => parseFloat(v.toFixed(1)));
moment.relativeTimeThreshold('m', 60);

export const DishesItem: React.FunctionComponent<DishesItemProps> = (props) => {
    const toggleEdit = useToggle({ defaultValue: false });
    const toggleIngredientsOverview = useToggle();
    const toggleStepsOverview = useToggle();
    const toggleDishesDetail = useToggle();
    const dishes = useSelector((state: RootState) => state.dishes.dishes);
    const ingredients = useSelector((state: RootState) => state.ingredient.ingredients);
    const toggleEditDuration = useToggle();
    const message = useMessage();
    const dispatch = useDispatch();

    const _onEdit = () => toggleEdit.show();
    const _onEditDuration = () => toggleEditDuration.show();

    const _sumDuration = () => {
        return moment.duration(Object.values(props.item.duration).reduce((prev, cur) => prev + cur || 0, 0), "minutes").locale("vi").humanize();
    }

    const _hasDuration = () => {
        return Object.values(props.item.duration).some(e => e !== null);
    }

    const _hasIncludeDishes = () => {
        return props.item.includeDishes.filter(id => dishes.find(e => e.id === id)).length > 0;
    }

    const _hasIngredients = () => props.item.ingredients.length > 0;
    const _hasSteps = () => props.item.steps.length > 0;

    const toggleExport = useToggle();
    const toggleDeleteConfirm = useToggle();

    const _referencingDishes = () => {
        return dishes.filter(d => d.id !== props.item.id && d.includeDishes?.includes(props.item.id));
    }

    const _onMoreActionClick = (e) => {
        switch (e.key) {
            case "edit": _onEdit(); break;
            case "duration": _onEditDuration(); break;
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
        message.success();
    }

    return <React.Fragment>
        <List.Item
            actions={[
                <Button size="small" icon={<FileTextOutlined />} onClick={toggleExport.show} />,
                <Dropdown menu={{
                    items: [
                        { label: 'Sửa món ăn', key: 'edit', icon: <EditOutlined /> },
                        { label: 'Thời lượng', key: 'duration', icon: <ClockCircleOutlined /> },
                        { type: 'divider' },
                        { label: 'Xóa', key: 'delete', icon: <DeleteOutlined />, danger: true },
                    ],
                    onClick: _onMoreActionClick
                }} placement="bottom">
                    <Button size="small" icon={<HolderOutlined />} />
                </Dropdown>
            ]}>
            <List.Item.Meta
                avatar={
                    <div onClick={toggleDishesDetail.show} style={{ cursor: "pointer" }}>
                        {props.item.image
                            ? <Avatar shape="square" size={48} src={props.item.image} />
                            : <Avatar shape="square" size={48} icon={<PictureOutlined />} />
                        }
                    </div>
                }
                title={
                    <Typography.Paragraph
                        onClick={toggleDishesDetail.show}
                        style={{ width: 200, marginBottom: 0, color: !props.item.isCompleted ? "orangered" : undefined, cursor: "pointer" }}
                        ellipsis={{ tooltip: props.item.name }}
                    >
                        {props.item.name}
                    </Typography.Paragraph>
                }
                description={<Stack direction="column" align="flex-start" gap={0}>
                    {_hasDuration() && <Space>
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
                            <Button type="text" size="small" style={{ paddingInline: 0, fontSize: 14 }} icon={<Image src={Clock2Icon} preview={false} width={18} style={{ marginBottom: 3 }} />}>
                                {_sumDuration()}
                            </Button>
                        </Popover>
                    </Space>}
                    {_hasSteps() && <Button onClick={toggleStepsOverview.show} type="text" size="small" style={{ paddingInline: 0, fontSize: 14 }} icon={<Image src={StepsIcon} preview={false} width={18} style={{ marginBottom: 3 }} />}>{props.item.steps.length + " bước thực hiện"}</Button>}
                    {_hasIngredients() && !_hasIncludeDishes() && <Button onClick={toggleIngredientsOverview.show} type="text" size="small" style={{ paddingInline: 0, fontSize: 14 }} icon={<Image src={VegetablesIcon} preview={false} width={18} style={{ marginBottom: 3 }} />}>{props.item.ingredients.length + " nguyên liệu"}</Button>}
                    {_hasIncludeDishes() &&
                        <Space size={3}>
                            <Popover title="Bao gồm các món ăn" content={props.item.includeDishes.map(dish => {
                                const found = dishes.find(e => e.id === dish);
                                if (!found) return null;
                                return <Tag key={dish}>{found.name}</Tag>;
                            })}>
                                <Button type="text" size="small" style={{ paddingInline: 0, fontSize: 14 }} icon={<Image src={NoodlesIcon} preview={false} width={18} style={{ marginBottom: 3 }} />}>{props.item.includeDishes.length} món ăn</Button>
                            </Popover>
                            {_hasIngredients() && <Button onClick={toggleIngredientsOverview.show} type="text" size="small" style={{ paddingInline: 0, fontSize: 14 }}>+ {props.item.ingredients.length} nguyên liệu</Button>}
                        </Space>}
                </Stack>} />
        </List.Item>
        <Modal style={{ top: 50 }} open={toggleDishesDetail.value} title={
            <Space>
                <Image src={NoodlesIcon} preview={false} width={24} style={{ marginBottom: 3 }} />
                {props.item.name}
            </Space>
        } destroyOnClose={true} onCancel={toggleDishesDetail.hide} footer={null}>
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
                    dataSource={orderBy(props.item.ingredients, [obj => obj.required], ['desc'])}
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
                    dataSource={props.item.steps}
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
    </React.Fragment>
}
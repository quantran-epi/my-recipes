import { ClockCircleOutlined, DeleteOutlined, EditOutlined, HolderOutlined, LoadingOutlined, MonitorOutlined, PlusOutlined, QuestionCircleOutlined } from "@ant-design/icons";
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
import React, { useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import Clock2Icon from "../../../../assets/icons/clock (2).png";
import NoodlesIcon from "../../../../assets/icons/noodles.png";
import StepsIcon from "../../../../assets/icons/process.png";
import VegetablesIcon from "../../../../assets/icons/vegetable.png";
import { DishesAddWidget } from "./DishesAdd.widget";
import { DishesEditWidget } from "./DishesEdit.widget";
import { DishesDetailWidget } from "./DishesManageIngredient/DishDetail.widget";
import { DishDurationWidget } from "./DishesManageIngredient/DishDuration.widget";
import moment from "moment";
import 'moment/locale/vi';

export const DishesListScreen = () => {
    const dishes = useSelector((state: RootState) => state.dishes.dishes);
    const toggleAddModal = useToggle({ defaultValue: false });
    const [searchText, setSearchText] = useState<string>("");
    const dispatch = useDispatch();
    const { } = useScreenTitle({ value: "Món ăn", deps: [] });
    const filteredDishes = useMemo<Dishes[]>(() => {
        return sortBy(dishes.filter(e => e.name.trim().toLowerCase().includes(searchText?.trim().toLowerCase())), "name")
    }, [dishes, searchText])

    // useEffect(() => {
    //     dispatch(test());
    // }, [])


    const _onAdd = () => {
        toggleAddModal.show();
    }

    const _onDelete = (item) => {
        dispatch(removeDishes([item.id]));
    }

    return <React.Fragment>
        <Stack.Compact>
            <Input allowClear placeholder="Tìm kiếm" onChange={debounce((e) => setSearchText(e.target.value), 350)} />
            <Button onClick={_onAdd} icon={<PlusOutlined />} />
        </Stack.Compact>
        <List
            pagination={{
                position: "bottom", align: "center", pageSize: 4
            }}
            itemLayout="horizontal"
            dataSource={filteredDishes}
            renderItem={(item) => <DishesItem item={item} onDelete={_onDelete} />}
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
    const toggleLoading = useToggle();
    const toggleEditDuration = useToggle();
    const message = useMessage();
    const dispatch = useDispatch();

    const _onEdit = () => {
        toggleEdit.show();
    }

    const _onEditDuration = () => {
        toggleEditDuration.show();
    }

    const _onManageIngredient = () => {
        toggleLoading.show();
        toggleDishesDetail.show();
    }

    const _sumDuration = () => {
        return moment.duration(Object.values(props.item.duration).reduce((prev, cur) => prev + cur || 0, 0), "minutes").locale("vi").humanize();
    }

    const _hasDuration = () => {
        return Object.values(props.item.duration).some(e => e !== null);
    }

    const _hasIncludeDishes = () => {
        return props.item.includeDishes.length > 0;
    }

    const _hasIngredients = () => {
        return props.item.ingredients.length > 0;
    }

    const _hasSteps = () => {
        return props.item.steps.length > 0;
    }

    const _onMoreActionClick = (e) => {
        switch (e.key) {
            case "edit": _onEdit(); break;
            case "duration": _onEditDuration(); break;
        }
    }

    const _onSaveDuration = (value: DishesDurationEditParams) => {
        dispatch(updateDishDuration(value));
        toggleEditDuration.hide();
        message.success();
    }

    return <React.Fragment>
        <List.Item
            actions={
                [
                    <Button size="small" onClick={_onManageIngredient} icon={toggleLoading.value ? <LoadingOutlined /> : <MonitorOutlined />} />,
                    <Popconfirm title="Xóa?" onConfirm={() => props.onDelete(props.item)}>
                        <Button size="small" danger icon={<DeleteOutlined />} />
                    </Popconfirm>,
                    <Dropdown menu={{
                        items: [
                            {
                                label: 'Sửa món ăn',
                                key: 'edit',
                                icon: <EditOutlined />,
                            },
                            {
                                label: 'Thời lượng',
                                key: 'duration',
                                icon: <ClockCircleOutlined />,
                            }
                        ],
                        onClick: _onMoreActionClick
                    }} placement="bottom">
                        <Button size="small" icon={<HolderOutlined />} />
                    </Dropdown>
                ]
            }>
            <List.Item.Meta
                title={<Stack>
                    <Tooltip title={props.item.name}>
                        <Typography.Paragraph style={{ width: 220, marginBottom: 0, color: !props.item.isCompleted ? "orangered" : undefined }} ellipsis>{props.item.name}</Typography.Paragraph>
                    </Tooltip>
                </Stack>}
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
                            <Popover title="Bao gồm các món ăn" content={props.item.includeDishes.map(dish => <Tag>{dishes.find(e => e.id === dish).name}</Tag>)}>
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
        } destroyOnClose={true} onCancel={toggleDishesDetail.hide} footer={null} afterOpenChange={toggleLoading.hide}>
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
    </React.Fragment>
}
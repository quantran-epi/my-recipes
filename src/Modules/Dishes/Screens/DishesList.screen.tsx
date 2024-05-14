import { CheckCircleOutlined, DeleteOutlined, EditOutlined, MonitorOutlined, PlusOutlined, ProjectOutlined, QuestionCircleOutlined, TeamOutlined } from "@ant-design/icons";
import { Button } from "@components/Button";
import { Input } from "@components/Form/Input";
import { Image } from "@components/Image";
import { Box } from "@components/Layout/Box";
import { Space } from "@components/Layout/Space";
import { Stack } from "@components/Layout/Stack";
import { List } from "@components/List";
import { Modal } from "@components/Modal";
import { Popconfirm } from "@components/Popconfirm";
import { Popover } from "@components/Popover";
import { Tag } from "@components/Tag";
import { Tooltip } from "@components/Tootip";
import { Typography } from "@components/Typography";
import { useScreenTitle, useToggle } from "@hooks";
import { RootRoutes } from "@routing/RootRoutes";
import { Dishes } from "@store/Models/Dishes";
import { removeDishes } from "@store/Reducers/DishesReducer";
import { RootState } from "@store/Store";
import { debounce, orderBy, sortBy } from "lodash";
import React, { useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import NoodlesIcon from "../../../../assets/icons/noodles.png";
import VegetablesIcon from "../../../../assets/icons/vegetable.png";
import StepsIcon from "../../../../assets/icons/process.png";
import { DishesAddWidget } from "./DishesAdd.widget";
import { DishesEditWidget } from "./DishesEdit.widget";
import { Avatar } from "@components/Avatar";
import { DishesDetailWidget } from "./DishesManageIngredient/DishDetail.widget";

export const DishesListScreen = () => {
    const dishes = useSelector((state: RootState) => state.dishes.dishes);
    const toggleAddModal = useToggle({ defaultValue: false });
    const [searchText, setSearchText] = useState<string>("");
    const dispatch = useDispatch();
    const { } = useScreenTitle({ value: "Món ăn", deps: [] });
    const filteredDishes = useMemo<Dishes[]>(() => {
        return sortBy(dishes.filter(e => e.name.trim().toLowerCase().includes(searchText?.trim().toLowerCase())), "name")
    }, [dishes, searchText])

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

export const DishesItem: React.FunctionComponent<DishesItemProps> = (props) => {
    const toggleEdit = useToggle({ defaultValue: false });
    const toggleIngredientsOverview = useToggle();
    const toggleStepsOverview = useToggle();
    const toggleDishesDetail = useToggle();
    const navigate = useNavigate();
    const dishes = useSelector((state: RootState) => state.dishes.dishes);
    const ingredients = useSelector((state: RootState) => state.ingredient.ingredients);

    const _onEdit = () => {
        toggleEdit.show();
    }

    const _onManageIngredient = () => {
        // navigate(RootRoutes.AuthorizedRoutes.DishesRoutes.ManageIngredient(props.item.id));
        toggleDishesDetail.show();
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

    return <React.Fragment>
        <List.Item
            actions={
                [
                    <Button size="small" onClick={_onEdit} icon={<EditOutlined />} />,
                    <Button size="small" onClick={_onManageIngredient} icon={<MonitorOutlined />} />,
                    <Popconfirm title="Xóa?" onConfirm={() => props.onDelete(props.item)}>
                        <Button size="small" danger icon={<DeleteOutlined />} />
                    </Popconfirm>
                ]
            }>
            <List.Item.Meta
                title={<Stack>
                    <Tooltip title={props.item.name}>
                        <Typography.Paragraph style={{ width: 220, marginBottom: 0, color: !props.item.isCompleted ? "orangered" : undefined }} ellipsis>{props.item.name}</Typography.Paragraph>
                    </Tooltip>
                </Stack>}
                description={<Stack direction="column" align="flex-start" gap={0}>
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
    </React.Fragment >
}
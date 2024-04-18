import { DeleteOutlined, EditOutlined, OrderedListOutlined, PlusOutlined, TeamOutlined, MonitorOutlined, FileTextOutlined, CheckCircleOutlined } from "@ant-design/icons";
import { Button } from "@components/Button";
import { Input } from "@components/Form/Input";
import { Box } from "@components/Layout/Box";
import { Space } from "@components/Layout/Space";
import { Stack } from "@components/Layout/Stack";
import { List } from "@components/List";
import { Modal } from "@components/Modal";
import { Popconfirm } from "@components/Popconfirm";
import { Tooltip } from "@components/Tootip";
import { Typography } from "@components/Typography";
import { useScreenTitle, useToggle } from "@hooks";
import { RootRoutes } from "@routing/RootRoutes";
import { Dishes } from "@store/Models/Dishes";
import { removeDishes, test } from "@store/Reducers/DishesReducer";
import { RootState } from "@store/Store";
import { debounce, sortBy } from "lodash";
import React, { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { DishesAddWidget } from "./DishesAdd.widget";
import { DishesEditWidget } from "./DishesEdit.widget";
import { Tag } from "@components/Tag";
import { Popover } from "@components/Popover";

export const DishesListScreen = () => {
    const dishes = useSelector((state: RootState) => state.dishes.dishes);
    const toggleAddModal = useToggle({ defaultValue: false });
    const dispatch = useDispatch();
    const { } = useScreenTitle({ value: "Món ăn", deps: [] });
    const [searchText, setSearchText] = useState("");
    const filteredDishes = useMemo<Dishes[]>(() => {
        return sortBy(dishes.filter(e => e.name.trim().toLowerCase().includes(searchText.trim().toLowerCase())), "name")
    }, [dishes, searchText])

    const _onAdd = () => {
        toggleAddModal.show();
    }

    const _onDelete = (item) => {
        dispatch(removeDishes([item.id]));
    }

    return <React.Fragment>
        <Stack.Compact>
            <Input allowClear autoFocus placeholder="Tìm kiếm" onChange={debounce((e) => setSearchText(e.target.value), 350)} />
            <Button onClick={_onAdd} icon={<PlusOutlined />} />
        </Stack.Compact>
        <List
            pagination={{
                position: "bottom", align: "center", pageSize: 5, size: "small"
            }}
            itemLayout="horizontal"
            dataSource={filteredDishes}
            renderItem={(item) => <DishesItem item={item} onDelete={_onDelete} />}
        />
        <Modal open={toggleAddModal.value} title="Thêm món ăn" destroyOnClose={true} onCancel={toggleAddModal.hide} footer={null}>
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
    const navigate = useNavigate();
    const dishes = useSelector((state: RootState) => state.dishes.dishes);

    const _onEdit = () => {
        toggleEdit.show();
    }

    const _onManageIngredient = () => {
        navigate(RootRoutes.AuthorizedRoutes.DishesRoutes.ManageIngredient(props.item.id));
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
            <List.Item.Meta title={<Tooltip title={props.item.name}>
                <Typography.Paragraph style={{ width: 220, marginBottom: 0 }} ellipsis>{props.item.name}</Typography.Paragraph>
            </Tooltip>}
                description={<Stack direction="column" align="flex-start" gap={0}>
                    {props.item.isCompleted && <Space size={3}>
                        <CheckCircleOutlined style={{ color: "#52c41a" }} />
                        <Typography.Text type="success">{"Hoàn thiện"}</Typography.Text>
                    </Space>}
                    <Space size={3}>
                        <TeamOutlined />
                        <Typography.Text type="secondary">{props.item.servingSize} người ăn</Typography.Text>
                    </Space>
                    <Space size={3}>
                        <OrderedListOutlined />
                        <Typography.Text type="secondary">{props.item.ingredients.length + " nguyên liệu"}</Typography.Text>
                    </Space>
                    <Space size={3}>
                        <FileTextOutlined />
                        <Typography.Text type="secondary">{props.item.includeDishes.length} món ăn</Typography.Text>
                        {props.item.includeDishes.length > 0 && <Popover title="Bao gồm các món ăn" content={props.item.includeDishes.map(dish => <Tag>{dishes.find(e => e.id === dish).name}</Tag>)}>
                            <Button size="small" icon={<MonitorOutlined />} />
                        </Popover>}
                    </Space>
                </Stack>} />
        </List.Item >
        <Modal open={toggleEdit.value} title="Chỉnh sửa món ăn" destroyOnClose={true} onCancel={toggleEdit.hide} footer={null}>
            <DishesEditWidget item={props.item} onDone={() => toggleEdit.hide()} />
        </Modal>
    </React.Fragment>
}
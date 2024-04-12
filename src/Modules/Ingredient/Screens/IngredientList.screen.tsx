import { Button } from "@components/Button";
import { List } from "@components/List";
import { Modal } from "@components/Modal";
import { Typography } from "@components/Typography";
import { useScreenTitle, useToggle } from "@hooks";
import { removeIngredient } from "@store/Reducers/IngredientReducer";
import { RootState } from "@store/Store";
import React, { useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { IngredientAddWidget } from "./IngredientAdd.widget";
import { Ingredient } from "@store/Models/Ingredient";
import { IngredientEditWidget } from "./IngredientEdit.widget";
import { EditOutlined, DeleteOutlined, SearchOutlined, PlusOutlined } from "@ant-design/icons";
import { Tooltip } from "@components/Tootip";
import { Popconfirm } from "@components/Popconfirm";
import { Stack } from "@components/Layout/Stack";
import { Input } from "@components/Form/Input";
import { useSmartForm } from "@components/SmartForm";
import { ObjectPropertyHelper } from "@common/Helpers/ObjectProperty";
import { debounce, sortBy } from "lodash";

export const IngredientListScreen = () => {
    const ingredients = useSelector((state: RootState) => state.ingredient.ingredients);
    const toggleAddModal = useToggle({ defaultValue: false });
    const dispatch = useDispatch();
    const { } = useScreenTitle({ value: "Nguyên liệu", deps: [] });
    const [searchText, setSearchText] = useState("");

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
        <Stack.Compact>
            <Input autoFocus placeholder="Tìm kiếm" onChange={debounce((e) => setSearchText(e.target.value), 350)} />
            <Button onClick={_onAdd} icon={<PlusOutlined />} />
        </Stack.Compact>
        <List
            pagination={{
                position: "bottom", align: "center", pageSize: 12, size: "small"
            }}
            itemLayout="horizontal"
            dataSource={filteredIngredients}
            renderItem={(item) => <IngredientItem item={item} onDelete={_onDelete} />}
        />
        <Modal open={toggleAddModal.value} title="Thêm nguyên liệu" destroyOnClose={true} onCancel={toggleAddModal.hide} footer={null}>
            <IngredientAddWidget />
        </Modal>
    </React.Fragment>
}

type IngredientItemProps = {
    item: Ingredient;
    onDelete: (item: Ingredient) => void;
}

export const IngredientItem: React.FunctionComponent<IngredientItemProps> = (props) => {
    const toggleEdit = useToggle({ defaultValue: false });

    const _onEdit = () => {
        toggleEdit.show();
    }

    return <React.Fragment>
        <List.Item
            actions={
                [
                    <Button size="small" onClick={_onEdit} icon={<EditOutlined />} />,
                    <Popconfirm title="Xóa?" onConfirm={() => props.onDelete(props.item)}>
                        <Button size="small" danger icon={<DeleteOutlined />} />
                    </Popconfirm>
                ]
            }>
            <List.Item.Meta description={<Tooltip title={props.item.name}>
                <Typography.Paragraph style={{ width: 200, marginBottom: 0 }} ellipsis>{props.item.name}</Typography.Paragraph>
            </Tooltip>} />
        </List.Item >
        <Modal open={toggleEdit.value} title="Chỉnh sửa nguyên liệu" destroyOnClose={true} onCancel={toggleEdit.hide} footer={null}>
            <IngredientEditWidget item={props.item} onDone={() => toggleEdit.hide()} />
        </Modal>
    </React.Fragment>
}
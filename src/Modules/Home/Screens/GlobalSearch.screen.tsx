import { CloseOutlined, SearchOutlined } from '@ant-design/icons';
import { Box } from '@components/Layout/Box';
import { Image } from '@components/Image';
import { Stack } from '@components/Layout/Stack';
import { Typography } from '@components/Typography';
import { Ingredient } from '@store/Models/Ingredient';
import { Dishes } from '@store/Models/Dishes';
import { ShoppingList } from '@store/Models/ShoppingList';
import { selectDishes, selectIngredients, selectIngredientsById, selectShoppingLists } from '@store/Selectors';
import { Input } from 'antd';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { RootRoutes } from '@routing/RootRoutes';
import NoodlesIcon from '../../../../assets/icons/noodles.png';
import IngredientIcon from '../../../../assets/icons/vegetable.png';
import ShoppingListIcon from '../../../../assets/icons/shoppingList.png';

const RECENT_KEY = 'global_search_recent';
const MAX_RECENT = 5;
const DEFAULT_SHOW = 5;

function loadRecent(): string[] {
    try { return JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]'); } catch { return []; }
}
function saveRecent(q: string) {
    const prev = loadRecent().filter(s => s !== q);
    localStorage.setItem(RECENT_KEY, JSON.stringify([q, ...prev].slice(0, MAX_RECENT)));
}

function highlight(text: string, q: string): React.ReactNode {
    if (!q) return text;
    const idx = text.toLowerCase().indexOf(q.toLowerCase());
    if (idx === -1) return text;
    return (
        <>
            {text.slice(0, idx)}
            <span style={{ background: '#ffe58f', borderRadius: 2, fontWeight: 700 }}>
                {text.slice(idx, idx + q.length)}
            </span>
            {text.slice(idx + q.length)}
        </>
    );
}

type DishResult = {
    dish: Dishes;
    nameMatch: boolean;
    matchedIngredientNames: string[];
};

type ListResult = {
    list: ShoppingList;
    nameMatch: boolean;
    matchedIngredientNames: string[];
};

type GlobalSearchScreenProps = {
    open: boolean;
    onClose: () => void;
    onNavigate?: (path: string, beforeNavigate?: () => void) => void;
};

export const GlobalSearchScreen: React.FC<GlobalSearchScreenProps> = ({ open, onClose, onNavigate }) => {
    const navigate = useNavigate();
    const [query, setQuery] = useState('');
    const [debouncedQ, setDebouncedQ] = useState('');
    const [recent, setRecent] = useState<string[]>([]);
    const [showAllDishes, setShowAllDishes] = useState(false);
    const [showAllIngredients, setShowAllIngredients] = useState(false);
    const [showAllLists, setShowAllLists] = useState(false);
    const inputRef = useRef<any>(null);

    const dishes = useSelector(selectDishes);
    const allIngredients = useSelector(selectIngredients);
    const ingredientsById = useSelector(selectIngredientsById);
    const shoppingLists = useSelector(selectShoppingLists);

    useEffect(() => {
        if (open) {
            setRecent(loadRecent());
            setQuery('');
            setDebouncedQ('');
            setShowAllDishes(false);
            setShowAllIngredients(false);
            setShowAllLists(false);
            setTimeout(() => inputRef.current?.focus(), 80);
        }
    }, [open]);

    useEffect(() => {
        const t = setTimeout(() => setDebouncedQ(query.trim().toLowerCase()), 300);
        return () => clearTimeout(t);
    }, [query]);

    const q = debouncedQ.length >= 2 ? debouncedQ : '';

    const matchedDishes = useMemo<DishResult[]>(() => {
        if (!q) return [];
        return dishes
            .map(dish => {
                const nameMatch = dish.name.toLowerCase().includes(q);
                const matchedIngredientNames = (dish.ingredients ?? [])
                    .map(req => ingredientsById.get(req.ingredientId)?.name ?? '')
                    .filter(name => name.toLowerCase().includes(q));
                return { dish, nameMatch, matchedIngredientNames };
            })
            .filter(r => r.nameMatch || r.matchedIngredientNames.length > 0);
    }, [dishes, ingredientsById, q]);

    const matchedIngredients = useMemo<Ingredient[]>(() => {
        if (!q) return [];
        return allIngredients.filter(i =>
            i.name.toLowerCase().includes(q) || (i.category ?? '').toLowerCase().includes(q)
        );
    }, [allIngredients, q]);

    const matchedLists = useMemo<ListResult[]>(() => {
        if (!q) return [];
        return shoppingLists
            .map(list => {
                const nameMatch = list.name.toLowerCase().includes(q);
                const matchedIngredientNames = (list.ingredients ?? [])
                    .map(g => ingredientsById.get(g.ingredientId)?.name ?? '')
                    .filter(name => name.toLowerCase().includes(q));
                return { list, nameMatch, matchedIngredientNames };
            })
            .filter(r => r.nameMatch || r.matchedIngredientNames.length > 0);
    }, [shoppingLists, ingredientsById, q]);

    const totalResults = matchedDishes.length + matchedIngredients.length + matchedLists.length;

    const _commit = () => {
        if (query.trim()) { saveRecent(query.trim()); setRecent(loadRecent()); }
    };

    const _navigate = (path: string) => {
        _commit();
        if (onNavigate) {
            onNavigate(path, onClose);
            return;
        }

        onClose();
        React.startTransition(() => navigate(path));
    };

    if (!open) return null;

    const renderMatchedChips = (names: string[], q: string) => (
        <Stack wrap="wrap" gap={4} style={{ marginTop: 5 }}>
            {names.map(name => (
                <span key={name} style={{
                    padding: '2px 8px', borderRadius: 10, fontSize: 11,
                    background: '#fff7e6', border: '1px solid #ffd591', color: '#d46b08',
                }}>
                    {highlight(name, q)}
                </span>
            ))}
        </Stack>
    );

    return (
        <>
        <div style={{
            position: 'fixed', inset: 0, zIndex: 2000,
            background: 'rgba(0,0,0,0.45)',
            display: 'flex', flexDirection: 'column',
        }}>
            {/* Header */}
            <div style={{
                background: '#fff', padding: '12px 16px',
                display: 'flex', alignItems: 'center', gap: 10,
                boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
            }}>
                <Input
                    ref={inputRef}
                    aria-label="Tìm kiếm toàn cục"
                    data-testid="global-search-input"
                    prefix={<SearchOutlined style={{ color: '#aaa' }} />}
                    placeholder="Tìm món ăn, nguyên liệu, lịch mua sắm..."
                    allowClear
                    value={query}
                    onChange={e => { setQuery(e.target.value); setShowAllDishes(false); setShowAllIngredients(false); setShowAllLists(false); }}
                    onPressEnter={_commit}
                    size="large"
                    style={{ flex: 1, borderRadius: 10 }}
                />
                <div onClick={onClose} style={{ cursor: 'pointer', padding: 6, color: '#555' }}>
                    <CloseOutlined style={{ fontSize: 18 }} />
                </div>
            </div>

            {/* Body */}
            <div style={{ flex: 1, overflowY: 'auto', background: '#f5f5f5' }}>

                {/* Recent */}
                {!q && recent.length > 0 && (
                    <Box style={{ background: '#fff', margin: '10px 12px', borderRadius: 10, padding: '12px 16px' }}>
                        <Stack justify="space-between" align="center" style={{ marginBottom: 8 }}>
                            <Typography.Text type="secondary" style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                                Tìm kiếm gần đây
                            </Typography.Text>
                            <Typography.Text
                                type="secondary" style={{ fontSize: 12, cursor: 'pointer' }}
                                onClick={() => { localStorage.removeItem(RECENT_KEY); setRecent([]); }}
                            >Xoá</Typography.Text>
                        </Stack>
                        <Stack wrap="wrap" gap={6}>
                            {recent.map(r => (
                                <div key={r} onClick={() => setQuery(r)} style={{
                                    padding: '4px 12px', borderRadius: 16, fontSize: 13,
                                    background: '#f0f0f0', cursor: 'pointer', color: '#444',
                                }}>{r}</div>
                            ))}
                        </Stack>
                    </Box>
                )}

                {!q && recent.length === 0 && (
                    <Box style={{ textAlign: 'center', padding: '48px 24px', color: '#bbb' }}>
                        <SearchOutlined style={{ fontSize: 40, marginBottom: 12 }} />
                        <Typography.Text type="secondary" style={{ display: 'block' }}>
                            Gõ để tìm món ăn, nguyên liệu hoặc lịch mua sắm
                        </Typography.Text>
                    </Box>
                )}

                {query.trim().length > 0 && query.trim().length < 2 && (
                    <Box style={{ textAlign: 'center', padding: '32px 24px' }}>
                        <Typography.Text type="secondary">Nhập ít nhất 2 ký tự để tìm kiếm</Typography.Text>
                    </Box>
                )}

                {q && totalResults === 0 && (
                    <Box style={{ textAlign: 'center', padding: '48px 24px' }}>
                        <Typography.Text type="secondary">Không tìm thấy kết quả cho "{query.trim()}"</Typography.Text>
                    </Box>
                )}

                {/* ── Dishes ── */}
                {matchedDishes.length > 0 && (
                    <Box style={{ background: '#fff', margin: '10px 12px', borderRadius: 10, overflow: 'hidden' }}>
                        <Stack align="center" gap={8} style={{ padding: '10px 16px 8px', borderBottom: '1px solid #f0f0f0' }}>
                            <Image src={NoodlesIcon} width={18} alt="" style={{ marginBottom: 2 }} />
                            <Typography.Text strong style={{ fontSize: 13 }}>Món ăn</Typography.Text>
                            <span style={{ marginLeft: 'auto', fontSize: 11, color: '#aaa' }}>
                                {matchedDishes.length} kết quả
                            </span>
                        </Stack>
                        {(showAllDishes ? matchedDishes : matchedDishes.slice(0, DEFAULT_SHOW)).map((r, i) => {
                            const list = showAllDishes ? matchedDishes : matchedDishes.slice(0, DEFAULT_SHOW);
                            return (
                                <div
                                    key={r.dish.id}
                                    onClick={() => _navigate(RootRoutes.AuthorizedRoutes.DishesRoutes.ManageIngredient(r.dish.id))}
                                    style={{
                                        padding: '10px 16px',
                                        borderBottom: i < list.length - 1 ? '1px solid #f5f5f5' : 'none',
                                        cursor: 'pointer',
                                    }}
                                >
                                    <Stack align="center" justify="space-between">
                                        <Typography.Text style={{ fontSize: 14 }}>
                                            {highlight(r.dish.name, query.trim())}
                                        </Typography.Text>
                                        <Typography.Text type="secondary" style={{ fontSize: 11, flexShrink: 0 }}>
                                            {r.dish.ingredients?.length ?? 0} nguyên liệu
                                        </Typography.Text>
                                    </Stack>
                                    {r.matchedIngredientNames.length > 0 && !r.nameMatch && (
                                        <Typography.Text type="secondary" style={{ fontSize: 11 }}>Có nguyên liệu khớp:</Typography.Text>
                                    )}
                                    {r.matchedIngredientNames.length > 0 && renderMatchedChips(r.matchedIngredientNames, query.trim())}
                                </div>
                            );
                        })}
                        {matchedDishes.length > DEFAULT_SHOW && (
                            <div
                                onClick={() => setShowAllDishes(v => !v)}
                                style={{ padding: '8px 16px', textAlign: 'center', cursor: 'pointer', color: '#1677ff', fontSize: 12, borderTop: '1px solid #f0f0f0' }}
                            >
                                {showAllDishes ? 'Thu gọn' : `Xem thêm ${matchedDishes.length - DEFAULT_SHOW} kết quả`}
                            </div>
                        )}
                    </Box>
                )}

                {/* ── Ingredients ── */}
                {matchedIngredients.length > 0 && (
                    <Box style={{ background: '#fff', margin: '10px 12px', borderRadius: 10, overflow: 'hidden' }}>
                        <Stack align="center" gap={8} style={{ padding: '10px 16px 8px', borderBottom: '1px solid #f0f0f0' }}>
                            <Image src={IngredientIcon} width={18} alt="" style={{ marginBottom: 2 }} />
                            <Typography.Text strong style={{ fontSize: 13 }}>Nguyên liệu</Typography.Text>
                            <span style={{ marginLeft: 'auto', fontSize: 11, color: '#aaa' }}>
                                {matchedIngredients.length} kết quả
                            </span>
                        </Stack>
                        {(showAllIngredients ? matchedIngredients : matchedIngredients.slice(0, DEFAULT_SHOW)).map((ing, i) => {
                            const list = showAllIngredients ? matchedIngredients : matchedIngredients.slice(0, DEFAULT_SHOW);
                            return (
                                <div
                                    key={ing.id}
                                    data-testid={`global-search-ingredient-${ing.id}`}
                                    onClick={() => _navigate(RootRoutes.AuthorizedRoutes.IngredientRoutes.Detail(ing.id))}
                                    style={{
                                        padding: '10px 16px',
                                        borderBottom: i < list.length - 1 ? '1px solid #f5f5f5' : 'none',
                                        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                    }}
                                >
                                    <Typography.Text style={{ fontSize: 14 }}>{highlight(ing.name, query.trim())}</Typography.Text>
                                    {ing.category && (
                                        <span style={{ fontSize: 11, color: '#888', background: '#f5f5f5', padding: '2px 8px', borderRadius: 10 }}>
                                            {highlight(ing.category, query.trim())}
                                        </span>
                                    )}
                                </div>
                            );
                        })}
                        {matchedIngredients.length > DEFAULT_SHOW && (
                            <div
                                onClick={() => setShowAllIngredients(v => !v)}
                                style={{ padding: '8px 16px', textAlign: 'center', cursor: 'pointer', color: '#1677ff', fontSize: 12, borderTop: '1px solid #f0f0f0' }}
                            >
                                {showAllIngredients ? 'Thu gọn' : `Xem thêm ${matchedIngredients.length - DEFAULT_SHOW} kết quả`}
                            </div>
                        )}
                    </Box>
                )}

                {/* ── Shopping lists ── */}
                {matchedLists.length > 0 && (
                    <Box style={{ background: '#fff', margin: '10px 12px 20px', borderRadius: 10, overflow: 'hidden' }}>
                        <Stack align="center" gap={8} style={{ padding: '10px 16px 8px', borderBottom: '1px solid #f0f0f0' }}>
                            <Image src={ShoppingListIcon} width={18} alt="" style={{ marginBottom: 2 }} />
                            <Typography.Text strong style={{ fontSize: 13 }}>Lịch mua sắm</Typography.Text>
                            <span style={{ marginLeft: 'auto', fontSize: 11, color: '#aaa' }}>
                                {matchedLists.length} kết quả
                            </span>
                        </Stack>
                        {(showAllLists ? matchedLists : matchedLists.slice(0, DEFAULT_SHOW)).map((r, i) => {
                            const list = showAllLists ? matchedLists : matchedLists.slice(0, DEFAULT_SHOW);
                            const itemCount = r.list.ingredients?.length ?? 0;
                            const doneCount = r.list.ingredients?.filter(g => g.isDone).length ?? 0;
                            return (
                                <div
                                    key={r.list.id}
                                    data-testid={`global-search-shopping-list-${r.list.id}`}
                                    onClick={() => _navigate(RootRoutes.AuthorizedRoutes.ShoppingListRoutes.Detail(r.list.id))}
                                    style={{
                                        padding: '10px 16px',
                                        borderBottom: i < list.length - 1 ? '1px solid #f5f5f5' : 'none',
                                        cursor: 'pointer',
                                    }}
                                >
                                    <Stack align="center" justify="space-between">
                                        <Typography.Text style={{ fontSize: 14 }}>
                                            {highlight(r.list.name, query.trim())}
                                        </Typography.Text>
                                        <Typography.Text type="secondary" style={{ fontSize: 11, flexShrink: 0 }}>
                                            {doneCount}/{itemCount} đã mua
                                        </Typography.Text>
                                    </Stack>
                                    {r.matchedIngredientNames.length > 0 && (
                                        <>
                                            <Typography.Text type="secondary" style={{ fontSize: 11 }}>Có nguyên liệu khớp:</Typography.Text>
                                            {renderMatchedChips(r.matchedIngredientNames, query.trim())}
                                        </>
                                    )}
                                </div>
                            );
                        })}
                        {matchedLists.length > DEFAULT_SHOW && (
                            <div
                                onClick={() => setShowAllLists(v => !v)}
                                style={{ padding: '8px 16px', textAlign: 'center', cursor: 'pointer', color: '#1677ff', fontSize: 12, borderTop: '1px solid #f0f0f0' }}
                            >
                                {showAllLists ? 'Thu gọn' : `Xem thêm ${matchedLists.length - DEFAULT_SHOW} kết quả`}
                            </div>
                        )}
                    </Box>
                )}
            </div>
        </div>
        </>
    );
};

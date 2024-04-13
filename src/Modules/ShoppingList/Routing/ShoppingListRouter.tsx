import { Container } from '@components/Layout/Container';
import { Outlet } from 'react-router-dom';

export const ShoppingListRouter = () => {
    return <Container>
        <Outlet />
    </Container>
}
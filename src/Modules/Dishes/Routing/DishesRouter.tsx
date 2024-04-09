import { Container } from '@components/Layout/Container';
import { Outlet } from 'react-router-dom';

export const DishesRouter = () => {
    return <Container>
        <Outlet />
    </Container>
}
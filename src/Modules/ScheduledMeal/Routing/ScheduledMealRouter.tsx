import { Container } from '@components/Layout/Container';
import { Outlet } from 'react-router-dom';

export const ScheduledMealRouter = () => {
    return <Container>
        <Outlet />
    </Container>
}
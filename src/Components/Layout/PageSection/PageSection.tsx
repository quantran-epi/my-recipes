import { Box } from "../Box"

type PageSectionProps = {
    children: React.ReactNode
}

export const PageSection: React.FunctionComponent<PageSectionProps> = ({
    children
}) => {
    return <Box style={{ marginBottom: 15 }}>
        {children}
    </Box>
}
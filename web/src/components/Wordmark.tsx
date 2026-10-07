import { Box } from "@mui/material";
import { displayFontFamily } from "../theme/theme";

/** "ente tasks" wordmark, set in the display face used by ente's auth pages. */
export const Wordmark: React.FC<{ size?: number; color?: string }> = ({
    size = 22,
    color,
}) => (
    <Box
        component="span"
        sx={{
            fontFamily: displayFontFamily,
            fontSize: `${size}px`,
            lineHeight: 1,
            letterSpacing: "-0.04em",
            color: color ?? "text.base",
            whiteSpace: "nowrap",
            userSelect: "none",
        }}
    >
        <Box component="span" sx={{ fontWeight: 700 }}>
            ente
        </Box>
        <Box component="span" sx={{ fontWeight: 400, opacity: 0.6, ml: "0.18em" }}>
            tasks
        </Box>
    </Box>
);

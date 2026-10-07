// Theme augmentation, following ente's web/packages/base/components/utils/mui-theme.d.ts.
import type { PaletteColor } from "@mui/material";
import type React from "react";

import type {} from "@mui/material/themeCssVarsAugmentation";

declare module "@mui/material/styles" {
    interface TypeBackground {
        paper2: string;
        elevatedPaper: string;
        searchInput: string;
    }

    interface TypeText {
        base: string;
        muted: string;
        faint: string;
    }

    interface Palette {
        accent: PaletteColor;
        critical: PaletteColor;
        stroke: { base: string; muted: string; faint: string; fainter: string };
        fill: {
            base: string;
            muted: string;
            faint: string;
            faintHover: string;
            fainter: string;
        };
        backdrop: { base: string; muted: string; faint: string };
        fixed: {
            white: string;
            black: string;
            golden: string;
            switchOn: string;
        };
        boxShadow: { paper: string; menu: string };
    }

    interface PaletteOptions {
        accent?: Palette["accent"];
        critical?: Palette["critical"];
        stroke?: Palette["stroke"];
        fill?: Palette["fill"];
        backdrop?: Palette["backdrop"];
        fixed?: Palette["fixed"];
        boxShadow?: Palette["boxShadow"];
    }

    interface TypographyVariants {
        body: React.CSSProperties;
        small: React.CSSProperties;
        mini: React.CSSProperties;
        tiny: React.CSSProperties;
    }

    interface TypographyVariantsOptions {
        body?: React.CSSProperties;
        small?: React.CSSProperties;
        mini?: React.CSSProperties;
        tiny?: React.CSSProperties;
    }
}

declare module "@mui/material/Button" {
    interface ButtonPropsColorOverrides {
        accent: true;
        critical: true;
    }
}

declare module "@mui/material/IconButton" {
    interface IconButtonPropsColorOverrides {
        accent: true;
        critical: true;
    }
}

declare module "@mui/material/Checkbox" {
    interface CheckboxPropsColorOverrides {
        accent: true;
    }
}

declare module "@mui/material/Switch" {
    interface SwitchPropsColorOverrides {
        accent: true;
    }
}

declare module "@mui/material/SvgIcon" {
    interface SvgIconPropsColorOverrides {
        accent: true;
        critical: true;
    }
}

declare module "@mui/material/CircularProgress" {
    interface CircularProgressPropsColorOverrides {
        accent: true;
    }
}

declare module "@mui/material/LinearProgress" {
    interface LinearProgressPropsColorOverrides {
        accent: true;
    }
}

declare module "@mui/material/Typography" {
    interface TypographyPropsVariantOverrides {
        subtitle1: false;
        subtitle2: false;
        body1: false;
        body2: false;
        caption: false;
        button: false;
        overline: false;
        body: true;
        small: true;
        mini: true;
        tiny: true;
    }
}

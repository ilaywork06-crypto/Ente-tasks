/**
 * The horizontal strip of lists, modelled on the album bar in ente Photos
 * (GalleryBarImpl): square tiles with a text overlay, an active indicator
 * underneath, and floating scroll buttons at the edges.
 */
import AddIcon from "@mui/icons-material/Add";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import NavigateNextIcon from "@mui/icons-material/NavigateNext";
import { Box, IconButton, Stack, styled, Tooltip, Typography } from "@mui/material";
import React, { useEffect, useRef, useState } from "react";
import type { Task, TaskList } from "../../services/tasks";
import { sameView, smartViews, viewCount, type View } from "./views";

interface ListBarProps {
    lists: TaskList[];
    tasks: Task[];
    view: View;
    onSelect: (view: View) => void;
    onNewList: () => void;
    onShowAll: () => void;
}

export const ListBar: React.FC<ListBarProps> = ({ lists, tasks, view, onSelect, onNewList, onShowAll }) => {
    const scrollRef = useRef<HTMLDivElement>(null);
    const [canScroll, setCanScroll] = useState({ left: false, right: false });

    const updateScroll = () => {
        const el = scrollRef.current;
        if (!el) return;
        setCanScroll({
            left: el.scrollLeft > 0,
            right: el.scrollLeft + el.clientWidth < el.scrollWidth - 1,
        });
    };

    useEffect(() => {
        updateScroll();
        window.addEventListener("resize", updateScroll);
        return () => window.removeEventListener("resize", updateScroll);
    }, [lists.length]);

    const scrollBy = (dx: number) => scrollRef.current?.scrollBy({ left: dx, behavior: "smooth" });

    return (
        <BarWrapper>
            <Row1>
                <Typography>Lists</Typography>
                <Stack direction="row" sx={{ gap: 1 }}>
                    <Tooltip title="New list">
                        <FilledIconButton onClick={onNewList} aria-label="New list">
                            <AddIcon />
                        </FilledIconButton>
                    </Tooltip>
                    <Tooltip title="All lists">
                        <FilledIconButton onClick={onShowAll} aria-label="All lists">
                            <ExpandMoreIcon />
                        </FilledIconButton>
                    </Tooltip>
                </Stack>
            </Row1>
            <ListWrapper>
                {canScroll.left && <ScrollButton side="left" onClick={() => scrollBy(-300)} />}
                <ScrollRow ref={scrollRef} onScroll={updateScroll}>
                    {smartViews.map((v) => (
                        <BarCard
                            key={v.id}
                            name={v.shortName ?? v.name}
                            emoji={v.emoji}
                            color={v.color}
                            count={viewCount({ kind: "smart", id: v.id }, tasks)}
                            active={sameView(view, { kind: "smart", id: v.id })}
                            onClick={() => onSelect({ kind: "smart", id: v.id })}
                        />
                    ))}
                    <Box sx={{ flex: "0 0 1px", height: 48, mt: 1, backgroundColor: "divider" }} />
                    {lists.map((l) => (
                        <BarCard
                            key={l.id}
                            name={l.name}
                            emoji={l.emoji}
                            color={l.color}
                            count={viewCount({ kind: "list", id: l.id }, tasks)}
                            active={sameView(view, { kind: "list", id: l.id })}
                            onClick={() => onSelect({ kind: "list", id: l.id })}
                        />
                    ))}
                    <div>
                        <NewListTile onClick={onNewList} aria-label="New list">
                            <AddIcon />
                        </NewListTile>
                    </div>
                </ScrollRow>
                {canScroll.right && <ScrollButton side="right" onClick={() => scrollBy(300)} />}
            </ListWrapper>
        </BarWrapper>
    );
};

const BarCard: React.FC<{
    name: string;
    emoji: string;
    color: string;
    count: number;
    active: boolean;
    onClick: () => void;
}> = ({ name, emoji, color, count, active, onClick }) => (
    <div>
        <Tile onClick={onClick} style={{ "--tile-color": color } as React.CSSProperties} aria-pressed={active} title={name}>
            <span className="emoji">{emoji}</span>
            {count > 0 && <span className="count">{count}</span>}
            <TileTextOverlay>
                <Typography variant="small" sx={{ fontWeight: "medium", lineHeight: "1.05", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", wordBreak: "normal", overflowWrap: "normal" }}>
                    {name}
                </Typography>
            </TileTextOverlay>
        </Tile>
        {active && <ActiveIndicator />}
    </div>
);

const BarWrapper = styled("div")`
    padding-inline: 24px;
    margin-block-end: 16px;
    @media (max-width: 600px) {
        padding-inline: 8px;
    }
`;

const Row1 = styled("div")`
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-block-end: 12px;
`;

export const FilledIconButton = styled(IconButton)(({ theme }) => ({
    padding: "8px",
    backgroundColor: theme.vars.palette.fill.faint,
    "&:hover": { backgroundColor: theme.vars.palette.fill.faintHover },
    "& svg": { fontSize: "20px" },
}));

const ListWrapper = styled("div")(({ theme }) => ({
    position: "relative",
    width: "100%",
    borderBottom: `1px solid ${theme.vars.palette.divider}`,
}));

const ScrollRow = styled("div")`
    display: flex;
    gap: 4px;
    overflow-x: auto;
    scrollbar-width: none;
    height: 86px;
    &::-webkit-scrollbar {
        display: none;
    }
`;

const Tile = styled("button")(({ theme }) => ({
    position: "relative",
    width: "64px",
    height: "64px",
    flexShrink: 0,
    border: 0,
    padding: 0,
    borderRadius: "4px",
    overflow: "hidden",
    cursor: "pointer",
    color: "#fff",
    backgroundColor: "var(--tile-color)",
    backgroundImage:
        "radial-gradient(circle at 30% 20%, rgba(255,255,255,0.35), transparent 60%), url('/images/surface-noise.svg')",
    backgroundSize: "auto, 300px",
    transition: "transform 150ms ease",
    "&:hover": { transform: "scale(1.04)" },
    "&:focus-visible": { outline: `1px solid ${theme.vars.palette.stroke.base}`, outlineOffset: "2px" },
    "& .emoji": {
        position: "absolute",
        top: "6px",
        left: "7px",
        fontSize: "20px",
        lineHeight: 1,
        filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.25))",
    },
    "& .count": {
        position: "absolute",
        top: "5px",
        right: "5px",
        minWidth: "18px",
        height: "18px",
        padding: "0 5px",
        borderRadius: "9px",
        fontSize: "11px",
        fontWeight: 700,
        lineHeight: "18px",
        backgroundColor: "rgba(0,0,0,0.35)",
        backdropFilter: "blur(4px)",
    },
}));

const TileTextOverlay = styled("div")`
    position: absolute;
    inset: 0;
    display: flex;
    align-items: flex-end;
    padding: 4px 5px;
    text-align: left;
    background: linear-gradient(transparent 40%, rgba(0, 0, 0, 0.55));
    & p {
        color: #fff;
        font-size: 11px;
    }
`;

const NewListTile = styled("button")(({ theme }) => ({
    width: "64px",
    height: "64px",
    border: `1px dashed ${theme.vars.palette.stroke.muted}`,
    borderRadius: "4px",
    background: "transparent",
    color: theme.vars.palette.stroke.muted,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    "&:hover": { color: theme.vars.palette.text.base, borderColor: theme.vars.palette.stroke.base },
}));

const ActiveIndicator = styled("div")(({ theme }) => ({
    height: "3px",
    backgroundColor: theme.vars.palette.stroke.base,
    marginTop: "19px",
    borderRadius: "2px",
}));

const ScrollButton: React.FC<{ side: "left" | "right"; onClick: () => void }> = ({ side, onClick }) => (
    <ScrollButtonRoot onClick={onClick} aria-label={`Scroll ${side}`} style={side == "left" ? { left: 0, transform: "translate(-50%, 0)" } : { right: 0, transform: "translate(50%, 0)" }}>
        <NavigateNextIcon style={side == "left" ? { transform: "rotate(180deg)" } : undefined} />
    </ScrollButtonRoot>
);

const ScrollButtonRoot = styled("button")(({ theme }) => ({
    position: "absolute",
    zIndex: 2,
    top: "7px",
    height: "50px",
    width: "50px",
    border: "none",
    padding: 0,
    borderRadius: "50%",
    backgroundColor: theme.vars.palette.backdrop.muted,
    color: theme.vars.palette.stroke.base,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    "& > svg": { height: "30px", width: "30px" },
}));

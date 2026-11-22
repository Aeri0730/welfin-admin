import { style } from "@vanilla-extract/css";
import { media, vars } from "@/styles/theme.css";

export const stack = style({
  display: "flex",
  flexDirection: "column",
  gap: 12,
  "@media": {
    [media.desktop]: { gap: 16 },
  },
});

export const cardGrid = style({
  display: "grid",
  gap: 12,
  gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
  "@media": {
    [media.desktop]: { gap: 16 },
  },
});

export const twoColumn = style({
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr)",
  gap: 12,
  alignItems: "start",
  "@media": {
    [media.desktop]: { gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)", gap: 16 },
  },
});

export const responsiveOnly = {
  desktop: style({
    display: "none",
    "@media": { [media.tablet]: { display: "block" } },
  }),
  mobile: style({
    "@media": { [media.tablet]: { display: "none" } },
  }),
};

/* ---------- 숫자 요약 ---------- */
export const statLabel = style({
  fontSize: 14,
  fontWeight: 500,
  color: vars.color.grey600,
});

export const statValue = style({
  marginTop: 4,
  fontSize: 26,
  fontWeight: 700,
  letterSpacing: "-0.02em",
  fontVariantNumeric: "tabular-nums",
});

export const statUnit = style({
  marginLeft: 2,
  fontSize: 17,
  fontWeight: 600,
  color: vars.color.grey600,
});

export const statRow = style({
  display: "flex",
  flexWrap: "wrap",
  gap: "12px 20px",
  marginTop: 16,
  paddingTop: 16,
  borderTop: `1px solid ${vars.color.grey100}`,
});

export const statMini = style({
  fontSize: 13,
  color: vars.color.grey500,
});

export const statMiniValue = style({
  marginTop: 2,
  fontSize: 17,
  fontWeight: 700,
  fontVariantNumeric: "tabular-nums",
});

export const plus = style({ color: vars.color.blue500 });
export const minus = style({ color: vars.color.red500 });

/* ---------- 필터 ---------- */
export const filterBar = style({
  display: "grid",
  gap: 12,
  gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)",
  "@media": {
    [media.desktop]: { gridTemplateColumns: "repeat(4, minmax(0, 1fr))" },
  },
});

/** 필터가 많은 화면(재고 현황)용: 데스크톱 6칸 */
export const filterBarWide = style({
  "@media": {
    [media.desktop]: { gridTemplateColumns: "repeat(6, minmax(0, 1fr))" },
  },
});

/** 모바일에서는 한 줄 전체, 데스크톱에서는 두 칸 */
export const filterWide = style({
  gridColumn: "1 / -1",
  "@media": {
    [media.desktop]: { gridColumn: "span 2" },
  },
});

/* ---------- 테이블 (태블릿 이상) ---------- */
export const tableWrap = style({
  overflowX: "auto",
  margin: "0 -4px",
});

export const table = style({
  width: "100%",
  borderCollapse: "collapse",
  fontSize: 15,
  whiteSpace: "nowrap",
});

/** 열 너비를 내용과 상관없이 고정 (첫 줄 th 너비 기준) */
export const fixedTable = style({
  tableLayout: "fixed",
});

/** 고정 표의 제품 열: 표 너비의 44% 유지, 넘치는 글자는 … 처리 */
export const productCol = style({
  width: "44%",
});

export const ellipsis = style({
  overflow: "hidden",
  textOverflow: "ellipsis",
});

export const th = style({
  padding: "10px 12px",
  textAlign: "left",
  fontSize: 13,
  fontWeight: 600,
  color: vars.color.grey500,
  borderBottom: `1px solid ${vars.color.grey200}`,
});

export const td = style({
  padding: "14px 12px",
  borderBottom: `1px solid ${vars.color.grey100}`,
  color: vars.color.grey800,
  
});

/** 표 머리글 정렬 버튼 */
export const sortButton = style({
  padding: 0,
  border: 0,
  background: "none",
  font: "inherit",
  color: "inherit",
  cursor: "pointer",
  selectors: { "&:hover": { color: vars.color.grey800 } },
});

export const num = style({
  textAlign: "right",
  fontVariantNumeric: "tabular-nums",
});

export const strong = style({
  fontWeight: 700,
  color: vars.color.grey900,
});

export const muted = style({
  color: vars.color.grey500,
  fontSize: 13,
});

export const wrapCell = style({
  whiteSpace: "normal",
  minWidth: 120,
});

/* ---------- 리스트 (모바일) ---------- */
export const listItem = style({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
  padding: "14px 0",
  borderBottom: `1px solid ${vars.color.grey100}`,
  selectors: {
    "&:last-child": { borderBottom: "none" },
  },
});

export const listMain = style({
  minWidth: 0,
  display: "flex",
  flexDirection: "column",
  gap: 4,
});

export const listTitle = style({
  display: "flex",
  alignItems: "center",
  gap: 6,
  fontSize: 16,
  fontWeight: 600,
  color: vars.color.grey900,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
});

export const listMeta = style({
  fontSize: 13,
  color: vars.color.grey500,
});

export const listRight = style({
  flexShrink: 0,
  textAlign: "right",
  fontSize: 17,
  fontWeight: 700,
  fontVariantNumeric: "tabular-nums",
});

export const groupLabel = style({
  marginTop: 8,
  padding: "8px 0 4px",
  fontSize: 13,
  fontWeight: 600,
  color: vars.color.grey500,
  selectors: {
    "&:first-child": { marginTop: 0 },
  },
});

export const chips = style({
  display: "flex",
  flexWrap: "wrap",
  gap: 6,
});

export const chip = style({
  padding: "2px 8px",
  borderRadius: 6,
  background: vars.color.grey100,
  fontSize: 12,
  fontWeight: 500,
  color: vars.color.grey600,
  fontVariantNumeric: "tabular-nums",
});

export const sectionHeader = style({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  marginBottom: 8,
});

export const sectionTitle = style({
  fontSize: 17,
  fontWeight: 700,
});

export const linkText = style({
  fontSize: 14,
  fontWeight: 600,
  color: vars.color.grey500,
  selectors: { "&:hover": { color: vars.color.grey700 } },
});

export const quickActions = style({
  display: "grid",
  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
  gap: 8,
});

export const quickAction = style({
  display: "flex",
  flexDirection: "column",
  alignItems: "flex-start",
  gap: 10,
  padding: 16,
  borderRadius: vars.radius.lg,
  background: vars.color.white,
  fontSize: 15,
  fontWeight: 600,
  color: vars.color.grey800,
  transition: "transform 0.1s ease, background-color 0.15s ease",
  selectors: {
    "&:hover": { background: vars.color.grey50 },
    "&:active": { transform: "scale(0.97)" },
  },
  "@media": {
    [media.tablet]: {
      flexDirection: "row",
      alignItems: "center",
      padding: "18px 20px",
    },
  },
});

export const quickIcon = style({
  display: "grid",
  placeItems: "center",
  width: 36,
  height: 36,
  borderRadius: 10,
  background: vars.color.blue50,
  color: vars.color.blue500,
});

/* ---------- 재고 현황 ---------- */
export const stockLayout = style({
  display: "grid",
  gap: 16,
  gridTemplateColumns: "minmax(0, 1fr)",
  gridTemplateAreas: '"filters" "main"',
});

export const stockFilters = style({ gridArea: "filters" });
export const stockMain = style({
  gridArea: "main",
  display: "flex",
  flexDirection: "column",
  gap: 16,
  minWidth: 0,
});

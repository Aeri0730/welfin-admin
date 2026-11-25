import { useMemo, useState } from "react";
import { useCreateReturns, useProducts, useUpdateReturns } from "@/api/queries";
import {
  CARRIER_LABEL,
  RETURN_KIND_LABEL,
  RETURN_STATUS_LABEL,
  type Carrier,
  type ReturnItem,
} from "@/api/types";
import { Button } from "@/components/Button";
import { SelectField, TextAreaField, TextField } from "@/components/Field";
import { Tooltip } from "@/components/Tooltip";
import { useToast } from "@/components/Toast";
import { Badge, Card, ErrorBox, type BadgeTone } from "@/components/ui";
import { today } from "@/lib/format";
import { attemptLabel, attemptOf } from "./status";
import { ReturnCreateDialog } from "./ReturnCreateDialog";
import {
  INPUT_MODE_LABEL,
  planPaste,
  rerequestPatch,
  type InputMode,
  type PlanRow,
} from "./parse";
import * as s from "@/pages/ReturnsPage.css";

const PLAN_BADGE: Record<
  PlanRow["status"],
  { label: string; tone: BadgeTone }
> = {
  create: { label: "신규 접수", tone: "blue" },
  update: { label: "반영", tone: "green" },
  skip: { label: "건너뜀", tone: "grey" },
  error: { label: "확인 필요", tone: "red" },
  duplicate: { label: "중복 확인", tone: "orange" },
};

/** 붙여넣기 칸 위 '입력 형식' 툴팁 내용 (열 순서) */
const FORMAT_GUIDE: Array<{ title: string; rows: Array<[string, string[]]> }> = [
  {
    title: "접수",
    rows: [
      ["이지어드민", ["관리번호", "주문번호", "발주일", "배송일", "수령자", "판매처상품", "수량", "전화번호1"]],
      ["스타팩", ["수령자", "연락처", "제품", "수량"]],
    ],
  },
  {
    title: "송장 입력",
    rows: [
      ["이지어드민", ["관리번호", "반송장번호"]],
      ["스타팩", ["반송장번호", "수령자", "연락처", "제품"]],
    ],
  },
];

const PLACEHOLDER: Record<InputMode, string> = {
  auto: "엑셀·메신저에서 복사한 내용을 그대로 붙여넣으세요. 줄마다 형태를 알아서 판별해요.",
  intake:
    "4080710  네이-169581  2026-10-19 15:31  2026-10-19 15:57  구근호  WELFIN-010 …  1  010-1234-5678\n홍길동  서울시 강남구 …  WELFIN-014 에어히터  1  010-1234-5678",
  invoice:
    "4080710  685012345678\n685012349999  홍길동  010-1234-5678\n4203859  512345678901  롯데",
  kind: "구근호 반품(단순변심)\n홍길동 교환(불량)\n4080710 김민수 반품(오배송)   ← 동명이인은 관리번호와 함께",
  inspect:
    "685012345678\n685012349999\n512345678901  512345670000\n← 회수 송장번호만 여러 개 넣으면 회수완료 건이 검수완료로 바뀌어요",
};

function describe(row: PlanRow): string {
  if (row.status === "create") {
    const i = row.input;
    const kind = i.kind
      ? ` · ${RETURN_KIND_LABEL[i.kind]}${i.reason ? `(${i.reason})` : ""}`
      : "";
    const id = i.mgmtNo ? `[${i.mgmtNo}] ` : "";
    return `${id}${i.recipient} · ${i.productText} × ${i.quantity}${kind}`;
  }
  if (row.status === "duplicate") {
    const i = row.input;
    const tg = row.target;
    const kind = i.kind
      ? ` · ${RETURN_KIND_LABEL[i.kind]}${i.reason ? `(${i.reason})` : ""}`
      : "";
    return (
      `${i.recipient} · ${i.productText} × ${i.quantity}${kind} — 같은 이름·주소로 ${tg.receivedOn} 접수한 건이 이미 있어요` +
      ` (${RETURN_STATUS_LABEL[tg.status]}${attemptLabel(attemptOf(tg.rerequestCount)) ? ` · ${attemptLabel(attemptOf(tg.rerequestCount))}` : ""})`
    );
  }
  if (row.status === "update") {
    const t = row.target;
    const carrier = row.patch.carrier
      ? `${CARRIER_LABEL[row.patch.carrier]} `
      : "";
    return `${t.mgmtNo ? `[${t.mgmtNo}] ` : ""}${t.recipient} → ${carrier}${row.label}`;
  }
  return row.message;
}

export function ReturnInput({ existing }: { existing: ReturnItem[] }) {
  const toast = useToast();
  const products = useProducts();
  const createReturns = useCreateReturns();
  const updateReturns = useUpdateReturns();

  const [mode, setMode] = useState<InputMode>("auto");
  const [receivedOn, setReceivedOn] = useState(today());
  const [carrier, setCarrier] = useState<Carrier>("cj");
  const [text, setText] = useState("");
  const [plan, setPlan] = useState<PlanRow[] | null>(null);
  /** 개별 입력 모달 */
  const [creating, setCreating] = useState(false);

  const counts = useMemo(() => {
    const result = {
      create: 0,
      update: 0,
      skip: 0,
      error: 0,
      duplicate: 0,
      undecided: 0,
      rerequest: 0,
    };
    for (const row of plan ?? []) {
      if (row.status === "duplicate") {
        if (row.choice === "new") result.create += 1;
        else if (row.choice === "rerequest") result.rerequest += 1;
        else result.undecided += 1;
        result.duplicate += 1;
      } else {
        result[row.status] += 1;
      }
    }
    return result;
  }, [plan]);

  const handlePreview = () => {
    setPlan(
      planPaste(text, {
        mode,
        receivedOn,
        defaultCarrier: carrier,
        existing,
        products: products.data ?? [],
      }),
    );
  };

  const saving = createReturns.isPending || updateReturns.isPending;
  const saveCount = counts.create + counts.update + counts.rerequest;

  const choose = (lineNo: number, choice: "new" | "rerequest") =>
    setPlan(
      (prev) =>
        prev?.map((row) =>
          row.status === "duplicate" && row.lineNo === lineNo
            ? { ...row, choice }
            : row,
        ) ?? null,
    );

  const chooseAll = (choice: "new" | "rerequest") =>
    setPlan(
      (prev) =>
        prev?.map((row) =>
          row.status === "duplicate" ? { ...row, choice } : row,
        ) ?? null,
    );

  const handleSave = async () => {
    if (!plan) return;
    if (counts.undecided > 0) return;
    const creates = plan.flatMap((row) =>
      row.status === "create" ||
      (row.status === "duplicate" && row.choice === "new")
        ? [row.input]
        : [],
    );
    const updates = plan.flatMap((row) => {
      if (row.status === "update")
        return [{ current: row.target, patch: row.patch }];
      if (row.status === "duplicate" && row.choice === "rerequest")
        return [{ current: row.target, patch: rerequestPatch(row) }];
      return [];
    });
    try {
      const created = creates.length
        ? await createReturns.mutateAsync(creates)
        : 0;
      const updated = updates.length
        ? await updateReturns.mutateAsync(updates)
        : 0;
      const rerequested = counts.rerequest;
      toast(
        [
          created && `${created}건 접수`,
          updated - rerequested > 0 && `${updated - rerequested}건 반영`,
          rerequested && `${rerequested}건 재접수`,
        ]
          .filter(Boolean)
          .join(" · ") + "했어요",
      );
      // 확인이 필요한 줄만 입력칸에 남겨서 고쳐서 다시 넣을 수 있게
      const remaining = plan
        .filter((row) => row.status === "error")
        .map((row) => row.raw);
      setText(remaining.join("\n"));
      setPlan(null);
    } catch {
      // 일부만 저장됐을 수 있으니 미리보기를 닫고 다시 확인하게 한다 (에러는 아래 ErrorBox)
      setPlan(null);
    }
  };

  const changeInput = (next: () => void) => {
    next();
    setPlan(null);
  };

  return (
    <Card title="회수 입력">
      <div className={s.inputGrid}>
        <div className={s.inputSide}>
          <SelectField
            label="입력 구분"
            containerClassName={s.modeSelect}
            value={mode}
            onChange={(e) =>
              changeInput(() => setMode(e.target.value as InputMode))
            }>
            {(Object.keys(INPUT_MODE_LABEL) as InputMode[]).map((key) => (
              <option key={key} value={key}>
                {INPUT_MODE_LABEL[key]}
              </option>
            ))}
          </SelectField>
          {(mode === "auto" || mode === "intake") && (
            <TextField
              label="접수일"
              type="date"
              value={receivedOn}
              max={today()}
              onChange={(e) =>
                e.target.value &&
                changeInput(() => setReceivedOn(e.target.value))
              }
            />
          )}
          {(mode === "auto" || mode === "invoice") && (
            <SelectField
              label="기본 택배사"
              value={carrier}
              onChange={(e) =>
                changeInput(() => setCarrier(e.target.value as Carrier))
              }>
              {(Object.keys(CARRIER_LABEL) as Carrier[]).map((key) => (
                <option key={key} value={key}>
                  {CARRIER_LABEL[key]}
                </option>
              ))}
            </SelectField>
          )}
        </div>

        <div>
          <div className={s.pasteHead}>
            <span className={s.pasteLabel}>붙여넣기</span>
            <Tooltip label="입력 형식">
              {FORMAT_GUIDE.map((group) => (
                <span key={group.title} className={s.formatGroup} style={{ display: "block" }}>
                  <span className={s.formatTitle} style={{ display: "block" }}>
                    {group.title}
                  </span>
                  {group.rows.map(([site, cols]) => (
                    <span key={site} className={s.formatRow}>
                      <span className={s.formatSite}>{site}</span>
                      <span className={s.formatCols}>{cols.join(" · ")}</span>
                    </span>
                  ))}
                </span>
              ))}
            </Tooltip>
          </div>
          <TextAreaField
            aria-label="붙여넣기"
            className={s.pasteArea}
            placeholder={PLACEHOLDER[mode]}
            value={text}
            onChange={(e) => changeInput(() => setText(e.target.value))}
            spellCheck={false}
          />
          {mode === "inspect" ? (
            <p className={s.helpText}>
              <b>회수완료</b> 상태인 건만 검수완료로 바뀌어요. 줄바꿈·띄어쓰기·쉼표로
              여러 송장을 한 번에 넣을 수 있어요.
            </p>
          ) : (
            <p className={s.helpText}>
              송장 줄에 <b>롯데</b> 또는 <b>직접</b>을 같이 적으면 그 택배사로
              등록돼요. 반품/교환은 <b>이름 반품(사유)</b>처럼 적고, 동명이인만
              관리번호를 앞에 붙여주세요.
            </p>
          )}
          <div className={s.inputActions}>
            {plan && (
              <Button variant="weak" onClick={() => setPlan(null)}>
                다시 입력
              </Button>
            )}
            {!plan ? (
              <>
                <Button onClick={() => setCreating(true)}>
                  개별 입력
                </Button>
                <Button onClick={handlePreview} disabled={!text.trim()}>
                  미리보기
                </Button>
              </>
            ) : (
              <Button
                onClick={handleSave}
                loading={saving}
                disabled={saveCount === 0 || counts.undecided > 0}>
                {counts.undecided > 0
                  ? `중복 ${counts.undecided}건 선택 필요`
                  : `${saveCount}건 저장`}
              </Button>
            )}
          </div>
        </div>
      </div>

      {plan && (
        <>
          <div className={s.previewSummary}>
            <Badge tone="blue">신규 {counts.create}</Badge>
            <Badge tone="green">반영 {counts.update}</Badge>
            <Badge tone="grey">건너뜀 {counts.skip}</Badge>
            {counts.rerequest > 0 && (
              <Badge tone="orange">재접수 {counts.rerequest}</Badge>
            )}
            {counts.error > 0 && (
              <Badge tone="red">확인 필요 {counts.error}</Badge>
            )}
          </div>
          {counts.duplicate > 0 && (
            <div className={s.dupNotice}>
              <span>
                이름·주소가 같은 건이 이미 있어요. 새로 추가할지, 기존 건의
                재접수인지 골라주세요.
                {counts.undecided > 0 && <b> ({counts.undecided}건 남음)</b>}
              </span>
              {counts.duplicate > 1 && (
                <span className={s.dupChoices}>
                  <Button
                    size="sm"
                    variant="weak"
                    onClick={() => chooseAll("new")}>
                    모두 새로 추가
                  </Button>
                  <Button
                    size="sm"
                    variant="weak"
                    onClick={() => chooseAll("rerequest")}>
                    모두 재접수
                  </Button>
                </span>
              )}
            </div>
          )}
          {plan.length === 0 ? (
            <p className={s.helpText}>읽을 수 있는 줄이 없어요.</p>
          ) : (
            <div className={s.previewList}>
              {plan.map((row) => (
                <div key={row.lineNo} className={s.previewRow}>
                  <span className={s.lineNo}>{row.lineNo}</span>
                  <Badge tone={PLAN_BADGE[row.status].tone}>
                    {PLAN_BADGE[row.status].label}
                  </Badge>
                  <div className={s.previewText}>
                    <span
                      className={
                        row.status === "error" ? s.errorText : undefined
                      }>
                      {describe(row)}
                    </span>
                    {"warning" in row && row.warning && (
                      <span className={s.warnText}>{row.warning}</span>
                    )}
                    {(row.status === "error" || row.status === "skip") && (
                      <span className={s.previewRaw}>{row.raw}</span>
                    )}
                    {row.status === "duplicate" && (
                      <span className={s.dupChoices}>
                        <Button
                          size="sm"
                          variant={row.choice === "new" ? "primary" : "weak"}
                          onClick={() => choose(row.lineNo, "new")}>
                          새로 추가
                        </Button>
                        <Button
                          size="sm"
                          variant={
                            row.choice === "rerequest" ? "primary" : "weak"
                          }
                          onClick={() => choose(row.lineNo, "rerequest")}>
                          {attemptLabel(
                            attemptOf(row.target.rerequestCount) + 1,
                          )}
                        </Button>
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
          {counts.error > 0 && (
            <p className={s.helpText}>
              확인 필요한 줄은 저장 후에도 입력칸에 남겨둘게요. 고쳐서 다시
              넣어주세요.
            </p>
          )}
        </>
      )}

      {(createReturns.error || updateReturns.error) && (
        <div style={{ marginTop: 12 }}>
          <ErrorBox error={createReturns.error ?? updateReturns.error} />
        </div>
      )}
      {creating && <ReturnCreateDialog onClose={() => setCreating(false)} />}
    </Card>
  );
}

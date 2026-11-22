import { useEffect, useMemo, useState } from "react";
import {
  useDeleteStorageDay,
  useSaveStorageDays,
  useSaveStorageItems,
} from "@/api/queries";
import { DEFAULT_STORAGE_PRICE } from "@/api/storage";
import { storageDayAmount, type StorageDay } from "@/api/types";
import { Button } from "@/components/Button";
import { TextField } from "@/components/Field";
import { useToast } from "@/components/Toast";
import { Badge, Card, ErrorBox } from "@/components/ui";
import { formatDateLabel, formatNumber, today } from "@/lib/format";
import { useStockMatrix } from "@/features/inventory/useStockMatrix";
import * as s from "@/pages/StoragePage.css";
import {
  computeStorageRows,
  findStorageWarehouse,
  toStorageItems,
} from "./calc";

const onlyDigits = (value: string) => value.replace(/\D/g, "").slice(0, 10);
const show = (value: string) => (value ? formatNumber(Number(value)) : "");
const toText = (value: number | null) =>
  value === null || value === undefined ? "" : String(value);
const toNumberOrNull = (value: string) => (value ? Number(value) : null);

interface Draft {
  palletQty: string;
  palletPrice: string;
  rackQty: string;
  rackPrice: string;
  reportedDaily: string;
  reportedTotal: string;
}

/** 그날 기록, 없으면 가장 최근 기록의 수량·단가를 가져온다 (업체 금액·메모는 비움) */
function draftFor(days: StorageDay[], date: string): Draft {
  const saved = days.find((day) => day.storedOn === date && day.recorded);
  if (saved) {
    return {
      palletQty: String(saved.palletQty),
      palletPrice: String(saved.palletPrice),
      rackQty: String(saved.rackQty),
      rackPrice: String(saved.rackPrice),
      reportedDaily: toText(saved.reportedDaily),
      reportedTotal: toText(saved.reportedTotal),
    };
  }
  const latest = days
    .filter((day) => day.recorded && day.storedOn < date)
    .at(-1);
  return {
    palletQty: latest ? String(latest.palletQty) : "",
    palletPrice: String(latest?.palletPrice ?? DEFAULT_STORAGE_PRICE.pallet),
    rackQty: latest ? String(latest.rackQty) : "",
    rackPrice: String(latest?.rackPrice ?? DEFAULT_STORAGE_PRICE.rack),
    reportedDaily: "",
    reportedTotal: "",
  };
}

interface StorageEntryProps {
  date: string;
  onDateChange: (date: string) => void;
  /** 이번 달 + 직전 며칠 기록 (날짜순) */
  days: StorageDay[];
  /** 기준일 이전 이번 달 누적 (기준일 제외) */
  monthBefore: number;
  className?: string;
}

export function StorageEntry({
  date,
  onDateChange,
  days,
  monthBefore,
  className,
}: StorageEntryProps) {
  const toast = useToast();
  const save = useSaveStorageDays();
  const remove = useDeleteStorageDay();
  const saveItems = useSaveStorageItems();
  // 세부 내역은 저장 버튼을 누른 순간의 현재 재고 기준
  const currentStock = useStockMatrix();
  const storageWarehouse = findStorageWarehouse(currentStock.warehouses);

  const [draft, setDraft] = useState<Draft>(() => draftFor(days, date));
  const [confirmDelete, setConfirmDelete] = useState(false);

  const saved = days.some((day) => day.storedOn === date && day.recorded);

  // 현재 재고(스타팩)로 계산한 팔레트·경량랙 수. 아직 저장 안 한 날은 이 값으로 자동 채움
  const computed = useMemo(() => {
    if (!storageWarehouse || currentStock.isLoading) return null;
    return computeStorageRows(currentStock.rows, storageWarehouse, {
      pallet: 0,
      rack: 0,
    }).reduce(
      (sum, row) => ({
        pallets: sum.pallets + row.pallets,
        racks: sum.racks + row.racks,
      }),
      { pallets: 0, racks: 0 },
    );
  }, [currentStock.rows, currentStock.isLoading, storageWarehouse]);
  const [autoFilled, setAutoFilled] = useState(false);
  useEffect(() => {
    if (saved || autoFilled || !computed) return;
    setDraft((prev) => ({
      ...prev,
      palletQty: String(computed.pallets),
      rackQty: String(computed.racks),
    }));
    setAutoFilled(true);
  }, [saved, autoFilled, computed]);
  const differsFromComputed =
    computed !== null &&
    (Number(draft.palletQty || 0) !== computed.pallets ||
      Number(draft.rackQty || 0) !== computed.racks);

  const current: Omit<StorageDay, "memo" | "recorded"> = {
    storedOn: date,
    palletQty: Number(draft.palletQty || 0),
    palletPrice: Number(draft.palletPrice || 0),
    rackQty: Number(draft.rackQty || 0),
    rackPrice: Number(draft.rackPrice || 0),
    reportedDaily: toNumberOrNull(draft.reportedDaily),
    reportedTotal: toNumberOrNull(draft.reportedTotal),
  };
  const dayAmount = storageDayAmount(current);
  const monthTotal = monthBefore + dayAmount;
  const dailyDiff =
    current.reportedDaily !== null ? current.reportedDaily - dayAmount : 0;
  // 업체 일일금액에 맞는 팔레트 수 (경량랙은 그대로 두고 계산, 나누어떨어질 때만)
  const fitPallets =
    current.reportedDaily !== null && current.palletPrice > 0
      ? (current.reportedDaily - current.rackQty * current.rackPrice) /
        current.palletPrice
      : null;
  const canFit =
    dailyDiff !== 0 &&
    fitPallets !== null &&
    Number.isInteger(fitPallets) &&
    fitPallets >= 0;
  const totalDiff =
    current.reportedTotal !== null ? current.reportedTotal - monthTotal : 0;

  const set = (field: keyof Draft, value: string) =>
    setDraft((prev) => ({ ...prev, [field]: value }));

  const handleSave = async () => {
    try {
      await save.mutateAsync([current]);
      const items = storageWarehouse
        ? toStorageItems(
            date,
            computeStorageRows(currentStock.rows, storageWarehouse, {
              pallet: current.palletPrice,
              rack: current.rackPrice,
            }),
          )
        : [];
      await saveItems.mutateAsync({ date, items });
      toast(
        `${formatDateLabel(date)} 보관비와 제품별 내역(현재 재고 기준 ${items.length}개)을 저장했어요`,
      );
    } catch {
      // 오류는 아래 ErrorBox 로 보여줌
    }
  };

  const handleDelete = () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    remove.mutate(date, {
      onSuccess: () => {
        toast(`${formatDateLabel(date)} 기록을 지웠어요`);
        setConfirmDelete(false);
      },
    });
  };

  return (
    <Card className={className}>
      <div className={s.sectionHead}>
        <h2 className={s.sectionTitle}>일일 보관비 입력</h2>
        {saved ? (
          <Badge tone="green">저장됨</Badge>
        ) : (
          <Badge tone="grey">미입력</Badge>
        )}
      </div>

      <>
        <div className={s.fieldGrid}>
          <TextField
            label="날짜"
            type="date"
            containerClassName={s.full}
            value={date}
            max={today()}
            onChange={(e) => e.target.value && onDateChange(e.target.value)}
          />
          <TextField
            label="팔레트(개)"
            inputMode="numeric"
            value={show(draft.palletQty)}
            onChange={(e) => set("palletQty", onlyDigits(e.target.value))}
          />
          <TextField
            label="팔레트 단가"
            inputMode="numeric"
            value={show(draft.palletPrice)}
            onChange={(e) => set("palletPrice", onlyDigits(e.target.value))}
          />
          <TextField
            label="경량랙(칸)"
            inputMode="numeric"
            value={show(draft.rackQty)}
            onChange={(e) => set("rackQty", onlyDigits(e.target.value))}
          />
          <TextField
            label="경량랙 단가"
            inputMode="numeric"
            value={show(draft.rackPrice)}
            onChange={(e) => set("rackPrice", onlyDigits(e.target.value))}
          />
          <TextField
            label="업체 일일금액"
            inputMode="numeric"
            placeholder="선택"
            value={show(draft.reportedDaily)}
            onChange={(e) => set("reportedDaily", onlyDigits(e.target.value))}
          />
          <TextField
            label="업체 누적금액"
            inputMode="numeric"
            placeholder="선택"
            value={show(draft.reportedTotal)}
            onChange={(e) => set("reportedTotal", onlyDigits(e.target.value))}
          />
        </div>

        {computed && (
          <p className={s.help} style={{ marginTop: 8 }}>
            현재 재고 계산값: 팔레트 {formatNumber(computed.pallets)} · 경량랙{" "}
            {formatNumber(computed.racks)}
            {!saved && !differsFromComputed && " (자동으로 채웠어요)"}
            {differsFromComputed && (
              <>
                {" "}
                <Button
                  size="sm"
                  variant="weak"
                  onClick={() =>
                    setDraft((prev) => ({
                      ...prev,
                      palletQty: String(computed.pallets),
                      rackQty: String(computed.racks),
                    }))
                  }
                >
                  계산값으로 채우기
                </Button>
              </>
            )}
          </p>
        )}

        <div className={s.totals}>
          <div className={s.totalLine}>
            <span>일일금액 (부가세 포함)</span>
            <span className={s.totalStrong}>{formatNumber(dayAmount)}원</span>
          </div>
          {dailyDiff !== 0 && (
            <p className={s.warn}>
              업체 일일금액과 {formatNumber(Math.abs(dailyDiff))}원 차이나요
              {canFit && (
                <>
                  {" "}
                  <Button
                    size="sm"
                    variant="weak"
                    onClick={() => set("palletQty", String(fitPallets))}
                  >
                    팔레트 {formatNumber(fitPallets!)}개로 맞추기
                  </Button>
                </>
              )}
            </p>
          )}
          <div className={s.totalLine}>
            <span>
              {Number(date.slice(5, 7))}월 누적 ({Number(date.slice(5, 7))}/1 ~{" "}
              {date.slice(5).replace("-", "/")})
            </span>
            <span className={s.totalStrong}>{formatNumber(monthTotal)}원</span>
          </div>
          {totalDiff !== 0 && (
            <p className={s.warn}>
              업체 누적금액과 {formatNumber(Math.abs(totalDiff))}원 차이나요 (
              {totalDiff > 0 ? "업체가 더 많음" : "업체가 더 적음"})
            </p>
          )}
        </div>

        <div className={s.actions}>
          {saved && (
            <Button
              variant="danger"
              onClick={handleDelete}
              loading={remove.isPending}
            >
              {confirmDelete ? "정말 삭제" : "삭제"}
            </Button>
          )}
          <Button
            fullWidth
            onClick={handleSave}
            loading={save.isPending || saveItems.isPending}
            disabled={currentStock.isLoading}
          >
            {saved ? "수정 저장" : "저장"}
          </Button>
        </div>
      </>

      {(save.error ||
        saveItems.error ||
        remove.error ||
        currentStock.error) && (
        <div style={{ marginTop: 12 }}>
          <ErrorBox
            error={
              save.error ??
              saveItems.error ??
              remove.error ??
              currentStock.error
            }
          />
        </div>
      )}
    </Card>
  );
}

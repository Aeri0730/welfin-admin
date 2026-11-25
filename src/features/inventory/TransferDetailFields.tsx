import type { TransferDetail } from '@/api/transfers';
import { TextField } from '@/components/Field';
import { formatNumber } from '@/lib/format';
import type { TransferDraft } from './transferPaste';
import * as s from './TransferDialog.css';

/** 이동 상세 입력칸이 다루는 값 (입력 중이라 전부 문자열) */
export type DetailForm = Pick<
  TransferDraft,
  'center' | 'arrivalTime' | 'poNo' | 'shipMethod' | 'pallets' | 'truckTon' | 'vehicleCost' | 'outNo' | 'vehicleNo' | 'driver' | 'address'
>;

const onlyDigits = (value: string, max = 12) => value.replace(/\D/g, '').slice(0, max);
const toNumber = (value: string) => (value.trim() ? Number(value) : null);

export const toDetailForm = (d: TransferDetail | undefined): DetailForm => ({
  center: d?.center ?? '',
  arrivalTime: d?.arrivalTime ?? '',
  poNo: d?.poNo ?? '',
  shipMethod: d?.shipMethod ?? '',
  pallets: d?.pallets === null || d?.pallets === undefined ? '' : String(d.pallets),
  truckTon: d?.truckTon ?? '',
  vehicleCost: d?.vehicleCost === null || d?.vehicleCost === undefined ? '' : String(d.vehicleCost),
  outNo: d?.outNo ?? '',
  vehicleNo: d?.vehicleNo ?? '',
  driver: d?.driver ?? '',
  address: d?.address ?? '',
});

export const toTransferDetail = (batchId: string, f: DetailForm, raw: string | null): TransferDetail => ({
  batchId,
  center: f.center,
  arrivalTime: f.arrivalTime,
  poNo: f.poNo,
  shipMethod: f.shipMethod,
  pallets: toNumber(f.pallets),
  truckTon: f.truckTon,
  vehicleCost: toNumber(f.vehicleCost),
  outNo: f.outNo,
  vehicleNo: f.vehicleNo,
  driver: f.driver,
  address: f.address,
  raw,
});

/**
 * 센터·입고시간·PLT·트럭·차량비용 등 이동 상세 입력칸.
 * 붙여넣기 등록 모달과 이동 내역 수정 모달이 같이 쓴다.
 * 날짜·제품·수량처럼 모달마다 다른 칸은 leading 으로 앞에 넣는다.
 */
export function TransferDetailFields({
  value,
  onChange,
  leading,
}: {
  value: DetailForm;
  onChange: (patch: Partial<DetailForm>) => void;
  leading?: React.ReactNode;
}) {
  return (
    <div className={s.grid}>
      <TextField label="센터" placeholder="안성5센터" value={value.center} onChange={(e) => onChange({ center: e.target.value })} />
      {leading}
      <TextField label="입고시간" type="time" value={value.arrivalTime} onChange={(e) => onChange({ arrivalTime: e.target.value })} />
      <TextField
        label="PLT"
        inputMode="numeric"
        placeholder="1"
        value={value.pallets}
        onChange={(e) => onChange({ pallets: onlyDigits(e.target.value, 3) })}
      />
      <TextField label="입고트럭 (t)" placeholder="1T" value={value.truckTon} onChange={(e) => onChange({ truckTon: e.target.value })} />
      <TextField
        label="차량비용 (원)"
        inputMode="numeric"
        value={value.vehicleCost ? formatNumber(Number(value.vehicleCost)) : ''}
        onChange={(e) => onChange({ vehicleCost: onlyDigits(e.target.value) })}
      />
      <TextField label="출고 방법" placeholder="밀크런" value={value.shipMethod} onChange={(e) => onChange({ shipMethod: e.target.value })} />

      <p className={s.groupTitle}>쿠팡 · 배송 정보</p>
      <TextField
        label="쿠팡 발주번호"
        inputMode="numeric"
        value={value.poNo}
        onChange={(e) => onChange({ poNo: onlyDigits(e.target.value, 20) })}
      />
      <TextField
        label="스타팩 출고번호"
        inputMode="numeric"
        value={value.outNo}
        onChange={(e) => onChange({ outNo: onlyDigits(e.target.value, 20) })}
      />
      <TextField label="차량번호" placeholder="경기90아3567" value={value.vehicleNo} onChange={(e) => onChange({ vehicleNo: e.target.value })} />
      <TextField
        label="기사님 정보"
        placeholder="이름 010-0000-0000"
        containerClassName={s.wide2}
        value={value.driver}
        onChange={(e) => onChange({ driver: e.target.value })}
      />
      <TextField
        label="입고 주소 및 담당자"
        containerClassName={s.full}
        value={value.address}
        onChange={(e) => onChange({ address: e.target.value })}
      />
    </div>
  );
}

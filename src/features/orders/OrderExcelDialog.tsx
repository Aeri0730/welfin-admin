import { useMemo, useRef, useState } from 'react';
import { useCreateOrderRequests, useProducts } from '@/api/queries';
import { Badge, ErrorBox } from '@/components/ui';
import { Button } from '@/components/Button';
import { Dialog } from '@/components/Dialog';
import { Icon } from '@/components/Icon';
import { SearchSelect } from '@/components/SearchSelect';
import { useToast } from '@/components/Toast';
import { tablesFromFile } from '@/features/inventory/siteStock';
import { downloadCsv } from '@/lib/csv';
import { formatNumber } from '@/lib/format';
import * as p from '@/pages/pages.css';
import { draftProblem, IMPORT_HEADER, parseOrderTable, toInput, type ImportDraft } from './excelImport';
import * as s from './orders.css';

/** 빈 양식 (예시 한 줄) */
const downloadTemplate = () =>
  downloadCsv('발주신청_양식.csv', IMPORT_HEADER, [
    ['홍길동', '06236', '서울 강남구 테헤란로 123 4층', '', '010-1234-5678', '부재 시 문 앞', '웰핀 더 에어히터', '', '', 1],
  ]);

/** 엑셀로 발주 여러 건을 한 번에 신청 */
export function OrderExcelDialog({ date, onClose }: { date: string; onClose: () => void }) {
  const toast = useToast();
  const products = useProducts();
  const create = useCreateOrderRequests();
  const fileRef = useRef<HTMLInputElement>(null);
  const [drafts, setDrafts] = useState<ImportDraft[] | null>(null);
  const [readError, setReadError] = useState<string | null>(null);

  const productList = useMemo(() => products.data ?? [], [products.data]);
  const productOptions = useMemo(
    () => productList.filter((pr) => pr.isActive).map((pr) => ({ value: String(pr.id), label: pr.name, hint: pr.sku })),
    [productList],
  );

  const handleFile = async (file: File) => {
    setReadError(null);
    try {
      const [table] = await tablesFromFile(file);
      const parsed = table ? parseOrderTable(table, productList) : null;
      if (!parsed) {
        setReadError("'수령자', '주소' 칸이 있는 머리글 줄을 찾지 못했어요. 양식을 받아서 채워주세요");
        setDrafts(null);
        return;
      }
      setDrafts(parsed);
    } catch {
      setReadError('파일을 읽지 못했어요. 엑셀(.xls, .xlsx)이나 .csv 파일인지 확인해주세요');
    }
  };

  const setProduct = (line: number, productId: string) =>
    setDrafts((prev) => prev?.map((d) => (d.line === line ? { ...d, productId: productId ? Number(productId) : null } : d)) ?? null);

  const ready = (drafts ?? []).filter((d) => draftProblem(d) === null);
  const blocked = (drafts ?? []).length - ready.length;

  const handleSave = () =>
    create.mutate(
      ready.map((d) => toInput(d, date, productList)),
      {
        onSuccess: (count) => {
          toast(`발주 ${count}건을 신청했어요${blocked ? ` (${blocked}건은 빠짐)` : ''}`);
          onClose();
        },
      },
    );

  return (
    <Dialog
      open
      wide
      onClose={onClose}
      title="엑셀로 발주 신청"
      footer={
        <div className={s.footer}>
          <Button variant="weak" onClick={downloadTemplate}>
            <Icon name="download" size={16} />
            양식 받기
          </Button>
          <span className={s.spacer} />
          <Button variant="weak" onClick={onClose}>
            닫기
          </Button>
          <Button onClick={handleSave} disabled={ready.length === 0} loading={create.isPending}>
            {ready.length}건 신청하기
          </Button>
        </div>
      }
    >
      <p className={p.listMeta}>
        발주처 엑셀과 같은 칸(수령자 · 우편번호 · 주소 · 전화번호 · 휴대폰 · 상세요구사항 · 판매처상품명 · 상품옵션 · 가격 · 수량)이면
        그대로 올리면 돼요. 상품명이 우리 제품과 다르면 줄마다 직접 골라주세요.
      </p>

      <input
        ref={fileRef}
        type="file"
        accept=".xls,.xlsx,.csv"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleFile(file);
          e.target.value = '';
        }}
      />
      <div style={{ margin: '12px 0' }}>
        <Button variant="secondary" onClick={() => fileRef.current?.click()} disabled={products.isLoading}>
          <Icon name="upload" size={16} />
          {drafts ? '다른 파일 고르기' : '엑셀 파일 고르기'}
        </Button>
      </div>

      {readError && <ErrorBox error={new Error(readError)} />}
      {create.error && <ErrorBox error={create.error} />}

      {drafts && (
        <>
          <p className={p.listMeta}>
            {drafts.length}건 중 <b>{ready.length}건</b> 신청 가능
            {blocked > 0 && <span className={p.muted}> · {blocked}건은 확인 필요 (신청에서 빠져요)</span>}
          </p>
          <div className={p.tableWrap} style={{ marginTop: 8 }}>
            <table className={p.table}>
              <thead>
                <tr>
                  <th className={p.th}>줄</th>
                  <th className={p.th}>수령자</th>
                  <th className={p.th}>주소 · 연락처</th>
                  <th className={p.th}>상품</th>
                  <th className={p.th}>수량</th>
                  <th className={p.th}>상태</th>
                </tr>
              </thead>
              <tbody>
                {drafts.map((d) => {
                  const problem = draftProblem(d);
                  return (
                    <tr key={d.line}>
                      <td className={p.td}>{d.line}</td>
                      <td className={`${p.td} ${s.nowrap}`}>{d.recipient || '-'}</td>
                      <td className={p.td}>
                        <div className={s.longCell}>{d.address || '-'}</div>
                        <div className={p.muted}>{[d.mobile, d.phone].filter(Boolean).join(' · ') || '-'}</div>
                      </td>
                      <td className={p.td} style={{ minWidth: 220 }}>
                        <SearchSelect
                          size="sm"
                          ariaLabel={`${d.line}번째 줄 상품`}
                          placeholder={d.productText || '제품 검색'}
                          value={d.productId ? String(d.productId) : ''}
                          options={productOptions}
                          invalid={!d.productId}
                          onChange={(value) => setProduct(d.line, value)}
                        />
                        {d.productText && !d.productId && <div className={p.muted}>엑셀: {d.productText}</div>}
                      </td>
                      <td className={p.td}>{formatNumber(d.quantity)}</td>
                      <td className={p.td}>
                        {problem ? <Badge tone="orange">{problem}</Badge> : <Badge tone="green">신청 가능</Badge>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </Dialog>
  );
}

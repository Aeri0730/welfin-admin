// 사이트 재고 비교 화면(StockComparePage)의 조각. 스타일은 화면과 함께 쓴다.
import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { cx } from '@/lib/cx';
import { formatDateTime, formatNumber } from '@/lib/format';
import { sumBy } from '@/lib/sum';
import * as st from '@/pages/StockComparePage.css';
import { SITES, type SiteData, type SiteKey } from './siteStock';

/** 사이트 한 곳의 파일 카드 */
export function SiteCard({
  siteKey,
  data,
  onUpload,
  onPaste,
  onRemove,
}: {
  siteKey: SiteKey;
  data: SiteData | undefined;
  onUpload: () => void;
  onPaste: () => void;
  onRemove: () => void;
}) {
  const label = SITES[siteKey].label;
  return (
    <section className={st.site}>
      <div className={st.siteHead}>
        <h2 className={st.siteName}>{label}</h2>
        {data && (
          <button type="button" className={st.removeButton} onClick={onRemove} aria-label={`${label} 파일 지우기`}>
            <Icon name="close" size={16} />
          </button>
        )}
      </div>
      {data ? (
        <>
          <p className={st.siteTotal}>{formatNumber(sumBy(data.rows, (r) => r.quantity))}개</p>
          <p className={st.siteMeta}>
            {data.rows.length}종 · {formatDateTime(data.uploadedAt)} 올림
          </p>
        </>
      ) : (
        <>
          <p className={cx(st.siteTotal, st.siteTotalEmpty)}>-</p>
          <p className={st.siteMeta}>아직 파일을 올리지 않았어요</p>
        </>
      )}
      <div className={st.siteActions}>
        <Button size="sm" variant={data ? 'weak' : 'primary'} className={cx(st.siteButton, data && st.softButton)} onClick={onUpload}>
          {data ? '다시 올리기' : '파일 올리기'}
        </Button>
        <Button size="sm" variant="ghost" onClick={onPaste}>
          붙여넣기
        </Button>
      </div>
    </section>
  );
}

import { useEffect, useRef, useState } from 'react';
import { formatPostcodeAddress, loadPostcode } from '@/lib/postcode';
import { Button } from './Button';
import { ErrorBox, Skeleton } from './ui';
import * as styles from './PostcodeSearch.css';

/**
 * 우편번호 검색 패널 (모달 안에 펼쳐서 쓴다).
 * 주소를 고르면 onSelect 로 우편번호·주소를 넘기고, 닫는 건 부르는 쪽이 정한다.
 */
export function PostcodeSearch({
  onSelect,
  onClose,
}: {
  onSelect: (result: { zipCode: string; address: string }) => void;
  onClose: () => void;
}) {
  const boxRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  // 패널이 열려 있는 동안 바뀐 onSelect 도 쓰도록
  const selectRef = useRef(onSelect);
  selectRef.current = onSelect;

  useEffect(() => {
    let cancelled = false;
    loadPostcode()
      .then((Postcode) => {
        if (cancelled || !boxRef.current) return;
        new Postcode({
          width: '100%',
          height: '100%',
          oncomplete: (data) => selectRef.current({ zipCode: data.zonecode, address: formatPostcodeAddress(data) }),
        }).embed(boxRef.current);
        setReady(true);
      })
      .catch((e: Error) => !cancelled && setError(e));
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className={styles.panel}>
      <div className={styles.head}>
        <span>도로명·건물명·지번으로 검색해주세요</span>
        <Button variant="ghost" size="sm" onClick={onClose}>
          닫기
        </Button>
      </div>
      {error ? (
        <ErrorBox error={error} />
      ) : (
        <div className={styles.box}>
          {!ready && <Skeleton height={400} />}
          <div ref={boxRef} className={styles.embed} />
        </div>
      )}
    </div>
  );
}

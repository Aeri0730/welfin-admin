/**
 * 카카오(다음) 우편번호 서비스. 키 없이 무료로 쓰는 공식 스크립트를 처음 쓸 때 한 번만 불러온다.
 * (t1.daumcdn.net 은 2026-11-30 종료 → t1.kakaocdn.net 사용)
 * https://postcode.map.daum.net/guide
 */
const SCRIPT_URL = 'https://t1.kakaocdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js';

/** 주소를 골랐을 때 받는 값 (쓰는 것만) */
export interface PostcodeResult {
  zonecode: string;
  roadAddress: string;
  jibunAddress: string;
  /** 'R' 도로명 / 'J' 지번 */
  userSelectedType: 'R' | 'J';
  bname: string;
  buildingName: string;
  apartment: 'Y' | 'N';
}

interface PostcodeInstance {
  /** 새 창(팝업)으로 검색 */
  open: (options?: { popupTitle?: string; popupKey?: string; left?: number; top?: number }) => void;
}

interface PostcodeConstructor {
  new (options: {
    oncomplete: (data: PostcodeResult) => void;
    width?: string | number;
    height?: string | number;
  }): PostcodeInstance;
}

declare global {
  interface Window {
    daum?: { Postcode?: PostcodeConstructor };
  }
}

let loading: Promise<PostcodeConstructor> | null = null;

export function loadPostcode(): Promise<PostcodeConstructor> {
  if (window.daum?.Postcode) return Promise.resolve(window.daum.Postcode);
  if (loading) return loading;
  loading = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = SCRIPT_URL;
    script.async = true;
    script.onload = () => {
      if (window.daum?.Postcode) resolve(window.daum.Postcode);
      else reject(new Error('우편번호 검색을 불러오지 못했어요'));
    };
    script.onerror = () => {
      loading = null;
      script.remove();
      reject(new Error('우편번호 검색을 불러오지 못했어요. 인터넷 연결을 확인해주세요'));
    };
    document.head.appendChild(script);
  });
  return loading;
}

/**
 * 고른 주소를 한 줄로: 도로명 주소면 '(법정동, 건물명)' 을 붙인다 (카카오 가이드 예시와 같은 규칙).
 */
export function formatPostcodeAddress(data: PostcodeResult): string {
  if (data.userSelectedType === 'J') return data.jibunAddress;
  const extras = [
    /[동로가]$/.test(data.bname) ? data.bname : '',
    data.buildingName && data.apartment === 'Y' ? data.buildingName : '',
  ].filter(Boolean);
  return extras.length ? `${data.roadAddress} (${extras.join(', ')})` : data.roadAddress;
}

const POPUP_WIDTH = 500;
const POPUP_HEIGHT = 600;

/**
 * 우편번호 검색을 새 창으로 띄운다. 주소를 고르면 창이 닫히고 onSelect 로 넘긴다.
 * 브라우저가 팝업을 막지 않도록 누른 순간 바로 열어야 해서, 화면을 열 때 loadPostcode() 로 미리 불러 둔다.
 */
export async function openPostcodePopup(onSelect: (result: { zipCode: string; address: string }) => void): Promise<void> {
  const Postcode = await loadPostcode();
  new Postcode({
    width: POPUP_WIDTH,
    height: POPUP_HEIGHT,
    oncomplete: (data) => onSelect({ zipCode: data.zonecode, address: formatPostcodeAddress(data) }),
  }).open({
    popupTitle: '우편번호 검색',
    // 같은 창을 다시 쓰도록 (여러 번 눌러도 창이 쌓이지 않게)
    popupKey: 'welfin-postcode',
    left: Math.round(window.screenX + (window.outerWidth - POPUP_WIDTH) / 2),
    top: Math.round(window.screenY + (window.outerHeight - POPUP_HEIGHT) / 2),
  });
}

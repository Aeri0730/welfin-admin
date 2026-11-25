/**
 * 카카오(다음) 우편번호 서비스. 키 없이 무료로 쓰는 공식 스크립트를 처음 쓸 때 한 번만 불러온다.
 * https://postcode.map.daum.net/guide
 */
const SCRIPT_URL = 'https://t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js';

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
  embed: (element: HTMLElement, options?: { autoClose?: boolean }) => void;
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

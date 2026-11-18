import { Card, PageHeader } from '@/components/ui';

/** .env.local 이 없을 때 보여주는 안내 화면 */
export function SetupNotice() {
  return (
    <main style={{ maxWidth: 560, margin: '0 auto', padding: '64px 16px' }}>
      <PageHeader title="Supabase 연결이 필요해요" description="아래 순서대로 설정한 뒤 개발 서버를 다시 실행해주세요" />
      <Card>
        <ol style={{ paddingLeft: 20, listStyle: 'decimal', lineHeight: 1.9, fontSize: 15 }}>
          <li>supabase.com 에서 프로젝트 만들기</li>
          <li>SQL Editor 에서 supabase/migrations/0001_init.sql 실행</li>
          <li>.env.example 을 복사해 .env.local 만들고 URL·키 입력</li>
          <li>supabase/create_user.sql 안내대로 첫 계정 만들기</li>
        </ol>
      </Card>
    </main>
  );
}

import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router';
import { useQueryClient } from '@tanstack/react-query';
import { signOut } from '@/api/auth';
import { Button } from '@/components/Button';
import { Icon, type IconName } from '@/components/Icon';
import { ToastViewport } from '@/components/Toast';
import { useProfile } from '@/features/auth/session';
import { cx } from '@/lib/cx';
import * as styles from './AppLayout.css';

interface NavItem {
  to: string;
  label: string;
  icon: IconName;
}

const NAV_ITEMS: NavItem[] = [
  { to: '/', label: '홈', icon: 'home' },
  { to: '/stock', label: '재고 현황', icon: 'box' },
  { to: '/sales', label: '매출', icon: 'chart' },
  { to: '/inbound', label: '입고', icon: 'inbound' },
  { to: '/outbound', label: '출고', icon: 'outbound' },
  { to: '/returns', label: '회수', icon: 'return' },
  { to: '/transfer', label: '창고 이동', icon: 'transfer' },
  { to: '/history', label: '입출고 내역', icon: 'list' },
  { to: '/settings', label: '기준 정보', icon: 'settings' },
];

interface TabItem extends NavItem {
  /** 이 경로들에 있을 때도 탭을 활성으로 표시 */
  match?: string[];
}

/** 모바일 하단 탭에 바로 노출할 메뉴 (나머지는 '전체'에서) */
const TAB_ITEMS: TabItem[] = [
  { to: '/', label: '홈', icon: 'home' },
  { to: '/stock', label: '재고', icon: 'box' },
  { to: '/sales', label: '매출', icon: 'chart' },
  { to: '/returns', label: '회수', icon: 'return' },
];

export function AppLayout() {
  const { data: profile } = useProfile();
  const queryClient = useQueryClient();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => setMenuOpen(false), [location.pathname]);

  const handleSignOut = async () => {
    await signOut();
    queryClient.clear();
  };

  const roleLabel = profile?.role === 'admin' ? '관리자' : '직원';

  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar}>
        <p className={styles.logo}>
          Welfin <span className={styles.logoAccent}>재고</span>
        </p>
        <nav className={styles.navList}>
          {NAV_ITEMS.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.to === '/'} className={styles.navLink}>
              <Icon name={item.icon} size={20} />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className={styles.userBox}>
          <div>
            <p className={styles.userName}>{profile?.name ?? ''}</p>
            <p className={styles.userRole}>{profile ? roleLabel : ''}</p>
          </div>
          <Button variant="ghost" size="sm" onClick={handleSignOut} aria-label="로그아웃">
            <Icon name="logout" size={18} />
          </Button>
        </div>
      </aside>

      <div>
        <header className={styles.topBar}>
          <span className={styles.topBarTitle}>Welfin 재고</span>
        </header>

        <main className={styles.main}>
          <Outlet />
        </main>
      </div>

      <nav className={styles.tabBar} aria-label="주요 메뉴">
        {TAB_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              cx(styles.tabItem, (isActive || item.match?.includes(location.pathname)) && 'active')
            }
          >
            <Icon name={item.icon} />
            {item.label}
          </NavLink>
        ))}
        <button type="button" className={styles.tabItem} onClick={() => setMenuOpen(true)}>
          <Icon name="menu" />
          전체
        </button>
      </nav>

      {menuOpen && (
        <>
          <div className={styles.overlay} onClick={() => setMenuOpen(false)} />
          <div className={styles.sheet} role="dialog" aria-modal="true" aria-label="전체 메뉴">
            <div className={styles.sheetHandle} />
            <div className={styles.sheetHeader}>
              <div>
                <p className={styles.userName}>{profile?.name}</p>
                <p className={styles.userRole}>{roleLabel}</p>
              </div>
              <Button variant="weak" size="sm" onClick={handleSignOut}>
                로그아웃
              </Button>
            </div>
            <nav className={styles.navList}>
              {NAV_ITEMS.map((item) => (
                <NavLink key={item.to} to={item.to} end={item.to === '/'} className={styles.navLink}>
                  <Icon name={item.icon} size={20} />
                  {item.label}
                </NavLink>
              ))}
            </nav>
          </div>
        </>
      )}

      <ToastViewport />
    </div>
  );
}

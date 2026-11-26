import { useState, type FormEvent } from 'react';
import { useCreateWarehouse, useDeleteWarehouse, useWarehouses } from '@/api/queries';
import { Button } from '@/components/Button';
import { TextField } from '@/components/Field';
import { useToast } from '@/components/Toast';
import { Card, EmptyState, ErrorBox } from '@/components/ui';
import * as s from '@/pages/pages.css';
import * as styles from '@/pages/SettingsPage.css';
import { findStorageWarehouse } from '@/features/storage/calc';

/** 기준 정보 > 창고: 추가와 삭제 (입출고 기록이 있는 창고는 DB 가 삭제를 막는다) */
export function WarehouseSection({ isAdmin }: { isAdmin: boolean }) {
  const toast = useToast();
  const warehouses = useWarehouses();
  const create = useCreateWarehouse();
  const remove = useDeleteWarehouse();
  const [name, setName] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  const list = warehouses.data ?? [];
  /** 보관비 계산에 쓰는 창고는 지우면 안 된다 */
  const storageWarehouseId = findStorageWarehouse(list)?.id;

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    create.mutate(trimmed, {
      onSuccess: () => {
        toast(`${trimmed} 창고를 추가했어요`);
        setName('');
      },
    });
  };

  const handleDelete = (id: number, warehouseName: string) => {
    if (confirmDeleteId !== id) {
      setConfirmDeleteId(id);
      return;
    }
    remove.mutate(id, {
      onSuccess: () => toast(`${warehouseName} 창고를 삭제했어요`),
      onSettled: () => setConfirmDeleteId(null),
    });
  };

  return (
    <Card title={`창고 ${warehouses.data ? list.length : ''}`}>
      {isAdmin && (
        <form className={styles.form} onSubmit={handleSubmit}>
          <TextField label="창고명" placeholder="예: 3PL 물류센터" value={name} onChange={(e) => setName(e.target.value)} />
          {create.error && <ErrorBox error={create.error} />}
          <Button type="submit" variant="secondary" fullWidth disabled={!name.trim()} loading={create.isPending}>
            창고 추가
          </Button>
        </form>
      )}

      {warehouses.error && <ErrorBox error={warehouses.error} />}
      {remove.error && <ErrorBox error={remove.error} />}
      {warehouses.data && list.length === 0 ? (
        <EmptyState title="등록된 창고가 없어요" />
      ) : (
        <ul>
          {list.map((w) => (
            <li key={w.id} className={s.listItem}>
              <div className={s.listMain}>
                <p className={s.listTitle}>{w.name}</p>
                {w.id === storageWarehouseId && <p className={s.listMeta}>보관비 계산 창고</p>}
              </div>
              {isAdmin && w.id !== storageWarehouseId && (
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => handleDelete(w.id, w.name)}
                  onBlur={() => setConfirmDeleteId((current) => (current === w.id ? null : current))}
                  disabled={remove.isPending}
                >
                  {confirmDeleteId === w.id ? '정말 삭제' : '삭제'}
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

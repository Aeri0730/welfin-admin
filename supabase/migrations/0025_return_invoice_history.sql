-- =====================================================================
-- 0025: 회수 건의 이전 반송장 기록
-- SQL Editor 에서 통째로 실행하세요. 여러 번 실행해도 괜찮아요.
--   재접수로 반송장이 새로 나오면 기존 송장을 지우지 않고 여기에 쌓는다.
--   invoice_no / tracking_* 칸은 '가장 최근 송장', invoice_history 는 그 전 송장들 (최근 것이 앞)
--   [{"carrier","invoice_no","entered_at","tracking_code","tracking_label",
--     "tracking_location","tracking_time","tracking_checked_at","tracking_error"}]
-- =====================================================================

alter table public.returns
  add column if not exists invoice_history jsonb not null default '[]'::jsonb;

comment on column public.returns.invoice_history is '이전 반송장 목록 (최근 것이 앞)';

notify pgrst, 'reload schema';

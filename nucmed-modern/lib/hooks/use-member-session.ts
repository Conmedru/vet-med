import useSWR from "swr";

export interface MemberSessionData {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  middleName: string;
  specialty: string;
  specialtyName: string;
  emailVerified: boolean;
}

interface SessionResponse {
  authenticated: boolean;
  member?: MemberSessionData;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

/**
 * Клиентское состояние авторизации специалиста. Используется в Header и на
 * главной — оба живут под layout с `revalidate = 3600`, поэтому статус
 * авторизации нельзя читать на сервере без риска "залипания" в кэше между
 * разными пользователями. SWR с no-store внутри API-роута решает это.
 */
export function useMemberSession() {
  const { data, isLoading, mutate } = useSWR<SessionResponse>("/api/member/session", fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 5000,
  });

  return {
    member: data?.authenticated ? data.member ?? null : null,
    isLoading,
    refresh: mutate,
  };
}

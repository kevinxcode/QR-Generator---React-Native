import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';

import { useDataVersion } from '@/store/data.store';

interface AsyncState<T> {
  data: T | undefined;
  loading: boolean;
  error: string | null;
  reload(): void;
}

interface Result<T> {
  key: string;
  data: T | undefined;
  error: string | null;
}

/**
 * Run an async loader, re-running when deps change, when the screen regains focus,
 * and whenever the global data version is bumped. Keeps the previous data while reloading.
 */
export function useAsync<T>(loader: () => Promise<T>, deps: unknown[] = []): AsyncState<T> {
  const version = useDataVersion((s) => s.version);
  const [tick, setTick] = useState(0);
  const [result, setResult] = useState<Result<T>>({ key: '', data: undefined, error: null });
  const loaderRef = useRef(loader);
  const key = `${JSON.stringify(deps)}|${version}|${tick}`;

  useEffect(() => {
    loaderRef.current = loader;
  });

  useEffect(() => {
    let alive = true;
    loaderRef
      .current()
      .then((data) => alive && setResult({ key, data, error: null }))
      .catch((e: unknown) => alive && setResult((r) => ({ key, data: r.data, error: e instanceof Error ? e.message : String(e) })));
    return () => {
      alive = false;
    };
  }, [key]);

  const focusedOnce = useRef(false);
  useFocusEffect(
    useCallback(() => {
      if (!focusedOnce.current) {
        focusedOnce.current = true;
        return;
      }
      setTick((t) => t + 1);
    }, []),
  );

  return { data: result.data, loading: result.key !== key, error: result.error, reload: () => setTick((t) => t + 1) };
}

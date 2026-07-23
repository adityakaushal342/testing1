import { useEffect, useState, useCallback } from "react";

// Minimal data-fetching hook: { data, error, loading, reload }.
export function useApi(fn, deps = []) {
  const [state, setState] = useState({ data: null, error: null, loading: true });

  const run = useCallback(() => {
    let alive = true;
    setState((s) => ({ ...s, loading: true }));
    Promise.resolve(fn())
      .then((data) => alive && setState({ data, error: null, loading: false }))
      .catch((error) => alive && setState({ data: null, error, loading: false }));
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(run, [run]);
  return { ...state, reload: run };
}

export const inr = (n) =>
  n == null ? "—" : "₹" + Number(n).toLocaleString("en-IN", { maximumFractionDigits: 2 });

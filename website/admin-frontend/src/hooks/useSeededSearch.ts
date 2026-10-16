import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

// A list page's search box that the header search can deep-link into via `?q=`.
export const useSeededSearch = () => {
  const [params] = useSearchParams();
  const q = params.get('q');
  const [search, setSearch] = useState(q ?? '');
  useEffect(() => {
    if (q !== null) setSearch(q);
  }, [q]);
  return [search, setSearch] as const;
};

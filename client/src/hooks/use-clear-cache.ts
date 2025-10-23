import { useEffect } from "react";
import { queryClient } from "@/lib/queryClient";

/**
 * Hook para limpar cache automaticamente quando o componente monta
 * Útil para garantir que dados frescos sejam carregados ao navegar para uma página
 * @param queryKeys - Array de query keys para invalidar
 */
export function useClearCache(queryKeys: (string | string[])[]) {
  useEffect(() => {
    queryKeys.forEach((key) => {
      const queryKey = Array.isArray(key) ? key : [key];
      console.log(`🔄 Clearing cache for:`, queryKey);
      // Invalidate without refetch - let useQuery handle the refetch
      queryClient.invalidateQueries({
        queryKey,
        refetchType: 'none'
      });
    });
  }, [queryKeys]);
}

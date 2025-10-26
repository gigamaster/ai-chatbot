import useSWR from "swr";

type Provider = {
  id: string;
  name: string;
  baseUrl: string;
  apiKey: string;
  model: string;
  createdAt: string;
  updatedAt: string;
  isEnabled: boolean;
};

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function useProviders() {
  const { data, error, isLoading, mutate } = useSWR<{
    success: boolean;
    providers: Provider[];
  }>("/api/get-providers", fetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
  });

  return {
    providers: data?.providers || [],
    isLoading,
    isError: error,
    mutate,
  };
}

export function useProvider(providerId: string) {
  const { providers, isLoading, isError } = useProviders();

  const provider = providers.find((p) => p.id === providerId);

  return {
    provider,
    isLoading,
    isError,
  };
}

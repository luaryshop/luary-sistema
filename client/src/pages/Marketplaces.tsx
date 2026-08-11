import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle2, XCircle, RefreshCw, Unlink } from "lucide-react";
import { toast } from "sonner";

export default function Marketplaces() {
  const [connecting, setConnecting] = useState<string | null>(null);
  const [disconnecting, setDisconnecting] = useState<string | null>(null);

  // Queries
  const { data: connections, isLoading, refetch } = trpc.marketplace.getConnections.useQuery();
  const { data: supportedMarketplaces } = trpc.marketplace.getSupportedMarketplaces.useQuery();

  // Mutations
  const handleOAuthMutation = trpc.marketplace.handleOAuthCallback.useMutation();
  const disconnectMutation = trpc.marketplace.disconnect.useMutation();

  const handleConnect = async (marketplaceType: string) => {
    try {
      setConnecting(marketplaceType);

      // Get authorization URL via fetch
      const response = await fetch("/api/trpc/marketplace.getAuthorizationUrl", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input: { marketplaceType } }),
      });

      const data = await response.json();
      if (data.result?.data?.authUrl) {
        // Redirect to marketplace OAuth
        window.location.href = data.result.data.authUrl;
      } else {
        toast.error(data.error?.message || "Failed to get authorization URL");
      }
    } catch (error) {
      toast.error(`Failed to connect to ${marketplaceType}`);
    } finally {
      setConnecting(null);
    }
  };

  const handleDisconnect = async (marketplaceType: string) => {
    try {
      setDisconnecting(marketplaceType);
      await disconnectMutation.mutateAsync({
        marketplaceType: marketplaceType as any,
      });
      toast.success(`Disconnected from ${marketplaceType}`);
      refetch();
    } catch (error) {
      toast.error(`Failed to disconnect from ${marketplaceType}`);
    } finally {
      setDisconnecting(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin">
          <RefreshCw className="w-8 h-8" />
        </div>
      </div>
    );
  }

  const connectionMap = new Map(connections?.map((c) => [c.marketplaceType, c]) || []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Integrações de Marketplaces</h1>
        <p className="text-muted-foreground mt-2">
          Conecte seus marketplaces para sincronizar produtos, estoque e pedidos automaticamente.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {supportedMarketplaces?.map((marketplace) => {
          const connection = connectionMap.get(marketplace.type);
          const isConnected = connection?.isConnected;

          return (
            <Card key={marketplace.type} className="relative overflow-hidden">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle>{marketplace.name}</CardTitle>
                    <CardDescription className="mt-2">
                      {isConnected ? `Conectado como ${connection?.sellerName}` : "Não conectado"}
                    </CardDescription>
                  </div>
                  {isConnected ? (
                    <CheckCircle2 className="w-6 h-6 text-green-500" />
                  ) : (
                    <XCircle className="w-6 h-6 text-gray-300" />
                  )}
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {connection && isConnected && (
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Última sincronização:</span>
                      <span>
                        {connection.lastSyncAt
                          ? new Date(connection.lastSyncAt).toLocaleString("pt-BR")
                          : "Nunca"}
                      </span>
                    </div>

                    {connection.lastErrorAt && (
                      <div className="flex gap-2 p-2 bg-red-50 rounded text-red-700">
                        <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="font-medium">Erro na última sincronização</p>
                          <p className="text-xs">{connection.lastErrorMessage}</p>
                        </div>
                      </div>
                    )}

                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Status:</span>
                      <Badge
                        variant={
                          connection.syncStatus === "syncing"
                            ? "default"
                            : connection.syncStatus === "error"
                              ? "destructive"
                              : "secondary"
                        }
                      >
                        {connection.syncStatus === "syncing" && "Sincronizando..."}
                        {connection.syncStatus === "idle" && "Inativo"}
                        {connection.syncStatus === "error" && "Erro"}
                      </Badge>
                    </div>
                  </div>
                )}

                <div className="flex gap-2">
                  {isConnected ? (
                    <Button
                      variant="destructive"
                      className="flex-1"
                      onClick={() => handleDisconnect(marketplace.type)}
                      disabled={disconnecting === marketplace.type}
                    >
                      {disconnecting === marketplace.type ? (
                        <>
                          <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                          Desconectando...
                        </>
                      ) : (
                        <>
                          <Unlink className="w-4 h-4 mr-2" />
                          Desconectar
                        </>
                      )}
                    </Button>
                  ) : (
                    <Button
                      className="flex-1"
                      onClick={() => handleConnect(marketplace.type)}
                      disabled={connecting === marketplace.type}
                    >
                      {connecting === marketplace.type ? (
                        <>
                          <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                          Conectando...
                        </>
                      ) : (
                        "Conectar"
                      )}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* OAuth Callback Handler */}
      <OAuthCallbackHandler onSuccess={() => refetch()} />
    </div>
  );
}

/**
 * Component to handle OAuth callback from marketplaces
 */
function OAuthCallbackHandler({ onSuccess }: { onSuccess: () => void }) {
  const [processed, setProcessed] = useState(false);
  const handleCallbackMutation = trpc.marketplace.handleOAuthCallback.useMutation();

  useEffect(() => {
    // Check URL for OAuth callback parameters
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const state = params.get("state");
    const marketplaceType = params.get("marketplace");

    if (code && state && marketplaceType && !processed) {
      setProcessed(true);

      handleCallbackMutation.mutate(
        {
          code,
          state,
          marketplaceType: marketplaceType as any,
        },
        {
          onSuccess: () => {
            toast.success("Marketplace conectado com sucesso!");
            // Clean up URL
            window.history.replaceState({}, document.title, window.location.pathname);
            onSuccess();
          },
          onError: (error) => {
            toast.error(`Erro ao conectar: ${error.message}`);
            window.history.replaceState({}, document.title, window.location.pathname);
          },
        }
      );
    }
  }, [processed, handleCallbackMutation, onSuccess]);

  return null;
}

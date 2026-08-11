import { useEffect, useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, AlertCircle, CheckCircle2, Clock } from "lucide-react";
import { toast } from "sonner";

export default function Dashboard() {
  const [lastSync, setLastSync] = useState<Record<string, Date>>({});

  // Queries
  const { data: connections } = trpc.marketplace.getConnections.useQuery();
  const { data: products } = trpc.products.list.useQuery();
  const { data: orders } = trpc.orders.list.useQuery({ limit: 10 });

  // Mutations
  const importOrdersMutation = trpc.orders.importFromAllMarketplaces.useMutation();

  const handleImportOrders = async () => {
    try {
      const result = await importOrdersMutation.mutateAsync({});
      toast.success(`Imported ${result.totalImported} order(s)`);
      if (result.totalFailed > 0) {
        toast.error(`Failed to import ${result.totalFailed} order(s)`);
      }
    } catch (error) {
      toast.error("Failed to import orders");
    }
  };

  const getStatusBadge = (isConnected: number) => {
    if (isConnected === 1) {
      return (
        <Badge className="bg-green-500">
          <CheckCircle2 className="w-3 h-3 mr-1" />
          Conectado
        </Badge>
      );
    }
    return (
      <Badge variant="destructive">
        <AlertCircle className="w-3 h-3 mr-1" />
        Desconectado
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground mt-2">Visão geral de suas integrações e atividades</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Marketplaces Conectados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{connections?.filter((c) => Number(c.isConnected) === 1).length || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total de Produtos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{products?.length || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pedidos Recentes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{orders?.length || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Status Geral</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge className="bg-blue-500">Operacional</Badge>
          </CardContent>
        </Card>
      </div>

      {/* Marketplaces Status */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Status dos Marketplaces</CardTitle>
              <CardDescription>Conexão e última sincronização</CardDescription>
            </div>
            <Button size="sm" onClick={handleImportOrders} disabled={importOrdersMutation.isPending}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Sincronizar Pedidos
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {connections?.map((connection) => (
              <div key={connection.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex-1">
                  <h3 className="font-semibold capitalize">{connection.marketplaceType}</h3>
                  <p className="text-sm text-muted-foreground">
                    {connection.sellerName || "Sem nome de vendedor"}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">Última sincronização</p>
                    <p className="text-sm font-medium">
                      {connection.lastSyncAt ? new Date(connection.lastSyncAt as any).toLocaleDateString("pt-BR") : "Nunca"}
                    </p>
                  </div>
                  {connection.lastErrorMessage && (
                    <div className="text-right">
                      <p className="text-sm text-red-600">{connection.lastErrorMessage}</p>
                    </div>
                  )}
                  {getStatusBadge(Number(connection.isConnected))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent Orders */}
      <Card>
        <CardHeader>
          <CardTitle>Pedidos Recentes</CardTitle>
          <CardDescription>Últimos pedidos importados dos marketplaces</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {orders && orders.length > 0 ? (
              orders.map((order) => (
                <div key={order.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <h3 className="font-semibold">Pedido #{order.marketplaceOrderId}</h3>
                    <p className="text-sm text-muted-foreground">{order.buyerName || "Cliente"}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">R$ {((order.totalAmount || 0) / 100).toFixed(2)}</p>
                    <Badge variant={order.status === "delivered" ? "default" : "secondary"}>{order.status}</Badge>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-center text-muted-foreground py-8">Nenhum pedido importado ainda</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

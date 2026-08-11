import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, Eye } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export default function Orders() {
  const [selectedOrder, setSelectedOrder] = useState<any>(null);

  // Queries
  const { data: orders, isLoading, refetch } = trpc.orders.list.useQuery({ limit: 100 });

  // Mutations
  const importMutation = trpc.orders.importFromAllMarketplaces.useMutation();
  const getItemsMutation = trpc.orders.getItems.useQuery({ orderId: selectedOrder?.id || 0 }, { enabled: false });

  const handleImport = async () => {
    try {
      const result = await importMutation.mutateAsync({});
      toast.success(`Imported ${result.totalImported} order(s)`);
      if (result.totalFailed > 0) {
        toast.error(`Failed to import ${result.totalFailed} order(s)`);
      }
      refetch();
    } catch (error) {
      toast.error("Failed to import orders");
    }
  };

  const handleViewDetails = async (order: any) => {
    setSelectedOrder(order);
  };

  const getStatusColor = (status: string | null) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "confirmed":
        return "bg-blue-100 text-blue-800";
      case "shipped":
        return "bg-purple-100 text-purple-800";
      case "delivered":
        return "bg-green-100 text-green-800";
      case "cancelled":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (isLoading) {
    return <div className="text-center py-8">Carregando pedidos...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Pedidos</h1>
          <p className="text-muted-foreground mt-2">Acompanhe pedidos de todos os seus marketplaces</p>
        </div>
        <Button onClick={handleImport} disabled={importMutation.isPending}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Sincronizar Pedidos
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Pedidos Recentes</CardTitle>
          <CardDescription>Últimos pedidos importados dos marketplaces</CardDescription>
        </CardHeader>
        <CardContent>
          {orders && orders.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-semibold">Pedido</th>
                    <th className="text-left py-3 px-4 font-semibold">Cliente</th>
                    <th className="text-left py-3 px-4 font-semibold">Valor</th>
                    <th className="text-left py-3 px-4 font-semibold">Status</th>
                    <th className="text-left py-3 px-4 font-semibold">Data</th>
                    <th className="text-left py-3 px-4 font-semibold">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => (
                    <tr key={order.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4 font-medium">#{order.marketplaceOrderId}</td>
                      <td className="py-3 px-4">{order.buyerName || "Cliente"}</td>
                      <td className="py-3 px-4 font-semibold">R$ {((order.totalAmount || 0) / 100).toFixed(2)}</td>
                      <td className="py-3 px-4">
                        <Badge className={getStatusColor(order.status)}>{order.status}</Badge>
                      </td>
                      <td className="py-3 px-4 text-sm text-muted-foreground">
                        {order.orderDate ? new Date(order.orderDate as any).toLocaleDateString("pt-BR") : "-"}
                      </td>
                      <td className="py-3 px-4">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleViewDetails(order)}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Detalhes do Pedido #{order.marketplaceOrderId}</DialogTitle>
                              <DialogDescription>Informações completas do pedido</DialogDescription>
                            </DialogHeader>
                            {selectedOrder && selectedOrder.id === order.id && (
                              <div className="space-y-4">
                                <div>
                                  <h4 className="font-semibold mb-2">Informações do Pedido</h4>
                                  <div className="space-y-1 text-sm">
                                    <p>
                                      <span className="text-muted-foreground">Cliente:</span> {selectedOrder.buyerName}
                                    </p>
                                    <p>
                                      <span className="text-muted-foreground">Email:</span> {selectedOrder.buyerEmail || "-"}
                                    </p>
                                    <p>
                                      <span className="text-muted-foreground">Valor Total:</span> R${" "}
                                      {((selectedOrder.totalAmount || 0) / 100).toFixed(2)}
                                    </p>
                                    <p>
                                      <span className="text-muted-foreground">Status:</span>{" "}
                                      <Badge className={getStatusColor(selectedOrder.status)}>
                                        {selectedOrder.status}
                                      </Badge>
                                    </p>
                                  </div>
                                </div>

                                {selectedOrder.items && selectedOrder.items.length > 0 && (
                                  <div>
                                    <h4 className="font-semibold mb-2">Itens do Pedido</h4>
                                    <div className="space-y-2">
                                      {selectedOrder.items.map((item: any) => (
                                        <div key={item.id} className="p-2 border rounded text-sm">
                                          <p className="font-medium">{item.title}</p>
                                          <p className="text-muted-foreground">
                                            Quantidade: {item.quantity} | Valor: R${" "}
                                            {((item.totalPrice || 0) / 100).toFixed(2)}
                                          </p>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </DialogContent>
                        </Dialog>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">Nenhum pedido importado ainda</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

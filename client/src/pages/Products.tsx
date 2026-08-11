import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Edit2, Trash2, Share2 } from "lucide-react";
import { toast } from "sonner";

export default function Products() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [formData, setFormData] = useState({
    sku: "",
    name: "",
    category: "",
    brand: "",
    description: "",
    costBase: 0,
    stock: 0,
    minStock: 0,
  });

  // Queries
  const { data: products, isLoading, refetch } = trpc.products.list.useQuery();

  // Mutations
  const createMutation = trpc.products.create.useMutation();
  const publishMutation = trpc.products.publishToAllMarketplaces.useMutation();

  const handleCreate = async () => {
    try {
      await createMutation.mutateAsync({
        ...formData,
        costBase: formData.costBase * 100, // Convert to cents
      });
      toast.success("Product created successfully");
      setFormData({
        sku: "",
        name: "",
        category: "",
        brand: "",
        description: "",
        costBase: 0,
        stock: 0,
        minStock: 0,
      });
      setIsCreateOpen(false);
      refetch();
    } catch (error) {
      toast.error("Failed to create product");
    }
  };

  const handlePublish = async (productId: number) => {
    try {
      const result = await publishMutation.mutateAsync({ productId });
      toast.success(`Published to ${result.successful.length} marketplace(s)`);
      if (result.failed.length > 0) {
        toast.error(`Failed on ${result.failed.length} marketplace(s)`);
      }
    } catch (error) {
      toast.error("Failed to publish product");
    }
  };

  if (isLoading) {
    return <div className="text-center py-8">Loading products...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Produtos</h1>
          <p className="text-muted-foreground mt-2">Gerencie seus produtos e publique nos marketplaces</p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Novo Produto
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Criar Novo Produto</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <Input
                placeholder="SKU"
                value={formData.sku}
                onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
              />
              <Input
                placeholder="Nome do Produto"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
              <Input
                placeholder="Categoria"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              />
              <Input
                placeholder="Marca"
                value={formData.brand}
                onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
              />
              <Input
                placeholder="Descrição"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
              <Input
                type="number"
                placeholder="Custo Base (R$)"
                value={formData.costBase}
                onChange={(e) => setFormData({ ...formData, costBase: parseFloat(e.target.value) })}
              />
              <Input
                type="number"
                placeholder="Estoque"
                value={formData.stock}
                onChange={(e) => setFormData({ ...formData, stock: parseInt(e.target.value) })}
              />
              <Input
                type="number"
                placeholder="Estoque Mínimo"
                value={formData.minStock}
                onChange={(e) => setFormData({ ...formData, minStock: parseInt(e.target.value) })}
              />
              <Button onClick={handleCreate} className="w-full">
                Criar Produto
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {products?.map((product) => (
          <Card key={product.id}>
            <CardHeader>
              <CardTitle className="text-lg">{product.name}</CardTitle>
              <CardDescription>{product.sku}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Categoria:</span>
                  <span>{product.category || "-"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Marca:</span>
                  <span>{product.brand || "-"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Custo:</span>
                  <span>R$ {((product.costBase || 0) / 100).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Estoque:</span>
                  <span>{product.stock}</span>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1"
                  onClick={() => handlePublish(product.id)}
                  disabled={publishMutation.isPending}
                >
                  <Share2 className="w-4 h-4 mr-1" />
                  Publicar
                </Button>
                <Button size="sm" variant="outline">
                  <Edit2 className="w-4 h-4" />
                </Button>
                <Button size="sm" variant="outline" className="text-red-600">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {products?.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-muted-foreground">Nenhum produto criado ainda</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Edit2, Trash2, Share2, Calculator } from "lucide-react";
import { toast } from "sonner";

export default function Products() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingProductId, setEditingProductId] = useState<number | null>(null);
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
  const [editFormData, setEditFormData] = useState({
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

  const [isPricingOpen, setIsPricingOpen] = useState(false);
  const [pricingProductId, setPricingProductId] = useState<number | null>(null);
  const [pricingProductName, setPricingProductName] = useState("");
  const [marginMode, setMarginMode] = useState<"percent" | "fixed">("percent");
  const [marginPercent, setMarginPercent] = useState(30);
  const [marginFixedReais, setMarginFixedReais] = useState(20);
  const [roundPsychological, setRoundPsychological] = useState(true);

  const marginValueBpOrCents = marginMode === "percent" ? Math.round(marginPercent * 100) : Math.round(marginFixedReais * 100);
  const { data: pricingResults, isLoading: isPricingLoading } = trpc.pricing.calculate.useQuery(
    {
      productId: pricingProductId ?? undefined,
      marginMode,
      marginValue: marginValueBpOrCents,
      roundPsychological,
    },
    { enabled: isPricingOpen && pricingProductId !== null }
  );

  // Mutations
  const createMutation = trpc.products.create.useMutation();
  const updateMutation = trpc.products.update.useMutation();
  const removeMutation = trpc.products.remove.useMutation();
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

  const handleEditOpen = (product: NonNullable<typeof products>[number]) => {
    setEditingProductId(product.id);
    setEditFormData({
      sku: product.sku ?? "",
      name: product.name ?? "",
      category: product.category ?? "",
      brand: product.brand ?? "",
      description: product.description ?? "",
      costBase: (product.costBase ?? 0) / 100,
      stock: product.stock ?? 0,
      minStock: product.minStock ?? 0,
    });
    setIsEditOpen(true);
  };

  const handleUpdate = async () => {
    if (editingProductId === null) return;
    try {
      await updateMutation.mutateAsync({
        id: editingProductId,
        ...editFormData,
        costBase: Math.round(editFormData.costBase * 100),
      });
      toast.success("Produto atualizado com sucesso");
      setIsEditOpen(false);
      setEditingProductId(null);
      refetch();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao atualizar o produto");
    }
  };

  const handleDelete = async (productId: number, productName: string) => {
    const confirmado = window.confirm(`Tem certeza que deseja excluir "${productName}"? Esta ação não pode ser desfeita.`);
    if (!confirmado) return;
    try {
      await removeMutation.mutateAsync({ id: productId });
      toast.success("Produto excluído com sucesso");
      refetch();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao excluir o produto");
    }
  };

  const openPricing = (productId: number, productName: string) => {
    setPricingProductId(productId);
    setPricingProductName(productName);
    setIsPricingOpen(true);
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

        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Editar Produto</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <Input
                placeholder="SKU"
                value={editFormData.sku}
                onChange={(e) => setEditFormData({ ...editFormData, sku: e.target.value })}
              />
              <Input
                placeholder="Nome do Produto"
                value={editFormData.name}
                onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
              />
              <Input
                placeholder="Categoria"
                value={editFormData.category}
                onChange={(e) => setEditFormData({ ...editFormData, category: e.target.value })}
              />
              <Input
                placeholder="Marca"
                value={editFormData.brand}
                onChange={(e) => setEditFormData({ ...editFormData, brand: e.target.value })}
              />
              <Input
                placeholder="Descrição"
                value={editFormData.description}
                onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
              />
              <Input
                type="number"
                placeholder="Custo Base (R$)"
                value={editFormData.costBase}
                onChange={(e) => setEditFormData({ ...editFormData, costBase: parseFloat(e.target.value) || 0 })}
              />
              <Input
                type="number"
                placeholder="Estoque"
                value={editFormData.stock}
                onChange={(e) => setEditFormData({ ...editFormData, stock: parseInt(e.target.value) || 0 })}
              />
              <Input
                type="number"
                placeholder="Estoque Mínimo"
                value={editFormData.minStock}
                onChange={(e) => setEditFormData({ ...editFormData, minStock: parseInt(e.target.value) || 0 })}
              />
              <Button onClick={handleUpdate} className="w-full" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? "Salvando..." : "Salvar Alterações"}
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
                  onClick={() => openPricing(product.id, product.name)}
                >
                  <Calculator className="w-4 h-4 mr-1" />
                  Preço
                </Button>
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
                <Button size="sm" variant="outline" onClick={() => handleEditOpen(product)}>
                  <Edit2 className="w-4 h-4" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-red-600"
                  onClick={() => handleDelete(product.id, product.name)}
                  disabled={removeMutation.isPending}
                >
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

      <Dialog open={isPricingOpen} onOpenChange={setIsPricingOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Calculadora de Preço — {pricingProductName}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-muted-foreground">Como definir a margem?</label>
                <div className="flex gap-2 mt-1">
                  <Button
                    size="sm"
                    variant={marginMode === "percent" ? "default" : "outline"}
                    onClick={() => setMarginMode("percent")}
                  >
                    % sobre o preço
                  </Button>
                  <Button
                    size="sm"
                    variant={marginMode === "fixed" ? "default" : "outline"}
                    onClick={() => setMarginMode("fixed")}
                  >
                    Lucro fixo (R$)
                  </Button>
                </div>
              </div>
              <div>
                <label className="text-sm text-muted-foreground">
                  {marginMode === "percent" ? "Margem desejada (%)" : "Lucro desejado (R$)"}
                </label>
                <Input
                  type="number"
                  step="0.01"
                  value={marginMode === "percent" ? marginPercent : marginFixedReais}
                  onChange={(e) => {
                    const v = parseFloat(e.target.value) || 0;
                    if (marginMode === "percent") setMarginPercent(v);
                    else setMarginFixedReais(v);
                  }}
                />
              </div>
            </div>

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={roundPsychological}
                onChange={(e) => setRoundPsychological(e.target.checked)}
              />
              Arredondar terminando em ,90 (preço psicológico)
            </label>

            <div className="border-t pt-4">
              {isPricingLoading && <p className="text-sm text-muted-foreground">Calculando...</p>}

              {!isPricingLoading && (!pricingResults || pricingResults.length === 0) && (
                <p className="text-sm text-muted-foreground">
                  Nenhum canal de venda cadastrado ainda.{" "}
                  <a href="/canais" className="underline">
                    Cadastre seus canais aqui
                  </a>{" "}
                  (comissão, taxa, frete) pra calculadora funcionar.
                </p>
              )}

              <div className="space-y-3">
                {pricingResults?.map((r) => (
                  <div key={r.channelId} className="border rounded-lg p-3">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-semibold">{r.channelName}</span>
                      {r.impossivel ? (
                        <span className="text-red-600 text-sm">Margem inviável com essas taxas</span>
                      ) : (
                        <span className="text-lg font-bold text-green-700">
                          R$ {((r.suggestedPriceCents ?? 0) / 100).toFixed(2)}
                        </span>
                      )}
                    </div>
                    {!r.impossivel && (
                      <div className="grid grid-cols-2 gap-1 text-sm text-muted-foreground">
                        <span>Lucro líquido: R$ {((r.profitCents ?? 0) / 100).toFixed(2)}</span>
                        <span>Margem sobre preço: {((r.marginPercentOfPrice ?? 0) / 100).toFixed(1)}%</span>
                        <span>Markup sobre custo: {((r.markupPercentOfCost ?? 0) / 100).toFixed(1)}%</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

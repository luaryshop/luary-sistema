import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ArrowLeft, Plus, Edit2, Trash2, Store } from "lucide-react";
import { toast } from "sonner";

// Converte entre reais (o que o usuário digita) e centavos (o que o banco guarda)
const reaisToCents = (v: number) => Math.round(v * 100);
const centsToReais = (v: number) => v / 100;
// Converte entre percentual (o que o usuário digita) e pontos-base (o que o banco guarda)
const percentToBp = (v: number) => Math.round(v * 100);
const bpToPercent = (v: number) => v / 100;

const emptyForm = {
  name: "",
  marketplaceType: "",
  commissionPercent: 0,
  fixedFeeReais: 0,
  shippingCostReais: 0,
  taxPercent: 0,
  isActive: true,
};

export default function SalesChannels() {
  const [, navigate] = useLocation();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState(emptyForm);

  const { data: channels, refetch } = trpc.pricing.channels.list.useQuery();
  const createMutation = trpc.pricing.channels.create.useMutation();
  const updateMutation = trpc.pricing.channels.update.useMutation();
  const removeMutation = trpc.pricing.channels.remove.useMutation();

  const openCreate = () => {
    setEditingId(null);
    setFormData(emptyForm);
    setIsFormOpen(true);
  };

  const openEdit = (channel: NonNullable<typeof channels>[number]) => {
    setEditingId(channel.id);
    setFormData({
      name: channel.name,
      marketplaceType: channel.marketplaceType ?? "",
      commissionPercent: bpToPercent(channel.commissionBp),
      fixedFeeReais: centsToReais(channel.fixedFeeCents),
      shippingCostReais: centsToReais(channel.shippingCostCents),
      taxPercent: bpToPercent(channel.taxBp),
      isActive: channel.isActive === 1,
    });
    setIsFormOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast.error("Dê um nome ao canal (ex: Mercado Livre, Loja Própria, Instagram)");
      return;
    }
    const payload = {
      name: formData.name.trim(),
      marketplaceType: formData.marketplaceType.trim() || undefined,
      commissionBp: percentToBp(formData.commissionPercent),
      fixedFeeCents: reaisToCents(formData.fixedFeeReais),
      shippingCostCents: reaisToCents(formData.shippingCostReais),
      taxBp: percentToBp(formData.taxPercent),
      isActive: formData.isActive,
    };
    try {
      if (editingId !== null) {
        await updateMutation.mutateAsync({ id: editingId, ...payload });
        toast.success("Canal atualizado");
      } else {
        await createMutation.mutateAsync(payload);
        toast.success("Canal criado");
      }
      setIsFormOpen(false);
      refetch();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao salvar o canal");
    }
  };

  const handleDelete = async (id: number, name: string) => {
    if (!window.confirm(`Excluir o canal "${name}"? Isso não afeta produtos já cadastrados.`)) return;
    try {
      await removeMutation.mutateAsync({ id });
      toast.success("Canal excluído");
      refetch();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao excluir o canal");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate("/")}>
            <ArrowLeft className="w-4 h-4 mr-1" /> Voltar
          </Button>
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <Store className="w-5 h-5" /> Canais de Venda
            </h1>
            <p className="text-sm text-gray-500">
              Cadastre a comissão, taxa fixa, frete médio e imposto de cada lugar onde você vende — inclusive canais
              sem integração automática, como sua loja própria, Instagram ou WhatsApp.
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6">
        <div className="flex justify-end mb-4">
          <Button onClick={openCreate}>
            <Plus className="w-4 h-4 mr-1" /> Novo Canal
          </Button>
        </div>

        {(!channels || channels.length === 0) && (
          <Card>
            <CardContent className="py-10 text-center text-gray-500">
              Nenhum canal cadastrado ainda. Clique em "Novo Canal" para começar — sugestão: cadastre primeiro o
              Mercado Livre (comissão em torno de 12-16%) e sua Loja Própria (sem comissão, só imposto se houver).
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {channels?.map((channel) => (
            <Card key={channel.id} className={channel.isActive ? "" : "opacity-50"}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle>{channel.name}</CardTitle>
                    <CardDescription>{channel.isActive ? "Ativo" : "Inativo"}</CardDescription>
                  </div>
                  <div className="flex gap-1">
                    <Button size="sm" variant="outline" onClick={() => openEdit(channel)}>
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-red-600"
                      onClick={() => handleDelete(channel.id, channel.name)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Comissão:</span>
                  <span>{bpToPercent(channel.commissionBp).toFixed(2)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Taxa fixa:</span>
                  <span>R$ {centsToReais(channel.fixedFeeCents).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Frete médio:</span>
                  <span>R$ {centsToReais(channel.shippingCostCents).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Imposto:</span>
                  <span>{bpToPercent(channel.taxBp).toFixed(2)}%</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId !== null ? "Editar Canal" : "Novo Canal"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nome do canal</Label>
              <Input
                placeholder="Ex: Mercado Livre, Loja Própria, Instagram"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div>
              <Label>Ligar com integração (opcional)</Label>
              <Input
                placeholder="mercadolivre, shopee, amazon ou tiktok — deixe em branco se não for o caso"
                value={formData.marketplaceType}
                onChange={(e) => setFormData({ ...formData, marketplaceType: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Comissão (%)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.commissionPercent}
                  onChange={(e) => setFormData({ ...formData, commissionPercent: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div>
                <Label>Imposto (%)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.taxPercent}
                  onChange={(e) => setFormData({ ...formData, taxPercent: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div>
                <Label>Taxa fixa por venda (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.fixedFeeReais}
                  onChange={(e) => setFormData({ ...formData, fixedFeeReais: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div>
                <Label>Frete médio pago por você (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.shippingCostReais}
                  onChange={(e) => setFormData({ ...formData, shippingCostReais: parseFloat(e.target.value) || 0 })}
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
              />
              <Label>Canal ativo (aparece na calculadora de preço)</Label>
            </div>
            <Button
              onClick={handleSave}
              className="w-full"
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {createMutation.isPending || updateMutation.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

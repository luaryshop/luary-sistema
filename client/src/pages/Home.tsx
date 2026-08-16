import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, Package, ShoppingCart, Globe, Settings, LogOut } from "lucide-react";
import { useLocation } from "wouter";
import { LoginForm } from "@/components/LoginForm";

export default function Home() {
  const { user, isAuthenticated, logout } = useAuth();
  const [, navigate] = useLocation();

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center space-y-6 max-w-md">
          <div>
            <h1 className="text-4xl font-bold text-gray-900">Luary Shop ERP</h1>
            <p className="text-gray-600 mt-2">Integração completa com múltiplos marketplaces</p>
          </div>
          <p className="text-gray-700">
            Gerencie seus produtos, estoque e pedidos de todos os seus marketplaces em um único lugar.
          </p>
          <div className="flex justify-center">
            <LoginForm />
          </div>
        </div>
      </div>
    );
  }

  const sections = [
    {
      title: "Dashboard",
      description: "Visão geral de suas integrações e atividades",
      icon: BarChart3,
      path: "/dashboard",
      color: "bg-blue-500",
    },
    {
      title: "Produtos",
      description: "Gerencie seus produtos e publique nos marketplaces",
      icon: Package,
      path: "/produtos",
      color: "bg-green-500",
    },
    {
      title: "Pedidos",
      description: "Acompanhe pedidos de todos os seus marketplaces",
      icon: ShoppingCart,
      path: "/pedidos",
      color: "bg-purple-500",
    },
    {
      title: "Marketplaces",
      description: "Conecte e gerencie suas integrações",
      icon: Globe,
      path: "/marketplaces",
      color: "bg-orange-500",
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">Luary Shop ERP</h1>
            <p className="text-sm text-gray-600">Bem-vindo, {user?.name || "Usuário"}</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => logout()}
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sair
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-12">
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-2">Bem-vindo ao seu ERP</h2>
          <p className="text-gray-600">Escolha uma seção para começar</p>
        </div>

        {/* Sections Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {sections.map((section) => {
            const Icon = section.icon;
            return (
              <Card
                key={section.path}
                className="cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => navigate(section.path)}
              >
                <CardHeader>
                  <div className={`${section.color} w-12 h-12 rounded-lg flex items-center justify-center mb-4`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <CardTitle>{section.title}</CardTitle>
                  <CardDescription>{section.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button variant="outline" className="w-full" onClick={() => navigate(section.path)}>
                    Acessar
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Quick Stats */}
        <div className="mt-12">
          <h3 className="text-xl font-bold mb-4">Informações Rápidas</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Conta</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-lg font-semibold">{user?.email}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Método de Login</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-lg font-semibold capitalize">{user?.loginMethod || "Senha"}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Função</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-lg font-semibold capitalize">{user?.role || "Usuário"}</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}

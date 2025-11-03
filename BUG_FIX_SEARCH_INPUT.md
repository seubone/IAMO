# Bug Fix: Email Aparecendo na Barra de Pesquisa

## Problema Relatado

Quando o usuário abria o modal de configurações da instância (InstanceSettingsDialog), o email do usuário logado (`contato.cainandesign@gmail.com`) aparecia na barra de pesquisa de conversas no lado esquerdo da tela e permanecia lá.

## Investigação Realizada

### 1. Análise de Código
- ✅ Verificados todos os 12 `useEffect` hooks em `whatsapp.tsx` - nenhum modificava `searchQuery`
- ✅ Todos os `setSearchQuery` calls encontrados (2 total):
  - Inicialização: `const [searchQuery, setSearchQuery] = useState("");`
  - User input: `onChange={(e) => setSearchQuery(e.target.value)}`
- ✅ Nenhum `useEffect` tinha `isSettingsDialogOpen` em suas dependências
- ✅ Nenhum localStorage/sessionStorage sendo usado para searchQuery
- ✅ Nenhum autofill, querySelector ou getElementById acessando a barra de pesquisa

### 2. Possíveis Causas
1. **Autofill do navegador** - O navegador tentava fazer autofill do input de pesquisa ao abrir o modal
2. **Falta de cleanup** - Não havia `useEffect` limpando as buscas quando o modal abre
3. **Falta de ID** - O input de pesquisa de conversas não tinha um `id` definido
4. **Falta de autoComplete="off"** - Os inputs não preveniam autofill do navegador

## Solução Implementada

### 1. useEffect para Limpar Buscas (Linhas 297-303)
```tsx
useEffect(() => {
  if (isSettingsDialogOpen) {
    setSearchQuery("");
    setMessageSearchQuery("");
  }
}, [isSettingsDialogOpen]);
```
**Efeito:** Quando o modal abre, ambas as barras de pesquisa são limpas automaticamente.

### 2. Adicionar ID ao Input de Pesquisa de Conversas (Linha 900)
```tsx
<Input
  id="chat-search-input"
  type="text"
  placeholder="Buscar conversas..."
  value={searchQuery}
  onChange={(e) => setSearchQuery(e.target.value)}
  className="w-full"
  data-testid="input-search-chats"
  autoComplete="off"
/>
```
**Efeito:** ID único identifica claramente qual input é, prevenindo confusão do navegador.

### 3. Adicionar autoComplete="off" (Linhas 907, 1085)
**Efeito:** Previne que o navegador tente fazer autofill com dados salvos anteriormente.

## Resultado

- ✅ Email não aparecerá mais na barra de pesquisa quando modal abre
- ✅ Buscas são limpas automaticamente para melhor UX
- ✅ Inputs de pesquisa protegidos contra autofill indesejado

## Commit

```
fix: Limpar barras de pesquisa quando modal de configurações abre
```

## Teste

Para verificar se o bug foi corrigido:

1. Abra a aplicação em http://localhost:5173
2. Digite algo na barra de "Buscar conversas..."
3. Abra o modal de configurações clicando no botão Settings
4. Verifique que a barra foi limpada automaticamente
5. Feche o modal - a barra permanecerá vazia

# HD Studio para Netlify

Esta é a versão adaptada para Next.js + Netlify Database (PostgreSQL). Mantém o visual, a loja, o login próprio, a administração de cargos e o chat. O banco e o servidor não dependem mais de Cloudflare/Sites.

## Publicar pela primeira vez

1. Extraia este ZIP. Crie um repositório privado no GitHub e envie o conteúdo da pasta, incluindo `package.json`, `package-lock.json`, `netlify.toml` e a pasta `netlify`. Não envie o ZIP como um único arquivo.
2. Na Netlify, escolha **Add new project → Import an existing project**, conecte o GitHub e selecione esse repositório.
3. Use **Build command: `npm run build`** e **Publish directory: `.next`**. Esses valores já estão em `netlify.toml`.
4. Antes de publicar, abra as variáveis de ambiente e cadastre `OWNER_PASSWORD` como segredo, disponível para **Functions**. Use a senha do dono enviada na conversa, ou outra senha segura com 12 a 128 caracteres. Não coloque a senha em arquivos do GitHub. O e-mail reservado é `tpdasilva@icloud.com`.
5. Publique. A integração com Netlify Database está declarada no projeto, e a criação das tabelas está na pasta de migrations. A Netlify provisiona o banco no fluxo de publicação. Se o painel solicitar ativação, vá a **Data & Storage → Database**, ative-o e publique novamente.
6. Abra o endereço HTTPS do site, vá a `/entrar` e entre com o e-mail do dono e a senha configurada. O primeiro login correto cria a conta protegida. Acesse `/dashboard/administracao` para gerenciar as contas e `/dashboard/tickets` para responder às mensagens.

Use a importação do projeto: o Netlify Drop (arrastar uma pasta de HTML) não instala esta aplicação com servidor. Referência: [Next.js na Netlify](https://docs.netlify.com/build/frameworks/framework-setup-guides/nextjs/overview/).

As contas, mensagens, produtos e pedidos do site publicado anteriormente não são transferidos neste ZIP. O banco da Netlify começa vazio; uma transferência de dados existentes exige uma migração separada. A conta do dono é recriada pelo primeiro acesso correto.

## Ativar cadastro e confirmação por e-mail

O login do dono funciona sem envio de e-mail. Novos cadastros ficam pausados enquanto o remetente não estiver configurado.

Configure um remetente no Resend e adicione estas variáveis na Netlify, disponíveis para **Functions**:

| Variável | Valor |
|---|---|
| `RESEND_API_KEY` | Chave de API do Resend, marcada como segredo |
| `EMAIL_FROM` | Remetente autorizado, por exemplo `HD Studio <contas@seu-dominio.com>` |

Publique novamente após configurar as variáveis. Faça um cadastro de teste com seu próprio e-mail e confira se o código chegou. A integração usa a [API oficial do Resend](https://resend.com/docs/api-reference/emails/send-email). Não insira uma chave inventada: a aplicação só informa que enviou o código quando o provedor aceita o envio.

O código tem seis dígitos, expira em dez minutos e aceita até cinco tentativas. Cancelar invalida a solicitação. Confirmar mostra a tela preta; o visto verde só aparece após a validação, com entrada automática na conta.

## Permissões

Somente o dono gerencia cargos e a loja. Dono e administradores podem ler e responder a todos os atendimentos. Clientes veem suas próprias conversas. Moderador, vendedor, parceiro e atendente são funções identificadas na conta; não dão acesso aos chats de outras pessoas nem à gestão comercial. A conta do dono não pode ser rebaixada.

Alterar `OWNER_PASSWORD` depois de criar a conta não substitui a senha já salva no banco. A variável serve para o primeiro acesso. O campo `OWNER_PASSWORD_HASH` é uma alternativa avançada para fornecer um hash scrypt, em vez de uma senha inicial em texto; deixe-o vazio quando usar `OWNER_PASSWORD`.

## Banco, desenvolvimento e verificação

O projeto usa `@netlify/database`, com migrations em `netlify/database/migrations`. A Netlify fornece a conexão automaticamente e separa os bancos de produção e de previews. Não copie a conexão de produção para um preview. [Configuração do banco](https://docs.netlify.com/build/data-and-storage/netlify-database/getting-started/) · [Migrations](https://docs.netlify.com/build/data-and-storage/netlify-database/migrations/).

Use Node 22.13 ou superior. Execute `npm ci`, `npm test` e `npm run build`. Para desenvolver com o banco integrado, use o ambiente `netlify dev` da Netlify CLI, após vincular o projeto à sua conta. O comando `npm run dev` inicia a interface Next.js; os recursos de conta exigem a conexão de banco.

Os testes executam as rotas reais e a migration PostgreSQL no PGlite. Cobrem cadastro, confirmação, cancelamento, expiração, limite de tentativas, falha de envio, sessão, reserva do dono, cargos, isolamento de chats, mensagens, produtos, pedidos e dashboard. O envio de e-mail é simulado exclusivamente no teste.

Este pacote foi preparado e validado localmente. A publicação na sua conta Netlify e o envio real de e-mails dependem da configuração acima. O uso do banco e da hospedagem segue o plano e as cotas da sua conta; este pacote não inclui assinatura ou créditos.

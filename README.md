# Conversões - Bot Telegram

Este projeto consulta quais bases estão rodando em cada conversão e agora pode responder via Telegram Bot.

## Como usar

1. Instale as dependências:

```bash
npm install
```

2. Configure o token do seu bot Telegram:

- Crie um bot no Telegram falando com o [@BotFather](https://t.me/BotFather) e obtenha o token.
- Defina as variáveis de ambiente indicadas no aquivo `.env.example`.

3. Execute o bot:

```bash
npm start
```

4. Adicione o bot ao seu grupo do Telegram.

5. No grupo, envie o comando:

```
/conv
```

O bot irá responder com os nomes das bases rodando em cada conversão.

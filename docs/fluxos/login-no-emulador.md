# Login no emulador Android

Procedimento para entrar no aplicativo móvel de desenvolvimento. Credenciais continuam no gerenciador do Worker; este documento não guarda senha nem chave.

## Fluxo

1. Confirme o emulador conectado:

   ```sh
   adb devices
   ```

2. Confirme o pacote da aplicação nova antes de operar. O pacote atual é `com.aliancapark.app`; não use o aplicativo legado `br.com.aliancapark.mobile`.

   ```sh
   adb shell dumpsys activity activities | rg 'topResumedActivity'
   ```

3. Se necessário, abra o pacote correto:

   ```sh
   adb shell monkey -p com.aliancapark.app 1
   ```

4. Use a tela de login do app novo. Preencha **Usuário** no campo com `autocomplete="username"` e **Senha** em `autocomplete="current-password"`; envie pelo botão **Entrar**.

5. Se usar inspeção WebView/CDP, selecione os campos pelos atributos `autocomplete`. Não escolha por índice em `input`: páginas podem ter controles de mapa e sliders antes dos campos do formulário.

6. Depois de inserir a senha, valide apenas que o campo está preenchido (por exemplo, comprimento maior que zero ou marcadores de senha visíveis). Não leia, registre, imprima ou salve o valor digitado em logs, capturas compartilhadas, scripts ou documentação.

7. Confirme o resultado pela navegação autenticada e pelo estado da sessão. Se o login falhar, confira o pacote ativo, o usuário, o tipo de cliente `mobile` enviado pelo app e a resposta visível; não copie a credencial para outro campo ou aplicativo.

## Observações

- O APK antigo e o novo podem estar instalados ao mesmo tempo. Verifique sempre `topResumedActivity` antes de interagir.
- O login é validado pelo Worker Cloudflare. Não crie credenciais locais nem altere o fluxo para outro serviço.
- As posições de toque variam com resolução, teclado e escala. Prefira atributos acessíveis e seletores semânticos; use coordenadas somente após conferir a captura da tela atual.

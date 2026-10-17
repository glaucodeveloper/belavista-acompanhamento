# Acesso por PAT do GitHub

O PAT é a chave de acesso: qualquer PAT válido que consiga ler o repositório
privado `glaucodeveloper/belavista-acompanhamento` autentica, sem pré-cadastro,
perfil ou distinção por usuário. O servidor valida a chave consultando a
identidade e o acesso ao repositório na API do GitHub. Toda chave aceita recebe
o mesmo perfil de aplicação `owner`, com acesso integral às funções.

O banco guarda a identidade devolvida pelo GitHub apenas para vincular e auditar
as sessões. Essa identidade não é usada para selecionar permissões. O banco
persiste somente o hash da sessão aleatória revogável de 24 horas; o PAT fica
cifrado no dispositivo para renovar a sessão e pode ser removido ao sair.

No servidor Node, `BELAVISTA_AUTH_MODE=github-pat` e
`BELAVISTA_GITHUB_AUTH_REPO=glaucodeveloper/belavista-acompanhamento` são os
valores padrão. As tabelas `github_auth_users` e `github_auth_sessions` são
criadas no SQLite real na inicialização. O Worker usa `GITHUB_REPO` e precisa
das migrações D1 `0009` e `0010` aplicadas **antes** da publicação do código.

No Android, depois do primeiro acesso válido, o PAT é cifrado com AES-GCM
usando chave do Android Keystore e salvo no diretório privado sem backup do
aplicativo. Quando a sessão de 24 horas expira, o APK valida novamente o PAT
salvo e abre uma nova sessão. No navegador web, o PAT fica cifrado no
armazenamento local do dispositivo e a sessão é persistida separadamente.

O `GITHUB_PAT` secreto já usado pelo Worker para operar no repositório não é o
PAT de login dos usuários e não deve ser enviado ao navegador. Não versionar
nem imprimir PATs. Sem migrações D1 e publicação do Worker, o APK continuará
apontando para o serviço antigo e não conseguirá entrar com PAT.

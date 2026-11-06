# Revisão do portfólio — 05 nov. 2026

## Escopo e método

Revisão estática de `src/App.tsx`, `src/Portfolio.module.css`, `src/styles.css`, `index.html`, dependências e imagens locais. O build de produção (`npm.cmd run build`) passou. Os cálculos de contraste abaixo usam as cores hexadecimais declaradas no CSS; não foram medidos sobre pixels renderizados.

O navegador não pôde ser inspecionado: a ferramenta encerrou o controle quando não conseguiu confirmar o URL aberto. Por isso, este relatório não afirma validação visual, teste de teclado em runtime, conformidade de acessibilidade ou desempenho medido. O pedido posterior para avaliar pelo código autorizou esta análise estática; nenhum componente do produto foi alterado.

## Leitura do estado atual

O código define uma identidade clara de caderno de trabalho: papel pontilhado, margens de folha, tipografia Caveat/Kalam, capas gráficas assimétricas para projetos e cartões de experiência com logos. O tema claro concentra a experiência; o tema escuro preserva apenas o nome, conforme a direção escolhida. O hero reúne posicionamento, navegação para os projetos e LinkedIn/GitHub; o CV segue explicitamente como indisponível. Os detalhes abrem em `<dialog>` nativo.

O sistema tem boas bases técnicas: fontes auto-hospedadas com `font-display: swap`, imagens com dimensões reservadas, carregamento sob demanda na maior parte dos logos, scroll do Lenis suspenso em repouso e respeito a `prefers-reduced-motion`. O CSS adapta a composição em 900, 620 e 360 px, mas esses estados não foram vistos no navegador.

### Sinais da implementação (não são notas visuais)

| Dimensão | Sinal no código | Leitura |
|---|---|---|
| Identidade | Forte e consistente | A metáfora do caderno aparece em superfícies, linguagem e ilustrações próprias. |
| Hierarquia | Boa base | Nome, resumo e links estão no início; o CTA “Entrar no arquivo” é autoral, mas menos explícito que “Ver projetos”. |
| Prova dos projetos | Incompleta | Três fichas exibem aviso de conteúdo pendente; os cards são capas gráficas/logos, não capturas das interfaces. |
| Responsividade | Regras presentes | Colunas reorganizam e navegação vira disclosure; falta conferir 320 px, zoom e conteúdo longo no navegador. |
| Acessibilidade | Fundamentos presentes | Skip link, foco visível, idioma, estado do menu, movimento reduzido e diálogo nativo estão no código; há um ponto de ordem de foco a corrigir e validar. |
| Desempenho | Decisões razoáveis | Fontes e imagens foram otimizadas, mas não há medição de LCP, INP ou CLS nesta revisão. |

Contraste calculado a partir dos tokens atuais: `--muted` sobre `--canvas` 5,52:1 e sobre `--paper` 5,14:1; `--accent-text` 5,06:1 e 4,70:1; o azul de foco sobre o canvas 5,56:1. São acima de 4,5:1 para texto normal nas combinações base. A textura e os estados reais ainda precisam ser conferidos renderizados; a referência da WCAG descreve o requisito de contraste mínimo e reflow. [WCAG 2.2 — Reflow](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html)

## Achados priorizados

| ID | Severidade | Área | Localização / evidência | Comportamento atual | Correção proposta | Impacto |
|---|---|---|---|---|---|---|
| R-01 | MÉDIA | Navegação por teclado no mobile | `src/App.tsx:215–226`; nav vem antes dos controles e o botão “Abrir menu” vem depois | Ao abrir o menu pelo botão, o foco permanece nele. Como os links estão antes do botão na ordem do DOM, Tab segue para o conteúdo principal e pula os links recém-abertos. Shift+Tab ainda pode alcançá-los, mas o caminho é contraintuitivo. | Colocar o botão antes do `<nav>` no DOM, ou mover foco ao primeiro link quando abrir; manter Escape fechando e devolvendo foco ao botão. Não aplicar `role="menu"` à navegação comum. | Quem usa teclado pode não perceber ou percorrer a navegação aberta. O padrão WAI de disclosure mantém links na sequência de Tab e recomenda Escape para fechar. [WAI APG — Disclosure Navigation](https://www.w3.org/WAI/ARIA/apg/patterns/disclosure/examples/disclosure-navigation/) |
| R-02 | MÉDIA | Semântica e escaneabilidade dos projetos | `src/App.tsx:268–274` | Cada card usa um `<button>` contendo `ProjectArtwork`, cujo elemento raiz é um `<div>`, e o nome do projeto é um `<span>`. O conteúdo `<div>` não corresponde ao modelo de conteúdo phrasing de `<button>`; nomes também não aparecem como títulos na hierarquia de headings. | Reestruturar cada artigo para ter um título semântico `<h3>` e um controle de abrir ficha com conteúdo permitido pelo modelo de `<button>`, preservando o layout visual. Validar nome acessível do controle após a mudança. | HTML mais robusto e navegação mais fácil por títulos e leitor de tela. A especificação HTML limita o conteúdo de botão a conteúdo phrasing. [HTML Standard — button](https://html.spec.whatwg.org/multipage/form-elements.html#the-button-element) |
| R-03 | MÉDIA | Prova e conteúdo dos cases | `src/App.tsx:36–40`, `:301` | Norte, Nexo e Linha de Braille usam a mensagem genérica “Ficha em preparação”; Norte usa logo, e Nexo/Braille têm estudos gráficos. A ficha NutriAmor já tem descrição, tecnologias e link, mas ainda não mostra a interface construída. | Manter as capas autorais e transformar cada modal em uma folha de case: captura real do produto, contexto, sua contribuição, uma decisão técnica e resultado/estado confirmado. Adicionar demonstrações e repositórios apenas quando existirem. | O visitante entende o universo visual, mas ainda não consegue avaliar como as soluções funcionam ou qual foi sua contribuição. Não preencher com resultados inventados. |
| R-04 | BAIXA | Ordem da experiência profissional | `src/App.tsx:43–46`, experiência renderizada em `:336–363` | SuperGeeks (jan. 2024–dez. 2025) aparece antes de FAP Online (início em abr. 2026, atual). | Mostrar primeiro o vínculo atual e depois SuperGeeks, em ordem cronológica reversa. | Destaca o trabalho atual no primeiro olhar e corresponde à convenção de leitura de currículo. |
| R-05 | BAIXA | Mensagem de estado do portfólio | `src/App.tsx:11`, `:18` e indicador do hero | O primeiro viewport apresenta “Portfólio em construção” / “Portfolio in progress”. | Se o site já estiver sendo usado para candidatura, trocar por uma frase verdadeira e mais intencional, como “Caderno em atualização” ou “Seleção de trabalhos”, sem declarar conclusão. Se ainda for uma versão de desenvolvimento, manter o aviso é honesto. | A frase atual pode fazer uma experiência deliberadamente autoral parecer incompleta para quem avalia o portfólio rapidamente. |
| R-06 | BAIXA | Peso do logo acadêmico | `public/images/fsa-logo.png` (132.535 bytes; 2335×1242); exibido no card de formação | O PNG transparente em resolução original é carregado lazy, embora o CSS o mostre em uma coluna de cerca de 112 px no desktop e 72–92 px no mobile. | Quando houver conversor disponível, aparar margens transparentes e gerar um WebP/PNG dimensionado para o tamanho de uso. O impacto é secundário porque a imagem é lazy e pesa ~130 KB. | Evita transferir pixels que não serão exibidos; não é uma urgência de carregamento inicial. |

## Direção recomendada

### Caderno de campo de interfaces

Preservar o tema de caderno e fazê-lo funcionar como estrutura narrativa, não apenas como textura:

1. Manter o hero e a composição assimétrica, mas tornar o destino do CTA imediatamente claro — “Ver projetos” pode ser o texto principal, com “entrar no arquivo” como anotação visual.
2. Usar as capas coloridas atuais como índice visual dos projetos. Dentro das fichas, colocar primeiro a captura real da interface; acrescentar chamadas manuscritas apontando para decisões confirmadas, sem sobrepor texto indispensável.
3. Dar a cada projeto uma folha curta com a mesma sequência de leitura: contexto → contribuição → decisão técnica → resultado ou estado atual. Se não houver resultado mensurável, explicar o que foi entregue sem inventar métrica.
4. Usar pequenas marcas de margem — número da folha, anotação ou seta — somente quando ajudarem orientação ou compreensão. Evitar desenhar enfeites em cada seção.
5. Como a barra de rolagem foi ocultada por escolha, considerar um indicador vertical fino de progresso/posição no índice lateral do caderno. Ele pode reforçar a metáfora e dar orientação sem restaurar a barra nativa; precisa respeitar movimento reduzido.

Alternativa mais conservadora: manter os cards e apenas melhorar conteúdo, sem progress indicator nem anotações interativas. Recomendo a direção de caderno de campo quando houver capturas e fatos confirmados; antes disso, a prioridade é resolver a navegação e a estrutura dos cards.

## Verificações e lacunas

**Executado:** `npm.cmd run build` — TypeScript e build Vite passaram. Revisão de tokens e CSS; cálculo dos contrastes base acima. O pacote Lenis declara `respectReducedMotion: true` por padrão e o CSS também reduz animação/transição sob a preferência do sistema.

**Não executado:** renderização e screenshots; 320 px e 200% zoom; sequência real de Tab/Shift+Tab; foco do skip link após ativação; interação do `<dialog>` com teclado/leitor de tela; inspeção de console/rede; medição Core Web Vitals em dispositivo. Para reflow, validar largura equivalente a 320 CSS px e ampliação de texto sem perda de conteúdo. [WCAG 2.2 — Reflow](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html) Para modal, confirmar entrada de foco, contenção durante a abertura, Escape e retorno ao acionador. [WAI APG — Modal Dialog](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/)

O código não demonstra o desempenho percebido. A próxima medição deve observar LCP, INP e CLS em desktop e mobile; Core Web Vitals descrevem carregamento, resposta e estabilidade e devem ser avaliados com dados de uso, não inferidos do tamanho do bundle. [web.dev — Web Vitals](https://web.dev/articles/vitals)

## Veredito

**Precisa de ajustes (revisão estática).** Foram encontrados problemas acionáveis de ordem de foco e semântica nos cards, além de uma lacuna de conteúdo importante para a finalidade do portfólio. A direção do caderno está coesa no código e merece ser preservada. Sem visualização em navegador, este relatório não aprova o acabamento visual nem certifica comportamento acessível/responsivo.

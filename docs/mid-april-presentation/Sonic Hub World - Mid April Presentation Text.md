**Sonic Hub World \- Mid April Presentation Text**

**Visão Geral do Projeto \+ Declaração de IA**

O objetivo deste projeto é desenvolver um mundo aberto 3D com Three.js, inspirado no Hub World do jogo Sonic Jam para o Sega Saturn.

Este jogo foi das primeiras coletâneas de vários jogos antigos do Sonic (sonic 1, 2, 3, …) num único jogo. E a diferença das outras coletâneas para esta (Sonic Jam) é o mundo aberto que o jogador tinha para explorar e encontrar os pontos onde se podia realmente jogar os jogos. Nesse mundo aberto, o jogador podia explorar, recolher anéis e fazer mini corridas pelo mapa, mas não existe um objetivo concreto sobre o que o utilizador deve fazer.

Neste projeto, eu quis re-implementar este Hub World com algumas diferenças que se adequassem mais ao meu gosto pessoal.

Estou a usar LLMs e agentes durante o desenvolvimento do projeto, principalmente o Claude Sonnet 4.6, embora também use o Gemini 3.1 Pro para questões mais de design, e o GitHub Copilot como reviewer.

\---

**Cena & Modelação 3D**

Os modelos da cena dividem-se em duas categorias distintas.

O **Sonic** é o único modelo externo \- um ficheiro .glTF feito por terceiros. No entanto, as três animações (idle, caminhada e corrida) foram criadas por mim através de uma ferramenta que desenvolvi especificamente para isso. Eu pedi a um LLM, que criasse um site simples (single file) que servisse como um editor de poses 3D no browser. Ele carrega o modelo GLTF, permite selecionar e rodar ossos individualmente, guardar poses como keyframes e importar/exportar tudo para ficheiros JSON. Esses ficheiros são depois carregados pelo jogo e interpolados frame a frame.

Para as expressões faciais (normal, sem boca, espantado), editei os modelos diretamente no Blender, exportando variantes em ficheiros .glTF separados.

Todos os restantes objetos foram construídos em Three.js de raiz, sem qualquer software de modelação externo (Terreno, Paredes, Árvores, Flores, Nuvens, Anéis, Ponte, Água, Motobug (mob)

Agora, passando à Demo…
# Candeeiros — versão 1.25

Gerados com a ferramenta integrada ImageGen (precise-object-edit e lighting-weather). As tentativas com pés/haste visíveis foram descartadas. Os três ficheiros candeeiros-*-v1.png são fontes de recortes, não substitutos completos da planta.

Prompt diurno: editar o render original 1024×1536, mantendo enquadramento e todos os objetos. Adicionar apenas abajur marfim com flores na mesa direita do quarto principal (737,223), cúpula preta no quarto 2 e taça cromada na sala. Câmara ortográfica vertical: apenas a superfície superior circular, nunca haste, pé, base ou vista inclinada. Todos apagados, luz natural.

Prompt noturno apagado: usar a imagem diurna como alvo e o render noturno original como referência de luz. Preservar exatamente os círculos de candeeiros em (737,223), (686,623) e (464,825); escurecer para luz azul noturna, sem emissão de luz, sem alterar a geometria.

Prompt noturno aceso: preservar os mesmos três círculos e respetivas posições; iluminação elétrica quente, abajur floral luminoso, cúpula preta com abertura central quente e taça cromada com lâmpada acesa. Nunca mostrar pés nem hastes.

Integração: lamps.js recorta exclusivamente discos com máscara suave de 1 píxel, reposicionando-os nos pontos assinalados pelo utilizador: quarto principal (737,223), quarto 2 (750,534), sala (475,840). O resto das imagens geradas é descartado na composição. Os três renders originais e todos os recortes de paredes permanecem intactos. As camadas diurna/apagada/elétrica incluem o mesmo candeeiro alinhado e seguem os estados de iluminação já existentes. Não foram introduzidos comandos Shelly de luzes nesta entrega.

# Aliança Park — modelo editável no Blender

Abra `alianca_park_editable_v1.blend` no Blender 5.x. A cena principal é
registrada sobre a imagem aérea e tem a textura embutida no arquivo.

## Organização

- **Chão e textura aérea** — plano UV com a imagem de referência completa.
- **Lotes editáveis** — 298 objetos `Lote_001` a `Lote_298`; cada lote tem
  volume leve e pode ser selecionado ou editado individualmente.
- **Divisas dos lotes** — linhas de limite separadas da geometria dos lotes.
- **Ruas — preenchimento contínuo** — cada contorno de segmento reto vira um
  objeto de asfalto preenchido; a base contínua fica sob os segmentos para não
  haver vãos nos encontros.

O arquivo contém somente um conjunto de **298 lotes**, sem duplicar os 298
objetos da fonte GLB. O chão mede 320 m de altura e mantém a proporção da
imagem de 1672 × 941 px.
Os dados dos 298 lotes e dos segmentos viários vêm dos arquivos
`aerial-lot-trace-v1.json` e `aerial-road-trace-v1.json`. Não há cortes
artificiais ao longo das ruas: edite cada objeto `Rua_XX` como um segmento
preenchido. O traçado composto mantém seus vazios internos reais.

Também está disponível `alianca_park_editable_v1.glb`, para importar em outros
aplicativos 3D. O PNG de prévia mostra a cena aberta.

## Regerar

Com o Blender 5.x instalado, execute no diretório raiz do projeto:

```powershell
& "C:\Program Files\Blender Foundation\Blender 5.1\blender.exe" --background --python scripts/build_blender_editable_model.py
```

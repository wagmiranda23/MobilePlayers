"""Gera os ícones do app (public/icone-*.png) e o do atalho do Windows (servidor/icone.ico).
Rode: python scripts/icones.py"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

PUBLIC = Path(__file__).resolve().parent.parent / "public"
FONTE = next((f for f in (r"C:\Windows\Fonts\segoeuib.ttf", r"C:\Windows\Fonts\arialbd.ttf") if Path(f).exists()), None)


def icone(lado: int) -> Image.Image:
    img = Image.new("RGB", (lado, lado), "#0b1015")
    d = ImageDraw.Draw(img)
    m = lado * 0.14
    # cartão no estilo do OVR: fundo escuro, aro dourado
    d.rounded_rectangle((m, m, lado - m, lado - m), radius=lado * 0.12, fill="#14202b",
                        outline="#f0c761", width=max(2, lado // 40))
    fonte = ImageFont.truetype(FONTE, int(lado * 0.36)) if FONTE else ImageFont.load_default()
    d.text((lado / 2, lado * 0.46), "MP", fill="#f0c761", font=fonte, anchor="mm")
    sub = ImageFont.truetype(FONTE, int(lado * 0.11)) if FONTE else ImageFont.load_default()
    d.text((lado / 2, lado * 0.70), "OVR", fill="#9fb3c4", font=sub, anchor="mm")
    return img


for lado in (180, 192, 512):
    icone(lado).save(PUBLIC / f"icone-{lado}.png")
    print("ok", lado)

# O atalho do Windows (área de trabalho e menu Iniciar) precisa de .ico.
ICO = PUBLIC.parent / "servidor" / "icone.ico"
icone(256).save(ICO, sizes=[(16, 16), (24, 24), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)])
print("ok", ICO.name)

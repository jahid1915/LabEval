import os
from PIL import Image

src_path = r"C:\Users\Lenovo\.gemini\antigravity-ide\brain\ca2a2f8a-1b05-4066-87d0-498e40c9cd08\labeval_brand_logo_1790327643613.jpg"
out_dir = r"d:\Lab Performance (LabEval)\frontend\public"

img = Image.open(src_path).convert("RGBA")
width, height = img.size

# High quality alpha keying
datas = img.getdata()
new_data = []
for item in datas:
    r, g, b, a = item
    if r > 242 and g > 242 and b > 242:
        diff = max(r, g, b) - 242
        alpha = int(max(0, 255 - diff * 19))
        new_data.append((r, g, b, alpha))
    else:
        new_data.append((r, g, b, 255))

img_transparent = Image.new("RGBA", img.size)
img_transparent.putdata(new_data)

# Save full logo (with text)
full_logo_path = os.path.join(out_dir, "labeval_logo.png")
img_transparent.save(full_logo_path, "PNG")

# Crop ONLY the icon mark (beaker + arrow), avoiding the text at bottom completely
# Arrow goes up to ~17% from top, beaker base is around 68% from top
bbox = (int(width * 0.18), int(height * 0.16), int(width * 0.83), int(height * 0.69))
icon_img = img_transparent.crop(bbox)

# Center in square canvas with comfortable padding
max_dim = max(icon_img.size)
canvas_size = int(max_dim * 1.1)
square_icon = Image.new("RGBA", (canvas_size, canvas_size), (0, 0, 0, 0))
paste_x = (square_icon.width - icon_img.width) // 2
paste_y = (square_icon.height - icon_img.height) // 2
square_icon.paste(icon_img, (paste_x, paste_y), icon_img)

icon_512 = square_icon.resize((512, 512), Image.Resampling.LANCZOS)
icon_path = os.path.join(out_dir, "labeval_icon.png")
icon_512.save(icon_path, "PNG")

# Favicon: 16, 32, 48, 64, 128
fav_png_path = os.path.join(out_dir, "favicon.png")
icon_512.resize((64, 64), Image.Resampling.LANCZOS).save(fav_png_path, "PNG")

fav_ico_path = os.path.join(out_dir, "favicon.ico")
icon_512.save(fav_ico_path, format="ICO", sizes=[(16, 16), (32, 32), (48, 48), (64, 64)])

# Also save a 32x32 crisp favicon
icon_512.resize((32, 32), Image.Resampling.LANCZOS).save(os.path.join(out_dir, "favicon-32x32.png"), "PNG")

print("All assets cleanly re-exported!")

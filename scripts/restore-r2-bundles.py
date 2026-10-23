from pathlib import Path
from zipfile import ZipFile
from urllib.parse import quote
import io, subprocess

bucket = "eternal-idle-v198-test-assets"
endpoint = "https://9bf17726da5739f20d3e5ec454ae3d91.r2.cloudflarestorage.com"
for num in range(1, 5):
    name = f"永夜v198_R2素材包_{num:02}.zip"
    key = quote(name, safe="")
    dest = Path("/tmp") / f"eternal-r2-{num:02}.zip"
    subprocess.run(["aws", "--endpoint-url", endpoint, "s3", "cp",
                    f"s3://{bucket}/{key}", str(dest), "--no-progress"], check=True)
    with ZipFile(dest) as package:
        for inner_name in package.namelist():
            if not inner_name.endswith(".zip"):
                continue
            with ZipFile(io.BytesIO(package.read(inner_name))) as inner:
                for item in inner.infolist():
                    if item.is_dir():
                        continue
                    if not item.filename.startswith("eternal-idle-v198/"):
                        raise ValueError("Unexpected ZIP contents")
                    relative = item.filename.removeprefix("eternal-idle-v198/")
                    target = Path(relative)
                    if ".." in target.parts or not relative.startswith(("public/", "source-assets/", "staged-assets/")):
                        raise ValueError("Unsafe ZIP path")
                    target.parent.mkdir(parents=True, exist_ok=True)
                    with inner.open(item) as src, target.open("wb") as out:
                        import shutil
                        shutil.copyfileobj(src, out)
    dest.unlink()
    print(f"Restored bundle {num}/4")
assert Path("public/assets/dragon381/definitions.json").is_file()
print("Game assets restored")

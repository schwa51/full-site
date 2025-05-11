
import os
import frontmatter
import pandas as pd

vault_dir = "vault/campaigns"
records = []

for root, _, files in os.walk(vault_dir):
    for file in files:
        if file.endswith(".md"):
            full_path = os.path.join(root, file)
            try:
                post = frontmatter.load(full_path)
                records.append({
                    "file": os.path.relpath(full_path, vault_dir),
                    "title": post.get("title"),
                    "type": post.get("type"),
                    "campaign": post.get("campaign"),
                    "publish": post.get("publish"),
                    "draft": post.get("draft")
                })
            except Exception as e:
                records.append({
                    "file": os.path.relpath(full_path, vault_dir),
                    "error": str(e)
                })

df = pd.DataFrame(records)
df.to_csv("frontmatter_summary.csv", index=False)
print("Saved to frontmatter_summary.csv")

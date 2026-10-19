import re, pathlib
p = pathlib.Path("netlify/edge-functions/wallet-api.ts")
s = p.read_text()
lines = s.splitlines()
print(f"Lines: {len(lines)}")
print("First 15:")
print("\n".join(lines[:15]))
print("\n--- converting ---")

# Replace Deno.serve(async (req) => {  -> export default async (req: Request) => {
s = re.sub(r"Deno\.serve\s*\(\s*async\s*\(\s*req\s*\)\s*=>\s*\{", "export default async (req: Request, context: any) => {", s)
s = re.sub(r"Deno\.serve\s*\(\s*\(\s*req[^\)]*\)\s*=>\s*\{", "export default async (req: Request, context: any) => {", s)
s = re.sub(r"Deno\.serve\s*\(\s*async\s*\(\s*req[^\)]*\)\s*=>\s*\{", "export default async (req: Request, context: any) => {", s)

# Replace ending }); with }
if s.rstrip().endswith("});"):
    s = s.rstrip()[:-3] + "\n}\n"
    print("Removed final });")

p.write_text(s)
print("Done")
print("\nLast 5 lines now:")
print("\n".join(s.splitlines()[-5:]))

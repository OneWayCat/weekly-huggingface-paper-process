# 指标不显示的 4 层排查清单

历史：这个问题在 W28 迭代了 v7-v15 共 8 个版本才找到根因。

## 第 1 层：数据解析

检查 `parse_slice_md()` 是否解析了 `指标` 字段：

```python
# 必须有的键：
elif key == "指标":
    current["metrics"] = [m.strip() for m in val.split("·")]
```

验证解析结果：
```bash
python -c "
from scripts.weekly_paper_pipeline import parse_slice_md
meta = parse_slice_md('output/2026WeekWW/slice.md')
for p in meta: print(p.get('metrics', []))
"
```

## 第 2 层：数据传递（⚠️ 最容易被忽略）

`paper_data` 构建时 `metrics` 是否从 `p` 传过来了？

```python
# ❌ 错误（v14 及之前的版本）
paper_data.append({"metrics": [], ...})

# ✅ 正确（v15 修复）
paper_data.append({"metrics": p.get("metrics", []), ...})
```

检查 Step 4 传参时是否用了正确值：
```python
render_remotion("paperDemo", {
    ...
    "metrics": paper.get("metrics", []),  # ← 不能写死 []
    ...
})
```

## 第 3 层：JSON 文件

验证 `_tmp_data.json` 的内容：
```bash
cat remotion_ainews/_tmp_data.json | python -m json.tool
```

检查 `metrics` 字段是否存在且为数组。

## 第 4 层：Remotion 渲染

- `render-scene.mjs` 的 `inputPropsMapper` 必须保留 `metrics: data.metrics || []`
- `PaperDemoCard.tsx` 的 props 接口必须包含 `metrics: string[]`
- 叠加层必须有 `zIndex: 10`（Chromium `<Video>` 层默认在普通 DOM 之上）

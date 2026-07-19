# Metrics 不显示的 5 层排查清单

W28 实战：从 `parse_slice_md` 正确解析到实际渲染，中间 3 层数据传递。

## 排查层

### 第 1 层：数据解析

```python
meta = parse_slice_md('slice.md')
# → Paper 0: metrics=['7-500×更少数据', 'ECCV 2026']
```

**检查**：`slice.md` 的 `指标` 行是否用 `·` 分隔。
**修复**：`parse_slice_md()` 的 `elif key == "指标"` 分支。

### 第 2 层：paper_data 构建 ⚠️ 这里是最常出问题的点

```python
paper_data.append({
    ...
    "metrics": [],  # ❌ 硬编码空数组！
    # 应该写成:
    "metrics": p.get("metrics", []),  # ✅ 从 meta 取值
})
```

**这是 W28 实际 bug 根因**。`parse_slice_md` 返回的 `meta[i]` 有正确的 metrics，但 Step 1 构建 `paper_data` 时写死了空数组。后续 Step 4 无论怎么传 `paper.get("metrics", [])` 都是空的。

### 第 3 层：render_remotion 传参

```python
render_remotion("paperDemo", {
    ...
    "metrics": paper.get("metrics", []),
    ...
})
```

**检查**：确认 `paper` 是 `paper_data[i]`，且 metrics 有值。

### 第 4 层：render-scene.mjs inputPropsMapper

```javascript
metrics: data.metrics || [],
```

**检查**：JSON 文件中的 metrics 字段是否正确传递。

### 第 5 层：PaperDemoCard 渲染

```tsx
// metrics 用 metrics 原值，不经过 realMetrics 中间变量
{metrics && metrics.length > 0 && metrics.map(...)}
```

**常见问题**：
- `<Video>` 层覆盖：加 `zIndex: 10`
- 底部渐变遮住位置：`bottom: 70` 而非 `bottom: 24`
- `realMetrics` 过滤掉非 upvote 指标（误杀）

# concat_videos xfade 实践指南

`concat_videos()` 在 Step 6 将 7 段 scene 视频拼接为完整视频，并通过 ffmpeg xfade 滤镜在场景间做 0.5s 交叉淡入。

## xfade 参数

- **过渡类型**：`fadewhite`（白色过渡，适配白底设计）
- **时长**：`tf = 12` 帧（24fps = 0.5s）
- **音频**：`acrossfade=d=0.5`（同步音频交叉淡入）

## offset 计算公式

```python
# 第 i 段 xfade 的偏移量
# 前 i+1 段总时长减去已消耗的过渡时间
offset = sum(durs[0..i]) - tf * (i+1) / 24
```

累计实现：
```python
cum = 0
for i in range(n - 1):
    offset = cum + durs[i] - tf / 24  # 第一段偏移 = durs[0] - 0.5s
    # ... build filter chain ...
    cum += durs[i]
```

## filter chain 结构（7 段视频 = 6 次 xfade）

```
[0:v][1:v]xfade=...offset=6.275[v0];  [0:a][1:a]acrossfade=...[a0];
[v0][2:v]xfade=...offset=47.85[v1];   [a0][2:a]acrossfade=...[a1];
[v1][3:v]xfade=...offset=76.53[v2];   [a1][3:a]acrossfade=...[a2];
...
```

## 失败 fallback

如果 xfade 失败（如输入文件无音频轨），自动 fallback 到标准 concat（硬切）：
```python
if r.returncode != 0:
    # 使用 concat filter 做硬切
    fp = "".join(f"[{i}:v][{i}:a]" for i in range(n))
    ffmpeg ... -filter_complex "{fp}concat=n={n}:v=1:a=1[ov][oa]" ...
```

## 已知失败原因

1. **输入无音频**：acrossfade 要求输入有音频流。Remotion 渲染的 scene 始终包含音频轨（空也有一轨），所以正常运行没问题
2. **分辨率/帧率不一致**：`concat_videos()` 先对每个输入做 normalize（scale + fps + pixel format），确保 xfade 兼容
3. **offset 计算超出视频总长**：如果 offset > 视频实际时长，ffmpeg 会报错。上面的公式已正确处理

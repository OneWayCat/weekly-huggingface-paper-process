# BGM 获取流程

每周由用户指定网易云音乐链接。获取流程：

## 步骤

1. 浏览器打开网易云音乐链接获取歌曲信息（歌名、艺人）
2. 在 YouTube 搜索 `"歌名 Artist"`（如 `"The Best Time Infraction Music"`）
3. 从搜索结果中找到同名视频，用 yt-dlp 下载音频
4. 替换 `assets/bgm_struggle.mp3`

## 下载命令

```bash
# 查找 YouTube 视频（手动在浏览器搜）
# 然后用 yt-dlp 下载
python -m yt_dlp \
  --proxy http://127.0.0.1:7897 \
  -x --audio-format mp3 --audio-quality 128k \
  -o "$SKILL_DIR/assets/bgm_struggle.mp3" \
  "https://www.youtube.com/watch?v=VIDEO_ID"
```

注意：需要 Clash 代理（127.0.0.1:7897）翻墙。

## 验证

```bash
ffprobe -v error -show_entries format=duration,size \
  -of default=noprint_wrappers=1:nokey=1 \
  assets/bgm_struggle.mp3
# 期望输出：时长（秒）和文件大小
```

BGM 应接近视频总时长（~200s），过短会循环播放。默认音量 0.12。

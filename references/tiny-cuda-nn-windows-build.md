# tiny-cuda-nn Windows 编译指南

NVlabs/tiny-cuda-nn 在 Windows 上通过 `pip install` 编译时踩坑极多。以下是 RTX 3060 Ti + CUDA 12.6 + PyTorch 2.13 + Python 3.11 环境下的完整排障记录。

## 前提条件

- Visual Studio 已安装（含 MSVC v143 或更高）
- CUDA Toolkit 已安装（nvcc 可用）
- conda 或 venv 环境

## 标准安装命令（大概率失败）

```bash
pip install git+https://github.com/NVlabs/tiny-cuda-nn/#subdirectory=bindings/torch
```

## 常见错误及修复

### 1. `ModuleNotFoundError: No module named 'pkg_resources'`

**原因**：pip 的隔离 build 环境使用最新的 setuptools（≥70），其中已移除 `pkg_resources`。但 tiny-cuda-nn 的 `setup.py` 第 5 行 `from pkg_resources import parse_version` 需要它。

**修复**：修改 `bindings/torch/setup.py`，加三路 fallback：

```python
try:
    from pkg_resources import parse_version
except ImportError:
    try:
        from packaging.version import parse as parse_version
    except ImportError:
        from distutils.version import LooseVersion as parse_version
```

> 注意：`--no-build-isolation` 不能解决此问题，因为 pip 仍然用隔离环境的 setuptools。必须改 setup.py 源码。

### 2. `OSError: Unknown compute capability`

**原因**：PyTorch 以 CPU-only 模式安装在 pip 隔离环境中，`torch.cuda.is_available()` 返回 False，脚本无法检测 GPU 架构。

**修复**：在 setup.py 中 fallback 到 Ampere 架构（RTX 30 系列 = compute 86）：

```python
if not torch.cuda.is_available():
    compute_capabilities = [86]  # Ampere for RTX 3060 Ti
```

### 3. `CUDA_HOME environment variable is not set`

**原因**：pip 隔离环境不继承外部 shell 的 `CUDA_HOME`。`torch.utils.cpp_extension.CUDAExtension()` 需要它来找 CUDA 库文件。

**修复**：在 setup.py 顶部自动检测并设置：

```python
if not os.environ.get("CUDA_HOME"):
    for candidate in [
        r"G:\cuda12.6",
        r"C:\Program Files\NVIDIA GPU Computing Toolkit\CUDA\v12.6",
    ]:
        if os.path.isdir(candidate):
            os.environ["CUDA_HOME"] = candidate
            break
```

> 注意：`set CUDA_HOME=...` 在外部 cmd 中无效，因为 pip 的 build 子进程不继承它。必须写在 setup.py 内。

### 4. `fatal: destination path ... already exists`

**原因**：G 盘（挂载盘）上 git clone 有时目录写入了但后续操作发现为空或 lock 文件残留。

**修复**：用 `--depth=1` 避免浅克隆问题，或用完全不同的目录名。Windows 原生路径（`C:/Users/...`）比 MSYS 路径（`/c/Users/...`）更可靠。

## 最终可用的 setup.py 修改

关键修改总结（三处）：

1. 第 5 行：`from pkg_resources import parse_version` → try/except 三路 fallback
2. 第 60 行附近：raise EnvironmentError → `compute_capabilities = [86]` fallback
3. 第 15 行附近：`os.environ["CUDA_HOME"]` 自动检测

加上一个 `pyproject.toml`（如果没有的话）：

```toml
[build-system]
requires = ["setuptools>=40.8.0", "wheel", "torch"]
build-backend = "setuptools.build_meta"
```

## 验证安装

```python
import tinycudann as tcnn
print(tcnn.__version__)
```

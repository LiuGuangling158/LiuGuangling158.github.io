---
title: Python 基础语法 ——笔记整理
description: 从零快速掌握 Python 基础语法，包括程序结构、输入输出、变量类型、运算符、控制流与异常处理等核心知识点，适合有其他语言基础的同学快速上手
pubDate: 2026-06-05
category: 编程学习记录
cover: /images/covers/2026-06-07-3xxbwc.png
---







Python 最大的特点就是简洁，别的语言要写一大堆样板代码，Python 几行就搞定了。它不需要编译，不需要声明变量类型，甚至不需要写 `main` 函数——打开文件，直接写代码，运行就完事了。

下面我们就从最简单的程序开始。

## Hello World 与程序结构

先看一个最简单的 Python 程序：

```python
print("hello world")
```

不需要 `import`，不需要 `class`，不需要 `main` 函数。Python 的执行方式很直觉：从文件的第一行开始，从上往下逐行执行，就这么简单。

还有一件事要提前说：**Python 用缩进来表示代码块**，而不是花括号 `{}`。这意味着缩进不是可选的美化，而是语法的一部分。后面讲到 `if`、`for` 的时候你就会看到，缩进错了程序会直接报错。

Python 的注释用 `#` 开头，`#` 后面的内容会被忽略：

```python
# 这是一行注释
print("hello")  # 这也是注释
```

---

## 输出

### print() 基本用法

`print()` 是 Python 中最常用的输出函数，把内容打印到控制台：

```python
print("Hello World")
print(42)
print(3.14)
print(True)
```

`print()` 可以接收多个参数，默认用空格隔开，打印完自动换行。

### sep 和 end 参数

如果你想改变分隔符或者取消自动换行，可以用 `sep` 和 `end` 参数：

```python
# sep 指定多个参数之间的分隔符（默认为空格）
print("a", "b", "c", sep="-")      # 输出：a-b-c

# end 指定打印完后的结尾字符（默认为换行符 \n）
print("Hello", end=" ")
print("World")                      # 输出：Hello World（同一行）

# 取消换行
print("Loading...", end="")         # 不换行
```

### f-string 格式化输出

在字符串前面加一个 `f`，就可以在花括号 `{}` 里直接写变量名或表达式，Python 会自动把它们替换成对应的值。这叫 f-string，是 Python 中最常用的字符串格式化方式：

```python
name = "Alice"
age = 25
print(f"我叫{name}，今年{age}岁")

pi = 3.1415926
print(f"圆周率约等于{pi:.2f}")    # 输出：圆周率约等于3.14
```

`f"{pi:.2f}"` 这种写法在算法题中经常用到，比如题目要求"保留两位小数输出"。冒号后面的 `.2f` 就是格式说明符，`.2` 表示两位小数，`f` 表示浮点数格式。

---

## 输入

### input() 读取一行

`input()` 从控制台读取一行输入，**返回的永远是字符串**。即使用户输入的是数字，拿到的也是字符串 `"123"` 而不是数字 `123`，要读取数字就需要手动转换类型：

```python
name = input("请输入你的名字：")
print(f"你好，{name}")

# 读取数字需要手动转换类型
s = input("请输入一个数字：")     # 用户输入 123
num = int(s)                      # 转换为整数
print(num + 1)                    # 输出 124
```

### 一行读取多个值

很多算法题的输入是一行多个数字，用空格隔开。这时候用 `split()` 切分，再用 `map()` 批量转换类型：

```python
# 读取两个整数
a, b = map(int, input().split())
# 用户输入 "3 5"，则 a=3, b=5
```

这个 `map(int, input().split())` 是 Python 算法题中的标准输入套路，建议记住。拆解一下：

1. `input()` 读取一行，比如 `"3 5"`
2. `.split()` 按空格切分成列表 `["3", "5"]`
3. `map(int, ...)` 对列表中每个元素调用 `int()` 转换
4. `a, b = ...` 把结果拆包赋值给两个变量

如果一行有很多数字需要存到列表里，可以这样：

```python
# 读取一行多个整数，存到列表中
nums = list(map(int, input().split()))
# 用户输入 "1 2 3 4 5"
# nums = [1, 2, 3, 4, 5]
```

---

## 变量与数据类型

Python 是动态类型语言，变量不需要声明类型，赋什么值就是什么类型，而且同一个变量可以随时改变类型：

```python
x = 42          # int
x = "hello"     # 同一个变量可以变成 str
x = 3.14        # 又变成 float
```

`type()` 函数可以查看任何值的类型。Python 中最常用的数据类型：

| 类型 | 说明 | 示例 |
|------|------|------|
| `int` | 整数（**任意大**，不会溢出） | `x = 42` |
| `float` | 浮点数（小数） | `x = 3.14` |
| `str` | 字符串 | `x = "hello"` |
| `bool` | 布尔值（注意首字母大写） | `x = True` |
| `NoneType` | 空值 | `x = None` |

Python 的 `int` 有一个很大的优势：**没有大小限制**，不管数字多大都能精确表示，不会溢出。这在处理大数运算的算法题时非常方便，比如 `2 ** 1000` 也能精确计算。

`None` 表示"什么都没有"，判断一个变量是否为 `None` 推荐用 `is` 而不是 `==`：

```python
result = None
if result is None:
    print("还没有结果")
```

---

## 类型转换

Python 的类型转换都是用对应的类型名当函数来调用：

```python
int("123")        # 123
float("3.14")     # 3.14
str(42)           # "42"
bool(1)           # True
bool(0)           # False
int(3.9)          # 3（直接截断，不是四舍五入）
```

`int()` 转换浮点数时是**直接截断小数部分**，不是四舍五入。想要四舍五入可以用 `round()` 函数。

---

## 运算符

### 算术运算符

```python
a = 17
b = 5

print(a + b)    # 22    加法
print(a - b)    # 12    减法
print(a * b)    # 85    乘法
print(a / b)    # 3.4   真除法（结果是浮点数）
print(a // b)   # 3     整除（向下取整）
print(a % b)    # 2     取余
print(a ** b)   # 1419857  幂运算（17的5次方）
print(9 ** 0.5) # 3.0   开平方
```

这里有两个重点：

1. **`/` 是真除法**，`17 / 5` 的结果是 `3.4`，不是 `3`。想要整除要用 `//`。
2. **`**` 是幂运算**，`2 ** 10` 就是 2 的 10 次方。`9 ** 0.5` 就是 9 的 0.5 次方，也就是开平方。

### 比较与逻辑运算符

```python
# 比较运算符
x == y    # 等于
x != y    # 不等于
x < y     # 小于
x > y     # 大于
x <= y    # 小于等于
x >= y    # 大于等于

# 链式比较（Python 特有，写起来像数学一样自然）
1 < x < 20     # x 在 1 到 20 之间

# 逻辑运算符（用英文单词，不是符号）
a and b   # 逻辑与
a or b    # 逻辑或
not a     # 逻辑非

# 成员运算符
x in lst        # x 是否在列表中
x not in lst    # x 是否不在列表中
```

Python 的链式比较 `1 < x < 20` 很方便，写起来像数学一样自然。逻辑运算符用的是 `and`、`or`、`not` 这三个英文单词，而不是符号。

### 位运算

位运算在处理二进制相关问题时非常高效。详细的位运算原理可以参考常用的位操作，这里了解一下基本用法就行：

```python
a = 5       # 二进制：0101
b = 3       # 二进制：0011

print(a & b)   # 1     按位与（0101 & 0011 = 0001）
print(a | b)   # 7     按位或（0101 | 0011 = 0111）
print(a ^ b)   # 6     按位异或（0101 ^ 0011 = 0110）
print(~a)      # -6    按位取反
print(a << 1)  # 10    左移一位（相当于乘以 2）
print(a >> 1)  # 2     右移一位（相当于除以 2）
```

---

## 控制流

### if / elif / else

Python 用缩进来表示代码块，**没有花括号**。条件后面跟一个冒号 `:`，下一行缩进（通常 4 个空格）就是条件成立时要执行的代码：

```python
score = 85

if score >= 90:
    print("优秀")
elif score >= 80:
    print("良好")
elif score >= 60:
    print("及格")
else:
    print("不及格")
```

几个关键点：

- 条件后面一定要有冒号 `:`
- 代码块用缩进表示，同一个代码块的缩进必须一致
- `elif` 是 "else if" 的缩写
- 条件**不需要括号**（加了也不报错，但 Python 风格不加）

缩进错了会直接报错，比如这样：

```python
if score >= 90:
print("优秀")  # 报错！缺少缩进
```

### for 循环

Python 的 `for` 循环用来遍历一个序列（列表、字符串、range 等），语法是 `for 变量 in 序列:`：

```python
# 使用 range 循环 n 次
for i in range(5):
    print(i)        # 输出：0 1 2 3 4

# range(start, stop) 左闭右开
for i in range(2, 5):
    print(i)        # 输出：2 3 4

# range(start, stop, step) 带步长
for i in range(0, 10, 2):
    print(i)        # 输出：0 2 4 6 8
```

`range(n)` 生成的序列是左闭右开的，从 `0` 到 `n-1`。这和数组下标的范围完全一致，用起来非常自然。

### 遍历列表和 enumerate

`for` 也可以直接遍历列表、字符串等。如果遍历的同时还需要知道下标，用 `enumerate()`：

```python
# 直接遍历列表
fruits = ["apple", "banana", "orange"]
for fruit in fruits:
    print(fruit)

# 同时获取下标和元素
for i, fruit in enumerate(fruits):
    print(f"{i}: {fruit}")
# 输出：
# 0: apple
# 1: banana
# 2: orange

# 遍历字符串
for ch in "hello":
    print(ch)       # h e l l o（每行一个字符）
```

`enumerate()` 返回的是 `(下标, 元素)` 的配对，用起来比手动维护一个计数器变量方便多了。

### while 循环

`while` 循环在条件为真时重复执行：

```python
count = 0
while count < 5:
    print(count)
    count += 1
# 输出：0 1 2 3 4
```

注意 Python **没有 `do-while` 循环**，也没有 `i++` 的写法，自增只能写 `i += 1`。

### break 和 continue

`break` 立刻跳出整个循环，`continue` 跳过当前这一轮、进入下一轮：

```python
# break：遇到 5 就停止
for i in range(10):
    if i == 5:
        break
    print(i)        # 输出：0 1 2 3 4

# continue：跳过偶数
for i in range(10):
    if i % 2 == 0:
        continue
    print(i)        # 输出：1 3 5 7 9
```

最后来个综合一点的例子，把前面学的输入输出和控制流结合起来：

```python
# 判断一个数是否为质数
n = int(input("请输入一个正整数："))

if n <= 1:
    print(f"{n} 不是质数")
else:
    is_prime = True
    for i in range(2, int(n ** 0.5) + 1):
        if n % i == 0:
            is_prime = False
            break
    if is_prime:
        print(f"{n} 是质数")
    else:
        print(f"{n} 不是质数")
```

---

## 异常处理

Python 代码出错时会抛出异常，用 `try-except` 把它接住继续运行，否则程序会直接停下来。

```python
try:
    num = int(input("请输入一个数字："))
    result = 100 / num
    print(f"结果是：{result}")
except ValueError:
    print("输入的不是有效的数字！")
except ZeroDivisionError:
    print("不能除以零！")
except Exception as e:
    print(f"发生了一个错误：{e}")
else:
    print("一切顺利，没有发生任何异常")
finally:
    print("无论是否出错，都会执行的清理代码")
```

四件套分工清楚：

- `try` 放可能出错的代码
- `except` 匹配并处理异常
- `else` 在没出错时才执行，常放只在成功路径上跑的收尾逻辑
- `finally` 无论成功失败都跑，常用来释放资源

常见的内置异常类型有 `ValueError`（值不合法）、`TypeError`（类型不对）、`IndexError`（序列越界）、`KeyError`（字典查不到）、`ZeroDivisionError`（除零）。

继承关系里 `Exception` 是大多数业务异常的父类，顶层是 `BaseException`，`KeyboardInterrupt` 和 `SystemExit` 直接继承 `BaseException`。

`raise` 可以抛一个新异常：

```python
def check_age(age):
    if age < 0:
        raise ValueError("年龄不能为负数")
    return age
```

如果在 `except` 块里空写 `raise`，表示把当前异常继续往上传。

想保留异常链，就用 `raise NewError("...") from e` 的写法（这里的 `e` 就是 `except KeyError as e` 里捕获到的异常对象），排查时能看到完整的错误来源：

```python
try:
    scores["Tom"]
except KeyError as e:
    raise ValueError(f"找不到用户") from e
```

最容易踩的坑是写裸 `except:`，它会连 `Ctrl+C`（`KeyboardInterrupt`）和 `SystemExit` 都一起吞掉，调试时完全没法退出程序。至少写成 `except Exception`，才能避开这两类系统级信号。

Python 社区推崇 **EAFP**（Easier to Ask Forgiveness than Permission，先做再说，出错再处理）的风格。比如查字典里某个 key 是否存在，与其先 `if name in scores` 再 `scores[name]`，不如直接 `try: scores[name] except KeyError: ...`，更简洁也更地道：

```python
# LBYL 风格（Look Before You Leap）
if name in scores:
    print(scores[name])
else:
    print("没有这个人的成绩")

# EAFP 风格（更 Pythonic）
try:
    print(scores[name])
except KeyError:
    print("没有这个人的成绩")
```

---

## 小结

这篇介绍了 Python 的基础语法：程序结构、输入输出、变量类型、运算符和控制流。Python 的语法非常贴近自然语言，没有花括号、不需要分号、变量不用声明类型，写起来很轻松。

几个核心要点回顾：

- `print()` 输出，`input()` 输入（返回字符串，需要手动转类型）
- `map(int, input().split())` 是读取一行多个整数的标准写法
- `/` 是真除法，`//` 是整除，`**` 是幂运算
- 逻辑运算用 `and`、`or`、`not` 而不是符号
- **缩进是语法**，不是装饰

